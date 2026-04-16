import {
  IdentityKeyPair,
  SignedPreKeyPair,
  OneTimePreKeyPair,
  generateIdentityKeyPair,
  generateSignedPreKey,
  generateOneTimePreKeys,
  bytesToBase64,
  base64ToBytes,
} from './keys';
import {
  RatchetState,
  SerializedRatchetState,
  serializeRatchetState,
  deserializeRatchetState,
} from './double-ratchet';

const STORAGE_PREFIX = 'chatapp_crypto_';
const IDENTITY_KEY = STORAGE_PREFIX + 'identity';
const SIGNED_PREKEY = STORAGE_PREFIX + 'signed_prekey';
const ONE_TIME_PREKEYS = STORAGE_PREFIX + 'one_time_prekeys';
const SESSIONS = STORAGE_PREFIX + 'sessions';
const NEXT_PREKEY_ID = STORAGE_PREFIX + 'next_prekey_id';

interface SerializedIdentityKeyPair {
  publicKey: string;
  privateKey: string;
  type: 'identity';
}

interface SerializedSignedPreKeyPair {
  publicKey: string;
  privateKey: string;
  type: 'signed_prekey';
  keyId: number;
  signature: string;
}

interface SerializedOneTimePreKeyPair {
  publicKey: string;
  privateKey: string;
  type: 'one_time_prekey';
  keyId: number;
}

interface SessionInfo {
  recipientId: string;
  deviceId: string;
  state: SerializedRatchetState;
  createdAt: number;
  updatedAt: number;
}

export class CryptoStore {
  private identityKeyPair: IdentityKeyPair | null = null;
  private signedPreKeyPair: SignedPreKeyPair | null = null;
  private oneTimePreKeys: Map<number, OneTimePreKeyPair> = new Map();
  private sessions: Map<string, RatchetState> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const identityData = localStorage.getItem(IDENTITY_KEY);
      if (identityData) {
        const parsed: SerializedIdentityKeyPair = JSON.parse(identityData);
        this.identityKeyPair = {
          publicKey: base64ToBytes(parsed.publicKey),
          privateKey: base64ToBytes(parsed.privateKey),
          type: 'identity',
        };
      }

      const signedPrekeyData = localStorage.getItem(SIGNED_PREKEY);
      if (signedPrekeyData) {
        const parsed: SerializedSignedPreKeyPair = JSON.parse(signedPrekeyData);
        this.signedPreKeyPair = {
          publicKey: base64ToBytes(parsed.publicKey),
          privateKey: base64ToBytes(parsed.privateKey),
          type: 'signed_prekey',
          keyId: parsed.keyId,
          signature: base64ToBytes(parsed.signature),
        };
      }

      const oneTimePrekeysData = localStorage.getItem(ONE_TIME_PREKEYS);
      if (oneTimePrekeysData) {
        const parsed: SerializedOneTimePreKeyPair[] = JSON.parse(oneTimePrekeysData);
        for (const key of parsed) {
          this.oneTimePreKeys.set(key.keyId, {
            publicKey: base64ToBytes(key.publicKey),
            privateKey: base64ToBytes(key.privateKey),
            type: 'one_time_prekey',
            keyId: key.keyId,
          });
        }
      }

      const sessionsData = localStorage.getItem(SESSIONS);
      if (sessionsData) {
        const parsed: SessionInfo[] = JSON.parse(sessionsData);
        for (const session of parsed) {
          const key = this.getSessionKey(session.recipientId, session.deviceId);
          this.sessions.set(key, deserializeRatchetState(session.state));
        }
      }
    } catch (error) {
      console.error('Failed to load crypto store from storage:', error);
    }
  }

  private saveIdentityKey(): void {
    if (this.identityKeyPair) {
      const data: SerializedIdentityKeyPair = {
        publicKey: bytesToBase64(this.identityKeyPair.publicKey),
        privateKey: bytesToBase64(this.identityKeyPair.privateKey),
        type: 'identity',
      };
      localStorage.setItem(IDENTITY_KEY, JSON.stringify(data));
    }
  }

  private saveSignedPreKey(): void {
    if (this.signedPreKeyPair) {
      const data: SerializedSignedPreKeyPair = {
        publicKey: bytesToBase64(this.signedPreKeyPair.publicKey),
        privateKey: bytesToBase64(this.signedPreKeyPair.privateKey),
        type: 'signed_prekey',
        keyId: this.signedPreKeyPair.keyId,
        signature: bytesToBase64(this.signedPreKeyPair.signature),
      };
      localStorage.setItem(SIGNED_PREKEY, JSON.stringify(data));
    }
  }

  private saveOneTimePreKeys(): void {
    const data: SerializedOneTimePreKeyPair[] = Array.from(this.oneTimePreKeys.values()).map(
      (key) => ({
        publicKey: bytesToBase64(key.publicKey),
        privateKey: bytesToBase64(key.privateKey),
        type: 'one_time_prekey',
        keyId: key.keyId,
      })
    );
    localStorage.setItem(ONE_TIME_PREKEYS, JSON.stringify(data));
  }

  private saveSessions(): void {
    const data: SessionInfo[] = [];
    for (const [key, state] of this.sessions) {
      const [recipientId, deviceId] = key.split(':');
      data.push({
        recipientId,
        deviceId,
        state: serializeRatchetState(state),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    localStorage.setItem(SESSIONS, JSON.stringify(data));
  }

  private getSessionKey(recipientId: string, deviceId: string): string {
    return `${recipientId}:${deviceId}`;
  }

  private getNextPrekeyId(): number {
    const stored = localStorage.getItem(NEXT_PREKEY_ID);
    const id = stored ? parseInt(stored, 10) : 1;
    localStorage.setItem(NEXT_PREKEY_ID, (id + 1).toString());
    return id;
  }

  async initializeKeys(): Promise<void> {
    if (!this.identityKeyPair) {
      this.identityKeyPair = generateIdentityKeyPair();
      this.saveIdentityKey();
    }

    if (!this.signedPreKeyPair) {
      const keyId = this.getNextPrekeyId();
      this.signedPreKeyPair = generateSignedPreKey(this.identityKeyPair.privateKey, keyId);
      this.saveSignedPreKey();
    }

    if (this.oneTimePreKeys.size < 10) {
      const startId = this.getNextPrekeyId();
      const newKeys = generateOneTimePreKeys(startId, 20);
      for (const key of newKeys) {
        this.oneTimePreKeys.set(key.keyId, key);
      }
      this.saveOneTimePreKeys();
    }
  }

  getIdentityKeyPair(): IdentityKeyPair | null {
    return this.identityKeyPair;
  }

  getSignedPreKeyPair(): SignedPreKeyPair | null {
    return this.signedPreKeyPair;
  }

  getOneTimePreKey(keyId: number): OneTimePreKeyPair | undefined {
    return this.oneTimePreKeys.get(keyId);
  }

  removeOneTimePreKey(keyId: number): void {
    this.oneTimePreKeys.delete(keyId);
    this.saveOneTimePreKeys();
  }

  getPublicKeysForUpload(): {
    identityKey: string;
    signedPrekey: { keyId: number; publicKey: string; signature: string };
    oneTimePrekeys: Array<{ keyId: number; publicKey: string }>;
  } | null {
    if (!this.identityKeyPair || !this.signedPreKeyPair) {
      return null;
    }

    return {
      identityKey: bytesToBase64(this.identityKeyPair.publicKey),
      signedPrekey: {
        keyId: this.signedPreKeyPair.keyId,
        publicKey: bytesToBase64(this.signedPreKeyPair.publicKey),
        signature: bytesToBase64(this.signedPreKeyPair.signature),
      },
      oneTimePrekeys: Array.from(this.oneTimePreKeys.values()).map((key) => ({
        keyId: key.keyId,
        publicKey: bytesToBase64(key.publicKey),
      })),
    };
  }

  hasSession(recipientId: string, deviceId: string): boolean {
    return this.sessions.has(this.getSessionKey(recipientId, deviceId));
  }

  getSession(recipientId: string, deviceId: string): RatchetState | undefined {
    return this.sessions.get(this.getSessionKey(recipientId, deviceId));
  }

  saveSession(recipientId: string, deviceId: string, state: RatchetState): void {
    this.sessions.set(this.getSessionKey(recipientId, deviceId), state);
    this.saveSessions();
  }

  deleteSession(recipientId: string, deviceId: string): void {
    this.sessions.delete(this.getSessionKey(recipientId, deviceId));
    this.saveSessions();
  }

  clearAllData(): void {
    this.identityKeyPair = null;
    this.signedPreKeyPair = null;
    this.oneTimePreKeys.clear();
    this.sessions.clear();

    localStorage.removeItem(IDENTITY_KEY);
    localStorage.removeItem(SIGNED_PREKEY);
    localStorage.removeItem(ONE_TIME_PREKEYS);
    localStorage.removeItem(SESSIONS);
    localStorage.removeItem(NEXT_PREKEY_ID);
  }
}

export const cryptoStore = new CryptoStore();
