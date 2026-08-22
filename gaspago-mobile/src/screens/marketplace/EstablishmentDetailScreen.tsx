import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import {
  getEstablishmentDetail,
  marketplaceCheckout,
  MarketplaceItem,
  CheckoutResponse,
} from '@/api/client';
import type { MainStackParamList } from '@/navigation';

const FLAME = '#FF6524';
const NAVY = '#0A1628';
const GOLD = '#F2B825';
const GROUND = '#F4F6FA';

type EstablishmentDetailRoute = RouteProp<
  MainStackParamList,
  'EstablishmentDetail'
>;
type NavProp = NativeStackNavigationProp<MainStackParamList>;

function formatBRL(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function StarRating({ rating }: { rating: number }) {
  const stars = Math.round(rating);
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Text key={s} style={[styles.star, s <= stars && styles.starFilled]}>
          ★
        </Text>
      ))}
      <Text style={styles.ratingNum}>{rating.toFixed(1)}</Text>
    </View>
  );
}

function ItemCard({
  item,
  quantity,
  onIncrement,
  onDecrement,
}: {
  item: MarketplaceItem;
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <View style={[styles.itemCard, !item.isAvailable && styles.itemCardDisabled]}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        {!!item.description && (
          <Text style={styles.itemDesc} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <Text style={styles.itemPrice}>{formatBRL(item.price)}</Text>
        {!item.isAvailable && (
          <Text style={styles.itemUnavailable}>Indisponível</Text>
        )}
      </View>
      {item.isAvailable && (
        <View style={styles.stepper}>
          <TouchableOpacity
            style={[styles.stepBtn, quantity <= 0 && styles.stepBtnDisabled]}
            onPress={onDecrement}
            disabled={quantity <= 0}
          >
            <Text style={styles.stepBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.stepQty}>{quantity}</Text>
          <TouchableOpacity style={styles.stepBtn} onPress={onIncrement}>
            <Text style={styles.stepBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export function EstablishmentDetailScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<EstablishmentDetailRoute>();
  const { establishmentId } = route.params;

  const [cart, setCart] = useState<Record<string, number>>({});
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<CheckoutResponse | null>(
    null,
  );

  const {
    data: establishment,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['establishment-detail', establishmentId],
    queryFn: () => getEstablishmentDetail(establishmentId),
  });

  const items = establishment?.marketplaceItems ?? [];

  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, qty]) => qty > 0)
        .map(([itemId, qty]) => {
          const item = items.find((i) => i.id === itemId);
          return { itemId, quantity: qty, item };
        }),
    [cart, items],
  );

  const cartTotal = cartLines.reduce(
    (sum, line) => sum + (line.item?.price ?? 0) * line.quantity,
    0,
  );
  const cartCount = cartLines.reduce((sum, line) => sum + line.quantity, 0);

  const handleIncrement = (itemId: string) => {
    setCart((prev) => ({ ...prev, [itemId]: (prev[itemId] ?? 0) + 1 }));
  };

  const handleDecrement = (itemId: string) => {
    setCart((prev) => {
      const next = Math.max(0, (prev[itemId] ?? 0) - 1);
      return { ...prev, [itemId]: next };
    });
  };

  const handleCheckout = async () => {
    if (!establishment || cartCount === 0) return;
    setCheckingOut(true);
    setCheckoutError(null);
    try {
      const response = await marketplaceCheckout({
        establishmentId: establishment.id,
        items: cartLines.map((line) => ({
          itemId: line.itemId,
          quantity: line.quantity,
        })),
        fgolToUse: 0,
      });
      setSuccessData(response);
      setCart({});
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setCheckoutError(
        e?.response?.data?.message ??
          'Erro ao finalizar o pedido. Tente novamente.',
      );
    } finally {
      setCheckingOut(false);
    }
  };

  const handleCloseSuccess = () => {
    setSuccessData(null);
    navigation.navigate('MainTabs');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingBox}>
          <ActivityIndicator color={FLAME} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !establishment) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Estabelecimento</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>😕</Text>
          <Text style={styles.emptyText}>
            Não foi possível carregar este estabelecimento.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {establishment.name}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Establishment summary ── */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryAvatar}>
            <Text style={styles.summaryAvatarEmoji}>🏬</Text>
          </View>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryName}>{establishment.name}</Text>
            <StarRating rating={establishment.rating} />
            <Text style={styles.summaryLocation}>
              📍 {establishment.city}/{establishment.state}
            </Text>
          </View>
          <View style={styles.cashbackBadge}>
            <Text style={styles.cashbackText}>
              +{establishment.cashbackPercent}% FGOL
            </Text>
          </View>
        </View>

        {/* ── Error ── */}
        {checkoutError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{checkoutError}</Text>
          </View>
        )}

        {/* ── Catalog ── */}
        <Text style={styles.sectionTitle}>Cardápio</Text>
        {items.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>🍽️</Text>
            <Text style={styles.emptyText}>
              Nenhum item disponível no momento.
            </Text>
          </View>
        ) : (
          items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              quantity={cart[item.id] ?? 0}
              onIncrement={() => handleIncrement(item.id)}
              onDecrement={() => handleDecrement(item.id)}
            />
          ))
        )}
      </ScrollView>

      {/* ── Sticky cart bar ── */}
      <View style={styles.ctaContainer}>
        <View style={styles.ctaSummary}>
          <Text style={styles.ctaCount}>
            {cartCount} {cartCount === 1 ? 'item' : 'itens'}
          </Text>
          <Text style={styles.ctaTotal}>{formatBRL(cartTotal)}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.ctaBtn,
            (cartCount === 0 || checkingOut) && styles.ctaBtnDisabled,
          ]}
          onPress={handleCheckout}
          disabled={cartCount === 0 || checkingOut}
          activeOpacity={0.85}
        >
          {checkingOut ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaBtnText}>Finalizar pedido</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Success modal ── */}
      <Modal
        visible={!!successData}
        transparent
        animationType="fade"
        onRequestClose={handleCloseSuccess}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEmoji}>🎉</Text>
            <Text style={styles.modalTitle}>Pedido confirmado!</Text>
            <Text style={styles.modalBody}>
              {successData
                ? `Você ganhou ${successData.cashbackEarned} FGOL de cashback em ${successData.establishmentName}.`
                : ''}
            </Text>
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={handleCloseSuccess}
              activeOpacity={0.85}
            >
              <Text style={styles.modalBtnText}>Voltar para o início</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: GROUND },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E9EDF3',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: GROUND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 26,
    color: NAVY,
    fontWeight: '300',
    lineHeight: 30,
    marginTop: -2,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '800',
    color: NAVY,
    marginHorizontal: 8,
  },
  headerSpacer: { width: 36 },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 24 },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryAvatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: GROUND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryAvatarEmoji: { fontSize: 28 },
  summaryInfo: { flex: 1 },
  summaryName: { fontSize: 16, fontWeight: '800', color: NAVY, marginBottom: 4 },
  summaryLocation: { fontSize: 12, color: '#64748B', marginTop: 2 },
  starsRow: { flexDirection: 'row', alignItems: 'center' },
  star: { fontSize: 13, color: '#CBD5E1' },
  starFilled: { color: GOLD },
  ratingNum: { fontSize: 11, color: '#64748B', marginLeft: 4, fontWeight: '600' },
  cashbackBadge: {
    backgroundColor: '#F0FDF4',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cashbackText: { fontSize: 12, color: '#10B981', fontWeight: '700' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 12,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  itemCardDisabled: { opacity: 0.5 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '700', color: NAVY, marginBottom: 2 },
  itemDesc: { fontSize: 12, color: '#64748B', marginBottom: 6 },
  itemPrice: { fontSize: 15, fontWeight: '800', color: NAVY },
  itemUnavailable: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
    marginTop: 4,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: GROUND,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: { opacity: 0.4 },
  stepBtnText: {
    color: NAVY,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  stepQty: {
    fontSize: 15,
    fontWeight: '800',
    color: NAVY,
    minWidth: 26,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 20,
    gap: 10,
  },
  emptyEmoji: { fontSize: 44 },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  ctaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 20,
    gap: 14,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E9EDF3',
  },
  ctaSummary: { flex: 1 },
  ctaCount: { fontSize: 12, color: '#64748B', marginBottom: 2 },
  ctaTotal: { fontSize: 18, fontWeight: '800', color: NAVY },
  ctaBtn: {
    backgroundColor: FLAME,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: FLAME,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaBtnDisabled: { opacity: 0.45, shadowOpacity: 0 },
  ctaBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,22,40,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '100%',
  },
  modalEmoji: { fontSize: 48, marginBottom: 12 },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: NAVY,
    marginBottom: 8,
  },
  modalBody: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
  },
  modalBtn: {
    backgroundColor: FLAME,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    width: '100%',
    alignItems: 'center',
  },
  modalBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
