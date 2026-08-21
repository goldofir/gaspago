import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { getDistributors, Distributor } from '@/api/client';

const FLAME = '#FF6524';
const NAVY = '#0A1628';
const GOLD = '#F2B825';
const GROUND = '#F4F6FA';

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

function DistributorCard({
  distributor,
  onSelect,
}: {
  distributor: Distributor;
  onSelect: (d: Distributor) => void;
}) {
  return (
    <TouchableOpacity
      style={styles.distCard}
      onPress={() => onSelect(distributor)}
      activeOpacity={0.85}
    >
      <View style={styles.distCardTop}>
        <View style={styles.distAvatar}>
          <Text style={styles.distAvatarEmoji}>🏪</Text>
        </View>
        <View style={styles.distInfo}>
          <Text style={styles.distName}>{distributor.name}</Text>
          <StarRating rating={distributor.rating} />
          <Text style={styles.distEta}>📍 {distributor.distance_km.toFixed(1)} km · ⏱ {distributor.eta_minutes} min</Text>
        </View>
      </View>
      <View style={styles.distCardBottom}>
        <View>
          <Text style={styles.distPriceLabel}>P13 (13kg)</Text>
          <Text style={styles.distPrice}>
            R$ {distributor.price_p13.toFixed(2).replace('.', ',')}
          </Text>
        </View>
        <View style={styles.cashbackBadge}>
          <Text style={styles.cashbackText}>
            +{distributor.cashback_pct}% FGOL
          </Text>
        </View>
        <TouchableOpacity
          style={styles.selectBtn}
          onPress={() => onSelect(distributor)}
        >
          <Text style={styles.selectBtnText}>Selecionar</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export function OrderGasScreen() {
  const [cep, setCep] = useState('');
  const [searchCep, setSearchCep] = useState<string | null>(null);

  const formattedCep = cep.replace(/\D/g, '').slice(0, 8);
  const displayCep =
    formattedCep.length > 5
      ? `${formattedCep.slice(0, 5)}-${formattedCep.slice(5)}`
      : formattedCep;

  const {
    data: distributors = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['distributors', searchCep],
    queryFn: () => getDistributors(searchCep!),
    enabled: !!searchCep,
  });

  const handleSearch = () => {
    const raw = cep.replace(/\D/g, '');
    if (raw.length !== 8) {
      Alert.alert('CEP inválido', 'Digite um CEP com 8 dígitos.');
      return;
    }
    setSearchCep(raw);
  };

  const handleSelect = (d: Distributor) => {
    Alert.alert(
      'Distribuidor selecionado',
      `Você escolheu: ${d.name}\nNavegação para seleção de produto em breve.`,
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ── */}
        <Text style={styles.pageTitle}>Pedir Gás 🔥</Text>
        <Text style={styles.pageSubtitle}>
          Encontre distribuidoras perto de você
        </Text>

        {/* ── CEP search ── */}
        <View style={styles.searchCard}>
          <Text style={styles.searchLabel}>Informe seu CEP</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.cepInput}
              placeholder="00000-000"
              placeholderTextColor="#A0AEC0"
              keyboardType="number-pad"
              value={displayCep}
              onChangeText={(t) => setCep(t.replace(/\D/g, ''))}
              maxLength={9}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity
              style={styles.searchBtn}
              onPress={handleSearch}
              disabled={isLoading || isFetching}
            >
              {isLoading || isFetching ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.searchBtnText}>Buscar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Results ── */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorEmoji}>😕</Text>
            <Text style={styles.errorText}>
              Não encontramos distribuidoras para este CEP.
            </Text>
            <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
              <Text style={styles.retryText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : searchCep && !isLoading && distributors.length === 0 ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorEmoji}>📍</Text>
            <Text style={styles.errorText}>
              Nenhuma distribuidora atende seu CEP ainda.
            </Text>
          </View>
        ) : (
          distributors.map((d) => (
            <DistributorCard key={d.id} distributor={d} onSelect={handleSelect} />
          ))
        )}

        {/* ── Placeholder when no search ── */}
        {!searchCep && (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderEmoji}>🗺️</Text>
            <Text style={styles.placeholderText}>
              Digite seu CEP para ver as distribuidoras disponíveis na sua região.
            </Text>
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
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: NAVY,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#64748B',
    paddingHorizontal: 20,
    marginBottom: 20,
    marginTop: 4,
  },
  searchCard: {
    marginHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  searchLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 10,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cepInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: NAVY,
    fontWeight: '600',
  },
  searchBtn: {
    backgroundColor: FLAME,
    borderRadius: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: FLAME,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  searchBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  distCard: {
    marginHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  distCardTop: {
    flexDirection: 'row',
    padding: 16,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  distAvatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: GROUND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  distAvatarEmoji: { fontSize: 28 },
  distInfo: { flex: 1 },
  distName: { fontSize: 15, fontWeight: '700', color: NAVY, marginBottom: 4 },
  starsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  star: { fontSize: 14, color: '#CBD5E1' },
  starFilled: { color: GOLD },
  ratingNum: { fontSize: 12, color: '#64748B', marginLeft: 4, fontWeight: '600' },
  distEta: { fontSize: 12, color: '#64748B' },
  distCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  distPriceLabel: { fontSize: 11, color: '#94A3B8' },
  distPrice: { fontSize: 17, fontWeight: '800', color: NAVY },
  cashbackBadge: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: 'center',
  },
  cashbackText: { fontSize: 12, color: '#10B981', fontWeight: '700' },
  selectBtn: {
    backgroundColor: FLAME,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  selectBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  placeholder: {
    marginHorizontal: 20,
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
  },
  placeholderEmoji: { fontSize: 56, marginBottom: 16 },
  placeholderText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
  },
  errorBox: {
    marginHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 10,
  },
  errorEmoji: { fontSize: 40 },
  errorText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: FLAME,
  },
  retryText: { color: FLAME, fontWeight: '700', fontSize: 13 },
});
