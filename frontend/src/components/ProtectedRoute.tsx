import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';

export default function ProtectedRoute() {
  const { token, user } = useAuth();
  const { urlLocale } = useLocale();

  if (!token || !user) {
    return <Navigate to={`/${urlLocale}/login`} replace />;
  }

  if (!['PLATFORM_ADMIN', 'BASIC_USER'].includes(user.profileCode)) {
    return <Navigate to={`/${urlLocale}/login`} replace />;
  }

  return <Outlet />;
}
