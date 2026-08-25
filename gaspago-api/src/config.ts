export const config = {
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  logLevel: (process.env.LOG_LEVEL ?? 'info') as string,
  jwtSecret: process.env.JWT_SECRET!,

  db: { url: process.env.DATABASE_URL! },
  redis: { url: process.env.REDIS_URL! },

  asaas: {
    apiKey: process.env.ASAAS_API_KEY!,
    baseUrl: process.env.ASAAS_BASE_URL ?? 'https://sandbox.asaas.com/api/v3',
  },

  polygon: {
    rpcUrl: process.env.POLYGON_RPC_URL ?? 'https://polygon-rpc.com',
    fgolContract: process.env.FGOL_CONTRACT!,
    platformWalletKey: process.env.PLATFORM_WALLET_KEY!,
  },

  web3auth: {
    clientId:     process.env.WEB3AUTH_CLIENT_ID!,
    clientSecret: process.env.WEB3AUTH_CLIENT_SECRET!,
    network:      process.env.WEB3AUTH_NETWORK ?? 'sapphire_devnet',
  },

  pos: {
    qrJwtSecret: process.env.QR_JWT_SECRET!,
    qrExpiresMinutes: Number(process.env.QR_EXPIRES_MINUTES ?? 5),
  },

  // Commission rules
  commission: {
    consumerPct: 0.20,
    platformPct: 0.30,
    networkPct: 0.35,
    credenciadorPct: 0.10,
    establishmentBonusPct: 0.05,
    // Affiliate state machine
    blockAfterMonths: 1,
    expireAfterMonths: 2,
  },
}
