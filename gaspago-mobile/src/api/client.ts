import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';

const BASE_URL =
  (process.env.EXPO_PUBLIC_API_URL as string) || 'http://192.168.0.100:3030';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor — attach Bearer token from zustand store
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor — surface API errors cleanly
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  },
);

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  message: string;
  expires_in: number;
}

export const login = (phone: string): Promise<LoginResponse> =>
  apiClient.post('/auth/otp/request', { phone }).then((r) => r.data);

export interface VerifyOtpResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export const verifyOtp = (
  phone: string,
  code: string,
): Promise<VerifyOtpResponse> =>
  apiClient.post('/auth/otp/verify', { phone, code }).then((r) => r.data);

export async function loginWithGoogle(idToken: string) {
  const res = await apiClient.post('/auth/google', { idToken });
  return res.data as { token: string; user: User };
}

// ─── User ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  phone: string;
  cpf?: string;
  email?: string;
  plan: 'FREE' | 'PREMIUM';
  referral_code: string;
  fgol_balance: number;
  fgol_frozen: number;
}

export const getMe = (): Promise<User> =>
  apiClient.get('/auth/me').then((r) => r.data);

// ─── Distributors ─────────────────────────────────────────────────────────────

export interface Distributor {
  id: string;
  name: string;
  rating: number;
  price_p13: number;
  cashback_pct: number;
  eta_minutes: number;
  distance_km: number;
}

export const getDistributors = (cep: string): Promise<Distributor[]> =>
  apiClient
    .get('/orders/distributors', { params: { cep } })
    .then((r) => r.data);

// ─── Orders ──────────────────────────────────────────────────────────────────

export interface OrderItem {
  product_id: string;
  qty: number;
}

export interface CreateOrderPayload {
  distributor_id: string;
  items: OrderItem[];
  delivery_address: string;
  payment_method: 'pix' | 'fgol' | 'credit_card';
}

export interface Order {
  id: string;
  distributor_name: string;
  status: 'pending' | 'confirmed' | 'delivering' | 'delivered' | 'cancelled';
  total_brl: number;
  fgol_earned: number;
  created_at: string;
}

export const createOrder = (data: CreateOrderPayload): Promise<Order> =>
  apiClient.post('/orders', data).then((r) => r.data);

export const getOrders = (limit = 10): Promise<Order[]> =>
  apiClient.get('/orders', { params: { limit } }).then((r) => r.data);

// ─── Wallet ──────────────────────────────────────────────────────────────────

export interface AffiliateWallet {
  fgolBalance: number;
  fgolFrozen: number;
  brlEquivalent: number;
}

export const getWallet = (userId: string): Promise<AffiliateWallet> =>
  apiClient.get(`/affiliates/${userId}/wallet`).then((r) => r.data);

// ─── Commissions ─────────────────────────────────────────────────────────────

export interface Commission {
  id: string;
  type: 'commission' | 'cashback' | 'withdrawal' | 'freeze' | 'unfreeze';
  amount: number;
  status: 'available' | 'frozen' | 'paid';
  role_label: string;
  order_id?: string;
  created_at: string;
}

export const getCommissions = (userId: string): Promise<Commission[]> =>
  apiClient.get(`/affiliates/${userId}/commissions`).then((r) => r.data);

// ─── POS Payments ─────────────────────────────────────────────────────────────

export interface PosPaymentResponse {
  posPaymentId: string;
  pixQrCode?: string;
  pixPayload?: string;
  fgolUsed: number;
  pixAmount: number;
  establishmentName: string;
  totalAmount: number;
}

export const scanPosQr = (
  qrToken: string,
  fgolToUse: number,
): Promise<PosPaymentResponse> =>
  apiClient.post('/pos/scan', { qrToken, fgolToUse }).then((r) => r.data);

// ─── Matrix Network ───────────────────────────────────────────────────────────

export interface MatrixLevel {
  level: number;
  count: number;
  activeCount: number;
  earned: number;
}

export interface MatrixData {
  levels: MatrixLevel[];
  totalEarned: number;
  referralCode: string;
  referralLink: string;
}

export const getMatrix = (userId: string): Promise<MatrixData> =>
  apiClient.get(`/affiliates/${userId}/matrix`).then((r) => r.data);
