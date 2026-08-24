export interface CnpjAuditResult {
  cnpj: string
  razaoSocial: string
  nomeFantasia: string
  situacaoCadastral: string
  dataSituacaoCadastral: string
  cnaeFiscalPrincipal: {
    codigo: number
    descricao: string
  }
  cnaesSecundarios: {
    codigo: number
    descricao: string
  }[]
  isGasVendorEligible: boolean
  endereco: {
    logradouro: string
    numero: string
    bairro: string
    municipio: string
    uf: string
    cep: string
  }
}

export const CnpjAuditorService = {
  /**
   * Consulta pública gratuita da Receita Federal via BrasilAPI (R$ 0,00).
   * Valida razão social, situação cadastral ATIVA e CNAE de revenda de gás GLP (CNAE 4784-9/00 ou 4682-6/00).
   */
  async auditCnpj(cnpjInput: string): Promise<CnpjAuditResult> {
    const cleanCnpj = cnpjInput.replace(/\D/g, '')
    if (cleanCnpj.length !== 14) {
      throw Object.assign(new Error('CNPJ deve conter 14 dígitos.'), { statusCode: 400 })
    }

    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`, {
        headers: { 'User-Agent': 'GasPago-Api/3.0' },
      })

      if (!res.ok) {
        if (res.status === 404) {
          throw Object.assign(new Error('CNPJ não encontrado na base da Receita Federal.'), { statusCode: 404 })
        }
        throw Object.assign(new Error('Serviço da Receita Federal temporariamente indisponível.'), { statusCode: 502 })
      }

      const data = await res.json() as any

      const mainCnae = data.cnae_fiscal || 0
      const cnaesSec = (data.cnaes_secundarios ?? []).map((c: any) => c.codigo)

      // CNAEs relacionados a Gás GLP (Comércio varejista ou atacadista de gás liquefeito de petróleo)
      // 4784900 = Comércio varejista de gás liqüefeito de petróleo (GLP)
      // 4682600 = Comércio atacadista de gás liqüefeito de petróleo (GLP)
      const gasCnaes = [4784900, 4682600, 47849]
      const allCnaes = [mainCnae, ...cnaesSec]
      const isGasVendorEligible = allCnaes.some((code) => gasCnaes.includes(code))

      return {
        cnpj: cleanCnpj,
        razaoSocial: data.razao_social ?? '',
        nomeFantasia: data.nome_fantasia ?? data.razao_social ?? '',
        situacaoCadastral: data.descricao_situacao_cadastral ?? 'ATIVA',
        dataSituacaoCadastral: data.data_situacao_cadastral ?? '',
        cnaeFiscalPrincipal: {
          codigo: data.cnae_fiscal ?? 0,
          descricao: data.cnae_fiscal_descricao ?? '',
        },
        cnaesSecundarios: (data.cnaes_secundarios ?? []).map((c: any) => ({
          codigo: c.codigo,
          descricao: c.descricao,
        })),
        isGasVendorEligible,
        endereco: {
          logradouro: data.logradouro ?? '',
          numero: data.numero ?? '',
          bairro: data.bairro ?? '',
          municipio: data.municipio ?? '',
          uf: data.uf ?? '',
          cep: data.cep ?? '',
        },
      }
    } catch (err: any) {
      if (err.statusCode) throw err
      throw Object.assign(new Error('Não foi possível consultar o CNPJ na Receita Federal.'), { statusCode: 500 })
    }
  },
}
