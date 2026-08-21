import axios from 'axios'
import { prisma } from '../shared/prisma'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

export const NotificationService = {
  async sendToUser(userId: string, title: string, body: string, data?: Record<string, unknown>) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { pushToken: true } })
    if (!user?.pushToken) return
    await this.send(user.pushToken, title, body, data)
  },

  async send(pushToken: string, title: string, body: string, data?: Record<string, unknown>) {
    if (!pushToken.startsWith('ExponentPushToken[')) return
    try {
      await axios.post(EXPO_PUSH_URL, { to: pushToken, title, body, data: data ?? {}, sound: 'default', priority: 'high' },
        { headers: { 'Content-Type': 'application/json', Accept: 'application/json' } })
    } catch (err) {
      console.error('Push failed:', err)
    }
  },

  async sendToMany(userIds: string[], title: string, body: string) {
    const users = await prisma.user.findMany({ where: { id: { in: userIds }, pushToken: { not: null } }, select: { pushToken: true } })
    await Promise.all(users.map(u => this.send(u.pushToken!, title, body)))
  },
}
