import { createCipheriv, pbkdf2Sync, randomBytes } from "node:crypto";

const SALT = "nomachi-chat-v1";

function getDerivedKey() {
  const rawHex = process.env.NEXT_PUBLIC_CHAT_ENCRYPTION_KEY || "";
  if (!rawHex) {
    throw new Error("NEXT_PUBLIC_CHAT_ENCRYPTION_KEY is not set");
  }

  const keyBytes = Buffer.from(rawHex, "hex");
  return pbkdf2Sync(keyBytes, SALT, 100_000, 32, "sha256");
}

export function encryptMessageServer(plaintext: string) {
  const key = getDerivedKey();
  const iv = randomBytes(12);

  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: Buffer.concat([ciphertext, authTag]).toString("base64"),
    iv: iv.toString("base64"),
  };
}
