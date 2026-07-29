import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { compare } from "bcryptjs"
import { prisma } from "./db"

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/drive.readonly",
        },
      },
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user || !user.passwordHash) {
          return null
        }

        const isValid = await compare(
          credentials.password as string,
          user.passwordHash
        )

        if (!isValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          organizationId: user.organizationId,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.role = user.role ?? "STAFF"
        token.organizationId = user.organizationId ?? ""
        token.id = user.id ?? ""

        // Fetch org billing info on sign-in so it's available in the session
        try {
          const org = await prisma.organization.findUnique({
            where: { id: user.organizationId as string },
            select: {
              stripeCustomerId: true,
              subscriptionStatus: true,
              googleConnected: true,
            },
          })
          if (org) {
            token.stripeCustomerId = org.stripeCustomerId ?? undefined
            token.subscriptionStatus = org.subscriptionStatus
            token.googleConnected = org.googleConnected
          }
        } catch {
          // Non-fatal: session just won't have billing info
        }

        // Store Google tokens when connecting
        if (account && account.provider === "google") {
          token.googleAccessToken = account.access_token
          token.googleRefreshToken = account.refresh_token
          token.googleTokenExpiry = account.expires_at
          token.googleConnected = true

          // Persist refresh token to database
          if (account.refresh_token) {
            try {
              await prisma.organization.update({
                where: { id: user.organizationId as string },
                data: {
                  googleRefreshToken: account.refresh_token,
                  googleAccessToken: account.access_token,
                  googleTokenExpiry: account.expires_at,
                  googleConnected: true,
                },
              })
            } catch (e) {
              console.error("Failed to store Google tokens:", e)
            }
          }
        }
      } else if (token.organizationId) {
        // Re-fetch googleConnected status from DB so disconnects take effect
        try {
          const org = await prisma.organization.findUnique({
            where: { id: token.organizationId as string },
            select: { googleConnected: true },
          })
          if (org) {
            token.googleConnected = org.googleConnected
          }
        } catch {
          // Non-fatal
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.organizationId = token.organizationId
        session.user.stripeCustomerId = token.stripeCustomerId
        session.user.subscriptionStatus = token.subscriptionStatus
        session.user.googleConnected = token.googleConnected ?? false
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
})
