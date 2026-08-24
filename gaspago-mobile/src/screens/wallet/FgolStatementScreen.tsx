import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getFgolStatement, FgolStatementEntry } from '@/api/client';
import { useAuthStore } from '@/store/auth.store';

const FLAME = '#FF6524';
const NAVY = '#0A1628';
const GOLD = '#F2B825';
const GROUND = '#F4F6FA';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  RELEASED:  { label: 'Disponível',  color: '#10B981', bg: '#ECFDF5', icon: '✅' },
  BLOCKED:   { label: 'Congelado',   color: '#F59E0B', bg: '#FFFBEB', icon: '❄️' },
  EXPIRED:   { label: 'Expirado',    color: '#EF4444', bg: '#FEF2F2', icon: '⌛' },
  PENDING:   { label: 'Pendente',    color: '#6366F1', bg: '#EEF2FF', icon: '🕐' },
  SETTLED:   { label: 'Liquidado',   color: '#64748B', bg: '#F8FAFC', icon: '💸' },
};

const ROLE_LABELS: Record<string, string> = {
  consumer_cashback:  'Cashback de compra',
  network_l1:         'Rede nível 1',
  network_l2:         'Rede nível 2',
  network_l3:         'Rede nível 3',
  network_l4:         'Rede nível 4',
  network_l5:         'Rede nível 5',
  credenciador:       'Comissão credenciador',
  establishment_bonus:'Bônus estabelecimento',
  platform:           'Receita plataforma',
};

const AFFILIATE_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE:  { label: 'Afiliado Ativo',    color: '#10B981', bg: '#ECFDF5' },
  BLOCKED: { label: 'Inativo (1 mês)',   color: '#F59E0B', bg: '#FFFBEB' },
  EXPIRED: { label: 'Expirado (2 meses)',color: '#EF4444', bg: '#FEF2F2' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

// ─── Entry Row ────────────────────────────────────────────────────────────────

function EntryRow({ entry }: { entry: FgolStatementEntry }) {
  const cfg = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.PENDING;
  const roleLabel = ROLE_LABELS[entry.role] ?? entry.role;
  const remaining = entry.expiresAt ? daysUntil(entry.expiresAt) : null;

  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: cfg.bg }]}>
        <Text style={styles.rowIconText}>{cfg.icon}</Text>
      </View>

      <View style={styles.rowMeta}>
        <Text style={styles.rowRole}>{roleLabel}</Text>
        <Text style={styles.rowDate}>{formatDate(entry.createdAt)}</Text>
        {entry.status === 'BLOCKED' && entry.expiresAt && (
          <Text style={[styles.rowExpiry, remaining === 0 && { color: '#EF4444' }]}>
            {remaining === 0
              ? 'Expira hoje!'
              : `Expira em ${remaining} dia${remaining !== 1 ? 's' : ''}`}
          </Text>
        )}
        {entry.status === 'EXPIRED' && entry.expiredAt && (
          <Text style={styles.rowExpiryDead}>
            Expirou em {formatDate(entry.expiredAt)}
          </Text>
        )}
      </View>

      <View style={styles.rowRight}>
        <Text style={styles.rowAmount}>
          +{entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 4 })}
        </Text>
        <Text style={styles.rowCurrency}>FGOL</Text>
        <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export function FgolStatementScreen() {
  const { user } = useAuthStore();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  const userId = user?.id ?? '';

  const { data, isLoading } = useQuery({
    queryKey: ['fgol-statement', userId],
    queryFn: () => getFgolStatement(userId),
    enabled: Boolean(userId),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['fgol-statement', userId] });
    } finally {
      setRefreshing(false);
    }
  }, [queryClient, userId]);

  const summary = data?.summary;
  const allItems = data?.items ?? [];
  const items = filter ? allItems.filter(e => e.status === filter) : allItems;

  const affiliateCfg = AFFILIATE_STATUS_CONFIG[summary?.affiliateStatus ?? 'ACTIVE'];

  const blockedCount = allItems.filter(e => e.status === 'BLOCKED').length;

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
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Extrato FGOL</Text>
        </View>

        {isLoading && !data ? (
          <ActivityIndicator color={FLAME} style={{ marginTop: 60 }} />
        ) : (
          <>
            {/* ── Affiliate status chip ── */}
            {summary && (
              <View style={[styles.affiliateChip, { backgroundColor: affiliateCfg.bg }]}>
                <Text style={[styles.affiliateChipText, { color: affiliateCfg.color }]}>
                  {affiliateCfg.label}
                </Text>
              </View>
            )}

            {/* ── Balance summary ── */}
            <View style={styles.summaryRow}>
              <View style={[styles.sumCard, styles.sumCardAvail]}>
                <Text style={styles.sumLabel}>Disponível</Text>
                <Text style={styles.sumAmount}>
                  {(summary?.available ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 4 })}
                </Text>
                <Text style={styles.sumUnit}>FGOL</Text>
              </View>
              <View style={[styles.sumCard, styles.sumCardFrozen]}>
                <Text style={styles.sumLabel}>Congelado ❄️</Text>
                <Text style={styles.sumAmount}>
                  {(summary?.frozen ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 4 })}
                </Text>
                <Text style={styles.sumUnit}>FGOL</Text>
              </View>
            </View>

            {/* ── Frozen warning ── */}
            {blockedCount > 0 && (
              <View style={styles.warningBox}>
                <Text style={styles.warningIcon}>⚠️</Text>
                <View style={styles.warningText}>
                  <Text style={styles.warningTitle}>
                    {blockedCount} comissão{blockedCount !== 1 ? 'ões' : ''} congelada{blockedCount !== 1 ? 's' : ''}
                  </Text>
                  <Text style={styles.warningBody}>
                    Faça uma compra para reativar e evitar a expiração dos tokens congelados.
                  </Text>
                </View>
              </View>
            )}

            {/* ── Filter tabs ── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
              contentContainerStyle={styles.filterRow}
            >
              {[null, 'RELEASED', 'BLOCKED', 'EXPIRED', 'PENDING', 'SETTLED'].map(f => (
                <TouchableOpacity
                  key={f ?? 'all'}
                  onPress={() => setFilter(f)}
                  style={[styles.filterChip, filter === f && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                    {f === null ? 'Todos' : (STATUS_CONFIG[f]?.label ?? f)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* ── Entries ── */}
            <View style={styles.list}>
              {items.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyIcon}>💎</Text>
                  <Text style={styles.emptyText}>Nenhuma transação encontrada</Text>
                </View>
              ) : (
                items.map(entry => <EntryRow key={entry.id} entry={entry} />)
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: GROUND },
  scroll: { flex: 1 },
  content: { paddingBottom: 48 },

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backBtn: { marginBottom: 8 },
  backText: { fontSize: 15, color: FLAME, fontWeight: '600' },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: NAVY,
  },

  affiliateChip: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  affiliateChipText: { fontSize: 13, fontWeight: '700' },

  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  sumCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
  },
  sumCardAvail: { backgroundColor: NAVY },
  sumCardFrozen: { backgroundColor: '#1E3050' },
  sumLabel: {
    fontSize: 10,
    color: '#8896A8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  sumAmount: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  sumUnit: { fontSize: 10, color: GOLD, fontWeight: '700', marginTop: 3 },

  warningBox: {
    marginHorizontal: 20,
    borderRadius: 14,
    backgroundColor: '#FFFBEB',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    padding: 14,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  warningIcon: { fontSize: 18, marginTop: 1 },
  warningText: { flex: 1 },
  warningTitle: { fontSize: 13, fontWeight: '700', color: '#92400E', marginBottom: 3 },
  warningBody: { fontSize: 12, color: '#B45309', lineHeight: 17 },

  filterScroll: { marginBottom: 16 },
  filterRow: { paddingHorizontal: 20, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: NAVY,
    borderColor: NAVY,
  },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  filterChipTextActive: { color: '#FFFFFF' },

  list: { paddingHorizontal: 20, gap: 8 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconText: { fontSize: 20 },
  rowMeta: { flex: 1 },
  rowRole: { fontSize: 13, fontWeight: '600', color: NAVY, marginBottom: 2 },
  rowDate: { fontSize: 11, color: '#94A3B8' },
  rowExpiry: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '600',
    marginTop: 2,
  },
  rowExpiryDead: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 2,
  },
  rowRight: { alignItems: 'flex-end' },
  rowAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
    fontVariant: ['tabular-nums'],
    marginBottom: 2,
  },
  rowCurrency: { fontSize: 10, color: GOLD, fontWeight: '700', marginBottom: 4 },

  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },

  emptyBox: {
    alignItems: 'center',
    paddingVertical: 48,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyText: { fontSize: 14, color: '#94A3B8', fontWeight: '500' },
});
