import { x25519, ed25519 } from '@noble/curves/ed25519.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { randomBytes } from '@noble/hashes/utils.js';

export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export interface IdentityKeyPair extends KeyPair {
  type: 'identity';
}

export interface SignedPreKeyPair extends KeyPair {
  type: 'signed_prekey';
  keyId: number;
  signature: Uint8Array;
}

export interface OneTimePreKeyPair extends KeyPair {
  type: 'one_time_prekey';
  keyId: number;
}

export interface PublicKeyBundle {
  identityKey: Uint8Array;
  signedPreKey: {
    keyId: number;
    publicKey: Uint8Array;
    signature: Uint8Array;
  };
  oneTimePreKey?: {
    keyId: number;
    publicKey: Uint8Array;
  };
}

export function generateKeyPair(): KeyPair {
  const privateKey = randomBytes(32);
  const publicKey = x25519.getPublicKey(privateKey);
  return { publicKey, privateKey };
}

export function generateIdentityKeyPair(): IdentityKeyPair {
  const { publicKey, privateKey } = generateKeyPair();
  return { publicKey, privateKey, type: 'identity' };
}

export function generateSignedPreKey(identityPrivateKey: Uint8Array, keyId: number): SignedPreKeyPair {
  const { publicKey, privateKey } = generateKeyPair();
  const signature = ed25519.sign(publicKey, identityPrivateKey);
  return { publicKey, privateKey, type: 'signed_prekey', keyId, signature };
}

export function generateOneTimePreKey(keyId: number): OneTimePreKeyPair {
  const { publicKey, privateKey } = generateKeyPair();
  return { publicKey, privateKey, type: 'one_time_prekey', keyId };
}

export function generateOneTimePreKeys(startKeyId: number, count: number): OneTimePreKeyPair[] {
  const keys: OneTimePreKeyPair[] = [];
  for (let i = 0; i < count; i++) {
    keys.push(generateOneTimePreKey(startKeyId + i));
  }
  return keys;
}

export function calculateDH(privateKey: Uint8Array, publicKey: Uint8Array): Uint8Array {
  return x25519.getSharedSecret(privateKey, publicKey);
}

export function kdf(input: Uint8Array, info: string, length: number = 32): Uint8Array {
  const infoBytes = new TextEncoder().encode(info);
  return hkdf(sha256, input, undefined, infoBytes, length);
}

export function concat(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

export function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function verifySignature(
  publicKey: Uint8Array,
  message: Uint8Array,
  signature: Uint8Array
): boolean {
  try {
    return ed25519.verify(signature, message, publicKey);
  } catch {
    return false;
  }
}
