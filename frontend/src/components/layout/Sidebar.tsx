import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Banknote,
  CreditCard,
  Wallet,
  FileText,
  UserCog,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useEffect } from 'react';
import { normalizeRole } from '../../router/roleUtils';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
}

const panelNavItems: NavItem[] = [
  { to: '/dashboard', icon: <LayoutDashboard size={19} />, label: 'Dashboard' },
  { to: '/reports', icon: <FileText size={19} />, label: 'Reportes' },
];

const fieldNavItems: NavItem[] = [
  { to: '/cash-register', icon: <Wallet size={19} />, label: 'Caja' },
  { to: '/payments', icon: <CreditCard size={19} />, label: 'Cobros / Pagos' },
  { to: '/clients', icon: <Users size={19} />, label: 'Clientes' },
  { to: '/loans', icon: <Banknote size={19} />, label: 'Prestamos' },
];

const adminNavItems: NavItem[] = [
  { to: '/admin/users', icon: <UserCog size={19} />, label: 'Usuarios' },
];

/* ── shared style objects ── */
const navItemBase: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  borderRadius: '12px',
  padding: '10px 12px',
  margin: '2px 8px',
  fontSize: '14px',
  fontWeight: 500,
  color: 'rgba(255, 255, 255, 0.55)',
  background: 'transparent',
  border: '1px solid transparent',
  cursor: 'pointer',
  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
  textDecoration: 'none',
  userSelect: 'none',
};

const navItemActive: React.CSSProperties = {
  ...navItemBase,
  background: 'rgba(37, 99, 235, 0.15)',
  border: '1px solid rgba(59, 130, 246, 0.2)',
  color: '#93c5fd',
};

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, setSidebarCollapsed } = useUIStore();
  const { user } = useAuthStore();

  const role = normalizeRole(user?.role?.name);
  const isAdmin = role === 'admin';
  const mainNavItems =
    role === 'cobrador'
      ? fieldNavItems
      : role === 'admin' || role === 'auxiliar'
        ? panelNavItems
        : [];

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setSidebarCollapsed(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarCollapsed]);

  /** Render a single nav item with hover micro-animation */
  const renderNavLink = (item: NavItem) => (
    <li key={item.to}>
      <NavLink
        to={item.to}
        onClick={() => { if (window.innerWidth < 768) setSidebarCollapsed(true); }}
        title={sidebarCollapsed ? item.label : undefined}
        style={({ isActive }) => (isActive ? navItemActive : navItemBase)}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLAnchorElement;
          if (!el.className.includes('active') && !el.getAttribute('aria-current')) {
            el.style.background = 'rgba(255, 255, 255, 0.06)';
            el.style.color = 'rgba(255, 255, 255, 0.85)';
            el.style.transform = 'translateX(2px)';
          }
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLAnchorElement;
          // active state is controlled by style prop — only reset if not active
          if (el.getAttribute('aria-current') !== 'page') {
            el.style.background = 'transparent';
            el.style.color = 'rgba(255, 255, 255, 0.55)';
            el.style.transform = 'translateX(0)';
          }
        }}
      >
        {({ isActive }) => (
          <>
            {/* Active indicator bar */}
            {isActive && (
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  top: '6px',
                  bottom: '6px',
                  width: '3px',
                  borderRadius: '0 3px 3px 0',
                  background: 'linear-gradient(180deg, #3b82f6, #2563eb)',
                  boxShadow: '0 0 8px rgba(59, 130, 246, 0.6)',
                }}
              />
            )}
            {/* Icon */}
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: isActive ? '#60a5fa' : 'inherit',
                filter: isActive ? 'drop-shadow(0 0 4px rgba(96, 165, 250, 0.5))' : 'none',
                transition: 'filter 0.2s',
              }}
            >
              {item.icon}
            </span>
            {/* Label */}
            {!sidebarCollapsed && (
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.label}
              </span>
            )}
          </>
        )}
      </NavLink>
    </li>
  );

  return (
    <>
      {/* ── 7. Mobile overlay ── */}
      {!sidebarCollapsed && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 40,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            transition: 'opacity 0.3s ease',
          }}
          className="md:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      {/* ── Sidebar panel ── */}
      <aside
        style={{
          /* 1. Background */
          background: 'linear-gradient(180deg, #0c1220 0%, #0f172a 60%, #0c1523 100%)',
          borderRight: '1px solid rgba(255, 255, 255, 0.06)',
          /* 8. Drawer animation */
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          color: 'white',
        }}
        className={`fixed left-0 top-0 z-50 flex h-full flex-col md:relative md:z-auto ${sidebarCollapsed
            ? '-translate-x-full md:translate-x-0 md:w-[68px]'
            : 'w-[260px] translate-x-0'
          }`}
      >

        {/* ── 2. Header ── */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            padding: '20px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: '64px',
          }}
        >
          {!sidebarCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
              {/* Logo icon — same style as login */}
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.1), 0 4px 16px rgba(37,99,235,0.4)',
                }}
              >
                <Banknote size={16} className="text-white" strokeWidth={2} />
              </div>
              <span style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.01em', color: 'rgba(255,255,255,0.92)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Cobros Diarios
              </span>
            </div>
          )}

          {/* ── 9. Collapse toggle — desktop ── */}
          <button
            onClick={toggleSidebar}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              padding: '8px',
              color: 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
              flexShrink: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
            title={sidebarCollapsed ? 'Expandir menu' : 'Colapsar menu'}
            className="hidden md:flex"
          >
            {sidebarCollapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          </button>

          {/* ── 9. Close — mobile ── */}
          <button
            onClick={() => setSidebarCollapsed(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              padding: '8px',
              color: 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
              flexShrink: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
            className="md:hidden"
          >
            <X size={17} />
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '20px 0' }}>

          {/* ── 5. Section label — Menu ── */}
          {!sidebarCollapsed && (
            <p style={{ marginBottom: '8px', padding: '0 16px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255, 255, 255, 0.25)' }}>
              Menu
            </p>
          )}

          <ul style={{ display: 'flex', flexDirection: 'column', gap: '2px', listStyle: 'none', margin: 0, padding: 0 }}>
            {mainNavItems.map(renderNavLink)}
          </ul>

          {/* ── Admin section ── */}
          {isAdmin && (
            <>
              {/* ── 5. Separator ── */}
              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', margin: '8px 16px' }} />
              {!sidebarCollapsed && (
                <p style={{ marginBottom: '8px', padding: '0 16px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255, 255, 255, 0.25)' }}>
                  Administracion
                </p>
              )}
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '2px', listStyle: 'none', margin: 0, padding: 0 }}>
                {adminNavItems.map(renderNavLink)}
              </ul>
            </>
          )}
        </nav>

        {/* ── 6. Footer / user area ── */}
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', padding: '8px' }}>
          {sidebarCollapsed ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '24px' }}>
              <span style={{ display: 'inline-block', height: '6px', width: '6px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
            </div>
          ) : (
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Avatar circle */}
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                    boxShadow: '0 0 0 2px rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    color: 'white',
                    fontSize: '13px',
                    flexShrink: 0,
                  }}
                >
                  {user?.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                    {user?.name ?? 'Usuario'}
                  </p>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
                    v1.0.0
                  </p>
                </div>
              </div>
              <span style={{ borderRadius: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', padding: '2px 6px', fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>
                BETA
              </span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
