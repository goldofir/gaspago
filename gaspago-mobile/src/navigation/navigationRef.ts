import { createNavigationContainerRef } from '@react-navigation/native';
import type { MainStackParamList } from './index';

// Module-level ref so code outside the component tree (e.g. push-notification
// listeners) can navigate without needing a `navigation` prop passed down.
// Attach it to <NavigationContainer ref={navigationRef}> in App.tsx.
export const navigationRef = createNavigationContainerRef<MainStackParamList>();

/** Navigate to the "Pedidos" tab, e.g. when a push notification is tapped. */
export function navigateToOrders() {
  if (navigationRef.isReady()) {
    navigationRef.navigate('MainTabs', { screen: 'Pedidos' });
  }
}
