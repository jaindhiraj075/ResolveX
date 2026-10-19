import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  User as UserIcon,
  LogOut,
  ChevronDown,
  ChevronRight,
  Search,
  Command,
} from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import ThemeToggle from '../common/ThemeToggle';
import Badge from '../common/Badge';
import NotificationBell from '../common/NotificationBell';
import { dropdownVariants } from '../../config/motion';

interface AppHeaderProps {
  pageTitle: string;
  category?: string;
  onMenuToggle?: () => void;
  onOpenCommandPalette?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  pageTitle,
  category,
  onOpenCommandPalette,
}) => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const notificationsPath = `/${role?.toLowerCase()}/notifications`;
  const profilePath = `/${role?.toLowerCase()}/profile`;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    navigate('/login');
  };

  const roleBadgeVariant =
    role === 'ADMIN' ? 'purple' : role === 'STAFF' ? 'indigo' : 'green';

  const normalizedUserRole = (role || user?.role || '').toUpperCase();
  const roleCategory =
    normalizedUserRole === 'ADMIN'
      ? 'Admin'
      : normalizedUserRole === 'STAFF'
      ? 'Staff'
      : normalizedUserRole === 'STUDENT'
      ? 'Student'
      : category;

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between transition-colors duration-200">
      {/* Left: Breadcrumbs / Title */}
      <div className="flex items-center gap-2">
        {roleCategory && (
          <>
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 capitalize">
              {roleCategory}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
          </>
        )}
        <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
          {pageTitle}
        </h2>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2.5">
        {/* Quick Command Palette Search Button */}
        {onOpenCommandPalette && (
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-850 dark:hover:bg-slate-800 text-xs text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700/80 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            title="Open Command Palette (Ctrl+K or ⌘K)"
            aria-label="Open Command Palette"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden md:inline font-normal">Quick search...</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 text-[10px] font-mono text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 shadow-2xs">
              ⌘K
            </kbd>
          </button>
        )}

        {/* Dynamic Notification Bell with Unread Badge & Dropdown */}
        <NotificationBell />

        {/* Theme Switcher */}
        <ThemeToggle size="sm" />

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

        {/* User Profile Menu with Animated Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer select-none"
            aria-expanded={profileOpen}
            aria-haspopup="true"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs ring-1 ring-indigo-500/20">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-slate-900 dark:text-white leading-tight truncate max-w-[120px]">
                {user?.full_name || 'User'}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {role}
              </p>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                profileOpen ? 'rotate-180' : 'rotate-0'
              }`}
            />
          </button>

          {/* Profile Dropdown with Motion Exit/Enter */}
          <AnimatePresence>
            {profileOpen && (
              <motion.div
                variants={dropdownVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-slate-950/60 py-1.5 z-50 origin-top-right"
                role="menu"
              >
                <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {user?.full_name}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {user?.email}
                  </p>
                  <div className="mt-1.5">
                    <Badge variant={roleBadgeVariant} size="sm">
                      {role} Account
                    </Badge>
                  </div>
                </div>

                <div className="p-1">
                  <Link
                    to={profilePath}
                    onClick={() => setProfileOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    role="menuitem"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                    My Profile
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                    role="menuitem"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
