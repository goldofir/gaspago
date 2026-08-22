import cron from 'node-cron'
import { FastifyInstance } from 'fastify'
import { prisma } from './prisma'
import { runDailyExpiryCheck } from '../commissions/expiry.cron'
import { runMonthlyCommissionCron } from '../commissions/commission.cron'
import { runConsumptionExpiryCheck } from '../commissions/consumption-expiry.cron'
import { runOnChainBatchCron } from '../wallet/onchain-batch.cron'
import { executeBuyback } from '../web3/buyback.service'

// In-process cron scheduling. Registered once at bootstrap, after the HTTP
// server is listening. All jobs run in the same Node process — a job must
// never throw past its own boundary or it would crash the API.

export function startSchedulers(app: FastifyInstance): void {
  // Daily at 02:00 — expire BLOCKED commissions past their expiresAt and
  // move the forfeited amount to CompanyRevenue.
  cron.schedule('0 2 * * *', async () => {
    app.log.info('[scheduler] Starting daily expiry check')
    try {
      await runDailyExpiryCheck()
      app.log.info('[scheduler] Daily expiry check finished')
    } catch (err) {
      app.log.error({ err }, '[scheduler] Daily expiry check failed')
    }
  })

  // Daily at 03:00 — checks affiliate purchase activity against month
  // boundaries. Runs internally against config.commission.blockAfterMonths /
  // expireAfterMonths, so daily execution is safe and always catches
  // month-end correctly.
  cron.schedule('0 3 * * *', async () => {
    app.log.info('[scheduler] Starting monthly commission check')
    try {
      await runMonthlyCommissionCron()
      app.log.info('[scheduler] Monthly commission check finished')
    } catch (err) {
      app.log.error({ err }, '[scheduler] Monthly commission check failed')
    }
  })

  // Weekly, Sunday at 04:00 — sweep the platform_cut CompanyRevenue
  // accumulated since the last buyback and use it as the budget for an
  // FGOL buyback/burn.
  cron.schedule('0 4 * * 0', async () => {
    app.log.info('[scheduler] Starting weekly FGOL buyback')
    try {
      const lastBatch = await prisma.buybackBatch.findFirst({
        orderBy: { executedAt: 'desc' },
        select: { executedAt: true },
      })
      const since = lastBatch?.executedAt ?? new Date(0)

      // platform_cut is recorded in FGOL currency (see commission.service.ts,
      // which posts `margin * platformPct` with currency: Currency.FGOL —
      // margin/FGOL are tracked 1:1 in this ledger, there is no separate BRL
      // entry for the platform cut). We sum the FGOL-denominated cut and use
      // that same figure as both the BRL budget and the FGOL amount to
      // acquire/burn, consistent with how the rest of the commission engine
      // treats the two as pegged 1:1.
      const agg = await prisma.companyRevenue.aggregate({
        where: {
          source: 'platform_cut',
          currency: 'FGOL',
          createdAt: { gt: since },
        },
        _sum: { amount: true },
      })

      const accumulated = Number(agg._sum.amount ?? 0)

      if (accumulated > 0) {
        await executeBuyback(accumulated, accumulated)
        app.log.info(
          { accumulated, since },
          '[scheduler] Weekly FGOL buyback finished — buyback executed',
        )
      } else {
        app.log.info({ since }, '[scheduler] Weekly FGOL buyback finished — nothing accumulated, skipped')
      }
    } catch (err) {
      app.log.error({ err }, '[scheduler] Weekly FGOL buyback failed')
    }
  })

  // Daily at 02:30 — forfeit fgolBalance for users 60+ days without a purchase
  // (gas order or marketplace checkout). 30-59 days just blocks PIX withdrawal,
  // enforced inline by the withdrawal endpoint, not by this cron.
  cron.schedule('30 2 * * *', async () => {
    app.log.info('[scheduler] Starting consumption-based expiry check')
    try {
      await runConsumptionExpiryCheck()
      app.log.info('[scheduler] Consumption-based expiry check finished')
    } catch (err) {
      app.log.error({ err }, '[scheduler] Consumption-based expiry check failed')
    }
  })

  // Every 15 minutes — flush any user whose pendingOnChainAmount crossed the
  // configured threshold into a queued treasury transfer, then drain the
  // on-chain transfer queue (both directions). Safe no-op until PLATFORM_WALLET_KEY
  // is configured (see wallet-treasury.service.ts).
  cron.schedule('*/15 * * * *', async () => {
    try {
      await runOnChainBatchCron()
    } catch (err) {
      app.log.error({ err }, '[scheduler] On-chain batch cron failed')
    }
  })

  app.log.info('[scheduler] Cron jobs registered: expiry (02:00 daily), commissions (03:00 daily), consumption-expiry (02:30 daily), buyback (04:00 Sunday), onchain-batch (every 15min)')
}
