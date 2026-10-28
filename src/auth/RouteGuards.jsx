import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import Splash from '../components/Splash.jsx';

export function ProtectedRoute() {
  const { status, retry } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <Splash />;
  if (status === 'error') return <Splash error onRetry={retry} />;
  if (status === 'guest') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

export function GuestRoute() {
  const { status, retry } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <Splash />;
  if (status === 'error') return <Splash error onRetry={retry} />;
  if (status === 'authenticated') {
    const target = location.state?.from?.pathname || '/';
    return <Navigate to={target} replace />;
  }
  return <Outlet />;
}
