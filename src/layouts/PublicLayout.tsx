import React from 'react';
import { Link, useNavigate, useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { ShieldCheck, LogIn, ArrowRight } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import Button from '../components/common/Button';
import ThemeToggle from '../components/common/ThemeToggle';
import PageTransition from '../components/common/PageTransition';

export const PublicLayout: React.FC = () => {
  const { isAuthenticated, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const element = useOutlet();

  const getDashboardPath = () => {
    if (role === 'ADMIN') return '/admin/dashboard';
    if (role === 'STAFF') return '/staff/dashboard';
    return '/student/dashboard';
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-indigo-500/20 selection:text-indigo-600 transition-colors duration-200">
      {/* Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Zone 1: Single text element wordmark */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Resolve<span className="text-indigo-600 dark:text-indigo-400">X</span>
            </span>
          </Link>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <Link to="/" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Platform
            </Link>
            {role === 'ADMIN' ? (
              <>
                <Link to="/admin/complaints" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                  All Grievances
                </Link>
                <Link to="/admin/analytics" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                  Analytics
                </Link>
              </>
            ) : role === 'STAFF' ? (
              <>
                <Link to="/staff/complaints" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                  Assigned Queue
                </Link>
                <Link to="/staff/notifications" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                  Notifications
                </Link>
              </>
            ) : (
              <>
                <Link to="/student/submit" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                  File Grievance
                </Link>
                <Link to="/student/complaints" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                  Track Status
                </Link>
              </>
            )}
          </nav>

          {/* Zone 3: Primary Actions & Theme Switcher */}
          <div className="flex items-center gap-2.5">
            <ThemeToggle size="sm" />

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(getDashboardPath())}
                  icon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Dashboard
                </Button>
                <Button variant="ghost" size="sm" onClick={() => logout()}>
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm" icon={<LogIn className="w-3.5 h-3.5" />}>
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm">
                    Register
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area with Route Transition System */}
      <main className="flex-1 flex flex-col">
        <AnimatePresence mode="wait" initial={false}>
          <PageTransition key={location.pathname} className="flex-1 flex flex-col">
            {element}
          </PageTransition>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800/80 py-8 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} ResolveX. AI-Powered College Complaint Management System.</p>
          <div className="flex items-center gap-4 text-slate-400 dark:text-slate-500">
            <span>Student First</span>
            <span aria-hidden="true">·</span>
            <span>Automated Routing</span>
            <span aria-hidden="true">·</span>
            <span>SLA Monitored</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
