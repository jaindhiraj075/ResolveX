import React from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { ShieldCheck, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import useAuth from '../../hooks/useAuth';

export interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface AppSidebarProps {
  items: NavItem[];
  mobileOpen: boolean;
  onCloseMobile: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  items,
  mobileOpen,
  onCloseMobile,
  collapsed,
  onToggleCollapse,
}) => {
  const { user, role, logout } = useAuth();
  const location = useLocation();

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 dark:bg-black/70 backdrop-blur-xs z-40 lg:hidden animate-in fade-in duration-200"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 h-screen z-40 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between transition-all duration-300 ease-out select-none shadow-xl lg:shadow-none ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'w-20' : 'w-64'}`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Brand Header */}
          <div className="h-16 px-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between shrink-0">
            <Link
              to="/"
              className={`flex items-center gap-2.5 overflow-hidden transition-all ${
                collapsed ? 'justify-center w-full' : ''
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center font-bold shadow-xs shrink-0 hover:scale-105 transition-transform duration-200">
                <ShieldCheck className="w-5 h-5" />
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-none block">
                    Resolve<span className="text-indigo-600 dark:text-indigo-400">X</span>
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
                    {role}
                  </span>
                </div>
              )}
            </Link>

            {/* Collapse Toggle for Desktop / Tablet */}
            {!collapsed && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden lg:flex p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Navigation Items with Shared Animated Active Indicator */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {!collapsed && (
              <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Menu
              </div>
            )}

            {items.map((item) => {
              const Icon = item.icon;
              const isItemActive =
                item.path === location.pathname ||
                (item.path.split('/').length > 2 && location.pathname.startsWith(item.path));

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path.split('/').length <= 3}
                  onClick={onCloseMobile}
                  title={collapsed ? item.name : undefined}
                  className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    collapsed ? 'justify-center' : ''
                  } ${
                    isItemActive
                      ? 'text-indigo-700 dark:text-indigo-300'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {/* Shared Animated Active Indicator */}
                  {isItemActive && (
                    <motion.div
                      layoutId="sidebarActiveIndicator"
                      className="absolute inset-0 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/70 dark:border-indigo-800/40 shadow-2xs pointer-events-none"
                      transition={{
                        type: 'spring',
                        stiffness: 380,
                        damping: 32,
                      }}
                    />
                  )}

                  {/* Icon & Label (stable above indicator) */}
                  <Icon
                    className={`w-4 h-4 shrink-0 relative z-10 transition-colors ${
                      isItemActive
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                    }`}
                  />
                  {!collapsed && <span className="truncate relative z-10">{item.name}</span>}

                  {/* Tooltip in collapsed mode */}
                  {collapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[11px] rounded-md shadow-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                      {item.name}
                    </div>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Collapsed Expand Toggle */}
          {collapsed && (
            <div className="hidden lg:flex justify-center py-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* User Section & Logout */}
          <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40">
            {!collapsed ? (
              <>
                <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-indigo-500/20">
                      {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {user?.full_name}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => logout()}
                  className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => logout()}
                className="w-full flex justify-center p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
