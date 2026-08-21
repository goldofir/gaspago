import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getWallet, getCommissions, Commission } from '@/api/client';
import { useAuthStore } from '@/store/auth.store';

const FLAME = '#FF6524';
const NAVY = '#0A1628';
const GOLD = '#F2B825';
const GROUND = '#F4F6FA';

const TX_STATUS_COLORS: Record<string, string> = {
  available: '#10B981',
  frozen: '#F59E0B',
  paid: '#3B82F6',
};

const TX_STATUS_LABELS: Record<string, string> = {
  available: 'Disponível',
  frozen: 'Congelado',
  paid: 'Pago',
};

const TX_TYPE_ICONS: Record<string, string> = {
  commission: '💰',
  cashback: '🔄',
  withdrawal: '📤',
  freeze: '❄️',
  unfreeze: '☀️',
};

function TxRow({ tx }: { tx: Commission }) {
  const color = TX_STATUS_COLORS[tx.status] ?? '#64748B';
  const isDebit = tx.type === 'withdrawal' || tx.type === 'freeze';
  return (
    <View style={styles.txRow}>
      <View style={styles.txIcon}>
        <Text style={styles.txIconEmoji}>{TX_TYPE_ICONS[tx.type] ?? '💳'}</Text>
      </View>
      <View style={styles.txMeta}>
        <Text style={styles.txRole}>{tx.role_label}</Text>
        <Text style={styles.txDate}>
          {new Date(tx.created_at).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </Text>
      </View>
      <View style={styles.txRight}>
        <Text style={[styles.txAmount, { color: isDebit ? '#EF4444' : '#10B981' }]}>
          {isDebit ? '-' : '+'}
          {Math.abs(tx.amount).toLocaleString('pt-BR', {
            minimumFractionDigits: 4,
          })}{' '}
          FGOL
        </Text>
        <View
          style={[
            styles.txBadge,
            { backgroundColor: `${color}20` },
          ]}
        >
          <Text style={[styles.txBadgeText, { color }]}>
            {TX_STATUS_LABELS[tx.status] ?? tx.status}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function WalletScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const userId = user?.id ?? '';

  const { data: wallet, isLoading: loadingWallet } = useQuery({
    queryKey: ['wallet', userId],
    queryFn: () => getWallet(userId),
    enabled: Boolean(userId),
  });

  const { data: commissions = [], isLoading: loadingCommissions } = useQuery({
    queryKey: ['commissions', userId],
    queryFn: () => getCommissions(userId),
    enabled: Boolean(userId),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['wallet', userId] });
      await queryClient.invalidateQueries({ queryKey: ['commissions', userId] });
    } finally {
      setRefreshing(false);
    }
  }, [queryClient, userId]);

  const isLoading = loadingWallet || loadingCommissions;
  const available = wallet?.fgolBalance ?? 0;
  const frozen = wallet?.fgolFrozen ?? 0;
  const brlEquiv = wallet?.brlEquivalent ?? 0;

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
        <Text style={styles.pageTitle}>Carteira</Text>

        {loadingWallet && !wallet ? (
          <ActivityIndicator color={FLAME} style={{ marginTop: 32 }} />
        ) : (
          <>
            {/* ── Balance cards ── */}
            <View style={styles.balanceRow}>
              <View style={[styles.balCard, styles.balCardAvailable]}>
                <Text style={styles.balCardLabel}>Disponível</Text>
                <Text style={styles.balCardAmount}>
                  {available.toLocaleString('pt-BR', { minimumFractionDigits: 4 })}
                </Text>
                <Text style={styles.balCardUnit}>FGOL</Text>
              </View>
              <View style={[styles.balCard, styles.balCardFrozen]}>
                <Text style={styles.balCardLabel}>Congelado ❄️</Text>
                <Text style={styles.balCardAmount}>
                  {frozen.toLocaleString('pt-BR', { minimumFractionDigits: 4 })}
                </Text>
                <Text style={styles.balCardUnit}>FGOL</Text>
              </View>
            </View>

            {/* ── BRL equiv ── */}
            <View style={styles.brlCard}>
              <Text style={styles.brlLabel}>Equivalente em reais</Text>
              <Text style={styles.brlAmount}>
                R$ {brlEquiv.toFixed(2).replace('.', ',')}
              </Text>
            </View>

            {/* ── Frozen info box ── */}
            <View style={styles.infoBox}>
              <Text style={styles.infoIcon}>ℹ️</Text>
              <View style={styles.infoText}>
                <Text style={styles.infoTitle}>O que é saldo congelado?</Text>
                <Text style={styles.infoBody}>
                  Comissões ficam congeladas enquanto seu status de afiliado está em
                  análise. Após aprovação como afiliado ativo, o saldo é liberado
                  automaticamente em até 24h.
                </Text>
              </View>
            </View>
          </>
        )}

        {/* ── Commission history ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Histórico de comissões</Text>

          {loadingCommissions && commissions.length === 0 ? (
            <ActivityIndicator color={FLAME} style={{ marginTop: 24 }} />
          ) : commissions.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>💳</Text>
              <Text style={styles.emptyText}>Nenhuma transação ainda</Text>
            </View>
          ) : (
            commissions.map((tx) => <TxRow key={tx.id} tx={tx} />)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: GROUND },
  scroll: { flex: 1 },
  content: { paddingBottom: 40 },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: NAVY,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 12,
  },
  balCard: {
    flex: 1,
    borderRadius: 16,
    padding: 18,
  },
  balCardAvailable: {
    backgroundColor: NAVY,
  },
  balCardFrozen: {
    backgroundColor: '#1E3050',
  },
  balCardLabel: {
    fontSize: 11,
    color: '#8896A8',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balCardAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  balCardUnit: {
    fontSize: 11,
    color: GOLD,
    fontWeight: '700',
    marginTop: 4,
  },
  brlCard: {
    marginHorizontal: 20,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  brlLabel: { fontSize: 13, color: '#64748B' },
  brlAmount: { fontSize: 18, fontWeight: '800', color: NAVY },
  infoBox: {
    marginHorizontal: 20,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  infoIcon: { fontSize: 18, marginTop: 2 },
  infoText: { flex: 1 },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4ED8',
    marginBottom: 4,
  },
  infoBody: {
    fontSize: 12,
    color: '#3B5998',
    lineHeight: 18,
  },
  section: { paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 14,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  txIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: GROUND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIconEmoji: { fontSize: 22 },
  txMeta: { flex: 1 },
  txRole: { fontSize: 14, fontWeight: '600', color: NAVY },
  txDate: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  txBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  txBadgeText: { fontSize: 10, fontWeight: '700' },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyText: { fontSize: 14, color: '#94A3B8', fontWeight: '500' },
});
