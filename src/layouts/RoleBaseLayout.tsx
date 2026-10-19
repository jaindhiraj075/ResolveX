import React, { useState, useEffect } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { Menu } from 'lucide-react';
import AppSidebar, { NavItem } from '../components/layout/AppSidebar';
import AppHeader from '../components/layout/AppHeader';
import PageTransition from '../components/common/PageTransition';
import CommandPalette from '../components/common/CommandPalette';

import useAuth from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface RoleBaseLayoutProps {
  navItems: NavItem[];
  roleName: string;
}

export const RoleBaseLayout: React.FC<RoleBaseLayoutProps> = ({ navItems, roleName }) => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const location = useLocation();
  const element = useOutlet();

  // Guard against role-layout mismatches: an Admin must be in AdminLayout, Staff in StaffLayout, Student in StudentLayout
  const normalizedUserRole = (role || user?.role || '').toUpperCase();
  const expectedRole = roleName.toUpperCase();

  useEffect(() => {
    if (normalizedUserRole && normalizedUserRole !== expectedRole) {
      const targetDashboard =
        normalizedUserRole === 'ADMIN'
          ? '/admin/dashboard'
          : normalizedUserRole === 'STAFF'
          ? '/staff/dashboard'
          : '/student/dashboard';
      navigate(targetDashboard, { replace: true });
    }
  }, [normalizedUserRole, expectedRole, navigate]);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeItem = navItems.find(
    (item) =>
      item.path === location.pathname ||
      (item.path.split('/').length > 2 && location.pathname.startsWith(item.path))
  );

  const pageTitle = activeItem ? activeItem.name : `${roleName} Workspace`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex text-slate-800 dark:text-slate-200 transition-colors duration-200">
      {/* Global Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

      {/* Responsive Sidebar */}
      <AppSidebar
        items={navItems}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top App Bar */}
        <div className="lg:hidden h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between sticky top-0 z-30">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
            {pageTitle}
          </span>
          <div className="w-7" />
        </div>

        {/* Application Header with Profile Menu, Notifications, Theme Toggle */}
        <AppHeader
          pageTitle={pageTitle}
          category={roleName}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        />

        {/* Viewport Content with AnimatePresence Route Transition */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          <AnimatePresence mode="wait" initial={false}>
            <PageTransition key={location.pathname}>
              {element}
            </PageTransition>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default RoleBaseLayout;
