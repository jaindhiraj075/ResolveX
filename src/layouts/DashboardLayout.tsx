import React, { useState } from 'react';
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Bell,
  User,
  Users,
  Building2,
  Tags,
  BarChart3,
  FileSpreadsheet,
  Settings,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import useAuth from '../hooks/useAuth';
import Badge from '../components/common/Badge';
import ThemeToggle from '../components/common/ThemeToggle';
import PageTransition from '../components/common/PageTransition';

export const DashboardLayout: React.FC = () => {
  const { user, role, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const studentLinks = [
    { name: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
    { name: 'My Complaints', path: '/student/complaints', icon: FileText },
    { name: 'Submit Complaint', path: '/student/submit', icon: PlusCircle },
    { name: 'Notifications', path: '/student/notifications', icon: Bell },
    { name: 'Profile', path: '/student/profile', icon: User },
  ];

  const staffLinks = [
    { name: 'Staff Dashboard', path: '/staff/dashboard', icon: LayoutDashboard },
    { name: 'Assigned Complaints', path: '/staff/complaints', icon: FileText },
    { name: 'Notifications', path: '/staff/notifications', icon: Bell },
    { name: 'My Profile', path: '/staff/profile', icon: User },
  ];

  const adminLinks = [
    { name: 'Overview', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'All Complaints', path: '/admin/complaints', icon: FileText },
    { name: 'Users Directory', path: '/admin/users', icon: Users },
    { name: 'Staff Directory', path: '/admin/staff', icon: Users },
    { name: 'Departments', path: '/admin/departments', icon: Building2 },
    { name: 'Categories', path: '/admin/categories', icon: Tags },
    { name: 'SLA & Reports', path: '/admin/reports', icon: FileSpreadsheet },
    { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
    { name: 'System Settings', path: '/admin/settings', icon: Settings },
  ];

  const currentNavLinks =
    role === 'ADMIN' ? adminLinks : role === 'STAFF' ? staffLinks : studentLinks;

  const roleBadgeVariant =
    role === 'ADMIN' ? 'purple' : role === 'STAFF' ? 'indigo' : 'green';

  const currentSection = currentNavLinks.find(
    (l) => l.path === location.pathname || location.pathname.startsWith(l.path + '/')
  )?.name || 'Portal';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row text-slate-800 dark:text-slate-200 transition-colors duration-200">
      {/* Mobile Top Header */}
      <div className="lg:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-30 transition-colors duration-200">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center font-bold shadow-2xs">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span className="font-bold text-slate-900 dark:text-white tracking-tight">
            Resolve<span className="text-indigo-600 dark:text-indigo-400">X</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle size="sm" />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 transition-transform duration-300 ease-out lg:w-64 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800/80 shrink-0 flex flex-col justify-between fixed lg:sticky top-0 h-screen z-40 shadow-lg lg:shadow-none`}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-lg bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-200">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  Resolve<span className="text-indigo-600 dark:text-indigo-400">X</span>
                </span>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">
                  {role} Workspace
                </p>
              </div>
            </Link>
            <div className="hidden lg:block">
              <ThemeToggle size="sm" />
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Navigation
            </div>
            {currentNavLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path.split('/').length <= 3}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0 text-current" />
                  <span className="truncate">{item.name}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* User Profile Card & Logout */}
          <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40">
            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs ring-1 ring-indigo-500/20">
                  {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {user?.full_name || 'User'}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                    {user?.email}
                  </p>
                </div>
                <Badge variant={roleBadgeVariant} size="sm">
                  {role}
                </Badge>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile sidebar */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-30 lg:hidden animate-in fade-in duration-200"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Breadcrumb Trail */}
        <header className="hidden lg:flex items-center justify-between px-8 py-3.5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-20">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="capitalize">{role?.toLowerCase()}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {currentSection}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
              {new Date().toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
        </header>

        {/* Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
