import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

// `declare module "next-auth/jwt"` (the usual way to type-augment JWT) can't
// be made to resolve under this repo's `moduleResolution: "Bundler"` setting
// — a known TypeScript limitation with ambient module augmentation for a
// package's subpath exports, not something fixable from this file. The
// `jwt()`/`session()` callback pair in config.ts casts `token.id` at its one
// read site instead of relying on an augmented type.
