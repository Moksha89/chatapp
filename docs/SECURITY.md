# Security Documentation

## End-to-End Encryption (E2EE) Implementation

This document describes the end-to-end encryption implementation used in the WhatsApp Business-style chat application.

## 1. Overview

The encryption system is based on the Signal Protocol, providing:

- **Confidentiality**: Only the sender and recipient can read messages
- **Integrity**: Messages cannot be modified in transit
- **Authentication**: Messages are verified to come from the claimed sender
- **Forward Secrecy**: Compromise of long-term keys doesn't compromise past messages
- **Future Secrecy**: Compromise of session keys doesn't compromise future messages

## 2. Cryptographic Primitives

### 2.1 Key Exchange
- **Algorithm**: X25519 (Curve25519 Diffie-Hellman)
- **Purpose**: Establish shared secrets between parties

### 2.2 Digital Signatures
- **Algorithm**: Ed25519
- **Purpose**: Sign prekeys to prevent tampering

### 2.3 Symmetric Encryption
- **Algorithm**: ChaCha20-Poly1305 (or AES-256-GCM)
- **Purpose**: Encrypt message content
- **Key Size**: 256 bits
- **Nonce**: 96 bits, unique per message

### 2.4 Key Derivation
- **Algorithm**: HKDF-SHA256
- **Purpose**: Derive multiple keys from shared secrets

### 2.5 Message Authentication
- **Algorithm**: HMAC-SHA256
- **Purpose**: Authenticate message headers

## 3. Key Types

### 3.1 Identity Key Pair
- **Lifetime**: Long-term (until device reset)
- **Generation**: Once per device registration
- **Storage**: Private key in secure device storage
- **Purpose**: Identifies the user/device cryptographically

### 3.2 Signed PreKey Pair
- **Lifetime**: Medium-term (rotated periodically, e.g., weekly)
- **Generation**: Periodically regenerated
- **Signature**: Signed by Identity Key
- **Purpose**: Allows asynchronous session establishment

### 3.3 One-Time PreKeys
- **Lifetime**: Single use
- **Generation**: Batch generated (e.g., 100 at a time)
- **Purpose**: Provides additional forward secrecy for initial messages

### 3.4 Session Keys
- **Lifetime**: Per message chain
- **Generation**: Derived via Double Ratchet
- **Purpose**: Encrypt individual messages

## 4. Key Generation

### 4.1 On Device Registration

```
1. Generate Identity Key Pair:
   identity_private = random_bytes(32)
   identity_public = X25519_base_point_multiply(identity_private)

2. Generate Signed PreKey Pair:
   signed_prekey_private = random_bytes(32)
   signed_prekey_public = X25519_base_point_multiply(signed_prekey_private)
   signed_prekey_signature = Ed25519_sign(identity_private, signed_prekey_public)

3. Generate One-Time PreKeys (batch of 100):
   for i in 1..100:
     otpk_private[i] = random_bytes(32)
     otpk_public[i] = X25519_base_point_multiply(otpk_private[i])

4. Upload to server:
   - identity_public
   - signed_prekey_public + signed_prekey_signature
   - otpk_public[1..100]

5. Store locally (encrypted):
   - identity_private
   - signed_prekey_private
   - otpk_private[1..100]
```

### 4.2 Key Storage

**Android:**
- Use Android Keystore for key encryption
- Store encrypted keys in EncryptedSharedPreferences
- Keys are hardware-backed when available

**Web:**
- Use Web Crypto API for key operations
- Store keys in IndexedDB with encryption
- Keys are non-extractable when possible

## 5. Session Establishment (X3DH)

### 5.1 Initiator (Alice) Sending First Message to Bob

```
1. Fetch Bob's key bundle from server:
   - IKb: Bob's Identity Public Key
   - SPKb: Bob's Signed PreKey Public
   - SPKb_sig: Signature on SPKb
   - OPKb: One-Time PreKey (if available)

2. Verify SPKb signature:
   Ed25519_verify(IKb, SPKb, SPKb_sig)

3. Generate ephemeral key pair:
   EKa_private = random_bytes(32)
   EKa_public = X25519_base_point_multiply(EKa_private)

4. Perform X3DH key agreement:
   DH1 = X25519(IKa_private, SPKb)      # Identity to Signed PreKey
   DH2 = X25519(EKa_private, IKb)       # Ephemeral to Identity
   DH3 = X25519(EKa_private, SPKb)      # Ephemeral to Signed PreKey
   
   if OPKb available:
     DH4 = X25519(EKa_private, OPKb)    # Ephemeral to One-Time PreKey
     SK = HKDF(DH1 || DH2 || DH3 || DH4, "WhatsAppX3DH")
   else:
     SK = HKDF(DH1 || DH2 || DH3, "WhatsAppX3DH")

5. Initialize Double Ratchet with SK

6. Send initial message with:
   - IKa (Alice's Identity Public Key)
   - EKa_public (Ephemeral Public Key)
   - OPK_id (if One-Time PreKey was used)
   - Ciphertext
```

### 5.2 Recipient (Bob) Receiving First Message

```
1. Receive message containing:
   - IKa, EKa_public, OPK_id (optional), Ciphertext

2. Look up own keys:
   - IKb_private (Identity Private Key)
   - SPKb_private (Signed PreKey Private)
   - OPKb_private (if OPK_id provided)

3. Perform X3DH key agreement:
   DH1 = X25519(SPKb_private, IKa)
   DH2 = X25519(IKb_private, EKa_public)
   DH3 = X25519(SPKb_private, EKa_public)
   
   if OPK_id provided:
     DH4 = X25519(OPKb_private, EKa_public)
     SK = HKDF(DH1 || DH2 || DH3 || DH4, "WhatsAppX3DH")
     Delete OPKb_private (one-time use)
   else:
     SK = HKDF(DH1 || DH2 || DH3, "WhatsAppX3DH")

4. Initialize Double Ratchet with SK

5. Decrypt message
```

## 6. Double Ratchet Algorithm

### 6.1 State

Each party maintains:
- **DHs**: Current DH key pair (sending)
- **DHr**: Remote party's current DH public key
- **RK**: Root key
- **CKs**: Sending chain key
- **CKr**: Receiving chain key
- **Ns**: Message number (sending)
- **Nr**: Message number (receiving)
- **PN**: Previous chain length
- **MKSKIPPED**: Dictionary of skipped message keys

### 6.2 Ratchet Step (on receiving new DH public key)

```
function ratchet(state, header):
    state.PN = state.Ns
    state.Ns = 0
    state.Nr = 0
    state.DHr = header.dh
    state.RK, state.CKr = KDF_RK(state.RK, DH(state.DHs, state.DHr))
    state.DHs = GENERATE_DH()
    state.RK, state.CKs = KDF_RK(state.RK, DH(state.DHs, state.DHr))
```

### 6.3 Encrypting Messages

```
function encrypt(state, plaintext):
    state.CKs, mk = KDF_CK(state.CKs)
    header = HEADER(state.DHs.public, state.PN, state.Ns)
    state.Ns += 1
    ciphertext = AEAD_ENCRYPT(mk, plaintext, CONCAT(AD, header))
    return header, ciphertext
```

### 6.4 Decrypting Messages

```
function decrypt(state, header, ciphertext):
    if header.dh != state.DHr:
        skip_message_keys(state, header.pn)
        ratchet(state, header)
    skip_message_keys(state, header.n)
    state.CKr, mk = KDF_CK(state.CKr)
    state.Nr += 1
    plaintext = AEAD_DECRYPT(mk, ciphertext, CONCAT(AD, header))
    return plaintext
```

## 7. Message Encryption Format

### 7.1 Encrypted Message Structure

```json
{
  "header": {
    "dh": "<base64 encoded DH public key>",
    "pn": 0,
    "n": 5
  },
  "ciphertext": "<base64 encoded encrypted content>",
  "nonce": "<base64 encoded nonce>"
}
```

### 7.2 Message Content (before encryption)

```json
{
  "type": "text|image|file|audio",
  "content": "<message content or media reference>",
  "timestamp": 1234567890,
  "replyTo": "<optional message id>"
}
```

## 8. Multi-Device Support

### 8.1 Device Linking via QR Code

```
1. Web client generates:
   - Temporary pairing code
   - Web device key pair

2. QR code contains:
   - Pairing code
   - Web device public key
   - Server endpoint

3. Mobile app scans QR:
   - Verifies pairing code with server
   - Establishes secure channel with web device
   - Transfers necessary session data

4. Server links web device to user account
```

### 8.2 Message Fan-out

When a message is sent to a user with multiple devices:

```
1. Sender encrypts message separately for each recipient device
2. Each device has its own session (separate Double Ratchet state)
3. Server delivers appropriate ciphertext to each device
```

## 9. Data Stored on Server

### 9.1 What the Server Stores

| Data Type | Encrypted? | Purpose |
|-----------|------------|---------|
| User ID | No | Account identification |
| Phone Number | No | Account identification |
| Display Name | No | User profile |
| Profile Photo | No | User profile |
| Device Public Keys | No | E2EE key exchange |
| Message Ciphertext | Yes (E2EE) | Message delivery |
| Message Metadata | No | Routing, timestamps |
| Chat Membership | No | Message routing |
| Labels | No | Business features |
| Quick Replies | No | Business features |

### 9.2 What the Server Cannot Access

- Message plaintext content
- Private encryption keys
- Session keys
- Decrypted media content

## 10. Threat Model

### 10.1 Protected Against

- **Passive network attackers**: Cannot read message content
- **Server compromise**: Cannot decrypt stored messages
- **Key compromise (future)**: Past messages remain secure (forward secrecy)
- **Key compromise (past)**: Future messages remain secure (future secrecy)
- **Message tampering**: Detected via authentication

### 10.2 Not Protected Against

- **Metadata analysis**: Server knows who talks to whom and when
- **Endpoint compromise**: If device is compromised, attacker can read messages
- **Social engineering**: Users can be tricked into revealing information
- **Legal compulsion**: Server can be compelled to provide metadata
- **Traffic analysis**: Message timing and size patterns visible

### 10.3 Trust Assumptions

- Device operating system is not compromised
- Cryptographic primitives are secure
- Random number generation is secure
- Users verify safety numbers for high-security conversations

## 11. Key Rotation and Recovery

### 11.1 Signed PreKey Rotation

```
1. Generate new Signed PreKey pair (weekly)
2. Sign with Identity Key
3. Upload to server
4. Keep old Signed PreKey for grace period (to decrypt in-flight messages)
5. Delete old Signed PreKey after grace period
```

### 11.2 One-Time PreKey Replenishment

```
1. Server tracks remaining One-Time PreKeys
2. When count drops below threshold (e.g., 25)
3. Server notifies client
4. Client generates and uploads new batch
```

### 11.3 Account Recovery

- **No server-side backup of keys**: Messages cannot be recovered if device is lost
- **Optional**: Encrypted local backup with user-provided password
- **New device**: Starts fresh, cannot decrypt old messages

## 12. Security Recommendations for Users

1. **Verify Safety Numbers**: For sensitive conversations, verify the safety number with your contact through a separate channel

2. **Enable Device Lock**: Use PIN, fingerprint, or face recognition on your device

3. **Keep App Updated**: Security updates may contain important fixes

4. **Be Cautious of Links**: Don't click suspicious links even from known contacts

5. **Report Suspicious Activity**: If you notice unusual behavior, report it immediately

## 13. Compliance and Auditing

### 13.1 Logging

- Authentication attempts (success/failure)
- Device registrations
- Key uploads
- No message content logging

### 13.2 Audit Trail

- Admin actions on business accounts
- Profile changes
- Device linking/unlinking

## 14. Implementation Libraries

### 14.1 Recommended Libraries

| Platform | Library | Purpose |
|----------|---------|---------|
| JavaScript | libsodium.js | Crypto primitives |
| JavaScript | @aspect-build/aspect-signal | Signal protocol |
| Android | libsodium-jni | Crypto primitives |
| Android | signal-protocol-java | Signal protocol |

### 14.2 Library Security

- Use well-audited, maintained libraries
- Keep libraries updated
- Avoid custom cryptographic implementations
