import {
  KeyPair,
  IdentityKeyPair,
  SignedPreKeyPair,
  PublicKeyBundle,
  calculateDH,
  kdf,
  concat,
  verifySignature,
} from './keys';

export interface X3DHResult {
  sharedSecret: Uint8Array;
  ephemeralPublicKey: Uint8Array;
  usedOneTimePreKeyId?: number;
}

export interface X3DHInitiatorParams {
  identityKeyPair: IdentityKeyPair;
  ephemeralKeyPair: KeyPair;
  recipientBundle: PublicKeyBundle;
}

export interface X3DHResponderParams {
  identityKeyPair: IdentityKeyPair;
  signedPreKeyPair: SignedPreKeyPair;
  oneTimePreKeyPair?: KeyPair;
  senderIdentityKey: Uint8Array;
  senderEphemeralKey: Uint8Array;
}

const X3DH_INFO = 'EChatBusiness_X3DH';

export function x3dhInitiator(params: X3DHInitiatorParams): X3DHResult {
  const { identityKeyPair, ephemeralKeyPair, recipientBundle } = params;

  if (!verifySignature(
    recipientBundle.identityKey,
    recipientBundle.signedPreKey.publicKey,
    recipientBundle.signedPreKey.signature
  )) {
    throw new Error('Invalid signed prekey signature');
  }

  const dh1 = calculateDH(identityKeyPair.privateKey, recipientBundle.signedPreKey.publicKey);
  const dh2 = calculateDH(ephemeralKeyPair.privateKey, recipientBundle.identityKey);
  const dh3 = calculateDH(ephemeralKeyPair.privateKey, recipientBundle.signedPreKey.publicKey);

  let dhConcat: Uint8Array;
  let usedOneTimePreKeyId: number | undefined;

  if (recipientBundle.oneTimePreKey) {
    const dh4 = calculateDH(ephemeralKeyPair.privateKey, recipientBundle.oneTimePreKey.publicKey);
    dhConcat = concat(dh1, dh2, dh3, dh4);
    usedOneTimePreKeyId = recipientBundle.oneTimePreKey.keyId;
  } else {
    dhConcat = concat(dh1, dh2, dh3);
  }

  const sharedSecret = kdf(dhConcat, X3DH_INFO, 32);

  return {
    sharedSecret,
    ephemeralPublicKey: ephemeralKeyPair.publicKey,
    usedOneTimePreKeyId,
  };
}

export function x3dhResponder(params: X3DHResponderParams): Uint8Array {
  const {
    identityKeyPair,
    signedPreKeyPair,
    oneTimePreKeyPair,
    senderIdentityKey,
    senderEphemeralKey,
  } = params;

  const dh1 = calculateDH(signedPreKeyPair.privateKey, senderIdentityKey);
  const dh2 = calculateDH(identityKeyPair.privateKey, senderEphemeralKey);
  const dh3 = calculateDH(signedPreKeyPair.privateKey, senderEphemeralKey);

  let dhConcat: Uint8Array;

  if (oneTimePreKeyPair) {
    const dh4 = calculateDH(oneTimePreKeyPair.privateKey, senderEphemeralKey);
    dhConcat = concat(dh1, dh2, dh3, dh4);
  } else {
    dhConcat = concat(dh1, dh2, dh3);
  }

  const sharedSecret = kdf(dhConcat, X3DH_INFO, 32);

  return sharedSecret;
}
