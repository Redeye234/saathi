import { env } from "cloudflare:workers";
import { localSession } from "./local-auth.mjs";
import { json, sameOrigin } from "./http.mjs";
const usage = new Map<string, { count: number; until: number }>();
export async function authorizeAI(request: Request) {
  if (!sameOrigin(request))
    return json({ error: "This request must come from Saathi." }, 403);
  const user = await localSession(request);
  if (!user) return json({ error: "Please sign in to use AI." }, 401);
  const now = Date.now();
  for (const [id, value] of usage) if (value.until < now) usage.delete(id);
  const value = usage.get(user.userId) || { count: 0, until: now + 60000 };
  if (value.count >= 30)
    return json({ error: "Please wait a moment before asking again." }, 429);
  value.count++;
  usage.set(user.userId, value);
  return null;
}
export function aiConfig() {
  const bindings = env as unknown as Record<string, string | undefined>;
  const get = (key: string) => bindings[key] || process.env[key];
  return {
    apiKey: get("OPENAI_API_KEY"),
    model: get("OPENAI_MODEL"),
    transcriptionModel: get("OPENAI_TRANSCRIPTION_MODEL"),
    speechModel: get("OPENAI_SPEECH_MODEL"),
  };
}
