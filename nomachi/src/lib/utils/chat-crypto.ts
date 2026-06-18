/**
 * chat-crypto.ts
 * Client-side AES-256-GCM encryption/decryption for chat messages.
 * Uses the Web Crypto API — no external dependencies.
 *
 * Key derivation: PBKDF2 (SHA-256, 100k iterations) from the env hex key.
 * Encryption: AES-256-GCM with a fresh random 12-byte IV per message.
 *
 * Stored in DB:
 *   content_encrypted  — base64-encoded ciphertext
 *   iv                 — base64-encoded 12-byte initialization vector
 */

const SALT = "nomachi-chat-v1"; // Fixed salt — changes invalidate all stored messages

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);
  return buffer.buffer as ArrayBuffer;
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

let _cachedKey: CryptoKey | null = null;

async function getDerivedKey(): Promise<CryptoKey> {
  if (_cachedKey) return _cachedKey;

  const rawHex = process.env.NEXT_PUBLIC_CHAT_ENCRYPTION_KEY || "";
  if (!rawHex) throw new Error("NEXT_PUBLIC_CHAT_ENCRYPTION_KEY is not set");

  // Convert hex string to bytes
  const keyBytes = new Uint8Array(
    rawHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
  );

  // Import raw bytes as base key for PBKDF2
  const baseKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  // Derive AES-256-GCM key
  _cachedKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(SALT),
      iterations: 100_000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  return _cachedKey;
}

/**
 * Encrypt a plaintext string.
 * @returns { ciphertext: base64, iv: base64 }
 */
export async function encryptMessage(
  plaintext: string
): Promise<{ ciphertext: string; iv: string }> {
  const key = await getDerivedKey();
  const ivBuffer = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: ivBuffer },
    key,
    encoded
  );

  return {
    ciphertext: bufferToBase64(encrypted),
    iv: bufferToBase64(ivBuffer.buffer as ArrayBuffer),
  };
}

/**
 * Decrypt an encrypted chat message.
 * @param ciphertext base64-encoded encrypted content
 * @param iv base64-encoded 12-byte IV
 * @returns plaintext string
 */
export async function decryptMessage(
  ciphertext: string,
  iv: string
): Promise<string> {
  try {
    const key = await getDerivedKey();
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBuffer(iv) },
      key,
      base64ToBuffer(ciphertext)
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    // Return a safe fallback if decryption fails (wrong key or corrupted data)
    return "[Message could not be decrypted]";
  }
}
