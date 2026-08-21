import { useEffect, useRef } from 'react'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { useAuthStore } from '../store/auth.store'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null

  const { status: existing } = await Notifications.getPermissionsAsync()
  let finalStatus = existing
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }
  if (finalStatus !== 'granted') return null

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6524',
    })
  }

  return token
}

export function usePushNotifications() {
  const { token: authToken } = useAuthStore()
  const notifListener = useRef<Notifications.Subscription>()
  const responseListener = useRef<Notifications.Subscription>()
  const API = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.0.100:3030'

  useEffect(() => {
    if (!authToken) return

    registerForPushNotifications().then(async (pushToken) => {
      if (!pushToken) return
      try {
        await fetch(API + '/notifications/device-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + authToken },
          body: JSON.stringify({ pushToken }),
        })
      } catch (e) {
        console.log('Push token registration failed:', e)
      }
    })

    notifListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification)
    })

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data
      console.log('Notification tapped:', data)
      // TODO: navigate to relevant screen based on data.orderId, etc.
    })

    return () => {
      if (notifListener.current) Notifications.removeNotificationSubscription(notifListener.current)
      if (responseListener.current) Notifications.removeNotificationSubscription(responseListener.current)
    }
  }, [authToken])
}
