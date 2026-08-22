import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { getMarketplaceCategories, MarketplaceCategory } from '@/api/client';
import type { MainStackParamList } from '@/navigation';

const FLAME = '#FF6524';
const NAVY = '#0A1628';
const GROUND = '#F4F6FA';

type NavProp = NativeStackNavigationProp<MainStackParamList>;

// Category cards cycle through this palette since the API doesn't return one.
const CARD_COLORS = [
  '#FEF3C7',
  '#DBEAFE',
  '#D1FAE5',
  '#EDE9FE',
  '#FCE7F3',
  '#FEF9C3',
  '#DCFCE7',
  '#E0F2FE',
];

// The API returns key/label/count only — icons are derived locally by key.
const CATEGORY_ICONS: Record<string, string> = {
  restaurante: '🍽️',
  farmacia: '💊',
  mercado: '🛒',
  beleza: '💅',
  servico: '🔧',
  pet: '🐾',
  educacao: '📚',
  automotivo: '🚗',
};

const DEFAULT_ICON = '🏪';

function CategoryCard({
  category,
  color,
  onPress,
}: {
  category: MarketplaceCategory;
  color: string;
  onPress: () => void;
}) {
  const icon = CATEGORY_ICONS[category.key] ?? DEFAULT_ICON;
  return (
    <TouchableOpacity
      style={styles.catCard}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={[styles.catIcon, { backgroundColor: color }]}>
        <Text style={styles.catEmoji}>{icon}</Text>
      </View>
      <Text style={styles.catLabel}>{category.label}</Text>
      <Text style={styles.catCount}>{category.count} parceiros</Text>
    </TouchableOpacity>
  );
}

function CategorySkeleton() {
  return (
    <View style={styles.grid}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <View key={i} style={styles.catCard}>
          <View style={styles.skeletonIcon} />
          <View style={styles.skeletonLine} />
        </View>
      ))}
    </View>
  );
}

export function MarketplaceScreen() {
  const navigation = useNavigation<NavProp>();

  const {
    data: categories = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['marketplace-categories'],
    queryFn: getMarketplaceCategories,
  });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Marketplace 🏪</Text>
          <Text style={styles.pageSubtitle}>
            Use seus FGOL em estabelecimentos parceiros
          </Text>
        </View>

        {/* ── Categories grid ── */}
        <Text style={styles.sectionTitle}>Categorias</Text>
        {isLoading ? (
          <CategorySkeleton />
        ) : error ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>😕</Text>
            <Text style={styles.emptyText}>
              Não foi possível carregar as categorias. Tente novamente mais
              tarde.
            </Text>
          </View>
        ) : categories.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>🏪</Text>
            <Text style={styles.emptyText}>
              Nenhum estabelecimento parceiro disponível ainda.
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {categories.map((cat, index) => (
              <CategoryCard
                key={cat.key}
                category={cat}
                color={CARD_COLORS[index % CARD_COLORS.length]}
                onPress={() =>
                  navigation.navigate('EstablishmentList', {
                    category: cat.key,
                    categoryLabel: cat.label,
                  })
                }
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: GROUND },
  scroll: { flex: 1 },
  content: { paddingBottom: 40 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: NAVY,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: NAVY,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    gap: 0,
    marginBottom: 24,
  },
  catCard: {
    width: '50%',
    padding: 6,
  },
  catIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  catEmoji: { fontSize: 28 },
  catLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 2,
  },
  catCount: { fontSize: 12, color: '#94A3B8' },
  skeletonIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#E9EDF3',
    marginBottom: 8,
  },
  skeletonLine: {
    width: '70%',
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E9EDF3',
  },
  emptyBox: {
    marginHorizontal: 20,
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  emptyEmoji: { fontSize: 44 },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 24,
  },
});
