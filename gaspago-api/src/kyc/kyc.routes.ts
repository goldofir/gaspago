import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { KycService } from './kyc.service'
import { requireAuth } from '../shared/auth.middleware'

const SubmitKycSchema = z.object({
  documentType: z.enum(['RG', 'CNH', 'PASSPORT']),
  documentNumber: z.string().min(4),
  fullName: z.string().min(3),
  cpf: z.string(),
  birthDate: z.string().optional(),
  frontImageBase64: z.string().min(10),
  backImageBase64: z.string().optional(),
  selfieImageBase64: z.string().min(10),
})

export async function kycRoutes(app: FastifyInstance) {
  // GET /kyc/status — check current user's KYC level & submission status
  app.get('/status', { preHandler: requireAuth }, async (req) => {
    const userId = (req as any).user.id as string
    return KycService.getKycStatus(userId)
  })

  // POST /kyc/submit — submit document photos & selfie for verification
  app.post('/submit', { preHandler: requireAuth }, async (req, reply) => {
    const userId = (req as any).user.id as string
    const body = SubmitKycSchema.parse(req.body)
    const ipAddress = req.ip

    const submission = await KycService.submitKyc({
      userId,
      ...body,
      ipAddress,
    })

    return reply.status(201).send({ ok: true, submission })
  })
}
