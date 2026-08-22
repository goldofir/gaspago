import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import {
  getMarketplaceEstablishments,
  MarketplaceEstablishment,
} from '@/api/client';
import type { MainStackParamList } from '@/navigation';

const FLAME = '#FF6524';
const NAVY = '#0A1628';
const GOLD = '#F2B825';
const GROUND = '#F4F6FA';

type EstablishmentListRoute = RouteProp<MainStackParamList, 'EstablishmentList'>;
type NavProp = NativeStackNavigationProp<MainStackParamList>;

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

function EstablishmentCard({
  establishment,
  onPress,
}: {
  establishment: MarketplaceEstablishment;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.estCard}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={styles.estAvatar}>
        <Text style={styles.estAvatarEmoji}>🏬</Text>
      </View>
      <View style={styles.estInfo}>
        <Text style={styles.estName}>{establishment.name}</Text>
        <Text style={styles.estLocation}>
          📍 {establishment.city}/{establishment.state}
          {typeof establishment.distanceKm === 'number'
            ? ` · ${establishment.distanceKm.toFixed(1)} km`
            : ''}
        </Text>
        <StarRating rating={establishment.rating} />
      </View>
      <View style={styles.cashbackBadge}>
        <Text style={styles.cashbackText}>
          +{establishment.cashbackPercent}%
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function ListSkeleton() {
  return (
    <View>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.skeletonCard} />
      ))}
    </View>
  );
}

export function EstablishmentListScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<EstablishmentListRoute>();
  const { category, categoryLabel } = route.params;

  const {
    data: establishments = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['marketplace-establishments', category],
    queryFn: () => getMarketplaceEstablishments({ category }),
  });

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
          {categoryLabel}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ListSkeleton />
        ) : error ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>😕</Text>
            <Text style={styles.emptyText}>
              Não foi possível carregar os estabelecimentos. Tente novamente.
            </Text>
          </View>
        ) : establishments.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>🏬</Text>
            <Text style={styles.emptyText}>
              Nenhum estabelecimento nessa categoria ainda.
            </Text>
          </View>
        ) : (
          establishments.map((item) => (
            <EstablishmentCard
              key={item.id}
              establishment={item}
              onPress={() =>
                navigation.navigate('EstablishmentDetail', {
                  establishmentId: item.id,
                })
              }
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: GROUND },
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
  content: { padding: 20, paddingBottom: 40 },
  estCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  estAvatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: GROUND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  estAvatarEmoji: { fontSize: 26 },
  estInfo: { flex: 1 },
  estName: { fontSize: 15, fontWeight: '700', color: NAVY, marginBottom: 3 },
  estLocation: { fontSize: 12, color: '#64748B', marginBottom: 4 },
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
  skeletonCard: {
    height: 84,
    borderRadius: 16,
    backgroundColor: '#E9EDF3',
    marginBottom: 12,
  },
  emptyBox: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyEmoji: { fontSize: 48 },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
});
