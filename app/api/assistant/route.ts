import { handleAssistant } from '../../../lib/assistant.mjs';
import { env } from 'cloudflare:workers';
export async function POST(request: Request) {
 const bindings = env as unknown as Record<string,string|undefined>;
 return handleAssistant(request,{apiKey:bindings.OPENAI_API_KEY || process.env.OPENAI_API_KEY,model:bindings.OPENAI_MODEL || process.env.OPENAI_MODEL});
}
export async function GET() {
 const bindings = env as unknown as Record<string,string|undefined>;
 return Response.json({configured:Boolean(bindings.OPENAI_API_KEY || process.env.OPENAI_API_KEY)},{headers:{'Cache-Control':'no-store'}});
}
