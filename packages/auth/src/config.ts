import { SupabaseAdapter } from "@auth/supabase-adapter";
import GitHub from "next-auth/providers/github";
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
  session: {
    strategy: "database",
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
};
