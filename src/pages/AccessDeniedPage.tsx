import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import Button from '../components/common/Button';

export const AccessDeniedPage: React.FC = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const normalizedRole = (role || user?.role || '').toUpperCase();

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (normalizedRole === 'ADMIN') return '/admin/dashboard';
    if (normalizedRole === 'STAFF') return '/staff/dashboard';
    return '/student/dashboard';
  };

  const handleSwitchAccount = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl dark:shadow-none animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto mb-5 shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
          403 Forbidden
        </span>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
          Access Denied
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 mb-6 leading-relaxed">
          You don&apos;t have permission to access this page. This route requires elevated credentials for your assigned role.
          {user && (
            <span className="block mt-2 font-mono text-[11px] text-slate-500 dark:text-slate-400">
              Active account: {user.email} ({normalizedRole || 'UNKNOWN'})
            </span>
          )}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <Link to={getDashboardPath()} className="w-full sm:w-auto">
            <Button
              variant="primary"
              className="w-full sm:w-auto"
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              Go to Dashboard
            </Button>
          </Link>
          <Button
            variant="ghost"
            className="w-full sm:w-auto text-slate-600 dark:text-slate-400"
            onClick={handleSwitchAccount}
            icon={<LogOut className="w-4 h-4" />}
          >
            Switch Account
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AccessDeniedPage;
