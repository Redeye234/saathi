import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../db/index.ts";
import { authSessions } from "../db/schema.ts";

const STATE_COOKIE = "saathi_oauth_state";
const SESSION_COOKIE = "saathi_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;

function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
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

function cookies(request) {
  const raw = request.headers.get("cookie") ?? "";
  return Object.fromEntries(raw.split(";").map((part) => part.trim().split("=")).filter(([key, value]) => key && value));
}

function cookieHeader(request, name, value, maxAge, httpOnly = true) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${httpOnly ? "; HttpOnly" : ""}${secure}`;
}

function redirect(request, path, headers = {}) {
  return Response.redirect(new URL(path, request.url).toString(), 302, headers);
}

export function googleConfig(request) {
  return {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: env.GOOGLE_REDIRECT_URI || new URL("/api/google/callback", request.url).toString(),
  };
}

export function googleConfigured(request) {
  const config = googleConfig(request);
  return Boolean(config.clientId && config.clientSecret && config.redirectUri);
}

export async function getGoogleSession(request) {
  const token = cookies(request)[SESSION_COOKIE];
  if (!token) return null;
  try {
    const sessionHash = await hashToken(decodeURIComponent(token));
    const [session] = await getDb().select().from(authSessions).where(eq(authSessions.sessionHash, sessionHash)).limit(1);
    if (!session || Date.parse(session.expiresAt) <= Date.now()) return null;
    return { userId: session.userId, email: session.email, displayName: session.displayName, sessionHash };
  } catch {
    return null;
  }
}

export function startGoogleLogin(request) {
  const config = googleConfig(request);
  if (!config.clientId || !config.clientSecret) {
    return Response.json({ error: "Google sign-in is not configured yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to the hosted secrets." }, { status: 503 });
  }
  const state = randomToken();
  const params = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirectUri, response_type: "code", scope: "openid email profile", state, prompt: "select_account", access_type: "online" });
  return redirect(request, `https://accounts.google.com/o/oauth2/v2/auth?${params}`, { "Set-Cookie": cookieHeader(request, STATE_COOKIE, state, 600) });
}

export async function completeGoogleLogin(request) {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  if (error) return redirect(request, `/?oauth_error=${encodeURIComponent(error.slice(0, 80))}`);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = cookies(request)[STATE_COOKIE];
  if (!code || !state || !storedState || state !== decodeURIComponent(storedState)) return redirect(request, "/?oauth_error=invalid_state");
  const config = googleConfig(request);
  if (!config.clientId || !config.clientSecret) return redirect(request, "/?oauth_error=google_not_configured");

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: config.redirectUri, grant_type: "authorization_code" }),
  });
  if (!tokenResponse.ok) return redirect(request, "/?oauth_error=token_exchange_failed");
  const token = await tokenResponse.json();
  if (!token.access_token) return redirect(request, "/?oauth_error=missing_access_token");
  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${token.access_token}` } });
  if (!profileResponse.ok) return redirect(request, "/?oauth_error=profile_lookup_failed");
  const profile = await profileResponse.json();
  if (!profile.sub || !profile.email || profile.email_verified === false) return redirect(request, "/?oauth_error=unverified_google_email");

  const sessionToken = randomToken();
  const sessionHash = await hashToken(sessionToken);
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();
  await getDb().insert(authSessions).values({ sessionHash, userId: String(profile.sub), email: String(profile.email), displayName: String(profile.name || profile.email.split("@")[0]), expiresAt }).onConflictDoUpdate({ target: authSessions.sessionHash, set: { expiresAt } });
  const headers = new Headers();
  headers.append("Set-Cookie", cookieHeader(request, SESSION_COOKIE, sessionToken, SESSION_SECONDS));
  headers.append("Set-Cookie", cookieHeader(request, STATE_COOKIE, "", 0));
  return redirect(request, "/", headers);
}

export async function logoutGoogle(request) {
  const session = await getGoogleSession(request);
  if (session) {
    try { await getDb().delete(authSessions).where(eq(authSessions.sessionHash, session.sessionHash)); } catch { /* cookie still gets cleared */ }
  }
  return redirect(request, "/", { "Set-Cookie": cookieHeader(request, SESSION_COOKIE, "", 0) });
}
