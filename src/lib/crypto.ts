import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    if (process.env.NODE_ENV === "development") {
      // Use global for Node.js dev-mode fallback
      const g = globalThis as unknown as { __fallbackKey?: Buffer };
      if (!g.__fallbackKey) {
        g.__fallbackKey = randomBytes(KEY_LENGTH);
      }
      return g.__fallbackKey;
    }
    throw new Error(
      "ENCRYPTION_KEY must be set to a 64-character hex string in production",
    );
  }
  return Buffer.from(hex, "hex");
}

function bytesToHex(bytes: Buffer): string {
  return bytes.toString("hex");
}

/** AES-256-GCM 加密，返回 "ivHex:encryptedHex:tagHex" */
export async function encryptApiKey(plaintext: string): Promise<string> {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf-8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${bytesToHex(iv)}:${bytesToHex(encrypted)}:${bytesToHex(tag)}`;
}

/** AES-256-GCM 解密 */
export async function decryptApiKey(encrypted: string): Promise<string> {
  const parts = encrypted.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted key format");
  }

  const [ivHex, cipherHex, tagHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const ciphertext = Buffer.from(cipherHex, "hex");
  const tag = Buffer.from(tagHex, "hex");

  const key = getEncryptionKey();
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf-8");
}

/** 脱敏展示 API Key：保留前6位和末4位，中间用 * 替换 */
export function maskApiKey(key: string): string {
  if (key.length <= 10) {
    return `${key.slice(0, 6)}${"*".repeat(Math.max(0, key.length - 6))}`;
  }
  return `${key.slice(0, 6)}${"*".repeat(key.length - 10)}${key.slice(-4)}`;
}
