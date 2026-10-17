import { completeGoogleLogin } from "../../../../lib/google-auth.mjs";

export const dynamic = "force-dynamic";
export async function GET(request: Request) { return completeGoogleLogin(request); }
