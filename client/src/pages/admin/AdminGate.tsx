import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';

export function AdminGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <main className="page"><p className="muted">Cargando…</p></main>;
  if (!user)
    return (
      <main className="page">
        <p className="error-box">Tienes que iniciar sesión con una cuenta de administrador.</p>
        <Link to="/login?next=/admin" className="btn primary">
          Entrar
        </Link>
      </main>
    );
  if (!user.isAdmin)
    return (
      <main className="page">
        <p className="error-box">
          Tu cuenta no es de administrador. Añade tu email a <code>ADMIN_EMAILS</code> en <code>server/.env</code> o ejecuta{' '}
          <code>npm run make-admin -w server -- {user.username}</code>.
        </p>
      </main>
    );
  return <>{children}</>;
}

export function adminError(e: unknown): string {
  if (e instanceof ApiError) {
    const known: Record<string, string> = {
      slot_taken: 'Ya hay otro reto publicado ese día en ese nivel.',
      slug_taken: 'Ese slug ya existe.',
      has_progress: 'Hay jugadores con progreso en este reto: retíralo en lugar de borrarlo.',
      forbidden: 'No tienes permisos de administrador.',
      login_required: 'Tienes que iniciar sesión.',
      executor_error: 'El motor de ejecución no responde.',
      no_reference: 'Falta la solución de referencia.',
    };
    return e.message && e.message !== e.code ? e.message : (known[e.code] ?? e.code);
  }
  return String(e);
}
