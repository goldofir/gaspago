import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { prisma } from './prisma'

// MASTER_KEY must be exactly 32 bytes (64 hex chars) — the only secret that stays in .env
function getMasterKey() {
  const key = process.env.MASTER_KEY
  if (!key || Buffer.from(key, 'hex').length !== 32) {
    throw new Error('MASTER_KEY must be a 64-character hex string (32 bytes). Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"')
  }
  return Buffer.from(key, 'hex')
}

function encrypt(text: string): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-gcm', getMasterKey(), iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

function decrypt(encoded: string): string {
  const parts = encoded.split(':')
  if (parts.length !== 3) throw new Error('Invalid encrypted value format')
  const [ivHex, tagHex, encHex] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const encrypted = Buffer.from(encHex, 'hex')
  const decipher = createDecipheriv('aes-256-gcm', getMasterKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

function mask(value: string): string {
  if (value.length <= 8) return '••••••••'
  return `${'•'.repeat(value.length - 4)}${value.slice(-4)}`
}

// In-memory cache — refreshed on set()
const cache = new Map<string, string>()

export const SystemConfigService = {
  async loadAll() {
    const rows = await prisma.systemConfig.findMany()
    for (const row of rows) {
      try { cache.set(row.key, decrypt(row.value)) } catch { /* skip corrupted */ }
    }
  },

  // Get decrypted value — DB cache first, then env fallback
  get(key: string): string | undefined {
    return cache.get(key) ?? process.env[key]
  },

  getOrThrow(key: string): string {
    const v = this.get(key)
    if (!v) throw new Error(`Config key "${key}" is not set. Configure it in SuperAdmin → Credenciais.`)
    return v
  },

  async set(key: string, value: string, updatedBy?: string) {
    const encrypted = encrypt(value)
    await prisma.systemConfig.upsert({
      where: { key },
      update: { value: encrypted, updatedBy: updatedBy ?? null },
      create: {
        key,
        value: encrypted,
        label: KNOWN_KEYS[key]?.label ?? key,
        group: KNOWN_KEYS[key]?.group ?? 'other',
        sensitive: KNOWN_KEYS[key]?.sensitive ?? true,
        updatedBy: updatedBy ?? null,
      },
    })
    cache.set(key, value)
  },

  async listForAdmin() {
    const rows = await prisma.systemConfig.findMany({ orderBy: [{ group: 'asc' }, { key: 'asc' }] })
    return rows.map(row => {
      let decrypted = ''
      try { decrypted = decrypt(row.value) } catch { decrypted = '' }
      return {
        key: row.key,
        label: row.label,
        group: row.group,
        sensitive: row.sensitive,
        value: row.sensitive ? mask(decrypted) : decrypted,
        isSet: !!decrypted,
        updatedAt: row.updatedAt,
        updatedBy: row.updatedBy,
      }
    })
  },

  // Returns all known config keys with metadata (for empty initial setup)
  getSchema() {
    return Object.entries(KNOWN_KEYS).map(([key, meta]) => ({
      key,
      ...meta,
      isSet: cache.has(key) || !!process.env[key],
    }))
  },
}

// All manageable credentials — the source of truth for the SuperAdmin UI
export const KNOWN_KEYS: Record<string, { label: string; group: string; sensitive: boolean; hint?: string; readonly?: boolean }> = {
  // Asaas
  ASAAS_API_KEY:      { label: 'Asaas API Key',         group: 'asaas', sensitive: true,  hint: 'Encontre em app.asaas.com → Integrações → API' },
  ASAAS_ENV:          { label: 'Ambiente',               group: 'asaas', sensitive: false, hint: 'sandbox → https://sandbox.asaas.com | production → https://api.asaas.com' },
  ASAAS_ACCOUNT_ID:   { label: 'Asaas Account ID',       group: 'asaas', sensitive: false, hint: 'ID da conta principal da plataforma — usado para split e transferências a subcontas (ex.: 4be15b3d-...)' },
  ASAAS_WEBHOOK_TOKEN: { label: 'Asaas Webhook Token', group: 'asaas', sensitive: true, hint: 'Token que o Asaas envia no header Authorization dos webhooks (POST /webhook/asaas)' },

  // Conexbot / WhatsApp — base URL é fixa: https://app.conext.click/api/v1
  CONEXBOT_API_KEY:        { label: 'Conexbot API Key',        group: 'conexbot', sensitive: true,  hint: 'Formato cxk_... — gerada em app.conext.click → Developer → Nova Key' },
  CONEXBOT_PHONE_ID:       { label: 'Conexbot Phone ID',       group: 'conexbot', sensitive: false, hint: 'Phone ID do número conectado (ex.: 1273538359175913)' },
  CONEXBOT_WEBHOOK_SECRET: { label: 'Conexbot Webhook Secret', group: 'conexbot', sensitive: true,  hint: 'Segredo para validar assinatura dos eventos recebidos' },
  WHATSAPP_ORDER_NUMBER:   { label: 'Número para pedidos via WhatsApp', group: 'conexbot', sensitive: false, hint: 'Formato internacional sem símbolos, ex.: 5511999998888 — usado nos botões "Pedir pelo WhatsApp" do site' },

  // Polygon / FGOL
  POLYGON_RPC_URL: { label: 'Polygon RPC URL', group: 'polygon', sensitive: false, hint: 'Ex.: https://polygon-rpc.com ou Alchemy/Infura' },
  FGOL_CONTRACT: { label: 'Endereço do contrato FGOL', group: 'polygon', sensitive: false, hint: '0xa1B7797F97eE6C928A6Ce0E403f345b68945C6D7' },
  PLATFORM_WALLET_KEY: { label: 'Chave privada da carteira da plataforma', group: 'polygon', sensitive: true, hint: 'Carteira que executa buybacks — NUNCA compartilhe' },
  FGOL_ONCHAIN_BATCH_THRESHOLD_BRL: { label: 'Valor mínimo p/ enviar FGOL à blockchain (R$)', group: 'polygon', sensitive: false, hint: 'Comissões acumulam em pendingOnChainAmount até bater esse valor, aí vira 1 transferência real na carteira do usuário. Evita 1 tx a cada centavo de comissão.' },
  FGOL_MIN_PIX_WITHDRAWAL_BRL: { label: 'Valor mínimo p/ saque via PIX (R$)', group: 'polygon', sensitive: false, hint: 'Abaixo desse valor em FGOL, o usuário não consegue solicitar saque em PIX — só usar no marketplace.' },

  // Matriz de afiliados
  MATRIX_WIDTH: { label: 'Largura da matriz (indicados diretos por linha)', group: 'matrix', sensitive: false, hint: 'Ex.: 5 = matriz 5x5. Ao encher, os próximos indicados transbordam pro indicado mais antigo com vaga. Quando a matriz inteira enche, o afiliado reentra com um ciclo novo.' },
  MATRIX_DEPTH: { label: 'Profundidade da matriz (níveis que pagam comissão)', group: 'matrix', sensitive: false, hint: 'Quantos níveis acima de quem consumiu recebem comissão de rede — cada nível usa a % configurada abaixo (Nível 1 = R$/comissão do indicador direto).' },

  // Comissão — cada corte é um % do "margin" (valor que a distribuidora/estabelecimento
  // ofereceu de cashback). Os cortes + os níveis de rede juntos não precisam somar
  // exatamente 100% — o que sobra fica retido (não é distribuído a ninguém).
  CONSUMER_CASHBACK_PCT: { label: 'Cashback do consumidor (%)', group: 'commissions', sensitive: false, hint: 'Ex.: 20 = 20% do margin volta pro próprio consumidor que comprou.' },
  PLATFORM_CUT_PCT: { label: 'Corte da plataforma (%)', group: 'commissions', sensitive: false, hint: 'Ex.: 30 = 30% do margin vira receita da empresa (CompanyRevenue).' },
  CREDENCIADOR_PCT: { label: 'Comissão do credenciador — padrão (%)', group: 'commissions', sensitive: false, hint: 'Ex.: 10 = 10% do margin vai pra quem credenciou a distribuidora/estabelecimento envolvido na compra. Qualquer afiliado pode virar credenciador — essa é a taxa base.' },
  CREDENCIADOR_PREMIUM_PCT: { label: 'Comissão do credenciador — com plano (%)', group: 'commissions', sensitive: false, hint: 'Taxa maior usada quando o credenciador tem assinatura ativa do plano definido em "Slug do plano de credenciador" abaixo. Se vazio ou igual ao padrão, não tem efeito.' },
  CREDENCIADOR_PLAN_SLUG: { label: 'Slug do plano de credenciador', group: 'commissions', sensitive: false, hint: 'O "slug" (em Planos) da assinatura que dá a taxa premium de credenciador. Ex.: "credenciador-pro". Crie o plano em Monetização → Planos primeiro.' },
  MATRIX_LEVEL_1_PCT: { label: 'Rede — Nível 1 (%)', group: 'commissions', sensitive: false, hint: 'Comissão de rede pro indicador direto (1 nível acima de quem comprou).' },
  MATRIX_LEVEL_2_PCT: { label: 'Rede — Nível 2 (%)', group: 'commissions', sensitive: false },
  MATRIX_LEVEL_3_PCT: { label: 'Rede — Nível 3 (%)', group: 'commissions', sensitive: false },
  MATRIX_LEVEL_4_PCT: { label: 'Rede — Nível 4 (%)', group: 'commissions', sensitive: false },
  MATRIX_LEVEL_5_PCT: { label: 'Rede — Nível 5 (%)', group: 'commissions', sensitive: false },
  MATRIX_LEVEL_6_PCT: { label: 'Rede — Nível 6 (%)', group: 'commissions', sensitive: false, hint: 'Só usado se a Profundidade da matriz acima for 6 ou mais.' },
  MATRIX_LEVEL_7_PCT: { label: 'Rede — Nível 7 (%)', group: 'commissions', sensitive: false, hint: 'Só usado se a Profundidade da matriz acima for 7 ou mais.' },
  MATRIX_LEVEL_8_PCT: { label: 'Rede — Nível 8 (%)', group: 'commissions', sensitive: false, hint: 'Só usado se a Profundidade da matriz acima for 8 ou mais.' },
  MATRIX_LEVEL_9_PCT: { label: 'Rede — Nível 9 (%)', group: 'commissions', sensitive: false, hint: 'Só usado se a Profundidade da matriz acima for 9 ou mais.' },
  MATRIX_LEVEL_10_PCT: { label: 'Rede — Nível 10 (%)', group: 'commissions', sensitive: false, hint: 'Só usado se a Profundidade da matriz acima for 10 ou mais.' },

  // Web3Auth
  WEB3AUTH_CLIENT_ID:     { label: 'Web3Auth Client ID',     group: 'web3auth', sensitive: false, hint: 'Encontre em dashboard.web3auth.io → seu projeto → Client ID' },
  WEB3AUTH_CLIENT_SECRET: { label: 'Web3Auth Client Secret', group: 'web3auth', sensitive: true,  hint: 'Usado para verificar JWTs no servidor' },
  WEB3AUTH_NETWORK:       { label: 'Web3Auth Network',       group: 'web3auth', sensitive: false, hint: 'sapphire_mainnet (prod) ou sapphire_devnet (teste)' },

  // Google OAuth
  GOOGLE_CLIENT_ID:     { label: 'Google Client ID',     group: 'google', sensitive: false, hint: 'OAuth 2.0 Client ID do Google Cloud Console (Web client)' },
  GOOGLE_CLIENT_SECRET: { label: 'Google Client Secret', group: 'google', sensitive: true,  hint: 'OAuth 2.0 Client Secret — nunca exponha no frontend' },

  // SMTP / Email
  SMTP_HOST: { label: 'SMTP Host', group: 'email', sensitive: false, hint: 'Ex.: smtp.gmail.com, smtp.sendgrid.net' },
  SMTP_PORT: { label: 'SMTP Port', group: 'email', sensitive: false, hint: '587 (TLS) ou 465 (SSL)' },
  SMTP_USER: { label: 'SMTP Usuário', group: 'email', sensitive: false },
  SMTP_PASS: { label: 'SMTP Senha / App Password', group: 'email', sensitive: true },
  SMTP_FROM_EMAIL: { label: 'E-mail remetente', group: 'email', sensitive: false, hint: 'Ex.: noreply@gaspago.app' },
  SMTP_FROM_NAME: { label: 'Nome remetente', group: 'email', sensitive: false, hint: 'Ex.: Gás Pago' },

}
