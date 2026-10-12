import { Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { NotFoundPage } from './pages/NotFoundPage';
import { ServiceStatusPage } from './pages/ServiceStatusPage';
import { WelcomePage } from './pages/WelcomePage';

export function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<WelcomePage />} />
          <Route path="status" element={<ServiceStatusPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
