import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import LoadingSpinner from '../common/LoadingSpinner';
import AccessDeniedPage from '../../pages/AccessDeniedPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('STUDENT' | 'STAFF' | 'ADMIN')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, isAuthenticated, loading, role } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <LoadingSpinner size="lg" message="Verifying authentication session..." />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const normalizedRole = (role || user?.role || '').toUpperCase() as 'STUDENT' | 'STAFF' | 'ADMIN';

  if (allowedRoles && (!normalizedRole || !allowedRoles.includes(normalizedRole))) {
    if (location.pathname.includes('/dashboard')) {
      const targetDashboard =
        normalizedRole === 'ADMIN'
          ? '/admin/dashboard'
          : normalizedRole === 'STAFF'
          ? '/staff/dashboard'
          : '/student/dashboard';
      return <Navigate to={targetDashboard} replace />;
    }
    return <AccessDeniedPage />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
