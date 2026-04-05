import { gcm } from '@noble/ciphers/aes.js';
import { randomBytes } from '@noble/hashes/utils.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { KeyPair, generateKeyPair, calculateDH, bytesToBase64, base64ToBytes } from './keys';

const MAX_SKIP = 1000;
const RATCHET_INFO = 'Abhi_Ratchet';
const MESSAGE_KEY_INFO = 'Abhi_MessageKey';

export interface MessageHeader {
  publicKey: string;
  previousChainLength: number;
  messageNumber: number;
}

export interface EncryptedMessage {
  header: MessageHeader;
  ciphertext: string;
  nonce: string;
}

interface ChainKey {
  key: Uint8Array;
  index: number;
}

interface SkippedMessageKey {
  publicKey: string;
  messageNumber: number;
  messageKey: Uint8Array;
}

export interface RatchetState {
  rootKey: Uint8Array;
  sendingChainKey: ChainKey | null;
  receivingChainKey: ChainKey | null;
  sendingRatchetKey: KeyPair | null;
  receivingRatchetKey: Uint8Array | null;
  previousSendingChainLength: number;
  skippedMessageKeys: SkippedMessageKey[];
}

export interface SerializedRatchetState {
  rootKey: string;
  sendingChainKey: { key: string; index: number } | null;
  receivingChainKey: { key: string; index: number } | null;
  sendingRatchetKeyPublic: string | null;
  sendingRatchetKeyPrivate: string | null;
  receivingRatchetKey: string | null;
  previousSendingChainLength: number;
  skippedMessageKeys: Array<{
    publicKey: string;
    messageNumber: number;
    messageKey: string;
  }>;
}

const encoder = new TextEncoder();

function kdfRootKey(rootKey: Uint8Array, dhOutput: Uint8Array): { newRootKey: Uint8Array; chainKey: Uint8Array } {
  const infoBytes = encoder.encode(RATCHET_INFO);
  const output = hkdf(sha256, dhOutput, rootKey, infoBytes, 64);
  return {
    newRootKey: output.slice(0, 32),
    chainKey: output.slice(32, 64),
  };
}

function kdfChainKey(chainKey: Uint8Array): { newChainKey: Uint8Array; messageKey: Uint8Array } {
  const msgInfoBytes = encoder.encode(MESSAGE_KEY_INFO + '_MSG');
  const chainInfoBytes = encoder.encode(MESSAGE_KEY_INFO + '_CHAIN');
  const messageKey = hkdf(sha256, chainKey, undefined, msgInfoBytes, 32);
  const newChainKey = hkdf(sha256, chainKey, undefined, chainInfoBytes, 32);
  return { newChainKey, messageKey };
}

export function initializeRatchetAsInitiator(
  sharedSecret: Uint8Array,
  recipientRatchetKey: Uint8Array
): RatchetState {
  const sendingRatchetKey = generateKeyPair();
  const dhOutput = calculateDH(sendingRatchetKey.privateKey, recipientRatchetKey);
  const { newRootKey, chainKey } = kdfRootKey(sharedSecret, dhOutput);

  return {
    rootKey: newRootKey,
    sendingChainKey: { key: chainKey, index: 0 },
    receivingChainKey: null,
    sendingRatchetKey,
    receivingRatchetKey: recipientRatchetKey,
    previousSendingChainLength: 0,
    skippedMessageKeys: [],
  };
}

export function initializeRatchetAsResponder(
  sharedSecret: Uint8Array,
  signedPreKeyPair: KeyPair
): RatchetState {
  return {
    rootKey: sharedSecret,
    sendingChainKey: null,
    receivingChainKey: null,
    sendingRatchetKey: signedPreKeyPair,
    receivingRatchetKey: null,
    previousSendingChainLength: 0,
    skippedMessageKeys: [],
  };
}

function performDHRatchet(state: RatchetState, theirPublicKey: Uint8Array): void {
  state.previousSendingChainLength = state.sendingChainKey?.index ?? 0;
  state.receivingRatchetKey = theirPublicKey;

  const dhOutput1 = calculateDH(state.sendingRatchetKey!.privateKey, theirPublicKey);
  const { newRootKey: rootKey1, chainKey: receivingChainKey } = kdfRootKey(state.rootKey, dhOutput1);
  state.rootKey = rootKey1;
  state.receivingChainKey = { key: receivingChainKey, index: 0 };

  state.sendingRatchetKey = generateKeyPair();
  const dhOutput2 = calculateDH(state.sendingRatchetKey.privateKey, theirPublicKey);
  const { newRootKey: rootKey2, chainKey: sendingChainKey } = kdfRootKey(state.rootKey, dhOutput2);
  state.rootKey = rootKey2;
  state.sendingChainKey = { key: sendingChainKey, index: 0 };
}

function skipMessageKeys(state: RatchetState, until: number): void {
  if (!state.receivingChainKey) return;
  
  if (until - state.receivingChainKey.index > MAX_SKIP) {
    throw new Error('Too many skipped messages');
  }

  while (state.receivingChainKey.index < until) {
    const { newChainKey, messageKey } = kdfChainKey(state.receivingChainKey.key);
    state.skippedMessageKeys.push({
      publicKey: bytesToBase64(state.receivingRatchetKey!),
      messageNumber: state.receivingChainKey.index,
      messageKey,
    });
    state.receivingChainKey.key = newChainKey;
    state.receivingChainKey.index++;
  }
}

function trySkippedMessageKeys(
  state: RatchetState,
  header: MessageHeader
): Uint8Array | null {
  const index = state.skippedMessageKeys.findIndex(
    (mk) => mk.publicKey === header.publicKey && mk.messageNumber === header.messageNumber
  );

  if (index >= 0) {
    const messageKey = state.skippedMessageKeys[index].messageKey;
    state.skippedMessageKeys.splice(index, 1);
    return messageKey;
  }

  return null;
}

export function ratchetEncrypt(
  state: RatchetState,
  plaintext: string
): EncryptedMessage {
  if (!state.sendingChainKey) {
    throw new Error('Sending chain not initialized');
  }

  const { newChainKey, messageKey } = kdfChainKey(state.sendingChainKey.key);
  state.sendingChainKey.key = newChainKey;

  const header: MessageHeader = {
    publicKey: bytesToBase64(state.sendingRatchetKey!.publicKey),
    previousChainLength: state.previousSendingChainLength,
    messageNumber: state.sendingChainKey.index,
  };

  state.sendingChainKey.index++;

  const nonce = randomBytes(12);
  const cipher = gcm(messageKey, nonce);
  const plaintextBytes = new TextEncoder().encode(plaintext);
  const ciphertext = cipher.encrypt(plaintextBytes);

  return {
    header,
    ciphertext: bytesToBase64(ciphertext),
    nonce: bytesToBase64(nonce),
  };
}

export function ratchetDecrypt(
  state: RatchetState,
  message: EncryptedMessage
): string {
  const { header, ciphertext, nonce } = message;

  const skippedKey = trySkippedMessageKeys(state, header);
  if (skippedKey) {
    const cipher = gcm(skippedKey, base64ToBytes(nonce));
    const plaintext = cipher.decrypt(base64ToBytes(ciphertext));
    return new TextDecoder().decode(plaintext);
  }

  const headerPublicKey = base64ToBytes(header.publicKey);

  if (!state.receivingRatchetKey || 
      bytesToBase64(state.receivingRatchetKey) !== header.publicKey) {
    if (state.receivingChainKey) {
      skipMessageKeys(state, header.previousChainLength);
    }
    performDHRatchet(state, headerPublicKey);
  }

  skipMessageKeys(state, header.messageNumber);

  const { newChainKey, messageKey } = kdfChainKey(state.receivingChainKey!.key);
  state.receivingChainKey!.key = newChainKey;
  state.receivingChainKey!.index++;

  const cipher = gcm(messageKey, base64ToBytes(nonce));
  const plaintext = cipher.decrypt(base64ToBytes(ciphertext));
  return new TextDecoder().decode(plaintext);
}

export function serializeRatchetState(state: RatchetState): SerializedRatchetState {
  return {
    rootKey: bytesToBase64(state.rootKey),
    sendingChainKey: state.sendingChainKey
      ? { key: bytesToBase64(state.sendingChainKey.key), index: state.sendingChainKey.index }
      : null,
    receivingChainKey: state.receivingChainKey
      ? { key: bytesToBase64(state.receivingChainKey.key), index: state.receivingChainKey.index }
      : null,
    sendingRatchetKeyPublic: state.sendingRatchetKey
      ? bytesToBase64(state.sendingRatchetKey.publicKey)
      : null,
    sendingRatchetKeyPrivate: state.sendingRatchetKey
      ? bytesToBase64(state.sendingRatchetKey.privateKey)
      : null,
    receivingRatchetKey: state.receivingRatchetKey
      ? bytesToBase64(state.receivingRatchetKey)
      : null,
    previousSendingChainLength: state.previousSendingChainLength,
    skippedMessageKeys: state.skippedMessageKeys.map((mk) => ({
      publicKey: mk.publicKey,
      messageNumber: mk.messageNumber,
      messageKey: bytesToBase64(mk.messageKey),
    })),
  };
}

export function deserializeRatchetState(serialized: SerializedRatchetState): RatchetState {
  return {
    rootKey: base64ToBytes(serialized.rootKey),
    sendingChainKey: serialized.sendingChainKey
      ? { key: base64ToBytes(serialized.sendingChainKey.key), index: serialized.sendingChainKey.index }
      : null,
    receivingChainKey: serialized.receivingChainKey
      ? { key: base64ToBytes(serialized.receivingChainKey.key), index: serialized.receivingChainKey.index }
      : null,
    sendingRatchetKey: serialized.sendingRatchetKeyPublic && serialized.sendingRatchetKeyPrivate
      ? {
          publicKey: base64ToBytes(serialized.sendingRatchetKeyPublic),
          privateKey: base64ToBytes(serialized.sendingRatchetKeyPrivate),
        }
      : null,
    receivingRatchetKey: serialized.receivingRatchetKey
      ? base64ToBytes(serialized.receivingRatchetKey)
      : null,
    previousSendingChainLength: serialized.previousSendingChainLength,
    skippedMessageKeys: serialized.skippedMessageKeys.map((mk) => ({
      publicKey: mk.publicKey,
      messageNumber: mk.messageNumber,
      messageKey: base64ToBytes(mk.messageKey),
    })),
  };
}
