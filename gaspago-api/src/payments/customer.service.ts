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
// so a real PIX charge can be issued against them at checkout.
export async function getOrCreateCustomerId(userId: string | null): Promise<string> {
  if (!userId) return getOrCreateGuestCustomer()

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  if (user.asaasCustomerId) return user.asaasCustomerId

  const customer = await createCustomer({
    name: user.name ?? `Cliente ${user.phone}`,
    cpfCnpj: user.cpf ?? undefined,
    email: user.email ?? undefined,
    mobilePhone: user.phone,
    externalReference: user.id,
  })

  await prisma.user.update({ where: { id: userId }, data: { asaasCustomerId: customer.id } })
  return customer.id
}
