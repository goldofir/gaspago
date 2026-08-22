import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/navigation';
import { login, loginWithGoogle } from '@/api/client';
import { useAuthStore } from '@/store/auth.store';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

type Props = NativeStackScreenProps<AuthStackParamList, 'Phone'>;

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'http://192.168.0.100:3031';

WebBrowser.maybeCompleteAuthSession();

function formatBRPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 11)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  return digits;
}

function getErrorMessage(err: any): string {
  const status = err?.response?.status;
  if (status === 429) {
    return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  }
  if (!err?.response) {
    return 'Sem conexão. Verifique sua internet e tente novamente.';
  }
  return err?.response?.data?.message || 'Não foi possível enviar o código.';
}

export function PhoneScreen({ navigation }: Props) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setToken, setUser } = useAuthStore();

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
    selectAccount: true,
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      if (id_token) handleGoogleLogin(id_token);
    }
  }, [response]);

  const handleGoogleLogin = async (idToken: string) => {
    try {
      setLoading(true);
      const { token, user } = await loginWithGoogle(idToken);
      setToken(token);
      setUser(user);
    } catch (err: any) {
      setError('Falha ao entrar com Google. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const rawPhone = phone.replace(/\D/g, '');
  const isValid = rawPhone.length === 11;

  const handleSubmit = async () => {
    if (!isValid) return;
    setError(null);
    setLoading(true);
    try {
      await login(`+55${rawPhone}`);
      navigation.navigate('Otp', { phone: `+55${rawPhone}` });
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* ── Brand hero ── */}
        <View style={styles.hero}>
          <View style={styles.flameBadge}>
            <Text style={styles.flameEmoji}>🔥</Text>
          </View>
          <Text style={styles.wordmark}>GÁS PAGO</Text>
          <Text style={styles.tagline}>Seu gás na porta em minutos</Text>
        </View>

        {/* ── White card ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Entrar ou criar conta</Text>
          <Text style={styles.cardSubtitle}>
            Digite seu celular para receber um código de acesso
          </Text>

          <TouchableOpacity
            style={[styles.googleBtn, (!request || loading) && styles.btnDisabled]}
            onPress={() => promptAsync()}
            disabled={!request || loading}
            activeOpacity={0.85}
          >
            <Text style={styles.googleBtnText}>Entrar com Google</Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          <View
            style={[
              styles.inputRow,
              error ? styles.inputRowError : undefined,
            ]}
          >
            <View style={styles.countryBadge}>
              <Text style={styles.countryText}>🇧🇷 +55</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="(11) 99999-9999"
              placeholderTextColor="#A0AEC0"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(t) => {
                setError(null);
                setPhone(formatBRPhone(t));
              }}
              maxLength={15}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.btn, !isValid && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={!isValid || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Receber código</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.legalNote}>
            Ao continuar você concorda com nossos{' '}
            <Text style={styles.link} onPress={() => WebBrowser.openBrowserAsync(`${WEB_URL}/termos`)}>
              Termos de Uso
            </Text>{' '}
            e{' '}
            <Text style={styles.link} onPress={() => WebBrowser.openBrowserAsync(`${WEB_URL}/privacidade`)}>
              Política de Privacidade
            </Text>.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const FLAME = '#FF6524';
const NAVY = '#0A1628';
const GOLD = '#F2B825';

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: NAVY,
  },
  flex: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 32,
  },
  flameBadge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: FLAME,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: FLAME,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  flameEmoji: {
    fontSize: 40,
  },
  wordmark: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  tagline: {
    fontSize: 14,
    color: GOLD,
    marginTop: 6,
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 28,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 24,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 24,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 8,
  },
  inputRowError: {
    borderColor: '#EF4444',
  },
  countryBadge: {
    backgroundColor: '#F4F6FA',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRightWidth: 1.5,
    borderRightColor: '#E2E8F0',
  },
  countryText: {
    fontSize: 15,
    color: NAVY,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: NAVY,
    fontWeight: '500',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    lineHeight: 18,
  },
  btn: {
    backgroundColor: FLAME,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    shadowColor: FLAME,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  btnDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  legalNote: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  link: {
    color: FLAME,
    fontWeight: '600',
  },
  googleBtn: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  googleBtnText: {
    color: NAVY,
    fontSize: 15,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
