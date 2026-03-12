import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Plus,
  Search,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { clientsService } from '../../services/clients.service';

interface LoanSummary {
  id: string;
  loanNumber: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  createdAt: string;
}

interface ClientListItem {
  id: string;
  name: string;
  cedula: string;
  phone: string;
  address: string;
  notes: string | null;
  isActive: boolean;
  lastContactAt: string;
  hasActiveLoan: boolean;
  activeLoan: LoanSummary | null;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const createClientSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido'),
  cedula: z.string().min(5, 'La cedula es requerida'),
  phone: z.string().min(7, 'El telefono debe tener al menos 7 digitos'),
  address: z.string().min(5, 'La direccion es requerida'),
  notes: z.string().max(500, 'Las notas no pueden superar 500 caracteres').optional(),
});

type CreateClientFormData = z.infer<typeof createClientSchema>;

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

const thStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.5)',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  padding: '14px 20px',
  whiteSpace: 'nowrap',
};

export default function ClientsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const limit = 12;

  const clientsQuery = useQuery({
    queryKey: ['clients', { page, limit, search }],
    queryFn: () => clientsService.getAll({ page, limit, search: search || undefined }),
  });

  const createClientMutation = useMutation({
    mutationFn: (data: CreateClientFormData) => clientsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente creado correctamente');
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'No se pudo crear el cliente');
    },
  });

  const clients: ClientListItem[] = useMemo(
    () => clientsQuery.data?.data?.data || [],
    [clientsQuery.data]
  );
  const pagination: PaginationMeta | undefined = clientsQuery.data?.data?.pagination;
  const totalPages = pagination?.totalPages || 1;
  const total = pagination?.total || clients.length;

  return (
    <div
      style={{
        background: 'radial-gradient(ellipse at 10% 0%, rgba(37,99,235,0.08) 0%, transparent 50%), radial-gradient(ellipse at 90% 80%, rgba(124,58,237,0.06) 0%, transparent 50%), #0c1220',
        minHeight: '100dvh',
        padding: '28px 24px 48px',
      }}
    >
      {/* ── Encabezado ── */}
      <div style={{ marginBottom: 28, display: 'flex', flexDirection: 'column', gap: 16 }}
        className="sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 style={{
            display: 'flex', alignItems: 'center', gap: 10,
            color: 'white', fontWeight: 800, fontSize: 28, letterSpacing: '-0.02em', margin: 0,
          }}>
            <Users size={30} color="#3b82f6" />
            Mis clientes
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 6 }}>
            Administra tu cartera de clientes ({total} registrados)
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            border: 'none', borderRadius: 14, color: 'white',
            fontSize: 14, fontWeight: 700, padding: '11px 22px',
            cursor: 'pointer', whiteSpace: 'nowrap', alignSelf: 'flex-start',
            boxShadow: '0 6px 20px -4px rgba(37,99,235,0.5)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 10px 28px -4px rgba(37,99,235,0.65)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 6px 20px -4px rgba(37,99,235,0.5)'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <Plus size={18} />
          Nuevo cliente
        </button>
      </div>

      {/* ── Buscador ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ position: 'relative', maxWidth: 480 }}>
          <Search size={17} style={{
            position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
            color: 'rgba(255,255,255,0.35)',
          }} />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por nombre o cedula..."
            className="w-full outline-none placeholder:text-white/20"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: 14, color: 'rgba(255,255,255,0.9)',
              fontSize: 14, padding: '11px 16px 11px 46px',
              transition: 'all 0.2s',
            }}
            onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; e.target.style.boxShadow = 'none'; }}
          />
        </div>
      </div>

      {/* ── Tabla ── */}
      <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 24, overflow: 'hidden',
        boxShadow: '0 20px 60px -12px rgba(0,0,0,0.5)',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="w-full text-left text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <th style={thStyle}>Cliente</th>
                <th style={thStyle}>Cedula</th>
                <th style={thStyle}>Prestamo activo</th>
                <th style={thStyle}>Ultimo contacto</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientsQuery.isLoading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '48px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'rgba(255,255,255,0.35)' }}>
                      <Loader2 size={18} className="animate-spin" style={{ color: '#3b82f6' }} />
                      Cargando clientes...
                    </div>
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '48px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 14 }}>
                    No hay clientes para mostrar
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr
                    key={client.id}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '15px 20px' }}>
                      <p style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>{client.name}</p>
                      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 2 }}>{client.phone}</p>
                    </td>
                    <td style={{ padding: '15px 20px', color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                      {client.cedula}
                    </td>
                    <td style={{ padding: '15px 20px' }}>
                      {client.hasActiveLoan && client.activeLoan ? (
                        <div>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center',
                            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
                            color: '#4ade80', borderRadius: 999, padding: '3px 10px',
                            fontSize: 11, fontWeight: 700,
                          }}>
                            Activo
                          </span>
                          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 5 }}>
                            Saldo: {formatCurrency(client.activeLoan.remainingAmount)}
                          </p>
                        </div>
                      ) : (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center',
                          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                          color: 'rgba(255,255,255,0.35)', borderRadius: 999, padding: '3px 10px',
                          fontSize: 11, fontWeight: 600,
                        }}>
                          Sin prestamo activo
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '15px 20px', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                      {formatDate(client.lastContactAt)}
                    </td>
                    <td style={{ padding: '15px 20px', textAlign: 'right' }}>
                      <Link
                        to={`/clients/${client.id}`}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 10, padding: '6px 14px',
                          color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: 600,
                          textDecoration: 'none', transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(37,99,235,0.15)'; e.currentTarget.style.color = '#93c5fd'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                      >
                        <Eye size={13} />
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)',
          }}>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
              Pagina {page} de {totalPages}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => setPage((c) => Math.max(1, c - 1))}
                disabled={page <= 1}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', fontSize: 13,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10, color: 'rgba(255,255,255,0.5)',
                  opacity: page <= 1 ? 0.3 : 1, cursor: page <= 1 ? 'not-allowed' : 'pointer',
                }}
              >
                <ChevronLeft size={15} /> Anterior
              </button>
              <button
                onClick={() => setPage((c) => Math.min(totalPages, c + 1))}
                disabled={page >= totalPages}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', fontSize: 13,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10, color: 'rgba(255,255,255,0.5)',
                  opacity: page >= totalPages ? 0.3 : 1, cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                Siguiente <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <CreateClientModal
          isSubmitting={createClientMutation.isPending}
          onClose={() => setIsModalOpen(false)}
          onSubmit={(data) => createClientMutation.mutate(data)}
        />
      )}
    </div>
  );
}

/* ── CreateClientModal ── */
function CreateClientModal({
  isSubmitting, onClose, onSubmit,
}: {
  isSubmitting: boolean; onClose: () => void; onSubmit: (data: CreateClientFormData) => void;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<CreateClientFormData>({
    resolver: zodResolver(createClientSchema as any),
    defaultValues: { name: '', cedula: '', phone: '', address: '', notes: '' },
  });

  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    width: '100%', height: 48, padding: '0 16px',
    background: hasError ? 'rgba(248,113,113,0.07)' : 'rgba(255,255,255,0.06)',
    border: hasError ? '1px solid rgba(248,113,113,0.5)' : '1px solid rgba(255,255,255,0.12)',
    borderRadius: 12, color: 'rgba(255,255,255,0.88)',
    fontSize: 14, outline: 'none', boxSizing: 'border-box',
  });

  const labelStyle: React.CSSProperties = {
    display: 'block', color: 'rgba(255,255,255,0.6)',
    fontSize: 13, fontWeight: 600, marginBottom: 8,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-lg" style={{
        background: 'linear-gradient(160deg, #131e35 0%, #0f172a 100%)',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24,
        boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
        maxHeight: '92dvh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '24px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div>
            <h2 style={{ color: 'white', fontWeight: 700, fontSize: 18, margin: 0 }}>Crear cliente</h2>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 3 }}>
              Completa los datos del nuevo cliente
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, padding: 8, color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
            display: 'flex', alignItems: 'center',
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} style={{ padding: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            <div>
              <label style={labelStyle}>Nombre</label>
              <input type="text" {...register('name')} style={inputStyle(!!errors.name)}
                className="placeholder:text-white/20"
                onFocus={(e) => { if (!errors.name) { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)'; } }}
                onBlur={(e) => { e.target.style.borderColor = errors.name ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none'; }}
              />
              {errors.name && <p style={{ color: '#f87171', fontSize: 12, marginTop: 6 }}>{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label style={labelStyle}>Cedula</label>
                <input type="text" {...register('cedula')} style={inputStyle(!!errors.cedula)}
                  className="placeholder:text-white/20"
                  onFocus={(e) => { if (!errors.cedula) { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)'; } }}
                  onBlur={(e) => { e.target.style.borderColor = errors.cedula ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none'; }}
                />
                {errors.cedula && <p style={{ color: '#f87171', fontSize: 12, marginTop: 6 }}>{errors.cedula.message}</p>}
              </div>
              <div>
                <label style={labelStyle}>Telefono</label>
                <input type="text" {...register('phone')} style={inputStyle(!!errors.phone)}
                  className="placeholder:text-white/20"
                  onFocus={(e) => { if (!errors.phone) { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)'; } }}
                  onBlur={(e) => { e.target.style.borderColor = errors.phone ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none'; }}
                />
                {errors.phone && <p style={{ color: '#f87171', fontSize: 12, marginTop: 6 }}>{errors.phone.message}</p>}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Direccion</label>
              <input type="text" {...register('address')} style={inputStyle(!!errors.address)}
                className="placeholder:text-white/20"
                onFocus={(e) => { if (!errors.address) { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)'; } }}
                onBlur={(e) => { e.target.style.borderColor = errors.address ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none'; }}
              />
              {errors.address && <p style={{ color: '#f87171', fontSize: 12, marginTop: 6 }}>{errors.address.message}</p>}
            </div>

            <div>
              <label style={labelStyle}>
                Notas <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>(opcional)</span>
              </label>
              <textarea rows={3} {...register('notes')}
                className="placeholder:text-white/20"
                style={{
                  ...inputStyle(!!errors.notes),
                  height: 'auto', padding: '11px 16px', resize: 'none',
                }}
                onFocus={(e) => { if (!errors.notes) { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)'; } }}
                onBlur={(e) => { e.target.style.borderColor = errors.notes ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none'; }}
              />
              {errors.notes && <p style={{ color: '#f87171', fontSize: 12, marginTop: 6 }}>{errors.notes.message}</p>}
            </div>
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            gap: 12, marginTop: 28, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.07)',
          }}>
            <button type="button" onClick={onClose} style={{
              padding: '11px 20px', background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
              color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 500, cursor: 'pointer',
            }}>
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} style={{
              padding: '11px 24px',
              background: isSubmitting ? 'rgba(37,99,235,0.5)' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              border: 'none', borderRadius: 12, color: 'white',
              fontSize: 14, fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: isSubmitting ? 'none' : '0 4px 16px rgba(37,99,235,0.4)',
            }}>
              {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : 'Guardar cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}