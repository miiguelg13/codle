import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  adminApi,
  SOURCE_LABEL,
  STATUS_LABEL,
  type AdminListItem,
  type AdminOverview,
  type ImportReport,
  type ProblemStatus,
} from '../../lib/adminApi';
import { formatDate } from '../../lib/format';
import { AdminGate, adminError } from './AdminGate';

const LEVEL_SHORT = ['', 'Fácil', 'Medio', 'Difícil', 'Experto'];

function Coverage({ days }: { days: AdminOverview['nextDays'] }) {
  return (
    <div className="coverage">
      {days.map((d, i) => (
        <Link
          key={d.date}
          to={`/admin?from=${d.date}&to=${d.date}`}
          className={`cov-day ${d.published >= 4 ? 'tone-pass' : d.published > 0 ? 'tone-partial' : 'tone-fail'}`}
          title={`${d.date}: ${d.published}/4 publicados`}
        >
          <small>{i === 0 ? 'Hoy' : d.date.slice(5)}</small>
          <strong>{d.published}/4</strong>
        </Link>
      ))}
    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminGate>
      <AdminDashboard />
    </AdminGate>
  );
}

function AdminDashboard() {
  const params = new URLSearchParams(window.location.search);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [items, setItems] = useState<AdminListItem[] | null>(null);
  const [status, setStatus] = useState(params.get('status') ?? '');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState(params.get('from') ?? '');
  const [to, setTo] = useState(params.get('to') ?? '');
  const [error, setError] = useState<string | null>(null);
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setError(null);
    adminApi.overview().then(setOverview).catch((e) => setError(adminError(e)));
    adminApi
      .list({ status, q, from, to })
      .then(setItems)
      .catch((e) => setError(adminError(e)));
  }, [status, q, from, to]);

  useEffect(() => {
    const id = setTimeout(load, 250);
    return () => clearTimeout(id);
  }, [load]);

  const toggle = async (it: AdminListItem) => {
    const next: ProblemStatus = it.status === 'published' ? 'rejected' : 'published';
    setBusy(true);
    try {
      await adminApi.setStatus(it.id, next);
      load();
    } catch (e) {
      setError(adminError(e));
    } finally {
      setBusy(false);
    }
  };

  const runImport = async () => {
    setBusy(true);
    try {
      setImportReport(await adminApi.importNow());
      load();
    } catch (e) {
      setError(adminError(e));
    } finally {
      setBusy(false);
    }
  };

  const s = overview?.problemsByStatus ?? {};

  return (
    <main className="page admin-page wide">
      <div className="admin-head">
        <h1>Administración</h1>
        <div className="admin-actions">
          <button className="btn secondary" onClick={runImport} disabled={busy} title="Importa ahora los ficheros de retos/">
            ⟳ Importar retos del agente
          </button>
          <Link to="/admin/problems/new" className="btn primary">
            + Nuevo reto
          </Link>
        </div>
      </div>

      {error && <p className="error-box">{error}</p>}
      {importReport && (
        <div className="notice small">
          <span>
            Importados: {importReport.imported.length} · actualizados: {importReport.updated.length} · omitidos:{' '}
            {importReport.skipped.length} · errores: {importReport.errors.length}
            {importReport.errors.length > 0 && <> — {importReport.errors.join(' | ')}</>}
          </span>
          <button className="ghost" onClick={() => setImportReport(null)}>
            ✕
          </button>
        </div>
      )}

      {overview && (
        <>
          <section className="stat-tiles admin-tiles">
            {[
              ['Usuarios', overview.users],
              ['Jugadores', overview.players],
              ['Envíos 24 h', overview.submissions24h],
              ['Publicados', s.published ?? 0],
              ['Borradores', (s.draft ?? 0) + (s.pending ?? 0)],
              ['Retirados', s.rejected ?? 0],
            ].map(([label, value]) => (
              <div key={label} className="stat-tile">
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </section>
          <h2 className="admin-sub">Próximos días</h2>
          <Coverage days={overview.nextDays} />
        </>
      )}

      <div className="admin-filters">
        <input placeholder="Buscar por título, slug o etiqueta…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <label>
          desde <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          hasta <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        {(from || to || status || q) && (
          <button
            className="ghost"
            onClick={() => {
              setFrom('');
              setTo('');
              setStatus('');
              setQ('');
            }}
          >
            Limpiar
          </button>
        )}
      </div>

      {!items ? (
        <p className="muted">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="empty">No hay retos con esos filtros.</p>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Nivel</th>
                <th>Título</th>
                <th>Estado</th>
                <th>Origen</th>
                <th title="Jugadores / resueltos / envíos">Jug. / ✓ / env.</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className={it.date === overview?.today ? 'is-today' : ''}>
                  <td className="mono nowrap" title={formatDate(it.date, 'es')}>
                    {it.date}
                  </td>
                  <td>
                    <span className={`badge level-${it.level}`}>{LEVEL_SHORT[it.level]}</span>
                  </td>
                  <td>
                    <Link to={`/admin/problems/${it.id}`} className="title-link">
                      {it.title.es}
                    </Link>
                    <div className="muted small mono">
                      {it.slug}
                      {it.tags.length > 0 && ` · ${it.tags.join(', ')}`}
                    </div>
                  </td>
                  <td>
                    <span className={`status-pill st-${it.status}`}>{STATUS_LABEL[it.status]}</span>
                  </td>
                  <td className="muted small">{SOURCE_LABEL[it.source] ?? it.source}</td>
                  <td className="mono small nowrap">
                    {it.players} / {it.solved} / {it.submissions}
                  </td>
                  <td className="nowrap">
                    <Link to={`/admin/problems/${it.id}`} className="ghost">
                      Editar
                    </Link>
                    <button className="ghost" disabled={busy} onClick={() => toggle(it)}>
                      {it.status === 'published' ? 'Retirar' : 'Publicar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
