import { Menu, LogOut } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/auth.service';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

/** Derive initials from a full name */
function getInitials(name?: string | null): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Role badge colour — dark palette */
function roleBadgeStyle(roleName?: string | null): React.CSSProperties {
  switch (roleName?.toLowerCase()) {
    case 'admin': return { background: 'rgba(124,58,237,0.15)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.25)' };
    case 'auxiliar': return { background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.25)' };
    case 'cobrador': return { background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' };
    default: return { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' };
  }
}

export default function Topbar() {
  const { toggleSidebar } = useUIStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      /* proceed even if API call fails */
    } finally {
      logout();
      navigate('/login');
      toast.success('Sesion cerrada correctamente');
    }
  };

  const initials = getInitials(user?.name);
  const roleName = user?.role?.name;
  const badgeStyle = roleBadgeStyle(roleName);

  return (
    /* ── 7. Navbar ── */
    <header
      style={{
        display: 'flex',
        height: '56px',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(12,18,32,0.8)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0 16px',
        flexShrink: 0,
      }}
    >
      {/* ── Left ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* ── 9. Hamburger button ── */}
        <button
          onClick={toggleSidebar}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            padding: '8px',
            color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
          title="Toggle menu"
          aria-label="Toggle menu"
        >
          <Menu size={18} />
        </button>

        {/* Breadcrumb */}
        <div className="hidden sm:flex" style={{ alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.35)' }}>Cobros Diarios</span>
          <span style={{ color: 'rgba(255,255,255,0.15)' }}>/</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>Panel</span>
        </div>
      </div>

      {/* ── Right ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

        {/* Role badge — desktop */}
        <span
          className="hidden md:inline-flex"
          style={{ borderRadius: '999px', padding: '2px 10px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', ...badgeStyle }}
        >
          {roleName ?? 'Sin rol'}
        </span>

        {/* Separator */}
        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.08)' }} />

        {/* User row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Avatar */}
          <div
            style={{
              width: '34px',
              height: '34px',
              flexShrink: 0,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              boxShadow: '0 0 0 2px rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: 700,
              color: 'white',
            }}
            aria-label={`Avatar de ${user?.name ?? 'usuario'}`}
          >
            {initials}
          </div>

          {/* Name + role — desktop */}
          <div className="hidden sm:block">
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: '1.2' }}>
              {user?.name ?? 'Usuario'}
            </p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: 0, lineHeight: '1.2' }}>
              {roleName ?? 'Sin rol'}
            </p>
          </div>
        </div>

        {/* Separator */}
        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.08)' }} />

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            borderRadius: '10px',
            border: '1px solid transparent',
            padding: '6px 10px',
            fontSize: '13px',
            fontWeight: 500,
            color: 'rgba(255,255,255,0.4)',
            background: 'none',
            cursor: 'pointer',
            transition: 'color 0.2s, background 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
            e.currentTarget.style.background = 'none';
          }}
          title="Cerrar sesion"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </header>
  );
}
