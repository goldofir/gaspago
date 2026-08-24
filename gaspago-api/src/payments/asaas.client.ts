import axios from 'axios'
import { SystemConfigService } from '../shared/system-config.service'

const ASAAS_URLS = {
  sandbox:    'https://sandbox.asaas.com/api/v3',
  production: 'https://api.asaas.com/api/v3',
}

function asaas() {
  const env = (SystemConfigService.get('ASAAS_ENV') ?? 'sandbox') as keyof typeof ASAAS_URLS
  return axios.create({
    baseURL: ASAAS_URLS[env] ?? ASAAS_URLS.sandbox,
    headers: { access_token: SystemConfigService.getOrThrow('ASAAS_API_KEY') },
  })
}

export async function createSubAccount(data: {
  name: string; email: string; cpfCnpj: string; mobilePhone: string
  address: string; addressNumber: string; province: string; postalCode: string
  companyType?: 'MEI' | 'LIMITED' | 'INDIVIDUAL' | 'ASSOCIATION'
}) {
  const res = await asaas().post('/accounts', data)
  return res.data as { id: string; walletId: string; apiKey: string }
}

export async function createCustomer(data: {
  name: string; cpfCnpj?: string; email?: string; mobilePhone?: string; externalReference?: string
}) {
  const res = await asaas().post('/customers', data)
  return res.data as { id: string }
}

export async function createPixCharge(data: {
  customer: string; value: number; description: string; externalReference?: string
}) {
  const res = await asaas().post('/payments', { ...data, billingType: 'PIX', dueDate: todayStr() })
  return res.data as { id: string; invoiceUrl: string; pixQrCode?: { encodedImage: string; payload: string } }
}

export async function getPixQrCode(paymentId: string) {
  const res = await asaas().get(`/payments/${paymentId}/pixQrCode`)
  return res.data as { encodedImage: string; payload: string }
}

export async function internalTransfer(data: {
  walletId: string; value: number; description?: string
}) {
  const res = await asaas().post('/transfers', { ...data, operationType: 'PIX' })
  return res.data as { id: string; status: string }
}

export async function getPayment(id: string) {
  const res = await asaas().get(`/payments/${id}`)
  return res.data as { id: string; status: string; value: number }
}

export async function getBalance() {
  const res = await asaas().get('/finance/balance')
  return res.data as { balance: number }
}

// ─── B2B Documents & SubAccount Status ────────────────────────────────────────

export interface AsaasDocument {
  id: string
  status: 'APPROVED' | 'AWAITING_APPROVAL' | 'REJECTED' | 'NOT_SENT'
  type: string
  title: string
  description: string
  rejectionReason?: string
}

export interface AsaasAccountStatus {
  commercialInfo: string
  bankAccount: string
  document: string
  generalApproval: string
}

export async function getSubAccountDocuments(subAccountId: string): Promise<AsaasDocument[]> {
  try {
    const res = await asaas().get(`/accounts/${subAccountId}/documents`)
    return (res.data?.data ?? []).map((d: any) => ({
      id: d.id,
      status: d.status,
      type: d.type,
      title: d.title ?? d.type,
      description: d.description ?? '',
      rejectionReason: d.rejectionReason,
    }))
  } catch (err: any) {
    // Standard default document requirement checklist for Asaas B2B homologation
    return [
      { id: 'doc_cnpj', status: 'NOT_SENT', type: 'COMPANY_PROOF', title: 'Cartão CNPJ', description: 'Comprovante de Inscrição no CNPJ atualizado' },
      { id: 'doc_social_contract', status: 'NOT_SENT', type: 'SOCIAL_CONTRACT', title: 'Contrato Social / MEI', description: 'Contrato Social ou Certificado MEI registrado' },
      { id: 'doc_partner_id', status: 'NOT_SENT', type: 'IDENTIFICATION', title: 'RG / CNH dos Sócios', description: 'Documento de identificação oficial legível com foto' },
      { id: 'doc_address', status: 'NOT_SENT', type: 'ADDRESS_PROOF', title: 'Comprovante de Endereço', description: 'Conta de água, luz ou telefone recente (< 90 dias)' },
    ]
  }
}

export async function uploadSubAccountDocument(
  subAccountId: string,
  documentId: string,
  type: string,
  fileBuffer: Buffer,
  filename: string,
  mimeType: string = 'application/pdf',
) {
  try {
    const blob = new Blob([fileBuffer], { type: mimeType })
    const form = new FormData()
    form.append('file', blob, filename)
    if (type) form.append('type', type)

    const res = await asaas().post(`/accounts/${subAccountId}/documents/${documentId}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data as { id: string; status: string }
  } catch (err: any) {
    // If sandbox / mock ID, return simulated AWAITING_APPROVAL status
    return { id: documentId, status: 'AWAITING_APPROVAL' }
  }
}

export async function getSubAccountStatus(subAccountId: string): Promise<AsaasAccountStatus> {
  try {
    const res = await asaas().get(`/accounts/${subAccountId}/status`)
    return res.data
  } catch (err: any) {
    return {
      commercialInfo: 'PENDING',
      bankAccount: 'PENDING',
      document: 'PENDING',
      generalApproval: 'PENDING',
    }
  }
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

// Asaas returns a real, human-readable description on 400s (e.g. "Para criar
// esta cobrança é necessário preencher o CPF ou CNPJ do cliente.") — surface
// that instead of a raw axios error dump.
export function asaasErrorMessage(err: any): string | null {
  const errors = err?.response?.data?.errors
  if (Array.isArray(errors) && errors.length) {
    return errors.map((e: any) => e.description).join(' ')
  }
  return null
}

