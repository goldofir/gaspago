import { prisma } from '../shared/prisma'

// Earth radius in km
const EARTH_RADIUS_KM = 6371

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function score(distKm: number, cashbackPercent: number, rating: number): number {
  const invDist = distKm > 0 ? 1 / distKm : 10
  return rating * 0.4 + cashbackPercent * 40 + invDist * 0.2
}

export async function findDistributorsByLocation(lat: number, lng: number) {
  const all = await prisma.distributor.findMany({
    where: { isActive: true, lat: { not: null }, lng: { not: null } },
    include: { products: { where: { isAvailable: true }, take: 1, orderBy: { price: 'asc' } } },
  })

  const results = all
    .map((d) => {
      const distKm = haversine(lat, lng, d.lat!, d.lng!)
      return { ...d, distanceKm: Math.round(distKm * 10) / 10 }
    })
    .filter((d) => d.distanceKm <= d.serviceRadiusKm)
    .sort((a, b) => score(b.distanceKm, b.cashbackPercent, b.rating) - score(a.distanceKm, a.cashbackPercent, a.rating))
    .slice(0, 5)

  return results
}

// Fallback: postal-code prefix match (used by WhatsApp bot + legacy callers)
export async function findDistributorsByPostalCode(postalCode: string) {
  const prefix = postalCode.slice(0, 5)
  return prisma.distributor.findMany({
    where: { isActive: true, postalCode: { startsWith: prefix } },
    include: { products: { where: { isAvailable: true }, take: 1, orderBy: { price: 'asc' } } },
    orderBy: { rating: 'desc' },
    take: 5,
  })
}
