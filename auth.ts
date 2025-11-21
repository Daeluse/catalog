import NextAuth from "next-auth"
import AzureADProvider from "next-auth/providers/azure-ad"
import CredentialsProvider from "next-auth/providers/credentials"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import clientPromise from "@/lib/mongodb"

const useMocks = process.env.USE_MOCKS === 'true'

// Mock users for local development
const mockUsers = [
  {
    id: "1",
    name: "Admin User",
    email: "admin@demo.local",
    image: null,
    password: "admin123",
    isAdmin: true,
  },
  {
    id: "2",
    name: "Demo Producer",
    email: "producer@demo.local",
    image: null,
    password: "demo123",
    isAdmin: false,
  },
  {
    id: "3",
    name: "Test User",
    email: "user@demo.local",
    image: null,
    password: "demo123",
    isAdmin: false,
  },
]

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: useMocks ? undefined : MongoDBAdapter(clientPromise, {
    databaseName: process.env.MONGODB_DB || "catalog",
  }),
  providers: useMocks
    ? [
        CredentialsProvider({
          name: "Mock Login",
          credentials: {
            email: { label: "Email", type: "email", placeholder: "producer@demo.local" },
            password: { label: "Password", type: "password", placeholder: "demo123" },
          },
          async authorize(credentials) {
            const user = mockUsers.find(
              u => u.email === credentials?.email && u.password === credentials?.password
            )
            if (user) {
              return {
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image,
                isAdmin: user.isAdmin,
              }
            }
            return null
          },
        }),
      ]
    : [
        AzureADProvider({
          clientId: process.env.AZURE_AD_CLIENT_ID!,
          clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
          issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
          authorization: {
            params: {
              scope: "openid profile email User.Read",
            },
          },
        }),
      ],
  callbacks: {
    async session({ session, user, token }) {
      // Add user ID and isAdmin to session for use in API routes
      if (useMocks && token) {
        session.user.id = token.sub || "1"
        session.user.isAdmin = token.isAdmin as boolean || false
      } else if (user) {
        session.user.id = user.id
        session.user.isAdmin = user.isAdmin || false
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.isAdmin = user.isAdmin || false
      }
      return token
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: useMocks ? "jwt" : "database",
  },
  debug: process.env.NODE_ENV === "development",
})
