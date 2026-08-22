import { prisma } from '../shared/prisma'
import { createCustomer } from './asaas.client'

// A guest POS payment (no logged-in consumer) still needs an Asaas customer to
// bill against — shared across all guests rather than creating one per scan.
const GUEST_CUSTOMER_CACHE_KEY = 'guest-pos-checkout'
let guestCustomerId: string | null = null

async function getOrCreateGuestCustomer(): Promise<string> {
  if (guestCustomerId) return guestCustomerId
  const customer = await createCustomer({
    name: 'Cliente balcão (não identificado)',
    externalReference: GUEST_CUSTOMER_CACHE_KEY,
  })
  guestCustomerId = customer.id
  return customer.id
}

// Lazily creates (once) and caches the Asaas Customer for a logged-in consumer,
// so a real PIX charge can be issued against them at checkout. Asaas requires a
// CPF/CNPJ to create a PIX charge — cpfFromCheckout is the value the consumer
// just typed at checkout (used only if their profile doesn't have one saved
// yet; saved to the profile so it's never asked again).
export async function getOrCreateCustomerId(userId: string | null, cpfFromCheckout?: string): Promise<string> {
  if (!userId) return getOrCreateGuestCustomer()

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  const cpf = user.cpf ?? cpfFromCheckout

  if (user.asaasCustomerId) {
    // Customer already exists in Asaas — if it was created before we had a CPF
    // (or the profile still doesn't have one, but checkout just supplied one),
    // save it to the profile for next time, but don't try to update Asaas here.
    if (!user.cpf && cpfFromCheckout) {
      await prisma.user.update({ where: { id: userId }, data: { cpf: cpfFromCheckout } })
    }
    return user.asaasCustomerId
  }

  const customer = await createCustomer({
    name: user.name ?? `Cliente ${user.phone}`,
    cpfCnpj: cpf,
    email: user.email ?? undefined,
    mobilePhone: user.phone,
    externalReference: user.id,
  })

  await prisma.user.update({
    where: { id: userId },
    data: { asaasCustomerId: customer.id, ...(cpf && !user.cpf ? { cpf } : {}) },
  })
  return customer.id
}
