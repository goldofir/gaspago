import { SystemConfigService } from '../shared/system-config.service'
import { prisma } from '../shared/prisma'

// Matches the pre-SuperAdmin-configurable defaults that used to live as
// static fractions in config.ts (0.20/0.30/0.35/0.10) — same total split,
// just expressed as whole percents (SuperAdmin's convention everywhere else,
// e.g. Distributor.cashbackPercent forms) instead of 0-1 fractions.
const DEFAULT_CONSUMER_PCT = 20
const DEFAULT_PLATFORM_PCT = 30
const DEFAULT_CREDENCIADOR_PCT = 10
// 35% total network commission, split equally across the old fixed 5 levels.
const DEFAULT_LEVEL_PCT = [7, 7, 7, 7, 7]
const DEFAULT_DIRECT_REFERRER_PCT = 0

function readPct(key: string, fallback: number): number {
  const raw = SystemConfigService.get(key)
  if (raw === undefined || raw === '') return fallback
  const v = Number(raw)
  return Number.isFinite(v) ? v : fallback
}

// All getters return a 0-1 fraction (ready to multiply against a margin),
// converting from the whole-percent value SuperAdmin's form uses.
export function getConsumerPct(): number {
  return readPct('CONSUMER_CASHBACK_PCT', DEFAULT_CONSUMER_PCT) / 100
}

export function getPlatformPct(): number {
  return readPct('PLATFORM_CUT_PCT', DEFAULT_PLATFORM_PCT) / 100
}

// Any affiliate can act as a credenciador (onboard distributors/establishments
// and earn a cut of what they sell) at the base rate. Subscribing to the
// designated "credenciador plan" (SuperAdmin picks which Plan.slug counts,
// via CREDENCIADOR_PLAN_SLUG) bumps that specific credenciador up to the
// premium rate — this is per-credenciador, not global, so it needs their id.
export async function getCredenciadorPct(credenciadorUserId: string): Promise<number> {
  const baseRate = readPct('CREDENCIADOR_PCT', DEFAULT_CREDENCIADOR_PCT) / 100
  const planSlug = SystemConfigService.get('CREDENCIADOR_PLAN_SLUG')
  if (!planSlug) return baseRate

  const activeSub = await prisma.subscription.findFirst({
    where: {
      userId: credenciadorUserId,
      isActive: true,
      expiresAt: { gt: new Date() },
      planRef: { slug: planSlug },
    },
  })
  if (!activeSub) return baseRate

  const premiumRaw = SystemConfigService.get('CREDENCIADOR_PREMIUM_PCT')
  if (premiumRaw === undefined || premiumRaw === '') return baseRate
  const premium = Number(premiumRaw)
  return Number.isFinite(premium) ? premium / 100 : baseRate
}

// Level is 1-indexed (1 = closest matrix ancestor to the buyer). This is
// matrix POSITION, not necessarily who really referred the buyer — those
// diverge once spillover places someone under a different node than their
// actual sponsor (see getDirectReferrerPct below for the sponsor-specific
// bonus). Levels beyond what's explicitly configured (KNOWN_KEYS only goes
// up to MATRIX_LEVEL_10_PCT) default to 0 — an admin running a deeper
// matrix than that needs to configure those levels explicitly, there's no
// formula to fall back to since levels are independent now, not an equal split.
export function getLevelPct(level: number): number {
  if (level < 1 || level > 10) return 0
  return readPct(`MATRIX_LEVEL_${level}_PCT`, DEFAULT_LEVEL_PCT[level - 1] ?? 0) / 100
}

// Same idea as getLevelPct, but for a specific Plan's own price (subscription
// commissions, not orders) — a plan can override individual levels via its
// sparse networkLevelPcts JSON ({"1": 12, "3": 8}); any level absent from
// that map just falls back to the global MATRIX_LEVEL_N_PCT above.
export function getPlanLevelPct(plan: { networkLevelPcts?: unknown } | null | undefined, level: number): number {
  const overrides = plan?.networkLevelPcts as Record<string, number> | null | undefined
  const override = overrides?.[String(level)]
  if (typeof override === 'number' && Number.isFinite(override)) return override / 100
  return getLevelPct(level)
}

// Flat bonus paid to whoever actually referred the buyer (User.referredById),
// independent of the matrix — see Plan.directReferrerPct in schema.prisma for
// why this exists as a separate concept from the level-1 network commission.
// Defaults to 0 (off) globally — a brand new commission stream shouldn't
// silently start paying out until an admin configures it.
export function getDirectReferrerPct(plan?: { directReferrerPct?: number | null } | null): number {
  if (plan?.directReferrerPct !== undefined && plan?.directReferrerPct !== null) {
    return plan.directReferrerPct / 100
  }
  return readPct('DIRECT_REFERRER_PCT', DEFAULT_DIRECT_REFERRER_PCT) / 100
}
