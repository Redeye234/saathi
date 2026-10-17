import { startGoogleLogin } from "../../../../lib/google-auth.mjs";

export const dynamic = "force-dynamic";
export function GET(request: Request) { return startGoogleLogin(request); }
