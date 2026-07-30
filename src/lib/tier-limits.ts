export const TIER_LIMITS: Record<string, { maxUsers: number | null; maxEntities: number | null }> = {
  SOLO: { maxUsers: 1, maxEntities: 3 },
  TEAM: { maxUsers: 5, maxEntities: 25 },
  ENTERPRISE: { maxUsers: null, maxEntities: null },
}
