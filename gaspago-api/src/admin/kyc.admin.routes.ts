import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../shared/prisma'
import { KycService } from '../kyc/kyc.service'
import { requireRole } from '../shared/auth.middleware'

const ReviewKycSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'FRAUD']),
  notes: z.string().optional(),
})

export async function kycAdminRoutes(app: FastifyInstance) {
  const requireAdmin = requireRole('SUPERADMIN', 'ADMIN')

  // GET /admin/kyc — list all KYC submissions with filters
  app.get('/', { preHandler: requireAdmin }, async (req) => {
    const { status, limit, offset } = req.query as { status?: string; limit?: string; offset?: string }

    const where: any = {}
    if (status) where.status = status

    const [total, items] = await Promise.all([
      prisma.kycSubmission.count({ where }),
      prisma.kycSubmission.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, phone: true, email: true, cpf: true, avatarUrl: true } },
        },
        orderBy: { submittedAt: 'desc' },
        take: limit ? parseInt(limit) : 50,
        skip: offset ? parseInt(offset) : 0,
      }),
    ])

    return { total, items }
  })

  // GET /admin/kyc/:id — get submission with presigned MinIO URLs for document inspection
  app.get('/:id', { preHandler: requireAdmin }, async (req) => {
    const { id } = req.params as { id: string }
    return KycService.getSubmissionWithSignedUrls(id)
  })

  // POST /admin/kyc/:id/review — approve, reject or flag as fraud
  app.post('/:id/review', { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const adminUserId = (req as any).user.id as string
    const { action, notes } = ReviewKycSchema.parse(req.body)

    const updated = await KycService.reviewKyc(id, adminUserId, action, notes)
    return reply.send({ ok: true, submission: updated })
  })
}
