import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import EntraIDProvider from "next-auth/providers/microsoft-entra-id";

import { env } from "@/lib/env";

export const { auth, handlers, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: undefined,
  providers: [
    env.nextAuthProvider === "microsoft-entra-id"
      ? EntraIDProvider({
          clientId: env.azureAdClientId,
          clientSecret: env.azureAdClientSecret,
          issuer: `https://login.microsoftonline.com/${env.azureAdTenantId}/v2.0`,
          authorization: {
            params: {
              scope: "openid profile email User.Read",
            },
          },
          async profile(profile) {
           return {
            id: profile.sub,
            name: profile.name,
            email: profile.email,
            isAdmin: profile.roles.includes("Admin"),
           };
          }
        })
      : CredentialsProvider({
          async authorize() {
            return { id: "test-user-id", email: "test@example.com", isAdmin: true };
          },
        }), 
  ],
  callbacks: {
    async session({ session, token }) {
      // Add user ID and isAdmin to session for use in API routes
      if (token) {
        session.user.id = token.sub || "1";
        session.user.isAdmin = (token.isAdmin as boolean) || false;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isAdmin = user.isAdmin || false;
      }
      return token;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: env.useMocks ? "jwt" : "database",
  },
  debug: env.isDevelopment,
});
