import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import {
  ChevronLeft,
  ChevronRight,
  Edit2,
  KeyRound,
  Loader2,
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
  UserCog,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '../../services/auth.service';
import { rolesService } from '../../services/roles.service';
import { usersService } from '../../services/users.service';
import type { User } from '../../types/auth.types';

const createUserSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().min(1, 'El correo es requerido').email('Correo invalido'),
  phone: z.string().min(7, 'El telefono debe tener al menos 7 digitos'),
  password: z.string().min(8, 'La contrasena inicial debe tener al menos 8 caracteres'),
  roleId: z.string().min(1, 'Seleccione un rol'),
});

const editUserSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().min(1, 'El correo es requerido').email('Correo invalido'),
  phone: z.string().min(7, 'El telefono debe tener al menos 7 digitos'),
  roleId: z.string().min(1, 'Seleccione un rol'),
});

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, 'La nueva contrasena debe tener al menos 8 caracteres'),
    confirmPassword: z.string().min(8, 'Confirme la nueva contrasena'),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: 'Las contrasenas no coinciden',
    path: ['confirmPassword'],
  });

type CreateUserFormData = z.infer<typeof createUserSchema>;
type EditUserFormData = z.infer<typeof editUserSchema>;
type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

interface RoleOption {
  id: string;
  name: string;
}

interface PaginationMeta {
  page: number;
  total: number;
  totalPages: number;
}

function isManagedRole(roleName?: string) {
  const role = (roleName || '').toLowerCase();
  return role === 'auxiliar' || role === 'cobrador';
}

export default function UsersListPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const limit = 10;

  const usersQuery = useQuery({
    queryKey: ['users', { page, limit, search }],
    queryFn: () => usersService.getAll({ page, limit, search: search || undefined }),
  });

  const rolesQuery = useQuery({
    queryKey: ['roles', 'managed'],
    queryFn: () => rolesService.getAll(),
  });

  const users: User[] = usersQuery.data?.data?.data || [];
  const pagination: PaginationMeta | undefined = usersQuery.data?.data?.pagination;
  const totalPages = pagination?.totalPages || 1;
  const total = pagination?.total || users.length;

  const roles: RoleOption[] = useMemo(() => {
    const allRoles: RoleOption[] = rolesQuery.data?.data?.data || [];
    return allRoles.filter((role) => isManagedRole(role.name));
  }, [rolesQuery.data]);

  const createMutation = useMutation({
    mutationFn: (data: CreateUserFormData) => usersService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuario creado correctamente');
      closeUserModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear el usuario');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditUserFormData }) =>
      usersService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuario actualizado correctamente');
      closeUserModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al actualizar el usuario');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (id: string) => usersService.toggleActive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Estado del usuario actualizado');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al cambiar el estado');
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ userId, newPassword }: { userId: string; newPassword: string }) =>
      authService.resetUserPassword(userId, { newPassword }),
    onSuccess: () => {
      toast.success('Contrasena restablecida correctamente');
      setResetPasswordUser(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al restablecer la contrasena');
    },
  });

  const openCreateModal = () => {
    setEditingUser(null);
    setModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setModalOpen(true);
  };

  const closeUserModal = () => {
    setModalOpen(false);
    setEditingUser(null);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const thStyle: React.CSSProperties = {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    padding: '14px 20px',
    whiteSpace: 'nowrap',
  };

  return (
    <div
      className="mx-auto w-full max-w-7xl"
      style={{
        background:
          'radial-gradient(ellipse at 10% 0%, rgba(37,99,235,0.1) 0%, transparent 50%), radial-gradient(ellipse at 90% 80%, rgba(124,58,237,0.08) 0%, transparent 50%), #0c1220',
        minHeight: '100dvh',
        padding: '32px 28px 48px',
      }}
    >
      {/* ── Encabezado ── */}
      <div style={{ marginBottom: 28 }}>
        <h1
          className="flex items-center gap-3"
          style={{ color: 'white', fontWeight: 800, fontSize: 32, letterSpacing: '-0.02em', margin: 0 }}
        >
          <UserCog color="#3b82f6" size={36} />
          Gestion de Usuarios
        </h1>
        <p
          style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400, fontSize: 16, marginTop: 6 }}
        >
          Administre usuarios, estado y contrasenas ({total} total)
        </p>
      </div>

      {/* ── Barra de búsqueda + botón ── */}
      <div
        style={{
          marginBottom: 20,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 20,
          padding: '16px 20px',
        }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-lg">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            />
            <input
              type="text"
              placeholder="Buscar por nombre, email o telefono..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full outline-none placeholder:text-white/20"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: 14,
                color: 'rgba(255,255,255,0.9)',
                fontSize: 14,
                padding: '11px 16px 11px 44px',
                transition: 'all 0.2s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6';
                e.target.style.background = 'rgba(255,255,255,0.07)';
                e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255,255,255,0.09)';
                e.target.style.background = 'rgba(255,255,255,0.05)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 whitespace-nowrap"
            style={{
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              border: 'none',
              borderRadius: 14,
              color: 'white',
              fontSize: 14,
              fontWeight: 700,
              padding: '11px 22px',
              cursor: 'pointer',
              boxShadow: '0 6px 20px -4px rgba(37,99,235,0.5)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 10px 28px -4px rgba(37,99,235,0.65)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 6px 20px -4px rgba(37,99,235,0.5)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Plus size={18} />
            Nuevo usuario
          </button>
        </div>
      </div>

      {/* ── Tabla / Cards ── */}
      <div
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 24,
          overflow: 'hidden',
          boxShadow: '0 20px 60px -12px rgba(0,0,0,0.5)',
        }}
      >
        {/* Mobile: cards */}
        <div className="flex flex-col gap-5 p-4 md:hidden">
          {usersQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12" style={{ color: 'rgba(255,255,255,0.35)' }}>
              <Loader2 size={20} className="animate-spin" />
              Cargando usuarios...
            </div>
          ) : users.length === 0 ? (
            <p className="py-12 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
              No se encontraron usuarios
            </p>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                style={{
                  background: 'linear-gradient(160deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 20,
                  padding: '20px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <p style={{ color: 'white', fontWeight: 800, fontSize: 17, letterSpacing: '-0.01em' }}>{user.name}</p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 3 }}>{user.email}</p>
                  </div>
                  <span style={{
                    background: user.isActive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    border: user.isActive ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(239,68,68,0.25)',
                    color: user.isActive ? '#4ade80' : '#f87171',
                    borderRadius: 10, padding: '5px 12px',
                    fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    {user.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Telefono</p>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 500 }}>{user.phone || '-'}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Rol</p>
                    <span style={{
                      background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(59,130,246,0.2)',
                      color: '#93c5fd', borderRadius: 8, padding: '3px 10px', fontSize: 11, fontWeight: 700,
                    }}>
                      {user.role?.name || 'Sin rol'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10 }}>
                  <button onClick={() => openEditModal(user)} style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12, padding: '11px', color: 'white', fontSize: 13, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer',
                  }}>
                    <Edit2 size={15} /> Editar
                  </button>
                  <button onClick={() => setResetPasswordUser(user)} style={{
                    background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
                    borderRadius: 12, padding: '11px', color: '#fbbf24', fontSize: 13, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer',
                  }}>
                    <KeyRound size={15} /> Clave
                  </button>
                  <button onClick={() => toggleActiveMutation.mutate(user.id)} style={{
                    background: user.isActive ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                    border: user.isActive ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(34,197,94,0.2)',
                    borderRadius: 12, padding: '11px 14px',
                    color: user.isActive ? '#f87171' : '#4ade80',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {user.isActive ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop: tabla */}
        <div className="hidden md:block">
          <table className="w-full text-left text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <th style={{ ...thStyle, width: '20%' }}>Nombre</th>
                <th style={{ ...thStyle, width: '26%' }}>Email</th>
                <th style={{ ...thStyle, width: '16%' }}>Telefono</th>
                <th style={{ ...thStyle, width: '13%' }}>Rol</th>
                <th style={{ ...thStyle, width: '13%' }}>Estado</th>
                <th style={{ ...thStyle, width: '12%', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usersQuery.isLoading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px 20px', textAlign: 'center' }}>
                    <div className="flex items-center justify-center gap-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      <Loader2 size={18} className="animate-spin" />
                      Cargando usuarios...
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                    No se encontraron usuarios
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '16px 20px', color: 'white', fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 0 }}>
                      {user.name}
                    </td>
                    <td style={{ padding: '16px 20px', color: 'rgba(255,255,255,0.45)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 0 }}>
                      {user.email}
                    </td>
                    <td style={{ padding: '16px 20px', color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>
                      {user.phone || '-'}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(59,130,246,0.2)',
                        color: '#93c5fd', borderRadius: 999, padding: '3px 11px', fontSize: 11, fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}>
                        {user.role?.name || 'Sin rol'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        background: user.isActive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                        border: user.isActive ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(239,68,68,0.25)',
                        color: user.isActive ? '#4ade80' : '#f87171',
                        borderRadius: 999, padding: '3px 11px', fontSize: 11, fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}>
                        {user.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                        <button
                          onClick={() => openEditModal(user)}
                          title="Editar usuario"
                          style={{
                            background: 'transparent', border: 'none', borderRadius: 8,
                            padding: '7px', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', transition: 'all 0.15s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(37,99,235,0.15)'; e.currentTarget.style.color = '#60a5fa'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => setResetPasswordUser(user)}
                          title="Restablecer contrasena"
                          style={{
                            background: 'transparent', border: 'none', borderRadius: 8,
                            padding: '7px', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', transition: 'all 0.15s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(245,158,11,0.15)'; e.currentTarget.style.color = '#fbbf24'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
                        >
                          <KeyRound size={15} />
                        </button>
                        <button
                          onClick={() => toggleActiveMutation.mutate(user.id)}
                          title={user.isActive ? 'Desactivar usuario' : 'Activar usuario'}
                          style={{
                            background: 'transparent', border: 'none', borderRadius: 8,
                            padding: '7px',
                            color: user.isActive ? 'rgba(34,197,94,0.8)' : 'rgba(239,68,68,0.8)',
                            cursor: 'pointer', transition: 'all 0.15s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = user.isActive ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)';
                            e.currentTarget.style.color = user.isActive ? '#f87171' : '#4ade80';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = user.isActive ? 'rgba(34,197,94,0.8)' : 'rgba(239,68,68,0.8)';
                          }}
                        >
                          {user.isActive ? <ToggleRight size={19} /> : <ToggleLeft size={19} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginacion */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)',
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
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '6px 14px', fontSize: 13,
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

      {modalOpen && (
        <UserFormModal
          editingUser={editingUser}
          roles={roles}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
          onClose={closeUserModal}
          onSubmitCreate={(data) => createMutation.mutate(data)}
          onSubmitEdit={(data) => {
            if (!editingUser) return;
            updateMutation.mutate({ id: editingUser.id, data });
          }}
        />
      )}

      {resetPasswordUser && (
        <ResetPasswordModal
          user={resetPasswordUser}
          isSubmitting={resetPasswordMutation.isPending}
          onClose={() => setResetPasswordUser(null)}
          onSubmit={(newPassword) =>
            resetPasswordMutation.mutate({ userId: resetPasswordUser.id, newPassword })
          }
        />
      )}
    </div>
  );
}

interface UserFormModalProps {
  editingUser: User | null;
  roles: RoleOption[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmitCreate: (data: CreateUserFormData) => void;
  onSubmitEdit: (data: EditUserFormData) => void;
}

type UserFormValues = {
  name: string;
  email: string;
  phone: string;
  roleId: string;
  password?: string;
};

function UserFormModal({ editingUser, roles, isSubmitting, onClose, onSubmitCreate, onSubmitEdit }: UserFormModalProps) {
  const isEditing = !!editingUser;

  const { register, handleSubmit, formState: { errors } } = useForm<UserFormValues>({
    resolver: zodResolver((isEditing ? editUserSchema : createUserSchema) as any),
    defaultValues: isEditing
      ? { name: editingUser.name, email: editingUser.email, phone: editingUser.phone || '', roleId: editingUser.role?.id || '' }
      : { name: '', email: '', phone: '', password: '', roleId: '' },
  });

  const onSubmit = (data: UserFormValues) => {
    if (isEditing) {
      onSubmitEdit({ name: data.name, email: data.email, phone: data.phone, roleId: data.roleId });
      return;
    }
    onSubmitCreate(data as CreateUserFormData);
  };

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
      <div
        className="w-full sm:max-w-lg"
        style={{
          background: 'linear-gradient(160deg, #131e35 0%, #0f172a 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 24,
          boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
          maxHeight: '92dvh', overflowY: 'auto',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '24px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div>
            <h2 style={{ color: 'white', fontWeight: 700, fontSize: 18, margin: 0 }}>
              {isEditing ? 'Editar usuario' : 'Nuevo usuario'}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 3 }}>
              {isEditing ? 'Modifica los datos del usuario' : 'Completa los datos del nuevo usuario'}
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

        <form onSubmit={handleSubmit(onSubmit)} style={{ padding: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={labelStyle}>Nombre completo</label>
              <input type="text" placeholder="Nombre del usuario" className="placeholder:text-white/20"
                {...register('name')} style={inputStyle(!!errors.name)}
                onFocus={(e) => { if (!errors.name) { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)'; } }}
                onBlur={(e) => { e.target.style.borderColor = errors.name ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none'; }}
              />
              {errors.name && <p style={{ color: '#f87171', fontSize: 12, marginTop: 6 }}>{errors.name.message}</p>}
            </div>

            <div>
              <label style={labelStyle}>Correo electronico</label>
              <input type="email" placeholder="correo@ejemplo.com" className="placeholder:text-white/20"
                {...register('email')} style={inputStyle(!!errors.email)}
                onFocus={(e) => { if (!errors.email) { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)'; } }}
                onBlur={(e) => { e.target.style.borderColor = errors.email ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none'; }}
              />
              {errors.email && <p style={{ color: '#f87171', fontSize: 12, marginTop: 6 }}>{errors.email.message}</p>}
            </div>

            <div>
              <label style={labelStyle}>Telefono</label>
              <input type="text" placeholder="3000000000" className="placeholder:text-white/20"
                {...register('phone')} style={inputStyle(!!errors.phone)}
                onFocus={(e) => { if (!errors.phone) { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)'; } }}
                onBlur={(e) => { e.target.style.borderColor = errors.phone ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none'; }}
              />
              {errors.phone && <p style={{ color: '#f87171', fontSize: 12, marginTop: 6 }}>{errors.phone.message}</p>}
            </div>

            {!isEditing && (
              <div>
                <label style={labelStyle}>Contrasena inicial</label>
                <input type="password" placeholder="Minimo 8 caracteres" className="placeholder:text-white/20"
                  {...register('password')} style={inputStyle(!!errors.password)}
                  onFocus={(e) => { if (!errors.password) { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)'; } }}
                  onBlur={(e) => { e.target.style.borderColor = errors.password ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none'; }}
                />
                {errors.password && <p style={{ color: '#f87171', fontSize: 12, marginTop: 6 }}>{errors.password.message}</p>}
              </div>
            )}

            <div>
              <label style={labelStyle}>Rol</label>
              <select {...register('roleId')} style={{ ...inputStyle(!!errors.roleId), cursor: 'pointer' }}
                onFocus={(e) => { if (!errors.roleId) { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)'; } }}
                onBlur={(e) => { e.target.style.borderColor = errors.roleId ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none'; }}
              >
                <option value="" style={{ background: '#1e293b' }}>Seleccione un rol</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id} style={{ background: '#1e293b' }}>{role.name}</option>
                ))}
              </select>
              {errors.roleId && <p style={{ color: '#f87171', fontSize: 12, marginTop: 6 }}>{errors.roleId.message}</p>}
            </div>
          </div>

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
              {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : isEditing ? 'Actualizar usuario' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ResetPasswordModalProps {
  user: User;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (newPassword: string) => void;
}

function ResetPasswordModal({ user, isSubmitting, onClose, onSubmit }: ResetPasswordModalProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema as any),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    width: '100%', height: 48, padding: '0 16px',
    background: hasError ? 'rgba(248,113,113,0.07)' : 'rgba(255,255,255,0.06)',
    border: hasError ? '1px solid rgba(248,113,113,0.5)' : '1px solid rgba(255,255,255,0.12)',
    borderRadius: 12, color: 'rgba(255,255,255,0.88)',
    fontSize: 14, outline: 'none', boxSizing: 'border-box',
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-md" style={{
        background: 'linear-gradient(160deg, #131e35 0%, #0f172a 100%)',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24,
        boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
        maxHeight: '92dvh', overflowY: 'auto',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '24px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div>
            <h2 style={{ color: 'white', fontWeight: 700, fontSize: 18, margin: 0 }}>Restablecer contrasena</h2>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 3 }}>{user.name}</p>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, padding: 8, color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
            display: 'flex', alignItems: 'center',
          }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit((data) => onSubmit(data.newPassword))} style={{ padding: '24px' }}>
          <div style={{
            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: 12, padding: '12px 16px', marginBottom: 24,
            color: '#fbbf24', fontSize: 13,
          }}>
            Se actualizara la contrasena de <strong>{user.name}</strong>. Esta accion no se puede deshacer.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                Nueva contrasena
              </label>
              <input type="password" placeholder="Minimo 8 caracteres" className="placeholder:text-white/20"
                {...register('newPassword')} style={inputStyle(!!errors.newPassword)}
                onFocus={(e) => { if (!errors.newPassword) { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)'; } }}
                onBlur={(e) => { e.target.style.borderColor = errors.newPassword ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none'; }}
              />
              {errors.newPassword && <p style={{ color: '#f87171', fontSize: 12, marginTop: 6 }}>{errors.newPassword.message}</p>}
            </div>

            <div>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                Confirmar contrasena
              </label>
              <input type="password" placeholder="Repita la contrasena" className="placeholder:text-white/20"
                {...register('confirmPassword')} style={inputStyle(!!errors.confirmPassword)}
                onFocus={(e) => { if (!errors.confirmPassword) { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)'; } }}
                onBlur={(e) => { e.target.style.borderColor = errors.confirmPassword ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none'; }}
              />
              {errors.confirmPassword && <p style={{ color: '#f87171', fontSize: 12, marginTop: 6 }}>{errors.confirmPassword.message}</p>}
            </div>
          </div>

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
              {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : 'Guardar contrasena'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}