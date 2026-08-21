import React, { useState, useRef, useEffect } from 'react';
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
import { verifyOtp, login } from '@/api/client';
import { useAuthStore } from '@/store/auth.store';

type Props = NativeStackScreenProps<AuthStackParamList, 'Otp'>;

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export function OtpScreen({ route, navigation }: Props) {
  const { phone } = route.params;
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [error, setError] = useState<string | null>(null);
  const inputs = useRef<(TextInput | null)[]>([]);
  const { setToken, setUser } = useAuthStore();

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const clearOtp = () => {
    setDigits(Array(OTP_LENGTH).fill(''));
    setTimeout(() => inputs.current[0]?.focus(), 50);
  };

  const handleDigit = (value: string, index: number) => {
    const char = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    setError(null);
    if (char && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
    if (next.every((d) => d !== '') && char) {
      submit(next.join(''));
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      const next = [...digits];
      next[index - 1] = '';
      setDigits(next);
      inputs.current[index - 1]?.focus();
    }
  };

  const submit = async (code: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await verifyOtp(phone, code);
      setToken(res.access_token);
      setUser(res.user);
      // Navigation is handled by App.tsx re-rendering on token change
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401) {
        setError('Código inválido. Verifique os dígitos e tente novamente.');
      } else if (!err?.response) {
        setError('Sem conexão. Verifique sua internet e tente novamente.');
      } else {
        setError(
          err?.response?.data?.message || 'Não foi possível verificar o código.',
        );
      }
      clearOtp();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    if (countdown > 0) return;
    setCountdown(RESEND_SECONDS);
    setError(null);
    login(phone).catch(() => {});
  };

  const maskedPhone = phone.replace(
    /^\+55(\d{2})(\d{5})(\d{4})$/,
    '+55 ($1) $2-$3',
  );

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          {/* Back */}
          <TouchableOpacity
            style={styles.back}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>← Voltar</Text>
          </TouchableOpacity>

          {/* Title */}
          <Text style={styles.title}>Verificar número</Text>
          <Text style={styles.subtitle}>
            Enviamos um código de 6 dígitos para{'\n'}
            <Text style={styles.phoneHighlight}>{maskedPhone}</Text>
          </Text>

          {/* OTP boxes */}
          <View style={styles.otpRow}>
            {digits.map((d, i) => (
              <TextInput
                key={i}
                ref={(el) => (inputs.current[i] = el)}
                style={[
                  styles.otpBox,
                  d ? styles.otpBoxFilled : undefined,
                  error ? styles.otpBoxError : undefined,
                ]}
                value={d}
                onChangeText={(v) => handleDigit(v, i)}
                onKeyPress={({ nativeEvent }) =>
                  handleKeyPress(nativeEvent.key, i)
                }
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
                selectTextOnFocus
                editable={!loading}
              />
            ))}
          </View>

          {/* Inline error */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={FLAME} size="small" />
              <Text style={styles.loadingText}>Verificando...</Text>
            </View>
          )}

          {/* Resend */}
          <View style={styles.resendRow}>
            <Text style={styles.resendLabel}>Não recebeu o código? </Text>
            <TouchableOpacity onPress={handleResend} disabled={countdown > 0}>
              <Text
                style={[
                  styles.resendBtn,
                  countdown > 0 && styles.resendBtnDisabled,
                ]}
              >
                {countdown > 0
                  ? `Reenviar em ${countdown}s`
                  : 'Reenviar código'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const FLAME = '#FF6524';
const NAVY = '#0A1628';

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F4F6FA',
  },
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 24,
  },
  back: {
    marginBottom: 32,
  },
  backText: {
    color: FLAME,
    fontSize: 15,
    fontWeight: '600',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: NAVY,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    lineHeight: 22,
    marginBottom: 40,
  },
  phoneHighlight: {
    color: NAVY,
    fontWeight: '700',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    fontSize: 22,
    fontWeight: '700',
    color: NAVY,
    backgroundColor: '#FFFFFF',
    textAlignVertical: 'center',
  },
  otpBoxFilled: {
    borderColor: FLAME,
    backgroundColor: '#FFF5F0',
  },
  otpBoxError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    lineHeight: 18,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  loadingText: {
    color: FLAME,
    fontSize: 14,
    fontWeight: '600',
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  resendLabel: {
    color: '#64748B',
    fontSize: 14,
  },
  resendBtn: {
    color: FLAME,
    fontSize: 14,
    fontWeight: '700',
  },
  resendBtnDisabled: {
    color: '#94A3B8',
    fontWeight: '500',
  },
});
