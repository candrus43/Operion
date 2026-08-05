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

        const user = await prisma.user.findFirst({
          where: {
            email: { equals: credentials.email as string, mode: "insensitive" },
          },
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
          isSuperAdmin: user.isSuperAdmin,
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
          const existingUser = await prisma.user.findFirst({
            where: {
              email: { equals: user.email!, mode: "insensitive" },
            },
          })

          if (existingUser) {
            // Link the Google account to the existing user
            // console.log("[AUTH signIn] Existing user found, id:", existingUser.id)
            // Set user id to existing db user id so JWT callback can use it
            ;(user as any).dbId = existingUser.id
            ;(user as any).role = existingUser.role
            ;(user as any).organizationId = existingUser.organizationId
            ;(user as any).isSuperAdmin = existingUser.isSuperAdmin
          } else {
            // OAuth accounts must be invited/created through the normal onboarding flow.
            // Never issue an organization-less JWT session.
            return false
          }
        } catch (e) {
          console.error("[AUTH signIn] Error looking up user:", e)
        }
      }

      if (account?.provider === "microsoft-entra-id") {
        try {
          const existingUser = await prisma.user.findFirst({
            where: {
              email: { equals: user.email!, mode: "insensitive" },
            },
          })

          if (existingUser) {
            // console.log("[AUTH signIn] Existing user found for Microsoft, id:", existingUser.id)
            ;(user as any).dbId = existingUser.id
            ;(user as any).role = existingUser.role
            ;(user as any).organizationId = existingUser.organizationId
            ;(user as any).isSuperAdmin = existingUser.isSuperAdmin
          } else {
            // OAuth accounts must be invited/created through the normal onboarding flow.
            return false
          }
        } catch (e) {
          console.error("[AUTH signIn] Error looking up user for Microsoft:", e)
        }
      }

      return true // Allow all sign-ins
    },
    async jwt({ token, user, account, trigger, session }) {
      // console.log("[AUTH jwt] ENTER — trigger:", trigger, "hasUser:", !!user, "hasAccount:", !!account, "provider:", account?.provider)

      // Handle support mode activation via client-side update()
      if (trigger === "update" && session) {
        if (session.isSupportMode) {
          token.isSupportMode = true
          token.supportOrgId = session.supportOrgId
          token.supportPermissions = session.supportPermissions
          token.supportTokenId = session.supportTokenId
          token.supportExpiresAt = session.supportExpiresAt
          token.supportActorId = session.supportActorId
        } else if (session.isSupportMode === false) {
          // Exiting support mode — clear claims
          delete token.isSupportMode
          delete token.supportOrgId
          delete token.supportPermissions
          delete token.supportTokenId
          delete token.supportExpiresAt
          delete token.supportActorId
        }

        // Handle impersonation activation
        if (session.isImpersonating) {
          token.isImpersonating = true
          token.impersonatingOriginalUserId = session.impersonatingOriginalUserId
          token.impersonatingOriginalOrgId = session.impersonatingOriginalOrgId
          token.impersonatingOriginalEmail = session.impersonatingOriginalEmail
          token.impersonatingOriginalRole = session.impersonatingOriginalRole
          token.impersonatingOriginalName = session.impersonatingOriginalName
          token.impersonatingOriginalIsSuperAdmin = session.impersonatingOriginalIsSuperAdmin
          // Override token with demo user data
          token.id = session.impersonatingDemoUserId
          token.email = session.impersonatingDemoEmail
          token.name = session.impersonatingDemoName
          token.role = session.impersonatingDemoRole
          token.organizationId = session.impersonatingDemoOrgId
          token.isSuperAdmin = false
        } else if (session.isImpersonating === false) {
          // Restore original admin session
          if (token.impersonatingOriginalUserId) {
            token.id = token.impersonatingOriginalUserId
            token.email = token.impersonatingOriginalEmail
            token.name = token.impersonatingOriginalName
            token.role = token.impersonatingOriginalRole
            token.organizationId = token.impersonatingOriginalOrgId
            token.isSuperAdmin = token.impersonatingOriginalIsSuperAdmin
          }
          delete token.isImpersonating
          delete token.impersonatingOriginalUserId
          delete token.impersonatingOriginalOrgId
          delete token.impersonatingOriginalEmail
          delete token.impersonatingOriginalRole
          delete token.impersonatingOriginalName
          delete token.impersonatingOriginalIsSuperAdmin
          delete token.impersonatingDemoUserId
          delete token.impersonatingDemoEmail
          delete token.impersonatingDemoName
          delete token.impersonatingDemoRole
          delete token.impersonatingDemoOrgId
        }

        return token
      }

      if (trigger === "signIn" && user) {
        // Capture identity and authorization claims at sign-in. These claims stay
        // in the signed JWT so middleware can validate sessions without Prisma.
        // Use db-linked id if available (set in signIn callback), otherwise use the OAuth sub
        token.id = (user as any).dbId || user.id || ""
        token.role = (user as any).role ?? "STAFF"
        token.organizationId = (user as any).organizationId ?? ""
        token.email = user.email ?? ""
        token.isSuperAdmin = (user as any).isSuperAdmin ?? false

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
      }

      // JWT sessions are also validated by middleware in the Edge runtime. Keep
      // all authorization claims in the signed token after the initial sign-in;
      // Prisma cannot be queried here during token refresh/session validation.

      // console.log("[AUTH jwt] EXIT — token.id:", token.id, "token.role:", token.role, "token.organizationId:", token.organizationId)
      return token
    },
    async session({ session, token }) {
      // console.log("[AUTH session] ENTER — token.id:", token.id, "token.role:", token.role, "token.organizationId:", token.organizationId)
      if (session.user) {
        // Support mode: use target org context
        if (token.isSupportMode) {
          session.user.isSupportMode = true
          session.user.supportOrgId = token.supportOrgId
          session.user.supportPermissions = token.supportPermissions
          session.user.supportTokenId = token.supportTokenId
          session.user.supportExpiresAt = token.supportExpiresAt
          session.user.supportActorId = token.supportActorId
          // Override organizationId with the target org so all routes use the customer's org
          session.user.organizationId = token.supportOrgId || token.organizationId
          // Keep the user's real id for audit purposes
          session.user.id = token.supportActorId || token.id
          session.user.role = "STAFF" // Support gets STAFF-level access, read-only enforced by permissions
        } else if (token.isImpersonating) {
          // Impersonation: use demo user context
          session.user.isImpersonating = true
          session.user.id = token.id
          session.user.role = token.role
          session.user.organizationId = token.organizationId
        } else {
          session.user.id = token.id
          session.user.role = token.role
          session.user.organizationId = token.organizationId
        }
        session.user.isSuperAdmin = token.isSuperAdmin ?? false
        session.user.stripeCustomerId = token.stripeCustomerId
        session.user.subscriptionStatus = token.subscriptionStatus
        session.user.subscriptionTier = token.subscriptionTier
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
