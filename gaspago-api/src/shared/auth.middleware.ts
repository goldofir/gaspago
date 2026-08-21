export async function requireAuth(request: any, reply: any) {
  try {
    await request.jwtVerify()
  } catch {
    return reply.status(401).send({ error: 'Não autenticado' })
  }
}

export function requireRole(...roles: string[]) {
  return async (request: any, reply: any) => {
    try {
      await request.jwtVerify()
    } catch {
      return reply.status(401).send({ error: 'Não autenticado' })
    }
    if (!roles.includes(request.user?.role)) {
      return reply.status(403).send({ error: 'Acesso negado' })
    }
  }
}
