import { cryptoStore } from './store';
import {
  generateKeyPair,
  PublicKeyBundle,
  base64ToBytes,
  bytesToBase64,
} from './keys';
import { x3dhInitiator, x3dhResponder } from './x3dh';
import {
  RatchetState,
  initializeRatchetAsInitiator,
  initializeRatchetAsResponder,
  ratchetEncrypt,
  ratchetDecrypt,
  EncryptedMessage,
} from './double-ratchet';

export interface KeyBundleFromServer {
  identityKey: string;
  signedPrekey: {
    keyId: number;
    publicKey: string;
    signature: string;
  };
  oneTimePrekey?: {
    keyId: number;
    publicKey: string;
  };
}

export interface OutgoingMessage {
  ciphertext: string;
  ephemeralKey?: string;
  usedOneTimePreKeyId?: number;
}

export interface IncomingMessage {
  senderId: string;
  senderDeviceId: string;
  ciphertext: string;
  ephemeralKey?: string;
  usedOneTimePreKeyId?: number;
}

class SessionManager {
  async initialize(): Promise<void> {
    await cryptoStore.initializeKeys();
  }

  getPublicKeysForUpload() {
    return cryptoStore.getPublicKeysForUpload();
  }

  async createSession(
    recipientId: string,
    deviceId: string,
    keyBundle: KeyBundleFromServer
  ): Promise<void> {
    const identityKeyPair = cryptoStore.getIdentityKeyPair();
    if (!identityKeyPair) {
      throw new Error('Identity key not initialized');
    }

    const ephemeralKeyPair = generateKeyPair();

    const recipientBundle: PublicKeyBundle = {
      identityKey: base64ToBytes(keyBundle.identityKey),
      signedPreKey: {
        keyId: keyBundle.signedPrekey.keyId,
        publicKey: base64ToBytes(keyBundle.signedPrekey.publicKey),
        signature: base64ToBytes(keyBundle.signedPrekey.signature),
      },
    };

    if (keyBundle.oneTimePrekey) {
      recipientBundle.oneTimePreKey = {
        keyId: keyBundle.oneTimePrekey.keyId,
        publicKey: base64ToBytes(keyBundle.oneTimePrekey.publicKey),
      };
    }

    const x3dhResult = x3dhInitiator({
      identityKeyPair,
      ephemeralKeyPair,
      recipientBundle,
    });

    const ratchetState = initializeRatchetAsInitiator(
      x3dhResult.sharedSecret,
      recipientBundle.signedPreKey.publicKey
    );

    cryptoStore.saveSession(recipientId, deviceId, ratchetState);
  }

  async processPreKeyMessage(
    senderId: string,
    senderDeviceId: string,
    senderIdentityKey: string,
    ephemeralKey: string,
    usedOneTimePreKeyId?: number
  ): Promise<void> {
    const identityKeyPair = cryptoStore.getIdentityKeyPair();
    const signedPreKeyPair = cryptoStore.getSignedPreKeyPair();

    if (!identityKeyPair || !signedPreKeyPair) {
      throw new Error('Keys not initialized');
    }

    let oneTimePreKeyPair;
    if (usedOneTimePreKeyId !== undefined) {
      oneTimePreKeyPair = cryptoStore.getOneTimePreKey(usedOneTimePreKeyId);
      if (oneTimePreKeyPair) {
        cryptoStore.removeOneTimePreKey(usedOneTimePreKeyId);
      }
    }

    const sharedSecret = x3dhResponder({
      identityKeyPair,
      signedPreKeyPair,
      oneTimePreKeyPair,
      senderIdentityKey: base64ToBytes(senderIdentityKey),
      senderEphemeralKey: base64ToBytes(ephemeralKey),
    });

    const ratchetState = initializeRatchetAsResponder(sharedSecret, signedPreKeyPair);

    cryptoStore.saveSession(senderId, senderDeviceId, ratchetState);
  }

  async encryptMessage(
    recipientId: string,
    deviceId: string,
    plaintext: string
  ): Promise<OutgoingMessage> {
    let session = cryptoStore.getSession(recipientId, deviceId);

    if (!session) {
      throw new Error('No session exists for this recipient. Fetch their key bundle first.');
    }

    const encrypted = ratchetEncrypt(session, plaintext);
    cryptoStore.saveSession(recipientId, deviceId, session);

    return {
      ciphertext: JSON.stringify(encrypted),
    };
  }

  async decryptMessage(
    senderId: string,
    senderDeviceId: string,
    ciphertext: string,
    senderIdentityKey?: string,
    ephemeralKey?: string,
    usedOneTimePreKeyId?: number
  ): Promise<string> {
    let session = cryptoStore.getSession(senderId, senderDeviceId);

    if (!session && ephemeralKey && senderIdentityKey) {
      await this.processPreKeyMessage(
        senderId,
        senderDeviceId,
        senderIdentityKey,
        ephemeralKey,
        usedOneTimePreKeyId
      );
      session = cryptoStore.getSession(senderId, senderDeviceId);
    }

    if (!session) {
      throw new Error('No session exists and no prekey message provided');
    }

    const encrypted: EncryptedMessage = JSON.parse(ciphertext);
    const plaintext = ratchetDecrypt(session, encrypted);
    cryptoStore.saveSession(senderId, senderDeviceId, session);

    return plaintext;
  }

  hasSession(recipientId: string, deviceId: string): boolean {
    return cryptoStore.hasSession(recipientId, deviceId);
  }

  deleteSession(recipientId: string, deviceId: string): void {
    cryptoStore.deleteSession(recipientId, deviceId);
  }

  clearAllSessions(): void {
    cryptoStore.clearAllData();
  }

  getIdentityPublicKey(): string | null {
    const keyPair = cryptoStore.getIdentityKeyPair();
    return keyPair ? bytesToBase64(keyPair.publicKey) : null;
  }
}

export const sessionManager = new SessionManager();
