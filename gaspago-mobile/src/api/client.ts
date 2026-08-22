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

// Client ID is fetched from the backend (SuperAdmin -> Credenciais) instead of a
// build-time env var, so changing it doesn't require editing .env or rebuilding.
export async function getGoogleClientId(): Promise<string | null> {
  const res = await apiClient.get('/auth/google-client-id');
  return res.data?.clientId ?? null;
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

// ─── Subscription plans (configured in SuperAdmin, never hardcoded here) ──────

export interface Plan {
  id: string;
  name: string;
  slug: string;
  price: number;
  billingCycle: 'MONTHLY' | 'YEARLY';
  features: string[];
}

export const getPlans = (): Promise<Plan[]> =>
  apiClient.get('/subscriptions/plans').then((r) => r.data);

// ─── Distributors ─────────────────────────────────────────────────────────────
// GET /orders/distributors returns the raw Distributor rows (shared with the
// WhatsApp bot's own search) — normalized here into what the app actually shows.

export interface DistributorProduct {
  id: string;
  name: string;
  price: number;
}

export interface Distributor {
  id: string;
  name: string;
  rating: number;
  cashbackPercent: number; // 0-1 fraction, e.g. 0.2 = 20%
  distanceKm?: number; // only present when searched by lat/lng, not by CEP
  products: DistributorProduct[];
}

export const getDistributors = (cep: string): Promise<Distributor[]> =>
  apiClient.get('/orders/distributors', { params: { cep } }).then((r) =>
    (r.data as any[]).map((d) => ({
      id: d.id,
      name: d.name,
      rating: d.rating,
      cashbackPercent: d.cashbackPercent,
      distanceKm: d.distanceKm,
      products: (d.products ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
      })),
    })),
  );

// ─── Orders ──────────────────────────────────────────────────────────────────

export interface CreateOrderPayload {
  distributorId: string;
  items: { productId: string; quantity: number }[];
  deliveryAddress: string;
  deliveryPostalCode: string;
  paymentMethod: 'PIX' | 'CARD' | 'FGOL_BALANCE' | 'MIXED';
  fgolToUse?: number;
}

export interface Order {
  id: string;
  distributor: { name: string };
  status: 'PENDING' | 'CONFIRMED' | 'IN_DELIVERY' | 'DELIVERED' | 'CANCELLED';
  total: string; // Decimal serializes as a string
  fgolUsed: string;
  createdAt: string;
}

export interface CreateOrderResponse {
  id: string;
  status: string;
  paymentStatus: 'PENDING' | 'PAID';
  total: string;
  // Present only when a real PIX charge was created (some amount was owed
  // beyond FGOL) — payment isn't confirmed yet when these are returned.
  pixQrCode?: string;
  pixPayload?: string;
}

export const createOrder = (data: CreateOrderPayload): Promise<CreateOrderResponse> =>
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
  status?: 'AWAITING_PAYMENT';
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

// ─── Marketplace ───────────────────────────────────────────────────────────────

export interface MarketplaceCategory {
  key: string;
  label: string;
  count: number;
}

export const getMarketplaceCategories = (): Promise<MarketplaceCategory[]> =>
  apiClient.get('/marketplace/categories').then((r) => r.data);

export interface MarketplaceEstablishment {
  id: string;
  name: string;
  category: string;
  city: string;
  state: string;
  rating: number;
  cashbackPercent: number;
  distanceKm?: number;
}

export const getMarketplaceEstablishments = (params: {
  category?: string;
  lat?: number;
  lng?: number;
}): Promise<MarketplaceEstablishment[]> =>
  apiClient
    .get('/marketplace/establishments', { params })
    .then((r) => r.data);

export interface MarketplaceItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
}

export interface EstablishmentDetail extends MarketplaceEstablishment {
  marketplaceItems: MarketplaceItem[];
}

export const getEstablishmentDetail = (
  id: string,
): Promise<EstablishmentDetail> =>
  apiClient.get(`/marketplace/establishments/${id}`).then((r) => r.data);

export interface CheckoutPayload {
  establishmentId: string;
  items: { itemId: string; quantity: number }[];
  fgolToUse?: number;
}

export interface CheckoutResponse {
  posPaymentId: string;
  establishmentName: string;
  totalAmount: number;
  fgolUsed: number;
  pixAmount: number;
  cashbackEarned: number;
  // Present only when pixAmount > 0 — a real PIX charge was created and
  // payment is not yet confirmed (status: 'AWAITING_PAYMENT'). When the
  // order was fully covered by FGOL, none of these are set and the purchase
  // already completed.
  status?: 'AWAITING_PAYMENT';
  pixQrCode?: string;
  pixPayload?: string;
}

export const marketplaceCheckout = (
  data: CheckoutPayload,
): Promise<CheckoutResponse> =>
  apiClient.post('/marketplace/checkout', data).then((r) => r.data);
