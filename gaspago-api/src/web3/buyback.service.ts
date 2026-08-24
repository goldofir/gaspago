import { ethers } from 'ethers'
import { prisma } from '../shared/prisma'
import { SystemConfigService } from '../shared/system-config.service'

const FGOL_ABI = ['function burn(uint256 amount) external']

export async function executeBuyback(brlSpent: number, fgolAmount: number): Promise<void> {
  // Reads live from SystemConfigService, not config.polygon — that object reads
  // process.env directly, which SuperAdmin never populates (same class of bug
  // already found and fixed for CONEXBOT_WEBHOOK_SECRET and the wallet-treasury
  // service). Without this fix, executeBuyback always hit the "not configured"
  // branch below even after PLATFORM_WALLET_KEY was set in SuperAdmin.
  const rpcUrl = SystemConfigService.get('POLYGON_RPC_URL') || 'https://polygon-rpc.com'
  const fgolContract = SystemConfigService.get('FGOL_CONTRACT')
  const platformWalletKey = SystemConfigService.get('PLATFORM_WALLET_KEY')

  if (!rpcUrl || !fgolContract || !platformWalletKey) {
    console.warn('[buyback] Polygon credentials not configured. Skipping on-chain transaction.')
    await recordBatch(brlSpent, fgolAmount, null)
    return
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const wallet = new ethers.Wallet(platformWalletKey, provider)
    const contract = new ethers.Contract(fgolContract, FGOL_ABI, wallet)

    const amountWei = ethers.parseUnits(fgolAmount.toString(), 18)
    const tx = await contract.burn(amountWei)
    const receipt = await tx.wait()

    console.log(`[buyback] Burned ${fgolAmount} FGOL. tx=${receipt.hash}`)
    await recordBatch(brlSpent, fgolAmount, receipt.hash)
  } catch (err) {
    console.error('[buyback] On-chain transaction failed:', err)
    throw err
  }
}

async function recordBatch(
  brlSpent: number,
  fgolAcquired: number,
  polygonTxHash: string | null,
): Promise<void> {
  const pricePerFgol = fgolAcquired > 0 ? brlSpent / fgolAcquired : 0

  await prisma.buybackBatch.create({
    data: {
      brlSpent,
      fgolAcquired,
      pricePerFgol,
      polygonTxHash,
      executedAt: new Date(),
    },
  })
}
