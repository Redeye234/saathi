import { and, eq } from "drizzle-orm";
import { localSession } from "../../../lib/local-auth.mjs";
import { getDb } from "../../../db";
import { workerWorkspaces } from "../../../db/schema";
import { cleanWorkspace } from "../../../lib/contracts.mjs";
import { json, readJson, sameOrigin } from "../../../lib/http.mjs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await localSession(request);
  if (!user) return json({ error: "Sign in to sync your workspace." }, 401);
  try {
    const [row] = await getDb()
      .select()
      .from(workerWorkspaces)
      .where(eq(workerWorkspaces.userId, user.userId))
      .limit(1);
    return json({
      data: cleanWorkspace(row ? JSON.parse(row.data) : {}),
      syncedAt: row?.updatedAt ?? null,
      user,
    });
  } catch {
    return json(
      { error: "Your saved workspace is temporarily unavailable." },
      503,
    );
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request))
    return json({ error: "This request must come from Saathi." }, 403);
  const user = await localSession(request);
  if (!user) return json({ error: "Sign in to sync your workspace." }, 401);
  if (!request.headers.get("content-type")?.includes("application/json"))
    return json({ error: "Send JSON." }, 415);
  let data, revision;
  try {
    const payload = await readJson(request, 450000);
    data = cleanWorkspace(payload.data);
    revision = payload.revision;
    if (revision !== null && typeof revision !== "string")
      return json({ error: "Reload your workspace before saving." }, 400);
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : "Invalid workspace." },
      e instanceof RangeError ? 413 : 400,
    );
  }
  try {
    const db = getDb();
    const timestamp = new Date().toISOString();
    const fields = {
      email: user.email,
      displayName: user.displayName,
      data: JSON.stringify(data),
      updatedAt: timestamp,
    };
    const updated =
      revision === null
        ? await db
            .insert(workerWorkspaces)
            .values({ ...fields, userId: user.userId, createdAt: timestamp })
            .onConflictDoNothing()
            .returning({ id: workerWorkspaces.userId })
        : await db
            .update(workerWorkspaces)
            .set(fields)
            .where(
              and(
                eq(workerWorkspaces.userId, user.userId),
                eq(workerWorkspaces.updatedAt, revision),
              ),
            )
            .returning({ id: workerWorkspaces.userId });
    if (!updated.length)
      return json(
        {
          error:
            "Your account changed on another device. Choose which copy to keep.",
        },
        409,
      );
    return json({ ok: true, syncedAt: timestamp });
  } catch {
    return json(
      {
        error:
          "Cloud save is unavailable. Your device copy is still available.",
      },
      503,
    );
  }
}
