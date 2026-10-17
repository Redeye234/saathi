import { eq, sql } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../db/index.ts";
import { localUsers, authSessions } from "../db/schema.ts";
import { getGoogleSession, logoutGoogle } from "./google-auth.mjs";
import { isValidPassword, isValidUsername, normalizeUsername } from "./auth-validation.mjs";
import { readJson, sameOrigin } from "./http.mjs";

const SESSION_SECONDS = 60 * 60 * 24 * 14;
const PBKDF2_ITERATIONS = 600000;
let usersSchemaReady;

function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function fromBase64url(value) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

async function hashToken(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return base64url(new Uint8Array(digest));
}

async function passwordHash(password) {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" }, key, 256);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${base64url(salt)}$${base64url(new Uint8Array(bits))}`;
}

async function verifyPassword(password, stored) {
  const [scheme, iterationsValue, saltValue, expectedValue] = String(stored).split("$");
  const iterations = Number(iterationsValue);
  if (scheme !== "pbkdf2" || !Number.isSafeInteger(iterations) || iterations < 100000 || iterations > 1000000 || !saltValue || !expectedValue) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: fromBase64url(saltValue), iterations, hash: "SHA-256" }, key, 256);
  const actual = new Uint8Array(bits);
  const expected = fromBase64url(expectedValue);
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) difference |= actual[index] ^ expected[index];
  return difference === 0;
}

async function ensureLocalUsersTable() {
  if (usersSchemaReady) return usersSchemaReady;
  usersSchemaReady = (async () => {
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS auth_sessions (
      session_hash TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      display_name TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`).run();
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS worker_workspaces (
      user_id TEXT PRIMARY KEY NOT NULL,
      email TEXT NOT NULL,
      display_name TEXT NOT NULL,
      data TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`).run();
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS local_users (
      user_id TEXT PRIMARY KEY NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`).run();
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS auth_rate_limits (
      rate_key TEXT PRIMARY KEY NOT NULL,
      window_started INTEGER NOT NULL,
      attempts INTEGER NOT NULL
    )`).run();
  })().catch((error) => {
    usersSchemaReady = undefined;
    throw error;
  });
  return usersSchemaReady;
}

async function allowAuthAttempt(request, scope, limit) {
  const address = request.headers.get("CF-Connecting-IP") || "local";
  const rateKey = await hashToken(`${scope}:${address}`);
  const now = Date.now();
  const cutoff = now - 15 * 60 * 1000;
  const result = await env.DB.prepare(`
    INSERT INTO auth_rate_limits (rate_key, window_started, attempts)
    VALUES (?, ?, 1)
    ON CONFLICT(rate_key) DO UPDATE SET
      attempts = CASE WHEN auth_rate_limits.window_started <= ? THEN 1 ELSE auth_rate_limits.attempts + 1 END,
      window_started = CASE WHEN auth_rate_limits.window_started <= ? THEN excluded.window_started ELSE auth_rate_limits.window_started END
    RETURNING attempts
  `).bind(rateKey, now, cutoff, cutoff).first();
  if (Math.random() < 0.05)
    await env.DB.prepare("DELETE FROM auth_rate_limits WHERE window_started < ?").bind(now - 24 * 60 * 60 * 1000).run();
  return Number(result?.attempts ?? limit + 1) <= limit;
}

function json(data, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

async function body(request) {
  if (!request.headers.get("content-type")?.includes("application/json")) return null;
  try { return await readJson(request, 16000); } catch { return null; }
}

async function createSession(request, user) {
  const sessionToken = randomToken();
  const sessionHash = await hashToken(sessionToken);
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();
  const db = getDb();
  await db.delete(authSessions).where(sql`${authSessions.expiresAt} <= ${new Date().toISOString()}`);
  await db.insert(authSessions).values({ sessionHash, userId: user.userId, email: user.username, displayName: user.displayName, expiresAt });
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  const cookie = `saathi_session=${encodeURIComponent(sessionToken)}; Path=/; Max-Age=${SESSION_SECONDS}; SameSite=Lax; HttpOnly${secure}`;
  return new Headers({ "Set-Cookie": cookie, "Cache-Control": "no-store" });
}

function userResponse(user) {
  return { userId: user.userId, email: user.username, displayName: user.displayName };
}

export async function signupLocal(request) {
  if (!sameOrigin(request)) return json({ error: "This request must come from Saathi." }, 403);
  if (!request.headers.get("content-type")?.includes("application/json")) return json({ error: "Send JSON." }, 415);
  const payload = await body(request);
  const username = normalizeUsername(payload?.username);
  const password = String(payload?.password ?? "");
  const displayName = String(payload?.displayName ?? username).trim().slice(0, 60) || username;
  if (!isValidUsername(username)) return json({ error: "Use 3–40 letters, numbers, dots, underscores or hyphens for your username." }, 400);
  if (username === "demo") return json({ error: "The shared demo username is reserved. Choose a personal username." }, 400);
  if (!isValidPassword(password)) return json({ error: "Your password must be at least 8 characters." }, 400);
  if (String(payload?.confirmPassword ?? "") !== password) return json({ error: "Passwords do not match." }, 400);
  try {
    await ensureLocalUsersTable();
    if (!(await allowAuthAttempt(request, "signup", 8))) return json({ error: "Too many attempts. Please wait before creating an account." }, 429);
    const existing = await getDb().select({ userId: localUsers.userId }).from(localUsers).where(eq(localUsers.username, username)).limit(1);
    if (existing.length) return json({ error: "That username is already registered. Try signing in." }, 409);
    const user = { userId: `local_${randomToken()}`, username, displayName, passwordHash: await passwordHash(password) };
    await getDb().insert(localUsers).values(user);
    const headers = await createSession(request, user);
    return new Response(JSON.stringify({ authenticated: true, user: userResponse(user) }), { headers: new Headers({ ...Object.fromEntries(headers), "Content-Type": "application/json" }) });
  } catch (error) {
    console.error("local signup failed", error);
    if (String(error?.message ?? error).toLowerCase().includes("unique")) return json({ error: "That username is already registered. Try signing in." }, 409);
    return json({ error: "Sign-up is unavailable right now. Please try again." }, 503);
  }
}

export async function loginLocal(request) {
  if (!sameOrigin(request)) return json({ error: "This request must come from Saathi." }, 403);
  if (!request.headers.get("content-type")?.includes("application/json")) return json({ error: "Send JSON." }, 415);
  const payload = await body(request);
  const username = normalizeUsername(payload?.username);
  const password = String(payload?.password ?? "");
  if (!isValidUsername(username) || !password) return json({ error: "Enter your username and password." }, 400);
  if (username === "demo") return json({ error: "The shared demo account is no longer available. Create a personal account instead." }, 401);
  try {
    await ensureLocalUsersTable();
    if (!(await allowAuthAttempt(request, "login", 10))) return json({ error: "Too many attempts. Please wait before signing in." }, 429);
    const [user] = await getDb().select().from(localUsers).where(eq(localUsers.username, username)).limit(1);
    if (!user || !(await verifyPassword(password, user.passwordHash))) return json({ error: "Username or password is incorrect." }, 401);
    if (!user.passwordHash.startsWith(`pbkdf2$${PBKDF2_ITERATIONS}$`)) {
      await getDb().update(localUsers).set({ passwordHash: await passwordHash(password) }).where(eq(localUsers.userId, user.userId));
    }
    const headers = await createSession(request, user);
    return new Response(JSON.stringify({ authenticated: true, user: userResponse(user) }), { headers: new Headers({ ...Object.fromEntries(headers), "Content-Type": "application/json" }) });
  } catch (error) {
    console.error("local login failed", error);
    return json({ error: "Sign-in is unavailable right now. Please try again." }, 503);
  }
}

export async function localSession(request) {
  return getGoogleSession(request);
}

export async function logoutLocal(request) {
  if (!sameOrigin(request)) return json({ error: "This request must come from Saathi." }, 403);
  return logoutGoogle(request);
}
