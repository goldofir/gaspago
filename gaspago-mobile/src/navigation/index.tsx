import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { NavigatorScreenParams } from '@react-navigation/native';

import { PhoneScreen } from '@/screens/auth/PhoneScreen';
import { OtpScreen } from '@/screens/auth/OtpScreen';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { WalletScreen } from '@/screens/wallet/WalletScreen';
import { OrderGasScreen } from '@/screens/order/OrderGasScreen';
import { OrderConfirmScreen } from '@/screens/order/OrderConfirmScreen';
import { MarketplaceScreen } from '@/screens/marketplace/MarketplaceScreen';
import { EstablishmentListScreen } from '@/screens/marketplace/EstablishmentListScreen';
import { EstablishmentDetailScreen } from '@/screens/marketplace/EstablishmentDetailScreen';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { PosScannerScreen } from '@/screens/pos/PosScannerScreen';
import { MatrixNetworkScreen } from '@/screens/profile/MatrixNetworkScreen';

// ─── Param lists ─────────────────────────────────────────────────────────────

export type AuthStackParamList = {
  Phone: undefined;
  Otp: { phone: string };
};

export type MainTabParamList = {
  Home: undefined;
  Pedidos: undefined;
  Carteira: undefined;
  Marketplace: undefined;
  Perfil: undefined;
};

export type MainStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  OrderConfirm: {
    distributorId: string;
    distributorName: string;
    productId: string;
    price: number;
    cashbackPct: number;
  };
  PosScanner: undefined;
  MatrixNetwork: undefined;
  EstablishmentList: { category: string; categoryLabel: string };
  EstablishmentDetail: { establishmentId: string };
};

// ─── Auth Navigator ───────────────────────────────────────────────────────────

const AuthStack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Phone" component={PhoneScreen} />
      <AuthStack.Screen name="Otp" component={OtpScreen} />
    </AuthStack.Navigator>
  );
}

// ─── Tab bar icon helper ──────────────────────────────────────────────────────

const TAB_ICONS: Record<string, string> = {
  Home: '🏠',
  Pedidos: '📦',
  Carteira: '💎',
  Marketplace: '🏪',
  Perfil: '👤',
};

function TabIcon({
  name,
  focused,
}: {
  name: string;
  focused: boolean;
}) {
  return (
    <View style={styles.iconWrapper}>
      <Text style={[styles.iconEmoji, focused && styles.iconFocused]}>
        {TAB_ICONS[name]}
      </Text>
    </View>
  );
}

// ─── Main Tabs ────────────────────────────────────────────────────────────────

const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} focused={focused} />
        ),
        tabBarLabel: ({ focused }) => (
          <Text
            style={[
              styles.tabLabel,
              focused ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
          >
            {route.name}
          </Text>
        ),
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#FF6524',
        tabBarInactiveTintColor: '#8896A8',
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Pedidos" component={OrderGasScreen} />
      <Tab.Screen name="Carteira" component={WalletScreen} />
      <Tab.Screen name="Marketplace" component={MarketplaceScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ─── Main Navigator (root stack wrapping tabs + modal screens) ────────────────

const MainStack = createNativeStackNavigator<MainStackParamList>();

export function MainNavigator() {
  return (
    <MainStack.Navigator screenOptions={{ headerShown: false }}>
      <MainStack.Screen name="MainTabs" component={MainTabsNavigator} />
      <MainStack.Screen name="OrderConfirm" component={OrderConfirmScreen} />
      <MainStack.Screen
        name="PosScanner"
        component={PosScannerScreen}
        options={{ presentation: 'modal' }}
      />
      <MainStack.Screen
        name="MatrixNetwork"
        component={MatrixNetworkScreen}
        options={{ presentation: 'card' }}
      />
      <MainStack.Screen
        name="EstablishmentList"
        component={EstablishmentListScreen}
        options={{ presentation: 'card' }}
      />
      <MainStack.Screen
        name="EstablishmentDetail"
        component={EstablishmentDetailScreen}
        options={{ presentation: 'card' }}
      />
    </MainStack.Navigator>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#0A1628',
    borderTopWidth: 0,
    height: 64,
    paddingBottom: 8,
    paddingTop: 6,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 22,
    opacity: 0.55,
  },
  iconFocused: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#FF6524',
  },
  tabLabelInactive: {
    color: '#8896A8',
  },
});
