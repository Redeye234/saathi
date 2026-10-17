import { eq } from "drizzle-orm";
import { getGoogleSession } from "../../../lib/google-auth.mjs";
import { getDb } from "../../../db";
import { workerWorkspaces } from "../../../db/schema";

export const dynamic = "force-dynamic";

const MAX_PAYLOAD_BYTES = 240_000;
const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Database request failed";
  if (message.includes("no such table") || message.includes("worker_workspaces")) {
    return "The worker workspace table is not ready yet. Deploy the latest migration and try again.";
  }
  return "The workspace could not be saved right now. Your local copy is still available.";
}

async function currentUser(request: Request) {
  return getGoogleSession(request);
}

export async function GET(request: Request) {
  const user = await currentUser(request);
  if (!user) return json({ error: "Sign in with Google to sync your workspace." }, 401);

  try {
    const db = getDb();
    const [row] = await db
      .select()
      .from(workerWorkspaces)
      .where(eq(workerWorkspaces.userId, user.userId))
      .limit(1);
    let data: Record<string, unknown> = {};
    if (row?.data) {
      try {
        const parsed = JSON.parse(row.data);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) data = parsed;
      } catch {
        data = {};
      }
    }
    return json({
      data,
      syncedAt: row?.updatedAt ?? null,
      user: { userId: user.userId, email: user.email, displayName: user.displayName },
    });
  } catch (error) {
    return json({ error: errorMessage(error) }, 503);
  }
}

export async function POST(request: Request) {
  const user = await currentUser(request);
  if (!user) return json({ error: "Sign in with Google to sync your workspace." }, 401);
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return json({ error: "Send workspace data as JSON." }, 415);
  }

  try {
    const raw = await request.text();
    if (raw.length > MAX_PAYLOAD_BYTES) return json({ error: "Your workspace is too large to sync." }, 413);
    const payload = JSON.parse(raw);
    const data = payload?.data;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return json({ error: "Workspace data is invalid." }, 400);
    }
    const serialized = JSON.stringify(data);
    if (serialized.length > MAX_PAYLOAD_BYTES) return json({ error: "Your workspace is too large to sync." }, 413);

    const db = getDb();
    const timestamp = new Date().toISOString();
    await db
      .insert(workerWorkspaces)
      .values({
        userId: user.userId,
        email: user.email,
        displayName: user.displayName,
        data: serialized,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .onConflictDoUpdate({
        target: workerWorkspaces.userId,
        set: {
          email: user.email,
          displayName: user.displayName,
          data: serialized,
          updatedAt: timestamp,
        },
      });
    return json({ ok: true, syncedAt: timestamp });
  } catch (error) {
    return json({ error: errorMessage(error) }, 503);
  }
}
