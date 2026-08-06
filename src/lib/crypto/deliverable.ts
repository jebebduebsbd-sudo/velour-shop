import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
} from "node:crypto";

/**
 * Authenticated encryption for inventory deliverables (authorized codes,
 * keys, vouchers). AES-256-GCM with keys derived from a single master key
 * via HKDF. The master key lives in the environment, never in the database.
 *
 * Ciphertext layout: [1-byte version][12-byte IV][16-byte auth tag][data].
 */
const VERSION = 1;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function deriveKey(masterKeyB64: string, info: string): Buffer {
  const master = Buffer.from(masterKeyB64, "base64");
  if (master.length !== 32) {
    throw new Error("Deliverable master key must decode to exactly 32 bytes");
  }
  return Buffer.from(hkdfSync("sha256", master, Buffer.alloc(0), info, 32));
}

export function encryptDeliverable(
  plaintext: string,
  masterKeyB64: string,
): Buffer {
  const key = deriveKey(masterKeyB64, "velour:deliverable:enc:v1");
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from([VERSION]), iv, tag, data]);
}

export function decryptDeliverable(
  ciphertext: Buffer,
  masterKeyB64: string,
): string {
  if (ciphertext.length < 1 + IV_LENGTH + TAG_LENGTH) {
    throw new Error("Ciphertext too short");
  }
  if (ciphertext[0] !== VERSION) {
    throw new Error("Unsupported ciphertext version");
  }
  const iv = ciphertext.subarray(1, 1 + IV_LENGTH);
  const tag = ciphertext.subarray(1 + IV_LENGTH, 1 + IV_LENGTH + TAG_LENGTH);
  const data = ciphertext.subarray(1 + IV_LENGTH + TAG_LENGTH);
  const key = deriveKey(masterKeyB64, "velour:deliverable:enc:v1");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8",
  );
}

/**
 * Keyed fingerprint of the plaintext payload. Used only for de-duplication
 * (unique constraint) — never reversible, never logged with the plaintext.
 */
export function fingerprintDeliverable(
  plaintext: string,
  masterKeyB64: string,
): string {
  const key = deriveKey(masterKeyB64, "velour:deliverable:mac:v1");
  return createHmac("sha256", key).update(plaintext, "utf8").digest("hex");
}
