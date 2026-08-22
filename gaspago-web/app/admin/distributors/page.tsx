'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminFetch } from '../../_components/adminFetch';
import {
  Search,
  Plus,
  X,
  Edit2,
  Star,
  ChevronDown,
  Building2,
  Phone,
  Mail,
  MapPin,
  Loader2,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030';

interface Distributor {
  id: string;
  name: string;
  cnpj: string;
  phone: string;
  email?: string;
  cep: string;
  address: string;
  city: string;
  state: string;
  rating: number;
  cashbackPercent: number;
  isActive: boolean;
  createdAt: string;
  _count?: {
    products: number;
    orders: number;
  };
}

interface FormData {
  name: string;
  cnpj: string;
  phone: string;
  email: string;
  cep: string;
  address: string;
  city: string;
  state: string;
  cashbackPercent: string;
}

const emptyForm: FormData = {
  name: '',
  cnpj: '',
  phone: '',
  email: '',
  cep: '',
  address: '',
  city: '',
  state: '',
  cashbackPercent: '0',
};

function formatCNPJ(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  }
  return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={13}
          fill={i <= Math.round(rating) ? 'var(--gold)' : 'none'}
          stroke={i <= Math.round(rating) ? 'var(--gold)' : 'var(--muted)'}
        />
      ))}
      <span style={{ fontSize: 12, color: 'var(--sub)', marginLeft: 4 }}>
        {rating ? rating.toFixed(1) : '—'}
      </span>
    </div>
  );
}

function StatusToggle({
  distributor,
  onToggle,
}: {
  distributor: Distributor;
  onToggle: (d: Distributor) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    try {
      const res = await adminFetch(`${API}/admin/distributors/${distributor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !distributor.isActive }),
      });
      if (!res.ok) throw new Error('Falha ao atualizar status');
      onToggle({ ...distributor, isActive: !distributor.isActive });
    } catch {
      // silently ignore; list will refresh
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 20,
        border: 'none',
        cursor: loading ? 'not-allowed' : 'pointer',
        fontSize: 12,
        fontWeight: 600,
        transition: 'all .15s',
        background: distributor.isActive ? 'var(--green-dim)' : 'var(--red-dim)',
        color: distributor.isActive ? 'var(--green)' : 'var(--red)',
        opacity: loading ? 0.6 : 1,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: distributor.isActive ? 'var(--green)' : 'var(--red)',
          display: 'inline-block',
        }}
      />
      {distributor.isActive ? 'Ativo' : 'Inativo'}
    </button>
  );
}

function SlidePanel({
  open,
  onClose,
  editing,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  editing: Distributor | null;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<FormData>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        cnpj: formatCNPJ(editing.cnpj),
        phone: formatPhone(editing.phone),
        email: editing.email ?? '',
        cep: editing.cep,
        address: editing.address,
        city: editing.city,
        state: editing.state,
        cashbackPercent: String(editing.cashbackPercent ?? 0),
      });
    } else {
      setForm(emptyForm);
    }
    setErrors({});
    setServerError('');
  }, [editing, open]);

  function field(key: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate() {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.name.trim()) e.name = 'Nome obrigatório';
    const cnpjDigits = form.cnpj.replace(/\D/g, '');
    if (cnpjDigits.length !== 14) e.cnpj = 'CNPJ deve ter 14 dígitos';
    if (!form.phone.trim()) e.phone = 'Telefone obrigatório';
    if (!form.cep.trim()) e.cep = 'CEP obrigatório';
    if (!form.address.trim()) e.address = 'Endereço obrigatório';
    if (!form.city.trim()) e.city = 'Cidade obrigatória';
    if (!form.state.trim() || form.state.length !== 2) e.state = 'UF (2 letras)';
    const cb = parseFloat(form.cashbackPercent);
    if (isNaN(cb) || cb < 0 || cb > 20) e.cashbackPercent = 'Entre 0 e 20';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setServerError('');
    const payload = {
      name: form.name.trim(),
      cnpj: form.cnpj.replace(/\D/g, ''),
      phone: form.phone.replace(/\D/g, ''),
      email: form.email.trim() || undefined,
      cep: form.cep.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.toUpperCase().trim(),
      cashbackPercent: parseFloat(form.cashbackPercent),
    };
    try {
      const url = editing
        ? `${API}/admin/distributors/${editing.id}`
        : `${API}/admin/distributors`;
      const method = editing ? 'PATCH' : 'POST';
      const res = await adminFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message ?? 'Erro ao salvar');
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: '1.5px solid var(--border)',
    borderRadius: 8,
    fontSize: 14,
    color: 'var(--text)',
    background: 'var(--surface)',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'Inter, sans-serif',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--sub)',
    marginBottom: 4,
    display: 'block',
  };

  const errStyle: React.CSSProperties = {
    fontSize: 12,
    color: 'var(--red)',
    marginTop: 3,
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(10,22,40,0.45)',
          zIndex: 40,
        }}
      />
      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(480px, 100vw)',
          background: 'var(--surface)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-4px 0 32px rgba(10,22,40,.18)',
        }}
      >
        {/* Panel header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>Operações</p>
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontFamily: 'Sora, sans-serif',
                fontWeight: 800,
                color: 'var(--text)',
              }}
            >
              {editing ? 'Editar Distribuidora' : 'Nova Distribuidora'}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--muted)',
              padding: 4,
              borderRadius: 6,
              display: 'flex',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{ flex: 1, overflowY: 'auto', padding: '24px' }}
        >
          {serverError && (
            <div
              style={{
                background: 'var(--red-dim)',
                color: 'var(--red)',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 13,
                marginBottom: 20,
              }}
            >
              {serverError}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Nome */}
            <div>
              <label style={labelStyle}>Nome *</label>
              <input
                value={form.name}
                onChange={(e) => field('name', e.target.value)}
                placeholder="Razão social ou nome fantasia"
                style={{ ...inputStyle, borderColor: errors.name ? 'var(--red)' : undefined }}
              />
              {errors.name && <span style={errStyle}>{errors.name}</span>}
            </div>

            {/* CNPJ */}
            <div>
              <label style={labelStyle}>CNPJ *</label>
              <input
                value={form.cnpj}
                onChange={(e) => field('cnpj', formatCNPJ(e.target.value))}
                placeholder="00.000.000/0000-00"
                style={{ ...inputStyle, borderColor: errors.cnpj ? 'var(--red)' : undefined }}
              />
              {errors.cnpj && <span style={errStyle}>{errors.cnpj}</span>}
            </div>

            {/* Phone + Email row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Telefone *</label>
                <input
                  value={form.phone}
                  onChange={(e) => field('phone', formatPhone(e.target.value))}
                  placeholder="(11) 99999-9999"
                  style={{ ...inputStyle, borderColor: errors.phone ? 'var(--red)' : undefined }}
                />
                {errors.phone && <span style={errStyle}>{errors.phone}</span>}
              </div>
              <div>
                <label style={labelStyle}>E-mail</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => field('email', e.target.value)}
                  placeholder="contato@empresa.com"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* CEP */}
            <div>
              <label style={labelStyle}>CEP *</label>
              <input
                value={form.cep}
                onChange={(e) => field('cep', e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="00000-000"
                style={{ ...inputStyle, borderColor: errors.cep ? 'var(--red)' : undefined }}
              />
              {errors.cep && <span style={errStyle}>{errors.cep}</span>}
            </div>

            {/* Address */}
            <div>
              <label style={labelStyle}>Endereço *</label>
              <input
                value={form.address}
                onChange={(e) => field('address', e.target.value)}
                placeholder="Rua, número, complemento"
                style={{ ...inputStyle, borderColor: errors.address ? 'var(--red)' : undefined }}
              />
              {errors.address && <span style={errStyle}>{errors.address}</span>}
            </div>

            {/* Cidade + Estado */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 12 }}>
              <div>
                <label style={labelStyle}>Cidade *</label>
                <input
                  value={form.city}
                  onChange={(e) => field('city', e.target.value)}
                  placeholder="São Paulo"
                  style={{ ...inputStyle, borderColor: errors.city ? 'var(--red)' : undefined }}
                />
                {errors.city && <span style={errStyle}>{errors.city}</span>}
              </div>
              <div>
                <label style={labelStyle}>UF *</label>
                <input
                  value={form.state}
                  onChange={(e) => field('state', e.target.value.toUpperCase().slice(0, 2))}
                  placeholder="SP"
                  maxLength={2}
                  style={{ ...inputStyle, borderColor: errors.state ? 'var(--red)' : undefined }}
                />
                {errors.state && <span style={errStyle}>{errors.state}</span>}
              </div>
            </div>

            {/* Cashback */}
            <div>
              <label style={labelStyle}>Cashback % (0–20)</label>
              <input
                type="number"
                min={0}
                max={20}
                step={0.5}
                value={form.cashbackPercent}
                onChange={(e) => field('cashbackPercent', e.target.value)}
                style={{ ...inputStyle, borderColor: errors.cashbackPercent ? 'var(--red)' : undefined }}
              />
              {errors.cashbackPercent && (
                <span style={errStyle}>{errors.cashbackPercent}</span>
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: 12,
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: '1.5px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--sub)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={submitting}
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--flame)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {submitting && <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />}
            {editing ? 'Salvar Alterações' : 'Cadastrar'}
          </button>
        </div>
      </div>
    </>
  );
}

function DistributorCard({
  distributor,
  onEdit,
  onToggle,
}: {
  distributor: Distributor;
  onEdit: (d: Distributor) => void;
  onToggle: (d: Distributor) => void;
}) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p
            style={{
              margin: 0,
              fontWeight: 700,
              fontSize: 15,
              color: 'var(--text)',
            }}
          >
            {distributor.name}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
            {formatCNPJ(distributor.cnpj)}
          </p>
        </div>
        <StatusToggle distributor={distributor} onToggle={onToggle} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--sub)', fontSize: 13 }}>
          <MapPin size={13} />
          {distributor.city}/{distributor.state}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--sub)', fontSize: 13 }}>
          <Phone size={13} />
          {formatPhone(distributor.phone)}
        </div>
        {distributor.email && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--sub)', fontSize: 13 }}>
            <Mail size={13} />
            {distributor.email}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--flame)',
              background: 'var(--flame-dim)',
              padding: '3px 8px',
              borderRadius: 6,
            }}
          >
            {Math.round((distributor.cashbackPercent ?? 0) * 100)}% cashback
          </span>
          <StarRating rating={distributor.rating} />
        </div>
        <button
          onClick={() => onEdit(distributor)}
          style={{
            background: 'none',
            border: '1px solid var(--border)',
            borderRadius: 7,
            padding: '6px 12px',
            cursor: 'pointer',
            color: 'var(--sub)',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <Edit2 size={13} />
          Editar
        </button>
      </div>
    </div>
  );
}

export default function DistributorsPage() {
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<Distributor | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const fetchDistributors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (search) params.set('search', search);
      const res = await adminFetch(`${API}/admin/distributors?${params}`);
      if (!res.ok) throw new Error('Falha ao carregar');
      const data = await res.json();
      setDistributors(data);
    } catch {
      setDistributors([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(fetchDistributors, 300);
    return () => clearTimeout(timer);
  }, [fetchDistributors]);

  function handleEdit(d: Distributor) {
    setEditing(d);
    setPanelOpen(true);
  }

  function handleNew() {
    setEditing(null);
    setPanelOpen(true);
  }

  function handleToggle(updated: Distributor) {
    setDistributors((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  }

  function handleClose() {
    setPanelOpen(false);
    setEditing(null);
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--ground)',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@800&family=Inter:wght@400;500;600;700&display=swap');
        :root {
          --flame: #FF6524;
          --navy: #0A1628;
          --gold: #F2B825;
          --ground: #F4F6FA;
          --surface: #FFF;
          --surface-2: #F8FAFC;
          --border: #E2E8F0;
          --text: #0F2040;
          --sub: #475569;
          --muted: #94A3B8;
          --green: #22C55E;
          --green-dim: rgba(34,197,94,.10);
          --red: #EF4444;
          --red-dim: rgba(239,68,68,.10);
          --amber: #F59E0B;
          --amber-dim: rgba(245,158,11,.10);
          --shadow: 0 1px 3px rgba(10,22,40,.07);
          --shadow-md: 0 4px 16px rgba(10,22,40,.10);
          --flame-dim: rgba(255,101,36,.10);
        }
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus { border-color: var(--flame) !important; box-shadow: 0 0 0 3px var(--flame-dim); }
      `}</style>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '20px 16px' : '32px 32px' }}>
        {/* Page header */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Operações
          </p>
          <h1
            style={{
              margin: '4px 0 0',
              fontSize: isMobile ? 26 : 32,
              fontFamily: 'Sora, sans-serif',
              fontWeight: 800,
              color: 'var(--text)',
            }}
          >
            Distribuidoras
          </h1>
        </div>

        {/* Top bar */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginBottom: 24,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ position: 'relative', flex: 1, minWidth: isMobile ? '100%' : 280 }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--muted)',
              }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou CNPJ..."
              style={{
                width: '100%',
                padding: '10px 12px 10px 38px',
                border: '1.5px solid var(--border)',
                borderRadius: 9,
                fontSize: 14,
                color: 'var(--text)',
                background: 'var(--surface)',
                outline: 'none',
                fontFamily: 'Inter, sans-serif',
              }}
            />
          </div>
          <button
            onClick={handleNew}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '10px 18px',
              background: 'var(--flame)',
              color: '#fff',
              border: 'none',
              borderRadius: 9,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            <Plus size={16} />
            Nova Distribuidora
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: 240,
              color: 'var(--muted)',
              gap: 10,
            }}
          >
            <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 14 }}>Carregando distribuidoras...</span>
          </div>
        ) : distributors.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: 280,
              gap: 12,
              color: 'var(--muted)',
            }}
          >
            <Building2 size={48} strokeWidth={1.2} />
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--sub)' }}>
              Nenhuma distribuidora cadastrada
            </p>
            <p style={{ margin: 0, fontSize: 13 }}>
              {search
                ? 'Tente outro termo de busca'
                : 'Clique em "Nova Distribuidora" para começar'}
            </p>
          </div>
        ) : isMobile ? (
          /* Mobile card list */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {distributors.map((d) => (
              <DistributorCard
                key={d.id}
                distributor={d}
                onEdit={handleEdit}
                onToggle={handleToggle}
              />
            ))}
          </div>
        ) : (
          /* Desktop table */
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: 14,
              border: '1px solid var(--border)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow)',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                    {['Nome / CNPJ', 'Cidade / UF', 'Telefone', 'Cashback %', 'Avaliação', 'Status', 'Ações'].map(
                      (h) => (
                        <th
                          key={h}
                          style={{
                            padding: '12px 16px',
                            textAlign: 'left',
                            fontSize: 12,
                            fontWeight: 700,
                            color: 'var(--muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {distributors.map((d, i) => (
                    <tr
                      key={d.id}
                      style={{
                        borderBottom: i < distributors.length - 1 ? '1px solid var(--border)' : 'none',
                        transition: 'background .1s',
                      }}
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLElement).style.background = 'var(--surface-2)')
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLElement).style.background = 'transparent')
                      }
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
                          {d.name}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                          {formatCNPJ(d.cnpj)}
                        </p>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--sub)' }}>
                        {d.city}/{d.state}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--sub)', whiteSpace: 'nowrap' }}>
                        {formatPhone(d.phone)}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: 'var(--flame)',
                            background: 'var(--flame-dim)',
                            padding: '3px 8px',
                            borderRadius: 6,
                          }}
                        >
                          {Math.round((d.cashbackPercent ?? 0) * 100)}%
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <StarRating rating={d.rating} />
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <StatusToggle distributor={d} onToggle={handleToggle} />
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <button
                          onClick={() => handleEdit(d)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '6px 12px',
                            border: '1px solid var(--border)',
                            borderRadius: 7,
                            background: 'none',
                            color: 'var(--sub)',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            fontFamily: 'Inter, sans-serif',
                          }}
                        >
                          <Edit2 size={13} />
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <SlidePanel
        open={panelOpen}
        onClose={handleClose}
        editing={editing}
        onSuccess={fetchDistributors}
      />
    </div>
  );
}
