import { flushPendingOnChainTransfers, processOnChainQueue } from './wallet-treasury.service'

export async function runOnChainBatchCron(): Promise<void> {
  const flushed = await flushPendingOnChainTransfers()
  if (flushed.usersFlushed > 0) {
    console.log(`[onchain-batch-cron] Flushed ${flushed.usersFlushed} user(s), ${flushed.totalAmount} FGOL queued for treasury transfer.`)
  }

  const processed = await processOnChainQueue()
  if (processed.processed > 0) {
    console.log(`[onchain-batch-cron] Queue: ${processed.processed} pending, ${processed.confirmed} confirmed, ${processed.failed} failed.`)
  }
}
