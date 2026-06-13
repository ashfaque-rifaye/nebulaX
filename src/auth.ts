// ─── NebulaX auth primitives ────────────────────────────────────────────────
// Industry-standard building blocks, zero external dependencies:
//  • scrypt password hashing (memory-hard KDF) with a per-user random salt
//  • timing-safe verification
//  • opaque high-entropy session tokens (httpOnly cookie on the wire)
//  • a small in-memory login rate-limiter (brute-force defense)
//  • cookie parse / serialize helpers with secure flags
import * as crypto from "crypto";

const SCRYPT_KEYLEN = 64;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 }; // OWASP-recommended floor

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const SESSION_COOKIE = "nx_session";

/** Hash a passphrase → "salt:hash" (both hex). */
export function hashPassphrase(pass: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pass, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

/** Verify a passphrase against a stored "salt:hash". Constant-time. */
export function verifyPassphrase(pass: string, stored: string | undefined): boolean {
  if (!stored || !stored.includes(":")) return false;
  const [saltHex, hashHex] = stored.split(":");
  try {
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    const actual = crypto.scryptSync(pass, salt, expected.length, SCRYPT_PARAMS);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

/** Opaque 256-bit session token. */
export function newSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// ── Validation ──
export function validateHandle(raw: unknown): { handle: string } | { error: string } {
  const handle = String(raw ?? "").trim();
  if (handle.length < 3 || handle.length > 40) return { error: "Handle must be 3–40 characters." };
  if (!/^[a-zA-Z0-9_.-]+$/.test(handle)) return { error: "Handle may only contain letters, numbers, and . _ -" };
  return { handle };
}

export function validatePassphrase(raw: unknown): { pass: string } | { error: string } {
  const pass = String(raw ?? "");
  if (pass.length < 6) return { error: "Passphrase must be at least 6 characters." };
  if (pass.length > 200) return { error: "Passphrase is too long." };
  return { pass };
}

// ── In-memory login rate limiter (per key sliding window) ──
const attempts = new Map<string, number[]>();
const RL_WINDOW_MS = 10 * 60 * 1000;
const RL_MAX = 8;

export function rateLimited(key: string): boolean {
  const now = Date.now();
  const hits = (attempts.get(key) || []).filter(t => now - t < RL_WINDOW_MS);
  attempts.set(key, hits);
  return hits.length >= RL_MAX;
}
export function recordAttempt(key: string): void {
  const now = Date.now();
  const hits = (attempts.get(key) || []).filter(t => now - t < RL_WINDOW_MS);
  hits.push(now);
  attempts.set(key, hits);
}
export function clearAttempts(key: string): void {
  attempts.delete(key);
}

// ── Cookies (no cookie-parser dependency) ──
export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

export function serializeSessionCookie(token: string, secure: boolean): string {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  const flags = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (secure) flags.push("Secure");
  return flags.join("; ");
}

export function clearSessionCookie(secure: boolean): string {
  const flags = [`${SESSION_COOKIE}=`, "HttpOnly", "Path=/", "SameSite=Lax", "Max-Age=0"];
  if (secure) flags.push("Secure");
  return flags.join("; ");
}
