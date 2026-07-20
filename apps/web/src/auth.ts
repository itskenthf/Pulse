import NextAuth from "next-auth";
import { authConfig } from "@pulse/auth";

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
