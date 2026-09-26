import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useI18n } from './lib/i18n';
import ArchivePage from './pages/ArchivePage';
import AuthPage from './pages/AuthPage';
import DayPage from './pages/DayPage';
import StatsPage from './pages/StatsPage';

const ProblemPage = lazy(() => import('./pages/ProblemPage'));

function Loading() {
  const { t } = useI18n();
  return (
    <main className="page">
      <p className="muted">{t('loading')}</p>
    </main>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DayPage />} />
          <Route path="day/:date" element={<DayPage />} />
          <Route path="archive" element={<ArchivePage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="login" element={<AuthPage />} />
          <Route
            path="problem/:id"
            element={
              <Suspense fallback={<Loading />}>
                <ProblemPage />
              </Suspense>
            }
          />
          <Route path="*" element={<DayPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
