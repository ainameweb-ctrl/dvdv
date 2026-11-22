import { createRoot } from 'react-dom/client';
import UserApp from './UserApp.tsx';
import { ErrorBoundary } from './components/ui/ErrorBoundary.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary scopeLabel="AIname Streaming">
    <UserApp />
  </ErrorBoundary>
);
