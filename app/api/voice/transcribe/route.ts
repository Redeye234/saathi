import { handleAudio } from "../../../../lib/audio.mjs";
import { aiConfig, authorizeAI } from "../../../../lib/api-access";
export async function POST(request: Request) {
  const error = await authorizeAI(request);
  if (error) return error;
  return handleAudio(request, "transcribe", aiConfig());
}
