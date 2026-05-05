import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute() {
  const { token, user } = useAuth();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!['PLATFORM_ADMIN', 'BASIC_USER'].includes(user.profileCode)) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
