import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379')

const OTP_TTL = 300 // 5 minutes
const OTP_PREFIX = 'otp:'

export const OtpService = {
  async generate(phone: string): Promise<string> {
    const code = String(Math.floor(100000 + Math.random() * 900000))
    await redis.setex(OTP_PREFIX + phone, OTP_TTL, code)
    return code
  },

  async verify(phone: string, code: string): Promise<boolean> {
    const stored = await redis.get(OTP_PREFIX + phone)
    if (!stored || stored !== code) return false
    await redis.del(OTP_PREFIX + phone)
    return true
  },
}
