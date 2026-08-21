export async function requireAdminAuth(request: any, reply: any) {
  try {
    await request.jwtVerify()
    const payload = request.user as { role?: string }
    if (!payload.role || !['superadmin', 'admin'].includes(payload.role)) {
      return reply.status(403).send({ error: 'Acesso negado' })
    }
  } catch (err) {
    // In local development, if no auth header is present, auto-context as dev superadmin
    if (process.env.NODE_ENV !== 'production' && !request.headers.authorization) {
      request.user = { id: 'dev-admin', role: 'superadmin' }
      return
    }
    return reply.status(401).send({ error: 'Token inválido ou ausente' })
  }
}
