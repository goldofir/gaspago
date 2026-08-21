import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMe, getOrders, getWallet, Order } from '@/api/client';
import { useAuthStore } from '@/store/auth.store';

const FLAME = '#FF6524';
const NAVY = '#0A1628';
const GOLD = '#F2B825';
const GROUND = '#F4F6FA';

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  confirmed: '#3B82F6',
  delivering: '#8B5CF6',
  delivered: '#10B981',
  cancelled: '#EF4444',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  delivering: 'Entregando',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: `${STATUS_COLORS[status] || '#64748B'}20` },
      ]}
    >
      <Text style={[styles.badgeText, { color: STATUS_COLORS[status] || '#64748B' }]}>
        {STATUS_LABELS[status] || status}
      </Text>
    </View>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

function OrderCard({ order }: { order: Order }) {
  return (
    <View style={styles.orderCard}>
      <View style={styles.orderRow}>
        <Text style={styles.orderDistributor}>{order.distributor_name}</Text>
        <StatusBadge status={order.status} />
      </View>
      <View style={styles.orderRow}>
        <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
        <Text style={styles.orderTotal}>
          R$ {order.total_brl.toFixed(2).replace('.', ',')}
        </Text>
      </View>
    </View>
  );
}

export function HomeScreen() {
  const { user: storedUser, setUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const me = await getMe();
      setUser(me);
      return me;
    },
  });

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['orders'],
    queryFn: () => getOrders(10),
  });

  const userId = (meData ?? storedUser)?.id;

  const { data: wallet } = useQuery({
    queryKey: ['wallet', userId],
    queryFn: () => getWallet(userId!),
    enabled: Boolean(userId),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      if (userId) {
        await queryClient.invalidateQueries({ queryKey: ['wallet', userId] });
      }
    } finally {
      setRefreshing(false);
    }
  }, [queryClient, userId]);

  const displayUser = meData ?? storedUser;
  const firstName = displayUser?.name?.split(' ')[0] ?? 'Usuário';
  const fgolBalance = wallet?.fgolBalance ?? displayUser?.fgol_balance ?? 0;
  const fgolFrozen = wallet?.fgolFrozen ?? displayUser?.fgol_frozen ?? 0;
  const brlEquiv = wallet?.brlEquivalent ?? fgolBalance * 1.0;
  const recentOrders = orders.slice(0, 3);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={FLAME}
            colors={[FLAME]}
          />
        }
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Olá, {firstName}! 👋</Text>
            <Text style={styles.subGreeting}>O que você precisa hoje?</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn}>
            <Text style={styles.bellEmoji}>🔔</Text>
          </TouchableOpacity>
        </View>

        {/* ── FGOL Balance card ── */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceTop}>
            <Text style={styles.balanceLabel}>Seu saldo FGOL</Text>
            <View style={styles.goldDot} />
          </View>
          <Text style={styles.balanceAmount}>
            {fgolBalance.toLocaleString('pt-BR', { minimumFractionDigits: 4 })}
          </Text>
          <Text style={styles.balanceBrl}>
            ≈ R$ {brlEquiv.toFixed(2).replace('.', ',')}
          </Text>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceFrozenRow}>
            <Text style={styles.balanceFrozenLabel}>Congelado</Text>
            <Text style={styles.balanceFrozenValue}>
              {fgolFrozen.toLocaleString('pt-BR', { minimumFractionDigits: 4 })} FGOL
            </Text>
          </View>
        </View>

        {/* ── Quick action ── */}
        <TouchableOpacity style={styles.orderBtn} activeOpacity={0.85}>
          <Text style={styles.orderBtnEmoji}>🔥</Text>
          <View>
            <Text style={styles.orderBtnTitle}>Pedir Gás</Text>
            <Text style={styles.orderBtnSub}>Entrega em 30–60 min</Text>
          </View>
          <Text style={styles.orderBtnArrow}>→</Text>
        </TouchableOpacity>

        {/* ── Quick actions row ── */}
        <View style={styles.quickRow}>
          <TouchableOpacity
            style={styles.quickCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('PosScanner')}
          >
            <Text style={styles.quickEmoji}>💳</Text>
            <Text style={styles.quickTitle}>Pagar no Balcão</Text>
            <Text style={styles.quickSub}>QR Code POS</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('MatrixNetwork')}
          >
            <Text style={styles.quickEmoji}>🌳</Text>
            <Text style={styles.quickTitle}>Minha Rede</Text>
            <Text style={styles.quickSub}>Matriz 5×5</Text>
          </TouchableOpacity>
        </View>

        {/* ── Recent orders ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pedidos recentes</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          {loadingOrders ? (
            <ActivityIndicator color={FLAME} style={{ marginTop: 16 }} />
          ) : recentOrders.length === 0 ? (
            <View style={styles.emptyOrders}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyText}>
                Você ainda não fez nenhum pedido.
              </Text>
              <Text style={styles.emptySubtext}>
                Peça seu primeiro botijão agora!
              </Text>
            </View>
          ) : (
            recentOrders.map((o) => <OrderCard key={o.id} order={o} />)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: GROUND },
  scroll: { flex: 1 },
  content: { paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  greeting: { fontSize: 22, fontWeight: '800', color: NAVY },
  subGreeting: { fontSize: 13, color: '#64748B', marginTop: 2 },
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  bellEmoji: { fontSize: 20 },
  // Balance card
  balanceCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    backgroundColor: NAVY,
    padding: 22,
    marginBottom: 16,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  balanceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  balanceLabel: { color: '#8896A8', fontSize: 13, fontWeight: '600' },
  goldDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: GOLD,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  balanceBrl: {
    fontSize: 14,
    color: GOLD,
    fontWeight: '600',
    marginTop: 4,
  },
  balanceDivider: {
    height: 1,
    backgroundColor: '#1E3050',
    marginVertical: 14,
  },
  balanceFrozenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceFrozenLabel: { color: '#8896A8', fontSize: 12 },
  balanceFrozenValue: { color: '#8896A8', fontSize: 12, fontWeight: '600' },
  // Order button
  orderBtn: {
    marginHorizontal: 20,
    borderRadius: 16,
    backgroundColor: FLAME,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
    shadowColor: FLAME,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  orderBtnEmoji: { fontSize: 28 },
  orderBtnTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  orderBtnSub: {
    fontSize: 12,
    color: '#FFD0B8',
    marginTop: 2,
  },
  orderBtnArrow: {
    marginLeft: 'auto',
    fontSize: 20,
    color: '#fff',
    fontWeight: '700',
  },
  // Section
  section: { paddingHorizontal: 20 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: NAVY },
  seeAll: { fontSize: 13, color: FLAME, fontWeight: '600' },
  // Order card
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderDistributor: { fontSize: 15, fontWeight: '700', color: NAVY, flex: 1 },
  orderDate: { fontSize: 13, color: '#94A3B8' },
  orderTotal: { fontSize: 15, fontWeight: '700', color: NAVY },
  // Badge
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  // Empty
  emptyOrders: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: 15, fontWeight: '600', color: NAVY },
  emptySubtext: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
  // Quick actions
  quickRow: {
    flexDirection: 'row', gap: 12,
    marginHorizontal: 20, marginBottom: 24,
  },
  quickCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: '#E2E8F0',
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  quickEmoji: { fontSize: 28, marginBottom: 8 },
  quickTitle: { fontSize: 13, fontWeight: '700', color: NAVY, textAlign: 'center' },
  quickSub: { fontSize: 11, color: '#94A3B8', marginTop: 2, textAlign: 'center' },
});
