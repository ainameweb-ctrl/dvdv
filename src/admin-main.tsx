import { createRoot } from 'react-dom/client';
import AdminApp from './AdminApp.tsx';
import { ErrorBoundary } from './components/ui/ErrorBoundary.tsx';
import './index.css';

createRoot(document.getElementById('admin-root')!).render(
  <ErrorBoundary scopeLabel="AIname Admin">
    <AdminApp />
  </ErrorBoundary>
);
