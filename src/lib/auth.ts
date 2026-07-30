import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
import { compare } from "bcryptjs"
import { prisma } from "./db"

const isSecure = process.env.NODE_ENV === "production" || (process.env.NEXTAUTH_URL || "").startsWith("https://")

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  useSecureCookies: isSecure,
  cookies: {
    sessionToken: {
      name: `__Secure-authjs.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isSecure,
      },
    },
    callbackUrl: {
      name: `__Secure-authjs.callback-url`,
      options: {
        sameSite: "lax",
        path: "/",
        secure: isSecure,
      },
    },
    csrfToken: {
      name: `__Host-authjs.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isSecure,
      },
    },
  },
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
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
      authorization: {
        params: {
          scope: "openid email profile Mail.Read Calendars.Read Files.Read offline_access",
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
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Debug: log sign-in attempt
      // console.log("[AUTH signIn] provider:", account?.provider, "email:", user?.email, "user.id:", user?.id)

      if (account?.provider === "google") {
        // Ensure organization exists (or link user to existing org by email)
        try {
          // Check if there's an existing user with this email
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! },
          })

          if (existingUser) {
            // Link the Google account to the existing user
            // console.log("[AUTH signIn] Existing user found, id:", existingUser.id)
            // Set user id to existing db user id so JWT callback can use it
            ;(user as any).dbId = existingUser.id
            ;(user as any).role = existingUser.role
            ;(user as any).organizationId = existingUser.organizationId
          } else {
            // console.log("[AUTH signIn] New Google user — no existing DB user for email:", user.email)
            // For now, allow sign-in even without DB user (JWT-only session)
            // The user will need onboarding to create an organization
          }
        } catch (e) {
          console.error("[AUTH signIn] Error looking up user:", e)
        }
      }

      if (account?.provider === "microsoft-entra-id") {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! },
          })

          if (existingUser) {
            // console.log("[AUTH signIn] Existing user found for Microsoft, id:", existingUser.id)
            ;(user as any).dbId = existingUser.id
            ;(user as any).role = existingUser.role
            ;(user as any).organizationId = existingUser.organizationId
          } else {
            // console.log("[AUTH signIn] New Microsoft user — no existing DB user for email:", user.email)
          }
        } catch (e) {
          console.error("[AUTH signIn] Error looking up user for Microsoft:", e)
        }
      }

      return true // Allow all sign-ins
    },
    async jwt({ token, user, account, trigger }) {
      // console.log("[AUTH jwt] ENTER — trigger:", trigger, "hasUser:", !!user, "hasAccount:", !!account, "provider:", account?.provider)

      if (user) {
        // Use db-linked id if available (set in signIn callback), otherwise use the OAuth sub
        token.id = (user as any).dbId || user.id || ""
        token.role = (user as any).role ?? "STAFF"
        token.organizationId = (user as any).organizationId ?? ""
        token.email = user.email ?? ""

        // console.log("[AUTH jwt] user block — token.id:", token.id, "token.role:", token.role, "token.organizationId:", token.organizationId)

        // Fetch org billing info on sign-in so it's available in the session
        if (token.organizationId) {
          try {
            const org = await prisma.organization.findUnique({
              where: { id: token.organizationId as string },
              select: {
                stripeCustomerId: true,
                subscriptionStatus: true,
                googleConnected: true,
                microsoftConnected: true,
              },
            })
            if (org) {
              token.stripeCustomerId = org.stripeCustomerId ?? undefined
              token.subscriptionStatus = org.subscriptionStatus
              token.googleConnected = org.googleConnected
              token.microsoftConnected = org.microsoftConnected
              // console.log("[AUTH jwt] org fetch OK — subscriptionStatus:", org.subscriptionStatus, "googleConnected:", org.googleConnected, "microsoftConnected:", org.microsoftConnected)
            }
          } catch (e) {
            console.error("[AUTH jwt] org fetch failed:", e)
          }
        }

        // Fetch hasPassword status
        if (token.id) {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { id: token.id as string },
              select: { passwordHash: true },
            })
            token.hasPassword = Boolean(dbUser?.passwordHash)
          } catch (e) {
            console.error("[AUTH jwt] hasPassword fetch failed:", e)
          }
        }

        // Store Google tokens when connecting
        if (account && account.provider === "google") {
          token.googleAccessToken = account.access_token
          token.googleRefreshToken = account.refresh_token
          token.googleTokenExpiry = account.expires_at
          token.googleConnected = true

          // console.log("[AUTH jwt] Google tokens stored in JWT. hasRefreshToken:", !!account.refresh_token)

          // Persist refresh token to database
          if (account.refresh_token && token.organizationId) {
            try {
              await prisma.organization.update({
                where: { id: token.organizationId as string },
                data: {
                  googleRefreshToken: account.refresh_token,
                  googleAccessToken: account.access_token,
                  googleTokenExpiry: account.expires_at,
                  googleConnected: true,
                },
              })
              // console.log("[AUTH jwt] Google tokens persisted to DB")
            } catch (e) {
              console.error("[AUTH jwt] Failed to store Google tokens:", e)
            }
          }
        }

        // Store Microsoft tokens when connecting
        if (account && account.provider === "microsoft-entra-id") {
          token.microsoftAccessToken = account.access_token
          token.microsoftRefreshToken = account.refresh_token
          token.microsoftTokenExpiry = account.expires_at
          token.microsoftConnected = true

          // console.log("[AUTH jwt] Microsoft tokens stored in JWT. hasRefreshToken:", !!account.refresh_token)

          // Persist refresh token to database
          if (account.refresh_token && token.organizationId) {
            try {
              await prisma.organization.update({
                where: { id: token.organizationId as string },
                data: {
                  microsoftRefreshToken: account.refresh_token,
                  microsoftAccessToken: account.access_token,
                  microsoftTokenExpiry: account.expires_at,
                  microsoftConnected: true,
                },
              })
              // console.log("[AUTH jwt] Microsoft tokens persisted to DB")
            } catch (e) {
              console.error("[AUTH jwt] Failed to store Microsoft tokens:", e)
            }
          }
        }
      } else if (token.organizationId) {
        // Re-fetch googleConnected status from DB so disconnects take effect
        try {
          const org = await prisma.organization.findUnique({
            where: { id: token.organizationId as string },
            select: { googleConnected: true, microsoftConnected: true },
          })
          if (org) {
            token.googleConnected = org.googleConnected
            token.microsoftConnected = org.microsoftConnected
            // console.log("[AUTH jwt] Re-fetched googleConnected:", org.googleConnected, "microsoftConnected:", org.microsoftConnected)
          }
        } catch (e) {
          console.error("[AUTH jwt] Org re-fetch failed:", e)
        }
      }

      // console.log("[AUTH jwt] EXIT — token.id:", token.id, "token.role:", token.role, "token.organizationId:", token.organizationId)
      return token
    },
    async session({ session, token }) {
      // console.log("[AUTH session] ENTER — token.id:", token.id, "token.role:", token.role, "token.organizationId:", token.organizationId)
      if (session.user) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.organizationId = token.organizationId
        session.user.stripeCustomerId = token.stripeCustomerId
        session.user.subscriptionStatus = token.subscriptionStatus
        session.user.googleConnected = token.googleConnected ?? false
        session.user.microsoftConnected = token.microsoftConnected ?? false
        ;(session.user as any).hasPassword = token.hasPassword ?? false
      }
      // console.log("[AUTH session] EXIT — session.user:", JSON.stringify(session.user))
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
})
