import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
import { compare } from "bcryptjs"
import { prisma } from "./db"
import {
  checkLoginRateLimit,
  recordLoginFailure,
  resetLoginRateLimit,
} from "./rate-limit"

const GENERIC_LOGIN_ERROR = "Invalid email or password"

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
      async authorize(credentials, request) {
        const email = typeof credentials?.email === "string"
          ? credentials.email.trim().toLowerCase()
          : ""
        const password = typeof credentials?.password === "string"
          ? credentials.password
          : ""

        // Check before touching the database so locked accounts cannot be
        // probed, and use the same error for every credentials failure.
        const limit = checkLoginRateLimit(email, request)
        if (!limit.allowed) {
          throw new Error(GENERIC_LOGIN_ERROR)
        }

        const user = email && password
          ? await prisma.user.findFirst({
              where: { email: { equals: email, mode: "insensitive" } },
            })
          : null

        if (!user?.passwordHash) {
          recordLoginFailure(email, request)
          throw new Error(GENERIC_LOGIN_ERROR)
        }

        const isValid = await compare(password, user.passwordHash)
        if (!isValid) {
          recordLoginFailure(email, request)
          throw new Error(GENERIC_LOGIN_ERROR)
        }

        resetLoginRateLimit(email, request)

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

      // Session updates are client-controlled. Never copy authorization claims from
      // them. Support activation accepts only the opaque raw token; all context is
      // derived from the database record below. Impersonation is deliberately not
      // activatable through session.update() (only its server-created JWT state may
      // be exited).
      if (trigger === "update" && session) {
        const updateData = session as Record<string, unknown>

        if (updateData.supportToken && typeof updateData.supportToken === "string") {
          const supportRecord = await prisma.supportAccessToken.findUnique({
            where: { token: updateData.supportToken },
          })
          const now = new Date()
          if (
            supportRecord &&
            !supportRecord.revokedAt &&
            supportRecord.expiresAt > now
          ) {
            token.isSupportMode = true
            token.supportToken = updateData.supportToken
            token.supportOrgId = supportRecord.organizationId
            token.supportPermissions = supportRecord.permissions
            token.supportTokenId = supportRecord.id
            token.supportExpiresAt = supportRecord.expiresAt.toISOString()
            // The authenticated identity is the only valid support actor.
            token.supportActorId = token.id
          }
        }

        if (updateData.isSupportMode === false) {
          delete token.isSupportMode
          delete token.supportToken
          delete token.supportOrgId
          delete token.supportPermissions
          delete token.supportTokenId
          delete token.supportExpiresAt
          delete token.supportActorId
        }

        // Client data can never activate or alter impersonation. A server-created
        // impersonation state can only be ended, restoring claims from the token.
        if (updateData.isImpersonating === false) {
          if (token.impersonatingOriginalUserId) {
            const jwt = token as any
            jwt.id = jwt.impersonatingOriginalUserId
            jwt.email = jwt.impersonatingOriginalEmail
            jwt.name = jwt.impersonatingOriginalName
            jwt.role = jwt.impersonatingOriginalRole
            jwt.organizationId = jwt.impersonatingOriginalOrgId
            jwt.isSuperAdmin = jwt.impersonatingOriginalIsSuperAdmin
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
      }

      // Re-verify support access on every JWT/session request. This makes revocation
      // effective immediately instead of trusting a previously issued JWT until it
      // expires. The raw token is never copied into the public session object.
      if (token.isSupportMode && token.supportToken) {
        const supportRecord = await prisma.supportAccessToken.findUnique({
          where: { token: token.supportToken },
        })
        if (!supportRecord || supportRecord.revokedAt || supportRecord.expiresAt <= new Date()) {
          delete token.isSupportMode
          delete token.supportToken
          delete token.supportOrgId
          delete token.supportPermissions
          delete token.supportTokenId
          delete token.supportExpiresAt
          delete token.supportActorId
        } else {
          token.supportOrgId = supportRecord.organizationId
          token.supportPermissions = supportRecord.permissions
          token.supportTokenId = supportRecord.id
          token.supportExpiresAt = supportRecord.expiresAt.toISOString()
        }
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
