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
}) {
  const res = await asaas().post('/accounts', data)
  return res.data as { id: string; walletId: string; apiKey: string }
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

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}
