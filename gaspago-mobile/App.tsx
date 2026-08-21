import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';

import { AuthNavigator } from '@/navigation';
import { MainNavigator } from '@/navigation';
import { useAuthStore } from '@/store/auth.store';
import { usePushNotifications } from './src/hooks/usePushNotifications';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export default function App() {
  const { token, setToken, setUser } = useAuthStore();
  const [bootstrapping, setBootstrapping] = useState(true);
  usePushNotifications();

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const stored = await SecureStore.getItemAsync('gaspago_token');
        if (stored) {
          setToken(stored);
        }
      } catch (_) {
        // no stored token — start unauthenticated
      } finally {
        setBootstrapping(false);
      }
    };
    bootstrap();
  }, []);

  if (bootstrapping) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="light" backgroundColor="#0A1628" />
          {token ? <MainNavigator /> : <AuthNavigator />}
        </NavigationContainer>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
