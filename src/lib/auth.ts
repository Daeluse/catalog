import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import EntraIDProvider from "next-auth/providers/microsoft-entra-id";
import { MongoDBAdapter } from "@auth/mongodb-adapter";

import { env } from "@/lib/env";
import { MongoClient } from "mongodb";

export const { auth, handlers, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: env.useMocks
    ? undefined
    : MongoDBAdapter(
        () => {
          if (!env.mongodbUri) {
            throw new Error("MongoDB URI not provided");
          }
          const client = new MongoClient(env.mongodbUri, {});
          return client.connect();
        },
        {
          databaseName: env.mongodbDb,
        },
      ),
  providers: [
    env.useMocks
      ? CredentialsProvider({
          async authorize() {
            return { id: "1", email: "test@test.com", isAdmin: true };
          },
        })
      : EntraIDProvider({
          clientId: env.azureAdClientId,
          clientSecret: env.azureAdClientSecret,
          issuer: `https://login.microsoftonline.com/${env.azureAdTenantId}/v2.0`,
          authorization: {
            params: {
              scope: "openid profile email User.Read",
            },
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
