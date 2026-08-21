import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { SystemConfigService, KNOWN_KEYS } from '../shared/system-config.service'

const SetCredentialSchema = z.object({
  value: z.string().min(1),
})

const BulkSetSchema = z.object({
  credentials: z.array(z.object({ key: z.string(), value: z.string().min(1) })),
})

export async function credentialsRoutes(app: FastifyInstance) {
  // GET /admin/credentials — list all credentials with masked values + setup status
  app.get('/', async () => {
    const configured = await SystemConfigService.listForAdmin()
    const schema = SystemConfigService.getSchema()

    // Merge: show known keys even if not yet configured
    const result = schema.map(known => {
      const existing = configured.find(c => c.key === known.key)
      const meta = KNOWN_KEYS[known.key]
      // For readonly (internal stack) keys: resolve value from env for display
      const envValue = meta?.readonly ? (process.env[known.key] ?? null) : null
      return {
        key: known.key,
        label: known.label,
        group: known.group,
        sensitive: known.sensitive,
        hint: known.hint,
        readonly: meta?.readonly ?? false,
        isSet: known.isSet,
        value: existing?.value ?? (envValue && !meta?.sensitive ? envValue : null),
        updatedAt: existing?.updatedAt ?? null,
        updatedBy: existing?.updatedBy ?? null,
      }
    })

    // Group by section for the UI
    const grouped: Record<string, typeof result> = {}
    for (const item of result) {
      if (!grouped[item.group]) grouped[item.group] = []
      grouped[item.group].push(item)
    }

    // readonly keys managed by env/stack are always considered "set" for the admin status
    const configurable = result.filter(r => !r.readonly)
    const allSet = configurable.every(r => r.isSet)
    const missing = configurable.filter(r => !r.isSet).map(r => r.key)

    return { grouped, allSet, missing }
  })

  // PUT /admin/credentials/:key — set a single credential
  app.put('/:key', async (req, reply) => {
    const { key } = req.params as { key: string }
    const { value } = SetCredentialSchema.parse(req.body)
    const adminId = (req as any).user?.id

    if (!KNOWN_KEYS[key]) {
      return reply.status(400).send({ error: `Unknown config key: ${key}` })
    }
    if (KNOWN_KEYS[key].readonly) {
      return reply.status(403).send({ error: `Key "${key}" is managed internally by the stack and cannot be changed here.` })
    }

    await SystemConfigService.set(key, value, adminId)
    return reply.send({ ok: true, key, label: KNOWN_KEYS[key].label })
  })

  // POST /admin/credentials/bulk — set multiple at once (initial setup)
  app.post('/bulk', async (req, reply) => {
    const { credentials } = BulkSetSchema.parse(req.body)
    const adminId = (req as any).user?.id

    const errors: string[] = []
    const saved: string[] = []

    for (const { key, value } of credentials) {
      if (!KNOWN_KEYS[key]) { errors.push(`Unknown key: ${key}`); continue }
      await SystemConfigService.set(key, value, adminId)
      saved.push(key)
    }

    return reply.send({ saved, errors })
  })

  // GET /admin/credentials/status — quick health check for all integrations
  app.get('/status', async () => {
    const checks = Object.keys(KNOWN_KEYS).map(key => ({
      key,
      label: KNOWN_KEYS[key].label,
      group: KNOWN_KEYS[key].group,
      isSet: !!SystemConfigService.get(key),
    }))

    const byGroup: Record<string, { allSet: boolean; keys: typeof checks }> = {}
    for (const c of checks) {
      if (!byGroup[c.group]) byGroup[c.group] = { allSet: true, keys: [] }
      byGroup[c.group].keys.push(c)
      if (!c.isSet) byGroup[c.group].allSet = false
    }

    return {
      ready: checks.every(c => c.isSet),
      groups: byGroup,
    }
  })
}
