import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { getMatrix, getCommissions, MatrixLevel } from '@/api/client';

const FLAME = '#FF6524';
const NAVY = '#0A1628';
const GOLD = '#F2B825';
const GROUND = '#F4F6FA';

const LEVEL_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

function LevelCard({ level, data }: { level: number; data: MatrixLevel }) {
  const color = LEVEL_COLORS[level - 1] ?? FLAME;
  const fillPct = data.count > 0 ? Math.min(100, (data.activeCount / data.count) * 100) : 0;

  return (
    <View style={[styles.levelCard, { borderLeftColor: color }]}>
      <View style={styles.levelHeader}>
        <View style={[styles.levelBadge, { backgroundColor: `${color}20` }]}>
          <Text style={[styles.levelBadgeText, { color }]}>N{level}</Text>
        </View>
        <Text style={styles.levelEarned}>
          {data.earned.toLocaleString('pt-BR', { minimumFractionDigits: 4 })} FGOL
        </Text>
      </View>
      <View style={styles.levelRow}>
        <Text style={styles.levelStat}>{data.count} indicados</Text>
        <Text style={[styles.levelStat, { color: '#10B981' }]}>{data.activeCount} ativos</Text>
      </View>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${fillPct}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export function MatrixNetworkScreen() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? '';

  const { data: matrix, isLoading } = useQuery({
    queryKey: ['matrix', userId],
    queryFn: () => getMatrix(userId),
    enabled: Boolean(userId),
  });

  const { data: commissions = [] } = useQuery({
    queryKey: ['commissions', userId],
    queryFn: () => getCommissions(userId),
    enabled: Boolean(userId),
  });

  const networkCommissions = commissions
    .filter((c) => c.type === 'commission')
    .slice(0, 8);

  async function shareReferral() {
    if (!matrix?.referralLink) return;
    await Share.share({
      message: `🔥 Economize no gás e ganhe cashback com o Gás Pago! Use meu link: ${matrix.referralLink}`,
      url: matrix.referralLink,
    });
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator color={FLAME} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Minha Rede 5×5</Text>
          <Text style={styles.subtitle}>Comissões acumuladas da sua rede de indicados</Text>
        </View>

        {/* Total earned card */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total ganho pela rede</Text>
          <Text style={styles.totalAmount}>
            {(matrix?.totalEarned ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 4 })}
          </Text>
          <Text style={styles.totalCurrency}>FGOL</Text>
        </View>

        {/* Level cards */}
        <Text style={styles.sectionTitle}>Níveis da Matriz</Text>
        {(matrix?.levels ?? []).map((lvl) => (
          <LevelCard key={lvl.level} level={lvl.level} data={lvl} />
        ))}
        {(!matrix?.levels || matrix.levels.length === 0) && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🌱</Text>
            <Text style={styles.emptyText}>Sua rede está vazia.</Text>
            <Text style={styles.emptySubtext}>Compartilhe seu link e comece a crescer!</Text>
          </View>
        )}

        {/* Referral share */}
        <View style={styles.referralCard}>
          <Text style={styles.referralLabel}>Seu código de indicação</Text>
          <Text style={styles.referralCode}>{matrix?.referralCode ?? '–'}</Text>
          <TouchableOpacity style={styles.shareBtn} onPress={shareReferral}>
            <Text style={styles.shareBtnText}>🔗  Compartilhar link</Text>
          </TouchableOpacity>
        </View>

        {/* Recent network commissions */}
        {networkCommissions.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Últimas comissões da rede</Text>
            {networkCommissions.map((c) => (
              <View key={c.id} style={styles.commRow}>
                <View>
                  <Text style={styles.commRole}>{c.role_label}</Text>
                  <Text style={styles.commDate}>{new Date(c.created_at).toLocaleDateString('pt-BR')}</Text>
                </View>
                <Text style={[styles.commAmount, { color: c.status === 'frozen' ? '#F59E0B' : '#10B981' }]}>
                  +{c.amount.toFixed(4)} FGOL
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: GROUND },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '800', color: NAVY },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 4 },
  // Total card
  totalCard: {
    backgroundColor: NAVY, borderRadius: 20, padding: 24,
    marginBottom: 24, alignItems: 'center',
    shadowColor: NAVY, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 10,
  },
  totalLabel: { color: '#8896A8', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  totalAmount: { fontSize: 36, fontWeight: '800', color: '#fff', fontVariant: ['tabular-nums'] },
  totalCurrency: { fontSize: 14, color: GOLD, fontWeight: '600', marginTop: 2 },
  // Section
  sectionTitle: { fontSize: 16, fontWeight: '700', color: NAVY, marginBottom: 12, marginTop: 4 },
  // Level card
  levelCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  levelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  levelBadgeText: { fontSize: 12, fontWeight: '800' },
  levelEarned: { fontSize: 14, fontWeight: '700', color: NAVY },
  levelRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  levelStat: { fontSize: 12, color: '#64748B' },
  progressBar: { height: 4, backgroundColor: '#F1F5F9', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  // Empty
  emptyBox: { alignItems: 'center', paddingVertical: 32, backgroundColor: '#fff', borderRadius: 16, marginBottom: 16 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 15, fontWeight: '600', color: NAVY },
  emptySubtext: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
  // Referral
  referralCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, marginVertical: 16,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  referralLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  referralCode: { fontSize: 22, fontWeight: '800', color: NAVY, marginVertical: 8, letterSpacing: 2 },
  shareBtn: {
    backgroundColor: FLAME, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12,
    marginTop: 4,
  },
  shareBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  // Commission rows
  commRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  commRole: { fontSize: 14, fontWeight: '600', color: NAVY },
  commDate: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  commAmount: { fontSize: 14, fontWeight: '700' },
});
