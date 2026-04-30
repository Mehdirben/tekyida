import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
  session: {
    totalDurationMs: 1000 * 60 * 60 * 24 * 365,
    inactiveDurationMs: 1000 * 60 * 60 * 24 * 90,
  },
  jwt: {
    durationMs: 1000 * 60 * 60 * 24,
  },
});
