import { prisma } from '../shared/prisma'

export interface In1888ReportSummary {
  year: number
  month: number
  totalVolumeBrl: number
  thresholdBrl: number
  requiresDeclaration: boolean
  operationsCount: number
  certificateA1Configured: boolean
  scope: string
}

export const In1888EcacService = {
  /**
   * Calcula a movimentação mensal de Criptoativos (FGOL / Polygon) de Residentes no Brasil (CPF/CNPJ)
   * e verifica obrigatoriedade de declaração à Receita Federal perante a IN 1888/2019 (> R$ 30k/mês).
   * 
   * NOTA FISCAL: Conforme a IN 1888/2019 Art. 6º §2º, a obrigação aplica-se SOMENTE a pessoas físicas (CPF)
   * ou pessoas jurídicas (CNPJ) residentes/domiciliadas fiscalmente no Brasil. Estrangeiros/não-residentes são ISENTOS.
   */
  async getMonthlySummary(year?: number, month?: number): Promise<In1888ReportSummary> {
    const now = new Date()
    const targetYear = year ?? now.getFullYear()
    const targetMonth = month ?? (now.getMonth() + 1)

    const startDate = new Date(targetYear, targetMonth - 1, 1)
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59)

    // Busca batches de buyback e movimentações do mês
    const buybacks = await prisma.buybackBatch.findMany({
      where: {
        executedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    const totalVolumeBrl = buybacks.reduce((sum, b) => sum + Number(b.brlSpent), 0)

    const thresholdBrl = 30000.0
    const requiresDeclaration = totalVolumeBrl >= thresholdBrl

    // Verifica se certificado A1 está salvo nas configurações do sistema
    const certConfig = await prisma.systemConfig.findUnique({
      where: { key: 'ECAC_CERT_A1_PFX' },
    })

    return {
      year: targetYear,
      month: targetMonth,
      totalVolumeBrl,
      thresholdBrl,
      requiresDeclaration,
      operationsCount: buybacks.length,
      certificateA1Configured: !!certConfig?.value,
      scope: 'SOMENTE_RESIDENTES_BRASIL_CPF_CNPJ',
    }
  },


  /**
   * Gera o arquivo XML com o layout oficial exigido pela Receita Federal (IN 1888/2019 - e-CAC)
   * para importação direta no sistema de declaração da Receita ou envio automatizado.
   */
  async generateXmlIn1888(year: number, month: number): Promise<string> {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59)

    const [buybacks, companyConfig] = await Promise.all([
      prisma.buybackBatch.findMany({
        where: {
          executedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { executedAt: 'asc' },
      }),
      prisma.systemConfig.findMany({
        where: {
          key: { in: ['COMPANY_CNPJ', 'COMPANY_RAZAO_SOCIAL', 'COMPANY_RESPONSAVEL_CPF'] },
        },
      }),
    ])

    const configMap = Object.fromEntries(companyConfig.map((c) => [c.key, c.value]))
    const cnpj = (configMap['COMPANY_CNPJ'] ?? '00000000000000').replace(/\D/g, '')
    const razaoSocial = configMap['COMPANY_RAZAO_SOCIAL'] ?? 'GÁS PAGO TECNOLOGIA LTDA'
    const respCpf = (configMap['COMPANY_RESPONSAVEL_CPF'] ?? '00000000000').replace(/\D/g, '')

    const monthPadded = month.toString().padStart(2, '0')

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
    xml += `<DeclaracaoIN1888 xmlns="http://www.receita.fazenda.gov.br/in1888/v1">\n`
    xml += `  <Cabecalho>\n`
    xml += `    <CNPJDeclarante>${cnpj}</CNPJDeclarante>\n`
    xml += `    <RazaoSocial>${razaoSocial}</RazaoSocial>\n`
    xml += `    <CPFResponsavel>${respCpf}</CPFResponsavel>\n`
    xml += `    <Ano>${year}</Ano>\n`
    xml += `    <Mes>${monthPadded}</Mes>\n`
    xml += `    <VersaoLayout>1.0</VersaoLayout>\n`
    xml += `  </Cabecalho>\n`

    xml += `  <OperacoesCriptoativos>\n`

    buybacks.forEach((b, idx) => {
      const dateIso = b.executedAt.toISOString().split('T')[0]
      xml += `    <Operacao id="OP-${idx + 1}">\n`
      xml += `      <Data>${dateIso}</Data>\n`
      xml += `      <TipoOperacao>COMPRA_RECOMPRA</TipoOperacao>\n`
      xml += `      <SimboloCriptoativo>FGOL</SimboloCriptoativo>\n`
      xml += `      <NomeCriptoativo>FGOL Token (Polygon)</NomeCriptoativo>\n`
      xml += `      <Quantidade>${b.fgolAcquired.toFixed(4)}</Quantidade>\n`
      xml += `      <ValorUnitarioBRL>${b.pricePerFgol.toFixed(4)}</ValorUnitarioBRL>\n`
      xml += `      <ValorTotalBRL>${b.brlSpent.toFixed(2)}</ValorTotalBRL>\n`
      xml += `      <HashTransacao>${b.polygonTxHash ?? ''}</HashTransacao>\n`
      xml += `    </Operacao>\n`
    })

    xml += `  </OperacoesCriptoativos>\n`
    xml += `</DeclaracaoIN1888>`

    return xml
  },
}
