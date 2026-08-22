import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { getMe, apiClient } from '@/api/client';
import { useAuthStore } from '@/store/auth.store';

const FLAME = '#FF6524';
const NAVY = '#0A1628';
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'http://192.168.0.100:3031';
const GOLD = '#F2B825';
const GROUND = '#F4F6FA';

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

function maskCpf(cpf?: string): string {
  if (!cpf) return '—';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.***.**${digits.slice(-2)}-**`;
}

function maskPhone(phone?: string): string {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return phone;
  return `(${digits.slice(-11, -9)}) *****-${digits.slice(-4)}`;
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

interface SubscriptionInfo {
  plan: 'FREE' | 'PREMIUM';
  status?: string;
}

export function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const [copied, setCopied] = useState(false);

  // Subscription state
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);
  const [subLoading, setSubLoading] = useState(false);

  // Upgrade modal state
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [pixCopied, setPixCopied] = useState(false);

  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
  });

  const displayUser = meData || user;
  const name = displayUser?.name ?? 'Usuário';
  const plan = displayUser?.plan ?? 'FREE';
  const referralCode = displayUser?.referral_code ?? '—';

  // Fetch subscription info
  const fetchSubscription = useCallback(async () => {
    setSubLoading(true);
    try {
      const res = await apiClient.get<SubscriptionInfo>('/subscriptions/me');
      setSubInfo(res.data);
    } catch {
      // Fallback to plan from user profile
      setSubInfo({ plan: plan as 'FREE' | 'PREMIUM' });
    } finally {
      setSubLoading(false);
    }
  }, [plan]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const currentPlan = subInfo?.plan ?? plan;

  // Upgrade to Premium: call POST /subscriptions/subscribe
  const handleUpgrade = async () => {
    setUpgradeLoading(true);
    setUpgradeError(null);
    setPixCode(null);
    try {
      const res = await apiClient.post('/subscriptions/subscribe');
      const data = res.data as { pixQrCode?: string };
      if (data?.pixQrCode) {
        setPixCode(data.pixQrCode);
      } else {
        setPixCode(null);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setUpgradeError(
        e?.response?.data?.message ?? 'Não foi possível criar a assinatura.',
      );
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleOpenUpgrade = () => {
    setUpgradeVisible(true);
    setPixCode(null);
    setUpgradeError(null);
    handleUpgrade();
  };

  const handleCopyPixCode = async () => {
    if (pixCode) {
      await Clipboard.setStringAsync(pixCode);
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 2000);
    }
  };

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = () => {
    Alert.alert('Sair da conta', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: logout,
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Page title ── */}
        <Text style={styles.pageTitle}>Perfil</Text>

        {/* ── Avatar + name ── */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(name)}</Text>
          </View>
          <Text style={styles.userName}>{name}</Text>
          <View style={[styles.planBadge, plan === 'PREMIUM' && styles.planBadgePremium]}>
            <Text style={[styles.planText, plan === 'PREMIUM' && styles.planTextPremium]}>
              {plan === 'PREMIUM' ? '⭐ PREMIUM' : 'FREE'}
            </Text>
          </View>
        </View>

        {/* ── Info card ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dados pessoais</Text>
          <InfoRow label="Nome" value={name} />
          <View style={styles.divider} />
          <InfoRow label="Telefone" value={maskPhone(displayUser?.phone)} />
          <View style={styles.divider} />
          <InfoRow label="CPF" value={maskCpf(displayUser?.cpf)} />
          <View style={styles.divider} />
          <InfoRow label="E-mail" value={displayUser?.email ?? '—'} />
        </View>

        {/* ── Subscription plan card ── */}
        <Text style={styles.sectionLabel}>Seu Plano</Text>
        {subLoading ? (
          <View style={styles.subLoadingBox}>
            <ActivityIndicator color={FLAME} />
          </View>
        ) : currentPlan === 'PREMIUM' ? (
          <View style={[styles.subCard, styles.subCardPremium]}>
            <View style={styles.subCardRow}>
              <View style={styles.subCardInfo}>
                <Text style={styles.subPlanName}>Premium R$ 29,90/mês</Text>
                <Text style={styles.subPlanDesc}>
                  Cashback dobrado + suporte prioritário
                </Text>
              </View>
              <Text style={styles.subPlanEmoji}>🏆</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.cancelLink}>Cancelar assinatura</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.subCard, styles.subCardFree]}>
            <View style={styles.subCardRow}>
              <View style={styles.subCardInfo}>
                <Text style={styles.subPlanNameFree}>Gratuito</Text>
                <Text style={styles.subPlanDescFree}>Sem cashback extra</Text>
              </View>
              <Text style={styles.subPlanEmoji}>🔓</Text>
            </View>
            <TouchableOpacity
              style={styles.upgradeBtn}
              onPress={handleOpenUpgrade}
              activeOpacity={0.85}
            >
              <Text style={styles.upgradeBtnText}>🔥 Upgrade para Premium</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Upgrade Modal ── */}
        <Modal
          visible={upgradeVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setUpgradeVisible(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setUpgradeVisible(false)}
          >
            <Pressable style={styles.modalSheet} onPress={() => {}}>
              {/* Close button */}
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setUpgradeVisible(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>

              <Text style={styles.modalTitle}>Upgrade para Premium</Text>
              <Text style={styles.modalSubtitle}>R$ 29,90/mês · Cancele quando quiser</Text>

              {upgradeLoading && (
                <View style={styles.modalLoadingBox}>
                  <ActivityIndicator color={FLAME} size="large" />
                  <Text style={styles.modalLoadingText}>Gerando pagamento...</Text>
                </View>
              )}

              {!upgradeLoading && upgradeError && (
                <View style={styles.modalErrorBox}>
                  <Text style={styles.modalErrorText}>{upgradeError}</Text>
                </View>
              )}

              {!upgradeLoading && !upgradeError && pixCode && (
                <View style={styles.pixBox}>
                  <Text style={styles.pixLabel}>Código PIX (copia e cola)</Text>
                  <View style={styles.pixCodeBox}>
                    <Text style={styles.pixCodeText} numberOfLines={3} selectable>
                      {pixCode}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.copyPixBtn, pixCopied && styles.copyPixBtnSuccess]}
                    onPress={handleCopyPixCode}
                  >
                    <Text style={styles.copyPixBtnText}>
                      {pixCopied ? '✓ Copiado!' : 'Copiar código PIX'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {!upgradeLoading && !upgradeError && !pixCode && (
                <View style={styles.pixBox}>
                  <Text style={styles.pixSuccessText}>
                    Assinatura criada! Aguarde confirmação do pagamento.
                  </Text>
                </View>
              )}
            </Pressable>
          </Pressable>
        </Modal>

        {/* ── Referral code card ── */}
        <View style={styles.referralCard}>
          <View style={styles.referralTop}>
            <Text style={styles.referralIcon}>🎁</Text>
            <View style={styles.referralMeta}>
              <Text style={styles.referralTitle}>Seu código de indicação</Text>
              <Text style={styles.referralSub}>
                Compartilhe e ganhe FGOL por cada indicação
              </Text>
            </View>
          </View>
          <View style={styles.referralCodeRow}>
            <Text style={styles.referralCode}>{referralCode}</Text>
            <TouchableOpacity
              style={[styles.copyBtn, copied && styles.copyBtnSuccess]}
              onPress={handleCopyCode}
            >
              <Text style={styles.copyBtnText}>{copied ? '✓ Copiado' : 'Copiar'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Actions ── */}
        <View style={styles.actionsCard}>
          <TouchableOpacity style={styles.actionRow} onPress={() => WebBrowser.openBrowserAsync(`${WEB_URL}/privacidade`)}>
            <Text style={styles.actionIcon}>🔒</Text>
            <Text style={styles.actionLabel}>Privacidade e segurança</Text>
            <Text style={styles.actionChevron}>›</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.actionRow} onPress={() => WebBrowser.openBrowserAsync(`${WEB_URL}/termos`)}>
            <Text style={styles.actionIcon}>📄</Text>
            <Text style={styles.actionLabel}>Termos de uso</Text>
            <Text style={styles.actionChevron}>›</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.actionRow}>
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.actionLabel}>Suporte</Text>
            <Text style={styles.actionChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── Logout ── */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <Text style={styles.logoutText}>Sair da conta</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Gás Pago v1.0.0</Text>
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
  // Avatar
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 8,
  },
  planBadge: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  planBadgePremium: {
    backgroundColor: '#FEF3C7',
    borderColor: GOLD,
  },
  planText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  planTextPremium: {
    color: '#92400E',
  },
  // Info card
  card: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoLabel: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  infoValue: { fontSize: 14, color: NAVY, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  divider: { height: 1, backgroundColor: '#F1F5F9' },
  // Referral
  referralCard: {
    marginHorizontal: 20,
    backgroundColor: NAVY,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  referralTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  referralIcon: { fontSize: 28, marginTop: 2 },
  referralMeta: { flex: 1 },
  referralTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  referralSub: { fontSize: 12, color: '#8896A8', lineHeight: 18 },
  referralCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E3050',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  referralCode: {
    fontSize: 20,
    fontWeight: '800',
    color: GOLD,
    letterSpacing: 3,
  },
  copyBtn: {
    backgroundColor: FLAME,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  copyBtnSuccess: {
    backgroundColor: '#10B981',
  },
  copyBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  // Actions
  actionsCard: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  actionIcon: { fontSize: 20 },
  actionLabel: { flex: 1, fontSize: 14, color: NAVY, fontWeight: '500' },
  actionChevron: { fontSize: 20, color: '#CBD5E1', fontWeight: '300' },
  // Logout
  logoutBtn: {
    marginHorizontal: 20,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '700',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#CBD5E1',
  },
  // Subscription section
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginHorizontal: 20,
    marginBottom: 8,
    marginTop: 4,
  },
  subLoadingBox: {
    marginHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  subCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  subCardFree: {
    backgroundColor: NAVY,
    shadowColor: NAVY,
  },
  subCardPremium: {
    backgroundColor: GOLD,
    shadowColor: GOLD,
  },
  subCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  subCardInfo: { flex: 1 },
  subPlanName: {
    fontSize: 15,
    fontWeight: '800',
    color: NAVY,
    marginBottom: 2,
  },
  subPlanDesc: {
    fontSize: 12,
    color: '#5A3E00',
    lineHeight: 18,
  },
  subPlanNameFree: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  subPlanDescFree: {
    fontSize: 12,
    color: '#8896A8',
    lineHeight: 18,
  },
  subPlanEmoji: { fontSize: 28 },
  upgradeBtn: {
    backgroundColor: FLAME,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: FLAME,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  upgradeBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  cancelLink: {
    fontSize: 12,
    color: '#5A3E00',
    textDecorationLine: 'underline',
    fontWeight: '600',
    textAlign: 'center',
  },
  // Upgrade modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '700',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: NAVY,
    marginBottom: 4,
    marginTop: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 20,
  },
  modalLoadingBox: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  modalLoadingText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
  },
  modalErrorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  modalErrorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  pixBox: {
    marginTop: 4,
  },
  pixLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  pixCodeBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 14,
  },
  pixCodeText: {
    fontSize: 11,
    color: NAVY,
    fontWeight: '600',
    letterSpacing: 0.5,
    lineHeight: 18,
  },
  copyPixBtn: {
    backgroundColor: FLAME,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: FLAME,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  copyPixBtnSuccess: {
    backgroundColor: '#10B981',
  },
  copyPixBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  pixSuccessText: {
    fontSize: 15,
    color: '#10B981',
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 20,
    lineHeight: 24,
  },
});
