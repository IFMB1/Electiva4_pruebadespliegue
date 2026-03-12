import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarRange,
  Download,
  FileSpreadsheet,
  Filter,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  reportsService,
  type CashClosuresReport,
  type CollectionSummaryReport,
  type MovementHistoryReport,
  type PortfolioStatusReport,
  type ReportCollector,
} from '../../services/reports.service';
import { exportToExcel, exportToPdf } from '../../services/exporters';

type ReportTab = 'collection' | 'portfolio' | 'movements' | 'closures';

interface FiltersState {
  from: string;
  to: string;
  collectorId: string;
}

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

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
  }).format(new Date(value));
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDefaultFilters(): FiltersState {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);
  return {
    from: toDateInputValue(start),
    to: toDateInputValue(end),
    collectorId: '',
  };
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('collection');
  const [filters, setFilters] = useState<FiltersState>(getDefaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<FiltersState>(getDefaultFilters);

  const collectorsQuery = useQuery({
    queryKey: ['reports', 'collectors'],
    queryFn: async () => {
      const response = await reportsService.getCollectors();
      return response.data.data as ReportCollector[];
    },
  });

  const reportQuery = useQuery({
    queryKey: ['reports', activeTab, appliedFilters],
    queryFn: async () => {
      const baseParams = {
        from: appliedFilters.from || undefined,
        to: appliedFilters.to || undefined,
        collectorId: appliedFilters.collectorId || undefined,
      };

      if (activeTab === 'collection') {
        const response = await reportsService.getCollectionSummary(baseParams);
        return {
          type: 'collection' as const,
          data: response.data.data as CollectionSummaryReport,
        };
      }

      if (activeTab === 'portfolio') {
        const response = await reportsService.getPortfolioStatus({
          collectorId: baseParams.collectorId,
        });
        return {
          type: 'portfolio' as const,
          data: response.data.data as PortfolioStatusReport,
        };
      }

      if (activeTab === 'movements') {
        const response = await reportsService.getMovementHistory(baseParams);
        return {
          type: 'movements' as const,
          data: response.data.data as MovementHistoryReport,
        };
      }

      const response = await reportsService.getCashClosures(baseParams);
      return {
        type: 'closures' as const,
        data: response.data.data as CashClosuresReport,
      };
    },
  });

  const collectors = collectorsQuery.data || [];
  const selectedCollectorName = useMemo(() => {
    if (!appliedFilters.collectorId) return 'Todos los cobradores';
    return (
      collectors.find((collector) => collector.id === appliedFilters.collectorId)?.name ||
      'Cobrador filtrado'
    );
  }, [collectors, appliedFilters.collectorId]);

  const exportSubtitle = `Filtro cobrador: ${selectedCollectorName}${
    activeTab !== 'portfolio'
      ? ` | Rango: ${appliedFilters.from || '-'} a ${appliedFilters.to || '-'}`
      : ''
  }`;

  const handleApplyFilters = () => {
    setAppliedFilters(filters);
  };

  const handleExportExcel = () => {
    if (!reportQuery.data) return;

    try {
      if (reportQuery.data.type === 'collection') {
        exportToExcel({
          filename: `reporte_cobranza_${appliedFilters.from}_${appliedFilters.to}`,
          title: 'Resumen de cobranza',
          subtitle: exportSubtitle,
          rows: reportQuery.data.data.rows,
          columns: [
            { header: 'Cobrador', value: (row) => row.collectorName },
            { header: 'Telefono', value: (row) => row.collectorPhone },
            { header: 'Cobrado', value: (row) => row.totalCollected },
            { header: 'Gastos', value: (row) => row.totalExpenses },
            { header: 'Neto', value: (row) => row.net },
          ],
        });
      } else if (reportQuery.data.type === 'portfolio') {
        exportToExcel({
          filename: 'reporte_estado_cartera',
          title: 'Estado de cartera',
          subtitle: exportSubtitle,
          rows: reportQuery.data.data.rows,
          columns: [
            { header: 'Prestamo', value: (row) => row.loanNumber },
            { header: 'Cliente', value: (row) => row.clientName },
            { header: 'Cedula', value: (row) => row.clientCedula },
            { header: 'Cobrador', value: (row) => row.collectorName },
            { header: 'Monto original', value: (row) => row.principalAmount },
            { header: 'Pagado', value: (row) => row.paidAmount },
            { header: 'Pendiente', value: (row) => row.remainingAmount },
          ],
        });
      } else if (reportQuery.data.type === 'movements') {
        exportToExcel({
          filename: `reporte_movimientos_${appliedFilters.from}_${appliedFilters.to}`,
          title: 'Historial de movimientos',
          subtitle: exportSubtitle,
          rows: reportQuery.data.data.rows,
          columns: [
            { header: 'Fecha', value: (row) => formatDateTime(row.timestamp) },
            { header: 'Tipo', value: (row) => row.type },
            { header: 'Cobrador', value: (row) => row.collectorName },
            { header: 'Cliente', value: (row) => row.clientName || '-' },
            { header: 'Prestamo', value: (row) => row.loanNumber || '-' },
            { header: 'Categoria', value: (row) => row.category || '-' },
            { header: 'Monto', value: (row) => row.amount },
          ],
        });
      } else {
        exportToExcel({
          filename: `reporte_cierres_${appliedFilters.from}_${appliedFilters.to}`,
          title: 'Cierres de caja',
          subtitle: exportSubtitle,
          rows: reportQuery.data.data.rows,
          columns: [
            { header: 'Fecha negocio', value: (row) => row.businessDate },
            { header: 'Cobrador', value: (row) => row.collectorName },
            { header: 'Tipo cierre', value: (row) => (row.isAutoClosed ? 'Automatico' : 'Manual') },
            { header: 'Cobrado', value: (row) => row.totalCollected },
            { header: 'Gastos', value: (row) => row.totalExpenses },
            { header: 'Neto', value: (row) => row.net },
            { header: 'Cerrado en', value: (row) => formatDateTime(row.closedAt) },
          ],
        });
      }

      toast.success('Reporte exportado en Excel');
    } catch (error: any) {
      toast.error(error.message || 'No se pudo exportar en Excel');
    }
  };

  const handleExportPdf = () => {
    if (!reportQuery.data) return;

    try {
      if (reportQuery.data.type === 'collection') {
        exportToPdf({
          filename: `reporte_cobranza_${appliedFilters.from}_${appliedFilters.to}`,
          title: 'Resumen de cobranza',
          subtitle: exportSubtitle,
          rows: reportQuery.data.data.rows,
          columns: [
            { header: 'Cobrador', value: (row) => row.collectorName },
            { header: 'Telefono', value: (row) => row.collectorPhone },
            { header: 'Cobrado', value: (row) => formatCurrency(row.totalCollected) },
            { header: 'Gastos', value: (row) => formatCurrency(row.totalExpenses) },
            { header: 'Neto', value: (row) => formatCurrency(row.net) },
          ],
        });
      } else if (reportQuery.data.type === 'portfolio') {
        exportToPdf({
          filename: 'reporte_estado_cartera',
          title: 'Estado de cartera',
          subtitle: exportSubtitle,
          rows: reportQuery.data.data.rows,
          columns: [
            { header: 'Prestamo', value: (row) => row.loanNumber },
            { header: 'Cliente', value: (row) => row.clientName },
            { header: 'Cobrador', value: (row) => row.collectorName },
            { header: 'Original', value: (row) => formatCurrency(row.principalAmount) },
            { header: 'Pagado', value: (row) => formatCurrency(row.paidAmount) },
            { header: 'Pendiente', value: (row) => formatCurrency(row.remainingAmount) },
          ],
        });
      } else if (reportQuery.data.type === 'movements') {
        exportToPdf({
          filename: `reporte_movimientos_${appliedFilters.from}_${appliedFilters.to}`,
          title: 'Historial de movimientos',
          subtitle: exportSubtitle,
          rows: reportQuery.data.data.rows,
          columns: [
            { header: 'Fecha', value: (row) => formatDateTime(row.timestamp) },
            { header: 'Tipo', value: (row) => row.type },
            { header: 'Cobrador', value: (row) => row.collectorName },
            { header: 'Detalle', value: (row) => row.description || '-' },
            { header: 'Monto', value: (row) => formatCurrency(row.amount) },
          ],
        });
      } else {
        exportToPdf({
          filename: `reporte_cierres_${appliedFilters.from}_${appliedFilters.to}`,
          title: 'Cierres de caja',
          subtitle: exportSubtitle,
          rows: reportQuery.data.data.rows,
          columns: [
            { header: 'Fecha negocio', value: (row) => row.businessDate },
            { header: 'Cobrador', value: (row) => row.collectorName },
            { header: 'Tipo', value: (row) => (row.isAutoClosed ? 'Automatico' : 'Manual') },
            { header: 'Cobrado', value: (row) => formatCurrency(row.totalCollected) },
            { header: 'Gastos', value: (row) => formatCurrency(row.totalExpenses) },
            { header: 'Neto', value: (row) => formatCurrency(row.net) },
          ],
        });
      }

      toast.success('Se abrio la vista de impresion para PDF');
    } catch (error: any) {
      toast.error(error.message || 'No se pudo exportar en PDF');
    }
  };

  return (
    <div
      style={{
        background:
          'radial-gradient(ellipse at 10% 0%, rgba(37,99,235,0.08) 0%, transparent 50%), radial-gradient(ellipse at 90% 80%, rgba(124,58,237,0.06) 0%, transparent 50%), #0c1220',
        minHeight: '100dvh',
        padding: '20px 16px 32px',
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: 'white', fontWeight: 700, fontSize: '22px' }}>Reportes</h1>
        <p style={{ marginTop: 4, color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
          Genera y exporta reportes de cobranza, cartera, movimientos y cierres.
        </p>
      </div>

      <section
        style={{
          marginBottom: 24,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 20,
          padding: 16,
        }}
      >
        <div className="mb-4 flex flex-wrap gap-2">
          <TabButton
            label="Resumen cobranza"
            active={activeTab === 'collection'}
            onClick={() => setActiveTab('collection')}
          />
          <TabButton
            label="Estado cartera"
            active={activeTab === 'portfolio'}
            onClick={() => setActiveTab('portfolio')}
          />
          <TabButton
            label="Movimientos"
            active={activeTab === 'movements'}
            onClick={() => setActiveTab('movements')}
          />
          <TabButton
            label="Cierres de caja"
            active={activeTab === 'closures'}
            onClick={() => setActiveTab('closures')}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: 6,
                color: 'rgba(255,255,255,0.35)',
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Cobrador
            </label>
            <select
              value={filters.collectorId}
              onChange={(event) =>
                setFilters((current) => ({ ...current, collectorId: event.target.value }))
              }
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                color: 'rgba(255,255,255,0.85)',
                padding: '10px 14px',
                outline: 'none',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6';
                e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <option value="">Todos</option>
              {collectors.map((collector) => (
                <option key={collector.id} value={collector.id}>
                  {collector.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                marginBottom: 6,
                color: 'rgba(255,255,255,0.35)',
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Fecha desde
            </label>
            <input
              type="date"
              value={filters.from}
              onChange={(event) =>
                setFilters((current) => ({ ...current, from: event.target.value }))
              }
              disabled={activeTab === 'portfolio'}
              style={{
                width: '100%',
                background: activeTab === 'portfolio' ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                color: activeTab === 'portfolio' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.85)',
                padding: '10px 14px',
                outline: 'none',
              }}
              onFocus={(e) => {
                if (activeTab !== 'portfolio') {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)';
                }
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                marginBottom: 6,
                color: 'rgba(255,255,255,0.35)',
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Fecha hasta
            </label>
            <input
              type="date"
              value={filters.to}
              onChange={(event) =>
                setFilters((current) => ({ ...current, to: event.target.value }))
              }
              disabled={activeTab === 'portfolio'}
              style={{
                width: '100%',
                background: activeTab === 'portfolio' ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                color: activeTab === 'portfolio' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.85)',
                padding: '10px 14px',
                outline: 'none',
              }}
              onFocus={(e) => {
                if (activeTab !== 'portfolio') {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)';
                }
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={handleApplyFilters}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#2563eb',
                color: 'white',
                padding: '10px 16px',
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 12,
                border: 'none',
                boxShadow: '0 4px 16px rgba(37,99,235,0.35)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 6px 24px rgba(37,99,235,0.55)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(37,99,235,0.35)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <Filter size={16} />
              Aplicar
            </button>
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            borderTop: '1px solid rgba(255,255,255,0.06)',
            paddingTop: 16,
          }}
        >
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
            Filtros activos: {selectedCollectorName}
            {activeTab !== 'portfolio' &&
              ` | ${appliedFilters.from || '-'} a ${appliedFilters.to || '-'}`}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleExportExcel}
              disabled={!reportQuery.data || reportQuery.isLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(34,197,94,0.08)',
                border: '1px solid rgba(34,197,94,0.2)',
                color: '#4ade80',
                padding: '8px 16px',
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 10,
                cursor: reportQuery.data && !reportQuery.isLoading ? 'pointer' : 'not-allowed',
                opacity: reportQuery.data && !reportQuery.isLoading ? 1 : 0.6,
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                if (reportQuery.data && !reportQuery.isLoading) {
                  e.currentTarget.style.background = 'rgba(34,197,94,0.15)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(34,197,94,0.08)';
              }}
            >
              <FileSpreadsheet size={16} />
              Excel
            </button>
            <button
              onClick={handleExportPdf}
              disabled={!reportQuery.data || reportQuery.isLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#f87171',
                padding: '8px 16px',
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 10,
                cursor: reportQuery.data && !reportQuery.isLoading ? 'pointer' : 'not-allowed',
                opacity: reportQuery.data && !reportQuery.isLoading ? 1 : 0.6,
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                if (reportQuery.data && !reportQuery.isLoading) {
                  e.currentTarget.style.background = 'rgba(239,68,68,0.15)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(239,68,68,0.08)';
              }}
            >
              <Download size={16} />
              PDF
            </button>
          </div>
        </div>
      </section>

      <section
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 20,
          overflow: 'hidden',
        }}
      >
        {reportQuery.isLoading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 224,
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            <Loader2 size={20} className="animate-spin" style={{ marginRight: 8, color: '#3b82f6' }} />
            Generando reporte...
          </div>
        ) : reportQuery.data?.type === 'collection' ? (
          <CollectionSummaryView report={reportQuery.data.data} />
        ) : reportQuery.data?.type === 'portfolio' ? (
          <PortfolioStatusView report={reportQuery.data.data} />
        ) : reportQuery.data?.type === 'movements' ? (
          <MovementsView report={reportQuery.data.data} />
        ) : reportQuery.data?.type === 'closures' ? (
          <CashClosuresView report={reportQuery.data.data} />
        ) : (
          <div
            style={{
              padding: '64px 24px',
              textAlign: 'center',
              color: 'rgba(255,255,255,0.25)',
            }}
          >
            <CalendarRange style={{ margin: '0 auto 8px', display: 'block', width: 24, height: 24 }} />
            Sin datos para mostrar.
          </div>
        )}
      </section>
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={
        active
          ? {
              background: 'rgba(37,99,235,0.2)',
              border: '1px solid rgba(59,130,246,0.3)',
              color: '#93c5fd',
              borderRadius: 10,
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }
          : {
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              padding: '8px 14px',
              color: 'rgba(255,255,255,0.45)',
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }
      }
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
          e.currentTarget.style.color = 'rgba(255,255,255,0.75)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
          e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
        }
      }}
    >
      {label}
    </button>
  );
}

function CollectionSummaryView({ report }: { report: CollectionSummaryReport }) {
  return (
    <div>
      <div
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '16px 20px',
        }}
      >
        <Metric label="Cobrado total" value={formatCurrency(report.totals.totalCollected)} />
        <Metric label="Gastos total" value={formatCurrency(report.totals.totalExpenses)} />
        <Metric label="Neto total" value={formatCurrency(report.totals.net)} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <th style={{ padding: '12px 20px', color: 'rgba(255,255,255,0.35)', fontSize: 10, letterSpacing: '0.08em' }}>Cobrador</th>
              <th style={{ padding: '12px 20px', color: 'rgba(255,255,255,0.35)', fontSize: 10, letterSpacing: '0.08em' }}>Telefono</th>
              <th style={{ padding: '12px 20px', color: 'rgba(255,255,255,0.35)', fontSize: 10, letterSpacing: '0.08em' }}>Cobrado</th>
              <th style={{ padding: '12px 20px', color: 'rgba(255,255,255,0.35)', fontSize: 10, letterSpacing: '0.08em' }}>Gastos</th>
              <th style={{ padding: '12px 20px', color: 'rgba(255,255,255,0.35)', fontSize: 10, letterSpacing: '0.08em' }}>Neto</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '32px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                  Sin resultados para este filtro.
                </td>
              </tr>
            ) : (
              report.rows.map((row) => (
                <tr
                  key={row.collectorId}
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <td style={{ padding: '12px 20px' }}>
                    <p style={{ fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{row.collectorName}</p>
                  </td>
                  <td style={{ padding: '12px 20px', color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>{row.collectorPhone}</td>
                  <td style={{ padding: '12px 20px', color: '#4ade80' }}>{formatCurrency(row.totalCollected)}</td>
                  <td style={{ padding: '12px 20px', color: '#f87171' }}>{formatCurrency(row.totalExpenses)}</td>
                  <td style={{ padding: '12px 20px', fontWeight: 600, color: 'white' }}>{formatCurrency(row.net)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PortfolioStatusView({ report }: { report: PortfolioStatusReport }) {
  return (
    <div>
      <div
        className="grid grid-cols-1 gap-3 sm:grid-cols-4"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '16px 20px',
        }}
      >
        <Metric label="Prestamos activos" value={String(report.totals.activeLoans)} />
        <Metric label="Capital colocado" value={formatCurrency(report.totals.totalPrincipal)} />
        <Metric label="Total pagado" value={formatCurrency(report.totals.totalPaid)} />
        <Metric label="Total pendiente" value={formatCurrency(report.totals.totalRemaining)} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <th style={{ padding: '12px 20px', color: 'rgba(255,255,255,0.35)', fontSize: 10, letterSpacing: '0.08em' }}>Prestamo</th>
              <th style={{ padding: '12px 20px', color: 'rgba(255,255,255,0.35)', fontSize: 10, letterSpacing: '0.08em' }}>Cliente</th>
              <th style={{ padding: '12px 20px', color: 'rgba(255,255,255,0.35)', fontSize: 10, letterSpacing: '0.08em' }}>Cobrador</th>
              <th style={{ padding: '12px 20px', color: 'rgba(255,255,255,0.35)', fontSize: 10, letterSpacing: '0.08em' }}>Original</th>
              <th style={{ padding: '12px 20px', color: 'rgba(255,255,255,0.35)', fontSize: 10, letterSpacing: '0.08em' }}>Pagado</th>
              <th style={{ padding: '12px 20px', color: 'rgba(255,255,255,0.35)', fontSize: 10, letterSpacing: '0.08em' }}>Pendiente</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '32px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                  Sin prestamos activos para este filtro.
                </td>
              </tr>
            ) : (
              report.rows.map((row) => (
                <tr
                  key={row.loanId}
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <td style={{ padding: '12px 20px' }}>
                    <p style={{ fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{row.loanNumber}</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Inicio: {formatDate(row.disbursedAt)}</p>
                  </td>
                  <td style={{ padding: '12px 20px' }}>
                    <p style={{ color: 'rgba(255,255,255,0.8)' }}>{row.clientName}</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{row.clientCedula}</p>
                  </td>
                  <td style={{ padding: '12px 20px', color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>{row.collectorName}</td>
                  <td style={{ padding: '12px 20px', color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>{formatCurrency(row.principalAmount)}</td>
                  <td style={{ padding: '12px 20px', color: '#4ade80' }}>{formatCurrency(row.paidAmount)}</td>
                  <td style={{ padding: '12px 20px', fontWeight: 600, color: 'white' }}>{formatCurrency(row.remainingAmount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MovementsView({ report }: { report: MovementHistoryReport }) {
  return (
    <div>
      <div
        className="grid grid-cols-1 gap-3 sm:grid-cols-4"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '16px 20px',
        }}
      >
        <Metric label="Movimientos" value={String(report.totals.movementsCount)} />
        <Metric label="Cobrado" value={formatCurrency(report.totals.totalCollected)} />
        <Metric label="Gastos" value={formatCurrency(report.totals.totalExpenses)} />
        <Metric label="Neto" value={formatCurrency(report.totals.net)} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <th style={{ padding: '12px 20px', color: 'rgba(255,255,255,0.35)', fontSize: 10, letterSpacing: '0.08em' }}>Fecha y hora</th>
              <th style={{ padding: '12px 20px', color: 'rgba(255,255,255,0.35)', fontSize: 10, letterSpacing: '0.08em' }}>Tipo</th>
              <th style={{ padding: '12px 20px', color: 'rgba(255,255,255,0.35)', fontSize: 10, letterSpacing: '0.08em' }}>Cobrador</th>
              <th style={{ padding: '12px 20px', color: 'rgba(255,255,255,0.35)', fontSize: 10, letterSpacing: '0.08em' }}>Detalle</th>
              <th style={{ padding: '12px 20px', color: 'rgba(255,255,255,0.35)', fontSize: 10, letterSpacing: '0.08em' }}>Monto</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '32px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                  Sin movimientos para este rango.
                </td>
              </tr>
            ) : (
              report.rows.map((row) => (
                <tr
                  key={row.id}
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <td style={{ padding: '12px 20px', color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>{formatDateTime(row.timestamp)}</td>
                  <td style={{ padding: '12px 20px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        borderRadius: 9999,
                        padding: '2px 10px',
                        fontSize: 12,
                        fontWeight: 600,
                        ...(row.type === 'PAYMENT'
                          ? { background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' }
                          : { background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }),
                      }}
                    >
                      {row.type === 'PAYMENT' ? 'Cobro' : 'Gasto'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 20px', color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>{row.collectorName}</td>
                  <td style={{ padding: '12px 20px' }}>
                    <p style={{ color: 'rgba(255,255,255,0.8)' }}>{row.description || '-'}</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                      {row.clientName ? `${row.clientName} / ${row.loanNumber}` : row.category || '-'}
                    </p>
                  </td>
                  <td style={{ padding: '12px 20px', fontWeight: 600, color: 'white' }}>{formatCurrency(row.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CashClosuresView({ report }: { report: CashClosuresReport }) {
  return (
    <div>
      <div
        className="grid grid-cols-1 gap-3 sm:grid-cols-4"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '16px 20px',
        }}
      >
        <Metric label="Cierres" value={String(report.totals.closuresCount)} />
        <Metric label="Manuales" value={String(report.totals.manualClosures)} />
        <Metric label="Automaticos" value={String(report.totals.autoClosures)} />
        <Metric label="Neto total" value={formatCurrency(report.totals.totalNet)} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <th style={{ padding: '12px 20px', color: 'rgba(255,255,255,0.35)', fontSize: 10, letterSpacing: '0.08em' }}>Fecha negocio</th>
              <th style={{ padding: '12px 20px', color: 'rgba(255,255,255,0.35)', fontSize: 10, letterSpacing: '0.08em' }}>Cobrador</th>
              <th style={{ padding: '12px 20px', color: 'rgba(255,255,255,0.35)', fontSize: 10, letterSpacing: '0.08em' }}>Tipo cierre</th>
              <th style={{ padding: '12px 20px', color: 'rgba(255,255,255,0.35)', fontSize: 10, letterSpacing: '0.08em' }}>Cobrado</th>
              <th style={{ padding: '12px 20px', color: 'rgba(255,255,255,0.35)', fontSize: 10, letterSpacing: '0.08em' }}>Gastos</th>
              <th style={{ padding: '12px 20px', color: 'rgba(255,255,255,0.35)', fontSize: 10, letterSpacing: '0.08em' }}>Neto</th>
              <th style={{ padding: '12px 20px', color: 'rgba(255,255,255,0.35)', fontSize: 10, letterSpacing: '0.08em' }}>Cerrado en</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '32px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                  Sin cierres en este periodo.
                </td>
              </tr>
            ) : (
              report.rows.map((row) => (
                <tr
                  key={row.shiftId}
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <td style={{ padding: '12px 20px', color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>{row.businessDate}</td>
                  <td style={{ padding: '12px 20px', color: 'rgba(255,255,255,0.8)' }}>{row.collectorName}</td>
                  <td style={{ padding: '12px 20px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        borderRadius: 9999,
                        padding: '2px 10px',
                        fontSize: 12,
                        fontWeight: 600,
                        ...(row.isAutoClosed
                          ? { background: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)' }
                          : { background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' }),
                      }}
                    >
                      {row.isAutoClosed ? 'Automatico' : 'Manual'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 20px', color: '#4ade80' }}>{formatCurrency(row.totalCollected)}</td>
                  <td style={{ padding: '12px 20px', color: '#f87171' }}>{formatCurrency(row.totalExpenses)}</td>
                  <td style={{ padding: '12px 20px', fontWeight: 600, color: 'white' }}>{formatCurrency(row.net)}</td>
                  <td style={{ padding: '12px 20px', color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>{formatDateTime(row.closedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14,
        padding: '12px 14px',
      }}
    >
      <p
        style={{
          marginBottom: 4,
          color: 'rgba(255,255,255,0.35)',
          fontSize: 10,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </p>
      <p style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>{value}</p>
    </div>
  );
}
