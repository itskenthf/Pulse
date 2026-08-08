import { SupabaseAdapter } from "@auth/supabase-adapter";
import GitHub from "next-auth/providers/github";
import type { GitHubProfile } from "next-auth/providers/github";
import type { NextAuthConfig } from "next-auth";

/**
 * Auth.js owns login/session for Pulse. Supabase is used purely as the
 * Postgres store for adapter data (next_auth schema) — Supabase's own
 * Auth product is not used. See docs/DECISIONS.md.
 *
 * GitHub is the first provider (Phase 0 login gate). Google and Spotify
 * are added as their respective widgets are built.
 */
export const authConfig: NextAuthConfig = {
  adapter: SupabaseAdapter({
    url: process.env.SUPABASE_URL as string,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  }),
  providers: [GitHub],
  // JWT, not "database": a database session makes every `auth()` call —
  // every page render, every server action — a live Postgres round trip
  // just to check who's signed in. A signed JWT cookie is a pure decrypt,
  // no DB call, and is the entire reason for this switch (see
  // docs/DECISIONS.md and PERFORMANCE_AUDIT.md's C1). The adapter above
  // stays wired up regardless of session strategy — it still owns
  // account/user persistence (GitHub OAuth linking, the `next_auth.users`
  // row `readUserName`/`readProviderAccessToken` read from) — only how a
  // session is *validated* on each request changes.
  session: {
    strategy: "jwt",
  },
  // Pulse is deployed on Vercel, which Auth.js already trusts by
  // convention — set explicitly so host-header handling doesn't rely on
  // inference if the deployment target ever changes.
  trustHost: true,
  callbacks: {
    // Single-user app: reject anyone whose GitHub login isn't the owner's
    // before Auth.js creates an account row for them — otherwise this is
    // open sign-up to anyone with a GitHub account, per docs/DECISIONS.md.
    signIn({ profile }) {
      const ownerLogin = process.env.OWNER_GITHUB_USERNAME;
      if (!ownerLogin) return false;
      const githubLogin = (profile as GitHubProfile | undefined)?.login;
      return githubLogin?.toLowerCase() === ownerLogin.toLowerCase();
    },
    // `user` is only present on the initial sign-in call (the adapter's
    // just-created/found DB user row) — persisting its id onto the token
    // here is what lets `session()` below read it back on every
    // subsequent request without touching the database.
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      // `token.id` is set by the jwt() callback above; the underlying JWT
      // type can't be augmented from this file (see types.ts's comment on
      // why), so it's read back as `unknown` and cast here at its one
      // consumption site instead.
      session.user.id = token.id as string;
      return session;
    },
  },
};
