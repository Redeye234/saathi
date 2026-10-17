import { getGoogleSession, googleConfigured } from "../../../lib/google-auth.mjs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getGoogleSession(request);
  return Response.json(
    user
      ? {
          authenticated: true,
          googleConfigured: googleConfigured(request),
          user: {
            userId: user.userId,
            email: user.email,
            displayName: user.displayName,
          },
          signOutPath: "/api/google/logout",
        }
      : {
          authenticated: false,
          googleConfigured: googleConfigured(request),
          user: null,
          signInPath: "/api/google/start",
        },
    { headers: { "Cache-Control": "no-store" } },
  );
}
