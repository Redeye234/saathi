import { handleAssistant } from "../../../lib/assistant.mjs";
import { aiConfig, authorizeAI } from "../../../lib/api-access";
export async function POST(request: Request) {
  const error = await authorizeAI(request);
  if (error) return error;
  return handleAssistant(request, aiConfig());
}
export async function GET() {
  return Response.json(
    { configured: Boolean(aiConfig().apiKey) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
