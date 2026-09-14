const encoder = new TextEncoder();
type Database = { prepare(query: string): { bind(...values: unknown[]): { first<T>(): Promise<T | null>; run(): Promise<unknown> } } };

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  return Uint8Array.from(atob(padded), char => char.charCodeAt(0));
}

export async function sha256(value: string) {
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}

async function signature(payload: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload))));
}

export async function signSession(payload: Record<string, unknown>, secret: string) {
  const body = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  return `${body}.${await signature(body, secret)}`;
}

export async function verifySession<T extends { exp?: number; scope?: string }>(token: string | undefined, secret: string): Promise<T | null> {
  if (!token || !secret) return null;
  const [body, supplied, extra] = token.split(".");
  if (!body || !supplied || extra) return null;
  const expected = await signature(body, secret);
  const a = encoder.encode(supplied), b = encoder.encode(expected);
  if (a.length !== b.length) return null;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a[i] ^ b[i];
  if (mismatch !== 0) return null;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(base64UrlToBytes(body))) as T;
    return parsed.exp && parsed.exp >= Date.now() ? parsed : null;
  } catch { return null; }
}

export function cookie(request: Request, name: string) {
  const raw = request.headers.get("cookie") || "";
  for (const item of raw.split(";")) {
    const [key, ...rest] = item.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
}

export function sessionCookie(name: string, value: string, maxAge: number) {
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${Math.max(0, Math.floor(maxAge))}; HttpOnly; Secure; SameSite=Strict`;
}

export function clientIp(request: Request) {
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

export async function ipKey(request: Request, secret: string, scope: string) {
  return `${scope}:${await sha256(`${secret}:${clientIp(request)}`)}`;
}

export async function isRateLimited(db: Database, key: string) {
  const row = await db.prepare("SELECT blocked_until FROM rate_limits WHERE key = ?").bind(key).first<{ blocked_until: number | null }>();
  return Boolean(row?.blocked_until && row.blocked_until > Date.now());
}

export async function recordFailure(db: Database, key: string, maxAttempts: number, windowMs: number, blockMs: number) {
  const now = Date.now();
  await db.prepare(`INSERT INTO rate_limits(key, attempts, window_start, blocked_until) VALUES (?, 1, ?, NULL)
    ON CONFLICT(key) DO UPDATE SET
      attempts = CASE WHEN rate_limits.window_start < ? THEN 1 ELSE rate_limits.attempts + 1 END,
      window_start = CASE WHEN rate_limits.window_start < ? THEN ? ELSE rate_limits.window_start END,
      blocked_until = CASE WHEN (CASE WHEN rate_limits.window_start < ? THEN 1 ELSE rate_limits.attempts + 1 END) >= ? THEN ? ELSE rate_limits.blocked_until END`)
    .bind(key, now, now - windowMs, now - windowMs, now, now - windowMs, maxAttempts, now + blockMs).run();
}

export async function clearFailures(db: Database, key: string) {
  await db.prepare("DELETE FROM rate_limits WHERE key = ?").bind(key).run();
}

export async function audit(db: Database, request: Request, secret: string, action: string, detail = "") {
  const actor = await sha256(`${secret}:${clientIp(request)}`);
  await db.prepare("INSERT INTO audit_logs(action, actor_hash, detail, created_at) VALUES (?, ?, ?, ?)").bind(action, actor, detail.slice(0, 500), Date.now()).run();
}
