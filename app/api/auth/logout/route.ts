import { logoutLocal } from "../../../../lib/local-auth.mjs";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return logoutLocal(request);
}
