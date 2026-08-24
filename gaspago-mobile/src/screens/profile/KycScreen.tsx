import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

const FLAME = '#FF6524';
const NAVY = '#0A1628';
const GOLD = '#F2B825';
const GROUND = '#F4F6FA';

export function KycScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const [docType, setDocType] = useState<'RG' | 'CNH' | 'PASSPORT'>('RG');
  const [docNumber, setDocNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');

  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const { data: statusData, isLoading } = useQuery({
    queryKey: ['kyc-status'],
    queryFn: () => apiClient.get('/kyc/status').then((r) => r.data),
  });

  const pickImage = async (setter: (base64: string) => void) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão necessária', 'Precisamos de acesso às fotos para enviar seu documento.');
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (!res.canceled && res.assets[0]?.base64) {
      const mime = res.assets[0].mimeType ?? 'image/jpeg';
      setter(`data:${mime};base64,${res.assets[0].base64}`);
    }
  };

  const handleSubmit = async () => {
    if (!docNumber || !fullName || !cpf) {
      Alert.alert('Campos incompletos', 'Preencha todos os dados de identificação.');
      return;
    }
    if (!frontImage || !selfieImage) {
      Alert.alert('Fotos ausentes', 'Selecione a foto da frente do documento e a selfie de prova de vida.');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post('/kyc/submit', {
        documentType: docType,
        documentNumber: docNumber,
        fullName,
        cpf: cpf.replace(/\D/g, ''),
        frontImageBase64: frontImage,
        backImageBase64: backImage ?? undefined,
        selfieImageBase64: selfieImage,
      });

      await queryClient.invalidateQueries({ queryKey: ['kyc-status'] });
      Alert.alert('Enviado com sucesso! 🎉', 'Seus documentos foram recebidos e estão em análise prioritária.');
    } catch (err: any) {
      Alert.alert('Erro', err.response?.data?.error ?? 'Não foi possível enviar os documentos.');
    } finally {
      setSubmitting(false);
    }
  };

  const isApproved = statusData?.kycVerified;
  const isPending = statusData?.status === 'PENDING_REVIEW';
  const isRejected = statusData?.status === 'REJECTED';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Verificação de Identidade (KYC)</Text>
          <Text style={styles.subtitle}>Necessário para saques PIX ilimitados e segurança da conta.</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color={FLAME} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Status Banner */}
            <View
              style={[
                styles.statusCard,
                isApproved && styles.statusApproved,
                isPending && styles.statusPending,
                isRejected && styles.statusRejected,
              ]}
            >
              <Text style={styles.statusTitle}>
                {isApproved
                  ? '⭐ KYC Nível 2 Aprovado'
                  : isPending
                  ? '⏳ Documentos em Análise'
                  : isRejected
                  ? '⚠️ Reenvio Necessário'
                  : '🔓 Iniciar Verificação'}
              </Text>
              <Text style={styles.statusDesc}>
                {isApproved
                  ? 'Sua conta está totalmente verificada. Saques PIX e operações liberadas!'
                  : isPending
                  ? 'Recebemos suas fotos. A validação ocorre em até 24 horas úteis.'
                  : isRejected
                  ? statusData?.submission?.rejectionReason ?? 'Revise as fotos e envie novamente.'
                  : 'Envie foto do seu documento de identidade e uma selfie.'}
              </Text>
            </View>

            {!isApproved && (
              <View style={styles.formCard}>
                <Text style={styles.sectionLabel}>1. Dados do documento</Text>

                <View style={styles.typeRow}>
                  {(['RG', 'CNH', 'PASSPORT'] as const).map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.typeChip, docType === t && styles.typeChipActive]}
                      onPress={() => setDocType(t)}
                    >
                      <Text style={[styles.typeText, docType === t && styles.typeTextActive]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Nome completo (conforme documento)</Text>
                <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Seu nome" />

                <Text style={styles.inputLabel}>CPF (somente números)</Text>
                <TextInput style={styles.input} value={cpf} onChangeText={setCpf} keyboardType="numeric" placeholder="000.000.000-00" />

                <Text style={styles.inputLabel}>Número do documento</Text>
                <TextInput style={styles.input} value={docNumber} onChangeText={setDocNumber} placeholder="Nº do RG ou CNH" />

                <Text style={[styles.sectionLabel, { marginTop: 24 }]}>2. Fotos dos documentos & Prova de Vida</Text>

                {/* Upload Front */}
                <TouchableOpacity style={styles.photoBtn} onPress={() => pickImage(setFrontImage)}>
                  <Text style={styles.photoBtnTitle}>📷 Frente do Documento ({docType})</Text>
                  <Text style={styles.photoBtnSub}>{frontImage ? '✓ Foto selecionada' : 'Toque para selecionar foto'}</Text>
                </TouchableOpacity>

                {/* Upload Back */}
                <TouchableOpacity style={styles.photoBtn} onPress={() => pickImage(setBackImage)}>
                  <Text style={styles.photoBtnTitle}>📷 Verso do Documento (Opcional se CNH)</Text>
                  <Text style={styles.photoBtnSub}>{backImage ? '✓ Foto selecionada' : 'Toque para selecionar foto'}</Text>
                </TouchableOpacity>

                {/* Upload Selfie */}
                <TouchableOpacity style={[styles.photoBtn, styles.photoBtnSelfie]} onPress={() => pickImage(setSelfieImage)}>
                  <Text style={styles.photoBtnTitle}>🤳 Selfie de Prova de Vida (Liveness)</Text>
                  <Text style={styles.photoBtnSub}>{selfieImage ? '✓ Selfie selecionada' : 'Tire uma foto bem iluminada do seu rosto'}</Text>
                </TouchableOpacity>

                {/* Submit button */}
                <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
                  {submitting ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.submitText}>Enviar para Verificação</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: GROUND },
  scroll: { flex: 1 },
  content: { paddingBottom: 40 },
  header: { paddingHorizontal: 20, paddingTop: 16, marginBottom: 16 },
  backBtn: { marginBottom: 8 },
  backText: { fontSize: 15, color: FLAME, fontWeight: '600' },
  pageTitle: { fontSize: 22, fontWeight: '800', color: NAVY },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 4 },

  statusCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 18,
    backgroundColor: '#E2E8F0',
    marginBottom: 20,
  },
  statusApproved: { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#10B981' },
  statusPending: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#F59E0B' },
  statusRejected: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#EF4444' },

  statusTitle: { fontSize: 16, fontWeight: '800', color: NAVY, marginBottom: 4 },
  statusDesc: { fontSize: 12.5, color: '#475569', lineHeight: 18 },

  formCard: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  typeChip: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center' },
  typeChipActive: { backgroundColor: NAVY },
  typeText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  typeTextActive: { color: '#FFFFFF' },

  inputLabel: { fontSize: 12, fontWeight: '600', color: NAVY, marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: NAVY,
    marginBottom: 12,
  },

  photoBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  photoBtnSelfie: { borderColor: FLAME, backgroundColor: '#FFF5F0' },
  photoBtnTitle: { fontSize: 13, fontWeight: '700', color: NAVY, marginBottom: 2 },
  photoBtnSub: { fontSize: 11.5, color: '#64748B' },

  submitBtn: {
    backgroundColor: FLAME,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: FLAME,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});
