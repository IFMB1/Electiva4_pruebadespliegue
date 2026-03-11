import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { useNavigate, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { Banknote, Eye, EyeOff, Loader2, Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/authStore';
import type { LoginResponse } from '../../types/auth.types';
import { getHomeRouteByRole } from '../../router/roleUtils';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo es requerido')
    .email('Ingrese un correo valido'),
  password: z
    .string()
    .min(1, 'La contrasena es requerida'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, setAuth, user } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema as any),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  if (isAuthenticated) {
    return <Navigate to={user ? getHomeRouteByRole(user.role?.name) : '/'} replace />;
  }

  const onSubmit = async (data: LoginFormData) => {
    try {
      const response = await authService.login(data);
      const loginData: LoginResponse = response.data;
      setAuth(loginData.data.user, loginData.data.accessToken);
      toast.success(`Bienvenido, ${loginData.data.user.name}`);
      navigate(getHomeRouteByRole(loginData.data.user.role?.name), { replace: true });
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Error al iniciar sesion. Verifique sus credenciales.';
      toast.error(message);
    }
  };

  /* ── shared input style ── */
  const inputBase: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '14px',
    color: 'rgba(255, 255, 255, 0.9)',
    height: '52px',
    padding: '0 16px 0 42px',
    fontSize: '15px',
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
  };

  const inputError: React.CSSProperties = {
    ...inputBase,
    borderColor: '#f87171',
    background: 'rgba(248, 113, 113, 0.08)',
  };

  return (
    /* ── 1. Wrapper / background ── */
    <div
      style={{
        background: `
          radial-gradient(ellipse at 20% 50%, rgba(124, 58, 237, 0.15) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 20%, rgba(37, 99, 235, 0.2) 0%, transparent 50%),
          #0c1220
        `,
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ── Animated background blobs ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="animate-blob absolute -left-24 -top-24 h-96 w-96 rounded-full bg-blue-500/25 blur-3xl"
        />
        <div
          className="animate-blob animation-delay-2000 absolute left-1/2 top-1/4 h-80 w-80 -translate-x-1/2 rounded-full bg-indigo-400/20 blur-3xl"
        />
        <div
          className="animate-blob animation-delay-4000 absolute -bottom-24 right-0 h-[28rem] w-[28rem] rounded-full bg-blue-400/20 blur-3xl"
        />
        {/* Subtle dot-grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      {/* ── 7. Card wrapper: max-width 400px, centered ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: 'calc(100% - 32px)',
          maxWidth: '400px',
          margin: 'auto',
        }}
      >

        {/* ── 6. Badge OUTSIDE and ABOVE the card ── */}
        <div className="animate-fade-in" style={{ marginBottom: '16px', textAlign: 'center' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '999px',
              padding: '6px 14px',
              fontSize: '11px',
              letterSpacing: '0.1em',
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            <span style={{ display: 'inline-block', height: '6px', width: '6px', borderRadius: '50%', background: 'rgba(147,197,253,0.8)' }} />
            Sistema de Gestion
          </span>
        </div>

        {/* ── 1. Card – glassmorphism ── */}
        <div
          className="animate-fade-in-up"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(32px) saturate(200%)',
            WebkitBackdropFilter: 'blur(32px) saturate(200%)',
            border: '1px solid rgba(255, 255, 255, 0.10)',
            borderRadius: '28px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
            padding: '40px 28px',
          }}
        >

          {/* ── Logo / Header ── */}
          <div style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            {/* ── 5. Icon container ── */}
            <div
              className="animate-float animate-pulse-glow"
              style={{
                width: '72px',
                height: '72px',
                background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                borderRadius: '20px',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.1), 0 8px 32px rgba(37,99,235,0.4)',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Banknote className="h-9 w-9 text-white" strokeWidth={1.75} />
            </div>
            <h1 className="text-[1.75rem] font-extrabold leading-tight tracking-tight" style={{ color: 'rgba(255,255,255,0.95)' }}>
              Cobros Diarios
            </h1>
            <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Ingresa tus credenciales para continuar
            </p>
          </div>

          {/* ── 2. Form – gap-y-5 ── */}
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} noValidate>

            {/* Email field */}
            <div className="animate-fade-in-up animation-delay-150">
              <label
                htmlFor="email"
                style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}
              >
                Correo electronico
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)', pointerEvents: 'none' }}>
                  <Mail size={16} />
                </span>
                {(() => {
                  const { onBlur: rhfBlurEmail, ...emailRest } = register('email');
                  return (
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="correo@ejemplo.com"
                      style={errors.email ? { ...inputError, paddingLeft: '42px' } : inputBase}
                      onFocus={e => {
                        e.currentTarget.style.borderColor = '#3b82f6';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.2)';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.11)';
                      }}
                      onBlur={e => {
                        e.currentTarget.style.borderColor = errors.email ? '#f87171' : 'rgba(255, 255, 255, 0.12)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.background = errors.email ? 'rgba(248, 113, 113, 0.08)' : 'rgba(255, 255, 255, 0.08)';
                        rhfBlurEmail(e);
                      }}
                      {...emailRest}
                    />
                  );
                })()}
              </div>
              {errors.email && (
                <p className="animate-fade-in mt-1.5 flex items-center gap-1 text-xs font-medium" style={{ color: '#f87171' }}>
                  <span className="text-sm">⚠</span> {errors.email.message}
                </p>
              )}
            </div>

            {/* Password field */}
            <div className="animate-fade-in-up animation-delay-300">
              <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label
                  htmlFor="password"
                  style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}
                >
                  Contrasena
                </label>
              </div>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)', pointerEvents: 'none' }}>
                  <Lock size={16} />
                </span>
                {(() => {
                  const { onBlur: rhfBlurPassword, ...passwordRest } = register('password');
                  return (
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      style={errors.password ? { ...inputError, paddingLeft: '42px', paddingRight: '48px' } : { ...inputBase, paddingRight: '48px' }}
                      onFocus={e => {
                        e.currentTarget.style.borderColor = '#3b82f6';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.2)';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.11)';
                      }}
                      onBlur={e => {
                        e.currentTarget.style.borderColor = errors.password ? '#f87171' : 'rgba(255, 255, 255, 0.12)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.background = errors.password ? 'rgba(248, 113, 113, 0.08)' : 'rgba(255, 255, 255, 0.08)';
                        rhfBlurPassword(e);
                      }}
                      {...passwordRest}
                    />
                  );
                })()}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', padding: '4px', color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '8px', transition: 'color 0.2s' }}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="animate-fade-in mt-1.5 flex items-center gap-1 text-xs font-medium" style={{ color: '#f87171' }}>
                  <span className="text-sm">⚠</span> {errors.password.message}
                </p>
              )}
            </div>

            {/* ── 4. Submit button ── */}
            <div className="animate-fade-in-up animation-delay-400">
              <button
                type="submit"
                disabled={isSubmitting}
                className="group flex w-full items-center justify-center gap-2.5 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  height: '52px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                  boxShadow: '0 4px 20px rgba(37, 99, 235, 0.45)',
                  fontWeight: 600,
                  fontSize: '15px',
                  marginTop: '8px',
                  color: '#fff',
                  border: 'none',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  transition: 'box-shadow 0.2s, transform 0.2s',
                }}
                onMouseEnter={e => {
                  if (!isSubmitting) {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 28px rgba(37, 99, 235, 0.65)';
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(37, 99, 235, 0.45)';
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Verificando credenciales...</span>
                  </>
                ) : (
                  <>
                    <span>Iniciar Sesion</span>
                    <ArrowRight
                      size={17}
                      className="transition-transform duration-200 group-hover:translate-x-1"
                    />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="animate-fade-in-up animation-delay-500" style={{ margin: '24px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ height: '1px', flex: 1, background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.25)' }}>
              Seguridad
            </span>
            <div style={{ height: '1px', flex: 1, background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* Security badge */}
          <div
            className="animate-fade-in-up animation-delay-600 flex items-center justify-center gap-2"
            style={{
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '10px 16px',
            }}
          >
            <ShieldCheck size={15} className="shrink-0" style={{ color: '#4ade80' }} />
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.45)' }}>
              Conexion protegida con encriptacion SSL
            </span>
          </div>
        </div>

        {/* Footer below card */}
        <div className="animate-fade-in animation-delay-700" style={{ marginTop: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>
            &copy; {new Date().getFullYear()} Cobros Diarios &middot; Todos los derechos reservados
          </p>
        </div>
      </div>
    </div>
  );
}
