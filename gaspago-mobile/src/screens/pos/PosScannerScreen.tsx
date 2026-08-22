import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, TextInput, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { scanPosQr } from '@/api/client';

const FLAME = '#FF6524';
const NAVY = '#0A1628';
const GROUND = '#F4F6FA';

type Step = 'idle' | 'scanning' | 'confirming' | 'processing' | 'success' | 'error';

interface ScanResult {
  posPaymentId: string;
  establishmentName: string;
  totalAmount: number;
  fgolUsed: number;
  pixAmount: number;
  pixQrCode?: string;
  pixPayload?: string;
  status?: 'AWAITING_PAYMENT';
}

export function PosScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<Step>('idle');
  const [scanned, setScanned] = useState(false);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [fgolToUse, setFgolToUse] = useState('0');
  const [result, setResult] = useState<ScanResult | null>(null);

  // Reset scanned flag each time we return to scanning step
  useEffect(() => {
    if (step === 'scanning') setScanned(false);
  }, [step]);

  async function handleBarcode({ data }: { data: string }) {
    if (scanned) return;
    setScanned(true);
    setQrToken(data);
    setStep('confirming');
  }

  async function confirmPayment() {
    if (!qrToken) return;
    setStep('processing');
    try {
      const res = await scanPosQr(qrToken, parseFloat(fgolToUse) || 0);
      setResult(res);
      setStep('success');
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.error ?? 'Falha ao processar pagamento.');
      setStep('error');
    }
  }

  function reset() {
    setStep('idle');
    setQrToken(null);
    setFgolToUse('0');
    setResult(null);
    setScanned(false);
  }

  if (step === 'idle') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.title}>Pagar no Balcão</Text>
          <Text style={styles.subtitle}>Escaneie o QR Code exibido no estabelecimento</Text>
          <TouchableOpacity
            style={styles.scanBtn}
            onPress={async () => {
              if (!permission?.granted) {
                const res = await requestPermission();
                if (!res.granted) {
                  Alert.alert('Permissão negada', 'Permita acesso à câmera para escanear QR Codes.');
                  return;
                }
              }
              setStep('scanning');
            }}
          >
            <Text style={styles.scanBtnText}>📷  Escanear QR Code</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'scanning') {
    return (
      <View style={{ flex: 1 }}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={handleBarcode}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        />
        <View style={styles.scanOverlay}>
          <View style={styles.scanFrame} />
          <Text style={styles.scanHint}>Aponte a câmera para o QR Code</Text>
          <TouchableOpacity style={styles.cancelBtn} onPress={reset}>
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (step === 'confirming') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>Confirmar Pagamento</Text>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Usar saldo FGOL (em FGOL)</Text>
            <TextInput
              style={styles.input}
              value={fgolToUse}
              onChangeText={setFgolToUse}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#94A3B8"
            />
          </View>
          <TouchableOpacity style={styles.confirmBtn} onPress={confirmPayment}>
            <Text style={styles.confirmBtnText}>Confirmar Pagamento</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={reset}>
            <Text style={styles.backBtnText}>Cancelar</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (step === 'processing') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={FLAME} />
          <Text style={styles.subtitle}>Processando pagamento…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'success' && result && result.status === 'AWAITING_PAYMENT') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.center}>
            <Text style={{ fontSize: 56 }}>💳</Text>
            <Text style={styles.title}>Pague com PIX para confirmar</Text>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Estabelecimento</Text>
              <Text style={styles.cardValue}>{result.establishmentName}</Text>
              <Text style={styles.cardLabel}>Valor via PIX</Text>
              <Text style={styles.cardValue}>
                R$ {Number(result.pixAmount).toFixed(2).replace('.', ',')}
              </Text>
              {!!result.pixPayload && (
                <>
                  <Text style={styles.cardLabel}>Copia e cola</Text>
                  <Text style={[styles.cardValue, styles.pixPayloadText]} selectable>
                    {result.pixPayload}
                  </Text>
                </>
              )}
            </View>
            <Text style={styles.subtitle}>O pagamento é confirmado automaticamente assim que cair.</Text>
            <TouchableOpacity style={styles.scanBtn} onPress={reset}>
              <Text style={styles.scanBtnText}>Novo Pagamento</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (step === 'success' && result) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={{ fontSize: 56 }}>✅</Text>
          <Text style={styles.successTitle}>Pagamento confirmado!</Text>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Estabelecimento</Text>
            <Text style={styles.cardValue}>{result.establishmentName}</Text>
            <Text style={styles.cardLabel}>Total</Text>
            <Text style={styles.cardValue}>
              R$ {Number(result.totalAmount).toFixed(2).replace('.', ',')}
            </Text>
            <Text style={styles.cardLabel}>FGOL usado</Text>
            <Text style={styles.cardValue}>
              {Number(result.fgolUsed).toLocaleString('pt-BR', { minimumFractionDigits: 4 })} FGOL
            </Text>
            <Text style={styles.cardLabel}>Pago via PIX</Text>
            <Text style={styles.cardValue}>
              R$ {Number(result.pixAmount).toFixed(2).replace('.', ',')}
            </Text>
          </View>
          <TouchableOpacity style={styles.scanBtn} onPress={reset}>
            <Text style={styles.scanBtnText}>Novo Pagamento</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // error fallback
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Text style={{ fontSize: 48 }}>⚠️</Text>
        <Text style={styles.subtitle}>Algo deu errado. Tente novamente.</Text>
        <TouchableOpacity style={styles.scanBtn} onPress={reset}>
          <Text style={styles.scanBtnText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: GROUND },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  scrollContent: { padding: 24 },
  title: { fontSize: 22, fontWeight: '800', color: NAVY, marginBottom: 8, textAlign: 'center' },
  successTitle: { fontSize: 22, fontWeight: '800', color: '#10B981', marginBottom: 16, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 24 },
  scanBtn: {
    backgroundColor: FLAME, borderRadius: 16, paddingHorizontal: 28, paddingVertical: 16,
    marginTop: 16, shadowColor: FLAME, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  scanBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  confirmBtn: {
    backgroundColor: FLAME, borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 16,
  },
  confirmBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  backBtn: { alignItems: 'center', marginTop: 12 },
  backBtnText: { fontSize: 14, color: '#64748B' },
  cancelBtn: {
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12, marginTop: 24,
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    width: '100%', marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 2 },
  cardValue: { fontSize: 16, fontWeight: '700', color: NAVY },
  pixPayloadText: { fontSize: 11, fontWeight: '500', fontFamily: 'monospace' },
  input: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10,
    padding: 12, fontSize: 18, fontWeight: '700', color: NAVY,
    marginTop: 8, backgroundColor: GROUND,
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  scanFrame: {
    width: 240, height: 240, borderRadius: 20,
    borderWidth: 3, borderColor: FLAME,
    backgroundColor: 'transparent',
  },
  scanHint: { color: '#fff', fontSize: 14, fontWeight: '600', marginTop: 20, textAlign: 'center' },
});
