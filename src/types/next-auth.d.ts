import { DefaultSession, DefaultUser } from "next-auth"
import { DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      organizationId: string
      isSuperAdmin?: boolean
      stripeCustomerId?: string
      subscriptionStatus?: string
      subscriptionTier?: string
      googleConnected?: boolean
      microsoftConnected?: boolean
      isSupportMode?: boolean
      supportOrgId?: string
      supportPermissions?: string
      supportTokenId?: string
      supportExpiresAt?: string
      supportActorId?: string
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    role?: string
    organizationId?: string
    isSuperAdmin?: boolean
    isSupportMode?: boolean
    supportOrgId?: string
    supportPermissions?: string
    supportTokenId?: string
    supportExpiresAt?: string
    supportActorId?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string
    role: string
    organizationId: string
    isSuperAdmin?: boolean
    stripeCustomerId?: string
    subscriptionStatus?: string
    subscriptionTier?: string
    googleAccessToken?: string
    googleRefreshToken?: string
    googleTokenExpiry?: number
    googleConnected?: boolean
    microsoftAccessToken?: string
    microsoftRefreshToken?: string
    microsoftTokenExpiry?: number
    microsoftConnected?: boolean
    isSupportMode?: boolean
    supportOrgId?: string
    supportPermissions?: string
    supportTokenId?: string
    supportExpiresAt?: string
    supportActorId?: string
  }
}
