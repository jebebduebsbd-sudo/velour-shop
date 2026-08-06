import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";

function scrypt(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, derived) => {
      if (error) reject(error);
      else resolve(derived);
    });
  });
}

/**
 * Password hashing.
 *
 * Preferred: Argon2id via @node-rs/argon2 (memory-hard, native bindings).
 * Fallback: scrypt with documented parameters, used only when the native
 * Argon2 binding is unavailable on the host (e.g. unsupported platform).
 *
 * scrypt parameters: N = 2^15 (32768), r = 8, p = 1, 32-byte key, 16-byte
 * salt — above the OWASP minimum of N = 2^14 for interactive logins.
 *
 * Passwords are never logged and hashes are never returned to clients.
 */
const SCRYPT_PARAMS = { N: 32768, r: 8, p: 1, keyLength: 32 } as const;

type Argon2Module = {
  hash: (password: string, options?: unknown) => Promise<string>;
  verify: (hash: string, password: string) => Promise<boolean>;
};

let argon2Promise: Promise<Argon2Module | null> | undefined;

async function loadArgon2(): Promise<Argon2Module | null> {
  argon2Promise ??= import("@node-rs/argon2")
    .then((module) => module as unknown as Argon2Module)
    .catch(() => null);
  return argon2Promise;
}

/** Argon2id parameters: 19 MiB memory, 2 iterations, parallelism 1. */
const ARGON2_OPTIONS = {
  algorithm: 2,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(password: string): Promise<string> {
  const argon2 = await loadArgon2();
  if (argon2) return argon2.hash(password, ARGON2_OPTIONS);

  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, SCRYPT_PARAMS.keyLength, {
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p,
  });
  return [
    "scrypt",
    SCRYPT_PARAMS.N,
    SCRYPT_PARAMS.r,
    SCRYPT_PARAMS.p,
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

export async function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  if (hash.startsWith("scrypt$")) {
    const [, n, r, p, saltB64, keyB64] = hash.split("$");
    if (!n || !r || !p || !saltB64 || !keyB64) return false;
    const expected = Buffer.from(keyB64, "base64");
    const derived = await scrypt(
      password,
      Buffer.from(saltB64, "base64"),
      expected.length,
      { N: Number(n), r: Number(r), p: Number(p) },
    );
    return (
      derived.length === expected.length && timingSafeEqual(derived, expected)
    );
  }

  const argon2 = await loadArgon2();
  if (!argon2) return false;
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

/** True when a stored hash was produced by the fallback algorithm. */
export function isFallbackHash(hash: string): boolean {
  return hash.startsWith("scrypt$");
}
