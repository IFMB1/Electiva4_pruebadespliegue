import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  WalletCards,
} from 'lucide-react';
import { loansService } from '../../services/loans.service';
import { Link } from 'react-router-dom';

interface LoanRow {
  id: string;
  loanNumber: string;
  status: 'ACTIVE' | 'COMPLETED' | 'RENEWED' | 'DEFAULTED' | 'CANCELLED';
  principalAmount: number;
  interestRate: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  createdAt: string;
  disbursedAt: string;
  client: {
    id: string;
    name: string;
    cedula: string;
    phone: string;
  };
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function formatCurrency(value: number | string) {
  const amount = Number(value);
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number.isNaN(amount) ? 0 : amount);
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function statusStyle(status: string): React.CSSProperties {
  const s = status.toUpperCase();
  if (s === 'ACTIVE')    return { background: 'rgba(34,197,94,0.1)',   color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)'   };
  if (s === 'COMPLETED') return { background: 'rgba(37,99,235,0.12)',  color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)'  };
  if (s === 'RENEWED')   return { background: 'rgba(124,58,237,0.12)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.25)' };
  if (s === 'DEFAULTED') return { background: 'rgba(239,68,68,0.1)',   color: '#f87171', border: '1px solid rgba(239,68,68,0.25)'  };
  return { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' };
}

function statusLabel(status: string) {
  const s = status.toUpperCase();
  if (s === 'ACTIVE')    return 'Activo';
  if (s === 'COMPLETED') return 'Completado';
  if (s === 'RENEWED')   return 'Renovado';
  if (s === 'DEFAULTED') return 'En mora';
  if (s === 'CANCELLED') return 'Cancelado';
  return status;
}

const thStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.5)',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  padding: '14px 20px',
  whiteSpace: 'nowrap',
};

export default function LoansPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'COMPLETED' | 'RENEWED' | ''>('');
  const limit = 12;

  const loansQuery = useQuery({
    queryKey: ['loans', { page, limit, search, status }],
    queryFn: () =>
      loansService.getAll({
        page,
        limit,
        search: search || undefined,
        status: status || undefined,
      }),
  });

  const loans: LoanRow[] = loansQuery.data?.data?.data || [];
  const pagination: PaginationMeta | undefined = loansQuery.data?.data?.pagination;
  const totalPages = pagination?.totalPages || 1;
  const total = pagination?.total || loans.length;

  return (
    <div
      style={{
        background:
          'radial-gradient(ellipse at 10% 0%, rgba(37,99,235,0.08) 0%, transparent 50%), radial-gradient(ellipse at 90% 80%, rgba(124,58,237,0.06) 0%, transparent 50%), #0c1220',
        minHeight: '100dvh',
        padding: '28px 24px 48px',
      }}
    >
      {/* ── Encabezado ── */}
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            color: 'white', fontWeight: 800, fontSize: 28,
            letterSpacing: '-0.02em', margin: 0,
          }}
        >
          <WalletCards size={30} color="#3b82f6" />
          Mis prestamos
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 6 }}>
          Seguimiento de prestamos creados ({total} registros)
        </p>
      </div>

      {/* ── Filtros ── */}
      <div
        className="flex flex-col gap-3 sm:flex-row"
        style={{ marginBottom: 20 }}
      >
        {/* Buscador */}
        <div style={{ position: 'relative', maxWidth: 480, flex: 1 }}>
          <Search
            size={17}
            style={{
              position: 'absolute', left: 16, top: '50%',
              transform: 'translateY(-50%)',
              color: 'rgba(255,255,255,0.35)',
            }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por cliente o cedula..."
            className="w-full outline-none placeholder:text-white/20"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: 14, color: 'rgba(255,255,255,0.9)',
              fontSize: 14, padding: '11px 16px 11px 46px',
              transition: 'all 0.2s',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#3b82f6';
              e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(255,255,255,0.09)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Select estado */}
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as 'ACTIVE' | 'COMPLETED' | 'RENEWED' | '');
            setPage(1);
          }}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 14, color: 'rgba(255,255,255,0.85)',
            fontSize: 14, padding: '11px 16px',
            outline: 'none', cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#3b82f6';
            e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(255,255,255,0.09)';
            e.target.style.boxShadow = 'none';
          }}
        >
          <option value="" style={{ background: '#1e293b' }}>Todos los estados</option>
          <option value="ACTIVE" style={{ background: '#1e293b' }}>Activos</option>
          <option value="COMPLETED" style={{ background: '#1e293b' }}>Completados</option>
          <option value="RENEWED" style={{ background: '#1e293b' }}>Renovados</option>
        </select>
      </div>

      {/* ── Tabla ── */}
      <div
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 24, overflow: 'hidden',
          boxShadow: '0 20px 60px -12px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table className="w-full text-left text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  borderBottom: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <th style={thStyle}>Prestamo</th>
                <th style={thStyle}>Cliente</th>
                <th style={thStyle}>Estado</th>
                <th style={thStyle}>Saldo</th>
                <th style={thStyle}>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {loansQuery.isLoading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '48px 20px', textAlign: 'center' }}>
                    <div
                      style={{
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: 8,
                        color: 'rgba(255,255,255,0.35)',
                      }}
                    >
                      <Loader2 size={18} className="animate-spin" style={{ color: '#3b82f6' }} />
                      Cargando prestamos...
                    </div>
                  </td>
                </tr>
              ) : loans.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: '48px 20px', textAlign: 'center',
                      color: 'rgba(255,255,255,0.25)', fontSize: 14,
                    }}
                  >
                    No hay prestamos para mostrar
                  </td>
                </tr>
              ) : (
                loans.map((loan) => (
                  <tr
                    key={loan.id}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    {/* Préstamo */}
                    <td style={{ padding: '15px 20px' }}>
                      <p style={{ color: 'rgba(255,255,255,0.88)', fontWeight: 600, fontSize: 14 }}>
                        {loan.loanNumber}
                      </p>
                      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 2 }}>
                        Total: {formatCurrency(loan.totalAmount)}
                      </p>
                    </td>

                    {/* Cliente */}
                    <td style={{ padding: '15px 20px' }}>
                      <Link
                        to={`/clients/${loan.client.id}`}
                        style={{
                          color: '#93c5fd', fontWeight: 600, fontSize: 14,
                          textDecoration: 'none', transition: 'color 0.15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#60a5fa'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#93c5fd'; }}
                      >
                        {loan.client.name}
                      </Link>
                      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 2 }}>
                        {loan.client.cedula}
                      </p>
                    </td>

                    {/* Estado */}
                    <td style={{ padding: '15px 20px' }}>
                      <span
                        style={{
                          display: 'inline-flex', alignItems: 'center',
                          borderRadius: 999, padding: '3px 10px',
                          fontSize: 11, fontWeight: 700,
                          ...statusStyle(loan.status),
                        }}
                      >
                        {statusLabel(loan.status)}
                      </span>
                    </td>

                    {/* Saldo */}
                    <td style={{ padding: '15px 20px' }}>
                      <span style={{ color: '#4ade80', fontWeight: 700, fontSize: 15 }}>
                        {formatCurrency(loan.remainingAmount)}
                      </span>
                    </td>

                    {/* Fecha */}
                    <td style={{ padding: '15px 20px', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                      {formatDate(loan.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Paginación ── */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
              Pagina {page} de {totalPages}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => setPage((c) => Math.max(1, c - 1))}
                disabled={page <= 1}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '6px 14px', fontSize: 13,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10, color: 'rgba(255,255,255,0.5)',
                  opacity: page <= 1 ? 0.3 : 1,
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                }}
              >
                <ChevronLeft size={15} /> Anterior
              </button>
              <button
                onClick={() => setPage((c) => Math.min(totalPages, c + 1))}
                disabled={page >= totalPages}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '6px 14px', fontSize: 13,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10, color: 'rgba(255,255,255,0.5)',
                  opacity: page >= totalPages ? 0.3 : 1,
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                Siguiente <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}