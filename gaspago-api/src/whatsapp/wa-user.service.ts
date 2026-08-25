import { prisma } from '../shared/prisma'
import { placeInMatrix, resolveReferrer } from '../commissions/matrix-placement.service'

// A WhatsApp conversation has no login/JWT — the phone number itself is the
// identity (WhatsApp already verified it's a real, reachable number, same
// trust level as our own OTP). Finds the existing consumer for this phone,
// or creates one — same shape and referral-network entry as every other
// consumer signup path (OTP verify, Google). No ?ref= is available in a
// WhatsApp conversation, so a brand-new user always falls back to the
// company root (see resolveReferrer), same as an organic app signup.
export async function resolveOrCreateWaUser(phone: string) {
  let user = await prisma.user.findUnique({ where: { phone } })
  if (user) return user

  user = await prisma.user.create({
    data: { phone, actorType: 'CONSUMER', affiliateStatus: 'ACTIVE' },
  })

  const referrer = await resolveReferrer(undefined, user.id)
  if (referrer) {
    await prisma.user.update({ where: { id: user.id }, data: { referredById: referrer.id } })
    await placeInMatrix(user.id, referrer.id).catch(err => console.error('[matrix] placement failed for', user!.id, err))
  }

  return user
}
