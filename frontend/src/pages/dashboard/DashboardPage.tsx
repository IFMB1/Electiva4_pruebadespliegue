import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Clock3,
  Loader2,
  Users,
  Wallet,
  WalletCards,
  TrendingUp,
} from 'lucide-react';
import {
  dashboardService,
  type DashboardCollectorStatus,
  type DashboardOverview,
} from '../../services/dashboard.service';

function formatCurrency(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function shiftStatusLabel(status: DashboardCollectorStatus['shiftStatus']) {
  if (status === 'OPEN') return 'Caja abierta';
  if (status === 'CLOSED') return 'Caja cerrada';
  if (status === 'AUTO_CLOSED') return 'Auto cerrada';
  return 'Sin apertura';
}

function shiftStatusStyle(status: DashboardCollectorStatus['shiftStatus']): React.CSSProperties {
  if (status === 'OPEN') return { background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' };
  if (status === 'CLOSED') return { background: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)' };
  if (status === 'AUTO_CLOSED') return { background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.25)' };
  return { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' };
}

/* ── shared section card style ── */
const sectionCard: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.07)',
  borderRadius: '20px',
  overflow: 'hidden',
};

const sectionHeader: React.CSSProperties = {
  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  padding: '16px',
};

export default function DashboardPage() {
  const overviewQuery = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: async () => {
      const response = await dashboardService.getOverview();
      return response.data.data as DashboardOverview;
    },
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  const overview = overviewQuery.data;

  if (overviewQuery.isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '70vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'rgba(255,255,255,0.4)' }}>
          <Loader2 size={28} className="animate-spin" style={{ color: '#3b82f6' }} />
          <p style={{ fontSize: '14px', fontWeight: 500 }}>Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ borderRadius: '16px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', padding: '24px', color: '#f87171' }}>
          <p style={{ fontWeight: 600 }}>No se pudo cargar el dashboard.</p>
        </div>
      </div>
    );
  }

  const inactiveCollectors = overview.collectors.filter((c) => c.isInactive);

  return (
    /* ── 1. Page background ── */
    <div
      style={{
        background: `
          radial-gradient(ellipse at 10% 0%, rgba(37,99,235,0.08) 0%, transparent 50%),
          radial-gradient(ellipse at 90% 80%, rgba(124,58,237,0.06) 0%, transparent 50%),
          #0c1220
        `,
        minHeight: '100dvh',
        padding: '20px 16px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      {/* ── 2. Page header ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }} className="md:flex-row md:items-end md:justify-between">
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'white', margin: 0 }}>
            Dashboard General
          </h1>
          <p style={{ marginTop: '4px', fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: '4px 0 0' }}>
            Datos en tiempo real &mdash; {overview.businessDate}
          </p>
        </div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.2)',
            borderRadius: '999px',
            padding: '3px 10px',
            fontSize: '11px',
            color: '#4ade80',
            alignSelf: 'flex-start',
          }}
          className="md:self-auto"
        >
          <span style={{ display: 'inline-block', height: '6px', width: '6px', borderRadius: '50%', background: '#4ade80' }} className="animate-pulse" />
          Actualizado {formatDateTime(overview.generatedAt)}
        </div>
      </div>

      {/* ── 3. KPI cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Cobrado hoy"
          value={formatCurrency(overview.kpis.totalCollectedToday)}
          icon={<Wallet size={20} />}
          tone="green"
          trend="up"
        />
        <KpiCard
          title="Cartera activa"
          value={formatCurrency(overview.kpis.activePortfolioTotal)}
          icon={<WalletCards size={20} />}
          tone="blue"
        />
        <KpiCard
          title="Clientes activos"
          value={String(overview.kpis.activeClientsTotal)}
          icon={<Users size={20} />}
          tone="indigo"
        />
        <KpiCard
          title="Alertas sin leer"
          value={String(overview.unreadInactivityAlerts.total)}
          icon={<AlertTriangle size={20} />}
          tone={overview.unreadInactivityAlerts.total > 0 ? 'red' : 'gray'}
        />
      </div>

      {/* ── Inactive collectors warning ── */}
      {inactiveCollectors.length > 0 && (
        <div style={{ display: 'flex', gap: '12px', borderRadius: '16px', border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.08)', padding: '16px' }}>
          <AlertTriangle size={18} style={{ marginTop: '2px', flexShrink: 0, color: '#f87171' }} />
          <div>
            <p style={{ fontSize: '14px', fontWeight: 700, color: '#f87171' }}>
              Cobradores con mas de {overview.inactivityThresholdHours}h sin actividad
            </p>
            <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {inactiveCollectors.map((c) => (
                <span
                  key={c.id}
                  style={{ display: 'inline-flex', alignItems: 'center', borderRadius: '999px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', padding: '2px 12px', fontSize: '12px', fontWeight: 600, color: '#f87171' }}
                >
                  {c.name} ({c.hoursWithoutActivity}h)
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">

        {/* ── 4 & 5. Collectors table ── */}
        <section style={{ ...sectionCard }} className="xl:col-span-2">
          <div style={sectionHeader}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', margin: 0 }}>Estado de cobradores</h2>
            <p style={{ marginTop: '2px', fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>{overview.collectors.length} cobradores registrados</p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr>
                  {['Cobrador', 'Cobrado', 'Gastos', 'Neto', 'Ult. movimiento', 'Caja', 'Estado'].map((h) => (
                    <th
                      key={h}
                      style={{ padding: '8px 12px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.04)', whiteSpace: 'nowrap' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {overview.collectors.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '24px 0', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
                      No hay cobradores registrados.
                    </td>
                  </tr>
                ) : (
                  overview.collectors.map((collector) => (
                    <tr
                      key={collector.id}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px' }}>
                        <p style={{ fontWeight: 600, color: 'rgba(255,255,255,0.85)', margin: 0 }}>{collector.name}</p>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>{collector.phone}</p>
                      </td>
                      <td style={{ padding: '12px', fontWeight: 500, color: '#34d399', whiteSpace: 'nowrap' }}>
                        {formatCurrency(collector.totalCollectedToday)}
                      </td>
                      <td style={{ padding: '12px', color: '#f87171', whiteSpace: 'nowrap' }}>
                        {formatCurrency(collector.totalExpensesToday)}
                      </td>
                      <td style={{ padding: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap' }}>
                        {formatCurrency(collector.netToday)}
                      </td>
                      <td style={{ padding: '12px', color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap' }}>
                        {formatDateTime(collector.lastMovementAt)}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ display: 'inline-flex', borderRadius: '999px', padding: '2px 10px', fontSize: '11px', fontWeight: 600, ...shiftStatusStyle(collector.shiftStatus) }}>
                          {shiftStatusLabel(collector.shiftStatus)}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {collector.isInactive ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', borderRadius: '999px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', padding: '2px 10px', fontSize: '11px', fontWeight: 600, color: '#f87171', whiteSpace: 'nowrap' }}>
                            <span style={{ height: '6px', width: '6px', borderRadius: '50%', background: '#f87171' }} />
                            Inactivo ({collector.hoursWithoutActivity}h)
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', borderRadius: '999px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', padding: '2px 10px', fontSize: '11px', fontWeight: 600, color: '#34d399' }}>
                            <span style={{ height: '6px', width: '6px', borderRadius: '50%', background: '#34d399' }} />
                            Activo
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── 6. Alerts panel ── */}
        <section style={{ ...sectionCard }}>
          <div style={sectionHeader}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', margin: 0 }}>Notificaciones</h2>
              {overview.unreadInactivityAlerts.total > 0 && (
                <span style={{ display: 'flex', height: '20px', width: '20px', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: '#ef4444', fontSize: '10px', fontWeight: 700, color: 'white' }}>
                  {overview.unreadInactivityAlerts.total}
                </span>
              )}
            </div>
            <p style={{ marginTop: '2px', fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>Alertas de inactividad sin leer</p>
          </div>
          <div style={{ maxHeight: '480px', overflowY: 'auto' }}>
            {overview.unreadInactivityAlerts.items.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '24px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }}>
                  <AlertTriangle size={22} style={{ color: 'rgba(255,255,255,0.2)' }} />
                </div>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>Sin alertas por ahora</p>
              </div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {overview.unreadInactivityAlerts.items.map((item) => (
                  <li
                    key={item.id}
                    style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s', cursor: 'default' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', margin: 0 }}>{item.title}</p>
                    <p style={{ marginTop: '2px', fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: '2px 0 0' }}>{item.message}</p>
                    <p style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: '8px 0 0' }}>
                      <Clock3 size={11} />
                      {formatDateTime(item.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ── KPI Card component ── */
function KpiCard({
  title,
  value,
  icon,
  tone: _tone,
  trend,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  tone: 'green' | 'blue' | 'indigo' | 'red' | 'gray';
  trend?: 'up' | 'down';
}) {
  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '20px',
        padding: '16px',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
        cursor: 'default',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.background = 'rgba(255,255,255,0.07)';
        el.style.borderColor = 'rgba(255,255,255,0.12)';
        el.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.background = 'rgba(255,255,255,0.04)';
        el.style.borderColor = 'rgba(255,255,255,0.08)';
        el.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', margin: 0 }}>{title}</p>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', background: 'rgba(37,99,235,0.12)', padding: '8px', color: '#60a5fa' }}>
          {icon}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
        <p style={{ fontSize: '28px', fontWeight: 700, color: 'white', margin: 0, lineHeight: 1 }}>{value}</p>
        {trend === 'up' && (
          <span style={{ marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '2px', background: 'rgba(34,197,94,0.1)', color: '#4ade80', borderRadius: '999px', padding: '2px 8px', fontSize: '11px', fontWeight: 600 }}>
            <TrendingUp size={11} />
            Hoy
          </span>
        )}
      </div>
    </div>
  );
}
