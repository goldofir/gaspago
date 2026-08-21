import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const FLAME = '#FF6524';
const NAVY = '#0A1628';
const GROUND = '#F4F6FA';

interface Category {
  id: string;
  icon: string;
  label: string;
  count: number;
  color: string;
}

const CATEGORIES: Category[] = [
  { id: 'restaurants', icon: '🍽️', label: 'Restaurantes', count: 142, color: '#FEF3C7' },
  { id: 'pharmacies', icon: '💊', label: 'Farmácias', count: 38, color: '#DBEAFE' },
  { id: 'markets', icon: '🛒', label: 'Mercados', count: 67, color: '#D1FAE5' },
  { id: 'services', icon: '🔧', label: 'Serviços', count: 94, color: '#EDE9FE' },
  { id: 'beauty', icon: '💅', label: 'Beleza', count: 55, color: '#FCE7F3' },
  { id: 'bakeries', icon: '🥐', label: 'Padarias', count: 29, color: '#FEF9C3' },
  { id: 'petshop', icon: '🐾', label: 'Pet Shop', count: 18, color: '#DCFCE7' },
  { id: 'auto', icon: '🚗', label: 'Automotivo', count: 41, color: '#E0F2FE' },
];

function CategoryCard({ category }: { category: Category }) {
  return (
    <TouchableOpacity
      style={styles.catCard}
      activeOpacity={0.85}
      onPress={() => {}}
    >
      {/* Coming soon overlay */}
      <View style={styles.comingSoonOverlay}>
        <Text style={styles.comingSoonText}>Em breve</Text>
      </View>

      <View style={[styles.catIcon, { backgroundColor: category.color }]}>
        <Text style={styles.catEmoji}>{category.icon}</Text>
      </View>
      <Text style={styles.catLabel}>{category.label}</Text>
      <Text style={styles.catCount}>{category.count} parceiros</Text>
    </TouchableOpacity>
  );
}

export function MarketplaceScreen() {
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

        {/* ── Coming soon banner ── */}
        <View style={styles.banner}>
          <Text style={styles.bannerIcon}>🚀</Text>
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>Em desenvolvimento</Text>
            <Text style={styles.bannerBody}>
              O marketplace está sendo construído. Em breve você poderá usar
              seus FGOL em centenas de estabelecimentos parceiros!
            </Text>
          </View>
        </View>

        {/* ── Categories grid ── */}
        <Text style={styles.sectionTitle}>Categorias</Text>
        <View style={styles.grid}>
          {CATEGORIES.map((cat) => (
            <CategoryCard key={cat.id} category={cat} />
          ))}
        </View>

        {/* ── Notify me card ── */}
        <View style={styles.notifyCard}>
          <Text style={styles.notifyEmoji}>🔔</Text>
          <Text style={styles.notifyTitle}>Quer ser avisado?</Text>
          <Text style={styles.notifyBody}>
            Quando o marketplace abrir, você será o primeiro a saber.
          </Text>
          <TouchableOpacity style={styles.notifyBtn}>
            <Text style={styles.notifyBtnText}>Me avise quando abrir</Text>
          </TouchableOpacity>
        </View>
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
  banner: {
    marginHorizontal: 20,
    backgroundColor: '#FFF7ED',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: FLAME,
  },
  bannerIcon: { fontSize: 24, marginTop: 2 },
  bannerText: { flex: 1 },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C2410C',
    marginBottom: 4,
  },
  bannerBody: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 19,
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
    position: 'relative',
  },
  comingSoonOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 10,
    backgroundColor: NAVY,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  comingSoonText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
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
  notifyCard: {
    marginHorizontal: 20,
    backgroundColor: NAVY,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  notifyEmoji: { fontSize: 40, marginBottom: 12 },
  notifyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  notifyBody: {
    fontSize: 13,
    color: '#8896A8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  notifyBtn: {
    backgroundColor: FLAME,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    shadowColor: FLAME,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  notifyBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
