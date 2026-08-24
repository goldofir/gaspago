import { prisma } from '../shared/prisma'
import { uploadImage, getPrivateUrl } from '../shared/storage.service'
import { NotificationService } from '../notifications/notification.service'

export interface SubmitKycInput {
  userId: string
  documentType: 'RG' | 'CNH' | 'PASSPORT'
  documentNumber: string
  fullName: string
  cpf: string
  birthDate?: string
  frontImageBase64: string
  backImageBase64?: string
  selfieImageBase64: string
  ipAddress?: string
}

// CPF digit validator
export function isValidCpf(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, '')
  if (clean.length !== 11 || /^(\d)\1{10}$/.test(clean)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(clean.charAt(i)) * (10 - i)
  let rev = 11 - (sum % 11)
  if (rev === 10 || rev === 11) rev = 0
  if (rev !== parseInt(clean.charAt(9))) return false

  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(clean.charAt(i)) * (11 - i)
  rev = 11 - (sum % 11)
  if (rev === 10 || rev === 11) rev = 0
  if (rev !== parseInt(clean.charAt(10))) return false

  return true
}

export const KycService = {
  async submitKyc(input: SubmitKycInput) {
    if (!isValidCpf(input.cpf)) {
      throw Object.assign(new Error('CPF informado é inválido.'), { statusCode: 400 })
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { id: input.userId } })

    // Process & compress images via Sharp to private MinIO bucket `kyc/`
    const frontBuffer = Buffer.from(input.frontImageBase64.replace(/^data:.*;base64,/, ''), 'base64')
    const frontUpload = await uploadImage(frontBuffer, { folder: 'kyc', isPrivate: true })

    let backUploadKey: string | undefined
    if (input.backImageBase64) {
      const backBuffer = Buffer.from(input.backImageBase64.replace(/^data:.*;base64,/, ''), 'base64')
      const backUpload = await uploadImage(backBuffer, { folder: 'kyc', isPrivate: true })
      backUploadKey = backUpload.key
    }

    const selfieBuffer = Buffer.from(input.selfieImageBase64.replace(/^data:.*;base64,/, ''), 'base64')
    const selfieUpload = await uploadImage(selfieBuffer, { folder: 'kyc', isPrivate: true })

    // Simulated automated OCR & AI Liveness check (0.92+ passes auto-score)
    const ocrConfidence = 0.96
    const livenessScore = 0.98

    const submission = await prisma.kycSubmission.upsert({
      where: { userId: input.userId },
      create: {
        userId: input.userId,
        documentType: input.documentType,
        documentNumber: input.documentNumber,
        fullName: input.fullName,
        cpf: input.cpf,
        birthDate: input.birthDate,
        frontImageKey: frontUpload.key,
        backImageKey: backUploadKey,
        selfieImageKey: selfieUpload.key,
        status: 'PENDING_REVIEW',
        ocrConfidence,
        livenessScore,
        pepCheckPassed: true,
        sanctionsPassed: true,
        auditLogs: {
          create: {
            actorId: input.userId,
            action: 'SUBMITTED',
            notes: 'Documentos e prova de vida enviados pelo aplicativo.',
            ipAddress: input.ipAddress,
          },
        },
      },
      update: {
        documentType: input.documentType,
        documentNumber: input.documentNumber,
        fullName: input.fullName,
        cpf: input.cpf,
        birthDate: input.birthDate,
        frontImageKey: frontUpload.key,
        backImageKey: backUploadKey,
        selfieImageKey: selfieUpload.key,
        status: 'PENDING_REVIEW',
        rejectionReason: null,
        submittedAt: new Date(),
        reviewedAt: null,
        reviewedById: null,
        auditLogs: {
          create: {
            actorId: input.userId,
            action: 'SUBMITTED',
            notes: 'Re-envio de documentos de identidade.',
            ipAddress: input.ipAddress,
          },
        },
      },
    })

    // Also update User profile CPF if not set
    if (!user.cpf) {
      await prisma.user.update({ where: { id: input.userId }, data: { cpf: input.cpf } })
    }

    return submission
  },

  async getKycStatus(userId: string) {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, kycVerified: true, kycLevel: true },
    })

    const submission = await prisma.kycSubmission.findUnique({
      where: { userId },
      select: {
        id: true,
        status: true,
        targetLevel: true,
        documentType: true,
        rejectionReason: true,
        submittedAt: true,
        reviewedAt: true,
      },
    })

    return {
      userId: user.id,
      kycVerified: user.kycVerified,
      kycLevel: user.kycLevel,
      status: submission?.status ?? 'NOT_SUBMITTED',
      submission,
    }
  },

  async reviewKyc(submissionId: string, adminUserId: string, action: 'APPROVE' | 'REJECT' | 'FRAUD', notes?: string) {
    const submission = await prisma.kycSubmission.findUniqueOrThrow({
      where: { id: submissionId },
      include: { user: true },
    })

    let newStatus: 'APPROVED' | 'REJECTED' | 'SUSPECTED_FRAUD' = 'APPROVED'
    let newLevel: 'LEVEL_2_VERIFIED' | 'LEVEL_0_UNVERIFIED' = 'LEVEL_2_VERIFIED'

    if (action === 'APPROVE') {
      newStatus = 'APPROVED'
      newLevel = 'LEVEL_2_VERIFIED'
    } else if (action === 'REJECT') {
      newStatus = 'REJECTED'
      newLevel = 'LEVEL_0_UNVERIFIED'
    } else {
      newStatus = 'SUSPECTED_FRAUD'
      newLevel = 'LEVEL_0_UNVERIFIED'
    }

    const updated = await prisma.$transaction(async (tx) => {
      const sub = await tx.kycSubmission.update({
        where: { id: submissionId },
        data: {
          status: newStatus,
          rejectionReason: action !== 'APPROVE' ? (notes ?? 'Documentos ilegíveis ou divergentes.') : null,
          adminNotes: notes,
          reviewedAt: new Date(),
          reviewedById: adminUserId,
          auditLogs: {
            create: {
              actorId: adminUserId,
              action: action === 'APPROVE' ? 'APPROVED' : action === 'REJECT' ? 'REJECTED' : 'FLAGGED_FRAUD',
              notes: notes ?? (action === 'APPROVE' ? 'Identidade aprovada.' : 'Identidade rejeitada.'),
            },
          },
        },
      })

      await tx.user.update({
        where: { id: submission.userId },
        data: {
          kycVerified: action === 'APPROVE',
          kycLevel: newLevel,
        },
      })

      return sub
    })

    // Dispara push notification para o usuário sobre o resultado
    if (action === 'APPROVE') {
      NotificationService.sendToUser(submission.userId, 'KYC Aprovado! ⭐', 'Sua identidade foi verificada. Limites de saque PIX liberados!').catch(() => {})
    } else {
      NotificationService.sendToUser(submission.userId, 'Verificação de KYC ⚠️', notes ?? 'Verifique os dados enviados e tente novamente.').catch(() => {})
    }

    return updated
  },

  async getSubmissionWithSignedUrls(submissionId: string) {
    const sub = await prisma.kycSubmission.findUniqueOrThrow({
      where: { id: submissionId },
      include: { user: { select: { name: true, phone: true, email: true, cpf: true } }, auditLogs: true },
    })

    const frontUrl = await getPrivateUrl(sub.frontImageKey, 900)
    const backUrl = sub.backImageKey ? await getPrivateUrl(sub.backImageKey, 900) : null
    const selfieUrl = await getPrivateUrl(sub.selfieImageKey, 900)

    return {
      ...sub,
      frontUrl,
      backUrl,
      selfieUrl,
    }
  },

  async assertWithdrawalAllowed(userId: string) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { kycVerified: true, kycLevel: true } })
    if (!user.kycVerified || user.kycLevel === 'LEVEL_0_UNVERIFIED') {
      throw Object.assign(
        new Error('Sua conta precisa estar com o KYC Aprovado para realizar saques via PIX. Envie seus documentos no aplicativo.'),
        { statusCode: 403 }
      )
    }
  },
}
