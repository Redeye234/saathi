import { localSession } from "../../../lib/local-auth.mjs";
import { googleConfigured } from "../../../lib/google-auth.mjs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await localSession(request);
  return Response.json(
    user
      ? {
          authenticated: true,
          authMode: "local",
          googleConfigured: googleConfigured(request),
          user: {
            userId: user.userId,
            email: user.email,
            displayName: user.displayName,
          },
          signOutPath: "/api/auth/logout",
        }
      : {
          authenticated: false,
          authMode: "local",
          googleConfigured: googleConfigured(request),
          user: null,
          signInPath: "/api/auth/login",
        },
    { headers: { "Cache-Control": "no-store" } },
  );
}
