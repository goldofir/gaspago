import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { apiClient } from '@/api/client';

// ─── Colors ──────────────────────────────────────────────────────────────────

const FLAME = '#FF6524';
const NAVY = '#0A1628';
const GOLD = '#F2B825';
const CARD = '#0D1E38';
const SURFACE = '#152035';
const MUTED = '#8896A8';

// ─── Navigation types ─────────────────────────────────────────────────────────

type RootParamList = {
  OrderConfirm: {
    distributorId: string;
    distributorName: string;
    price: number;
    cashbackPct: number;
  };
  Home: undefined;
};

type OrderConfirmRoute = RouteProp<RootParamList, 'OrderConfirm'>;
type NavProp = NativeStackNavigationProp<RootParamList>;

// ─── Payment methods ──────────────────────────────────────────────────────────

type PaymentMethod = 'PIX' | 'CARD' | 'FGOL';

const PAYMENT_OPTIONS: { key: PaymentMethod; label: string }[] = [
  { key: 'PIX', label: 'PIX' },
  { key: 'CARD', label: 'Cartão' },
  { key: 'FGOL', label: 'Saldo FGOL' },
];

const PAYMENT_API_MAP: Record<PaymentMethod, string> = {
  PIX: 'PIX',
  CARD: 'credit_card',
  FGOL: 'fgol',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBRL(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function OrderConfirmScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<OrderConfirmRoute>();
  const { distributorId, distributorName, price, cashbackPct } = route.params;

  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState(false);

  const subtotal = price * quantity;
  const cashbackFgol = Math.round((subtotal * cashbackPct) / 100);

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, Math.min(5, prev + delta)));
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.post('/orders', {
        distributorId,
        items: [{ productId: 'default', quantity }],
        paymentMethod: PAYMENT_API_MAP[paymentMethod],
        channel: 'app',
      });
      setSuccessBanner(true);
      setTimeout(() => {
        navigation.navigate('Home');
      }, 1200);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(
        e?.response?.data?.message ?? 'Erro ao realizar pedido. Tente novamente.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Success banner ── */}
      {successBanner && (
        <View style={styles.successBanner}>
          <Text style={styles.successBannerText}>
            Pedido realizado com sucesso!
          </Text>
        </View>
      )}

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirmar Pedido</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Distributor card ── */}
        <View style={styles.card}>
          <View style={styles.distCardTop}>
            <View style={styles.distAvatar}>
              <Text style={styles.distAvatarEmoji}>🏪</Text>
            </View>
            <View style={styles.distInfo}>
              <Text style={styles.distName}>{distributorName}</Text>
              <Text style={styles.distMeta}>
                P13 · R$ {formatBRL(price)}/unidade
              </Text>
              <View style={styles.cashbackBadge}>
                <Text style={styles.cashbackText}>+{cashbackPct}% FGOL</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Product selector ── */}
        <Text style={styles.sectionLabel}>Produto</Text>
        <View style={styles.card}>
          <View style={styles.productRow}>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>13kg</Text>
              <Text style={styles.productPrice}>
                R$ {formatBRL(price)}/cilindro
              </Text>
            </View>
            <View style={styles.stepper}>
              <TouchableOpacity
                style={[styles.stepBtn, quantity <= 1 && styles.stepBtnDisabled]}
                onPress={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
              >
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepQty}>{quantity}</Text>
              <TouchableOpacity
                style={[styles.stepBtn, quantity >= 5 && styles.stepBtnDisabled]}
                onPress={() => handleQuantityChange(1)}
                disabled={quantity >= 5}
              >
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Payment method ── */}
        <Text style={styles.sectionLabel}>Forma de Pagamento</Text>
        <View style={styles.paymentRow}>
          {PAYMENT_OPTIONS.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.paymentChip,
                paymentMethod === key && styles.paymentChipActive,
              ]}
              onPress={() => setPaymentMethod(key)}
            >
              <Text
                style={[
                  styles.paymentChipText,
                  paymentMethod === key && styles.paymentChipTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Order summary ── */}
        <Text style={styles.sectionLabel}>Resumo do Pedido</Text>
        <View style={styles.card}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>R$ {formatBRL(subtotal)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Cashback estimado</Text>
            <Text style={styles.summaryValueGreen}>
              {cashbackFgol} FGOL
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabelTotal}>Total</Text>
            <Text style={styles.summaryValueTotal}>
              R$ {formatBRL(subtotal)}
            </Text>
          </View>
        </View>

        {/* ── Error ── */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      {/* ── Sticky CTA ── */}
      <View style={styles.ctaContainer}>
        <TouchableOpacity
          style={[styles.ctaBtn, loading && styles.ctaBtnDisabled]}
          onPress={handlePlaceOrder}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaBtnText}>🔥 Fazer Pedido</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NAVY },
  scroll: { flex: 1 },
  content: { paddingBottom: 24, paddingTop: 8 },

  // Success banner
  successBanner: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    alignItems: 'center',
  },
  successBannerText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E3050',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 26,
    color: '#FFFFFF',
    fontWeight: '300',
    lineHeight: 30,
    marginTop: -2,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSpacer: { width: 36 },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },

  // Card
  card: {
    marginHorizontal: 20,
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E3050',
  },

  // Distributor card
  distCardTop: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  distAvatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  distAvatarEmoji: { fontSize: 26 },
  distInfo: { flex: 1 },
  distName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  distMeta: {
    fontSize: 13,
    color: MUTED,
    marginBottom: 8,
  },
  cashbackBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#0C2E1A',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  cashbackText: { fontSize: 12, color: '#10B981', fontWeight: '700' },

  // Product row
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productInfo: { flex: 1 },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  productPrice: { fontSize: 13, color: MUTED },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: '#1E3050',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: {
    opacity: 0.4,
  },
  stepBtnText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 24,
  },
  stepQty: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    minWidth: 32,
    textAlign: 'center',
  },

  // Payment method chips
  paymentRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    gap: 10,
  },
  paymentChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: CARD,
    borderWidth: 1.5,
    borderColor: '#1E3050',
    alignItems: 'center',
  },
  paymentChipActive: {
    borderColor: FLAME,
    backgroundColor: '#1A1010',
  },
  paymentChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: MUTED,
  },
  paymentChipTextActive: {
    color: FLAME,
    fontWeight: '800',
  },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#1E3050',
  },
  summaryLabel: {
    fontSize: 14,
    color: MUTED,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  summaryValueGreen: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '700',
  },
  summaryLabelTotal: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  summaryValueTotal: {
    fontSize: 18,
    color: FLAME,
    fontWeight: '800',
  },

  // Error
  errorBox: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#2D0D0D',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  // CTA
  ctaContainer: {
    padding: 20,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#1E3050',
    backgroundColor: NAVY,
  },
  ctaBtn: {
    backgroundColor: FLAME,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: FLAME,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  ctaBtnDisabled: {
    opacity: 0.6,
  },
  ctaBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
