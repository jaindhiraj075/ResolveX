import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Command,
  FileText,
  PlusCircle,
  LayoutDashboard,
  Users,
  Building2,
  Tags,
  FileSpreadsheet,
  BarChart3,
  Settings,
  LogOut,
  Moon,
  Sun,
  Bell,
  User,
  ArrowRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  CornerDownLeft,
  X,
  ExternalLink,
} from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import complaintService, { ComplaintItem } from '../../services/complaintService';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ActionItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Navigation' | 'Actions' | 'Complaints' | 'Preferences';
  icon: React.ElementType;
  shortcut?: string;
  badge?: string;
  perform: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const { user, role, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [complaintResults, setComplaintResults] = useState<ComplaintItem[]>([]);
  const [searchingComplaints, setSearchingComplaints] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input whenever opened & reset query
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setComplaintResults([]);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Live complaint search with debounce when query is typed
  useEffect(() => {
    if (!isOpen || !query.trim() || query.length < 2) {
      setComplaintResults([]);
      setSearchingComplaints(false);
      return;
    }

    setSearchingComplaints(true);
    const timer = setTimeout(async () => {
      try {
        const results = await complaintService.getComplaints({ search: query.trim() });
        setComplaintResults((results || []).slice(0, 5));
      } catch {
        setComplaintResults([]);
      } finally {
        setSearchingComplaints(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  // Static role-based command items
  const baseActions = useMemo<ActionItem[]>(() => {
    const items: ActionItem[] = [];

    // --- Role Navigation ---
    if (role === 'STUDENT') {
      items.push(
        {
          id: 'nav-student-dashboard',
          title: 'Student Dashboard',
          subtitle: 'Overview of active grievances and SLA statuses',
          category: 'Navigation',
          icon: LayoutDashboard,
          perform: () => {
            navigate('/student/dashboard');
            onClose();
          },
        },
        {
          id: 'nav-student-submit',
          title: 'Submit New Complaint',
          subtitle: 'Log a new grievance with AI categorization',
          category: 'Actions',
          icon: PlusCircle,
          badge: 'New',
          perform: () => {
            navigate('/student/submit');
            onClose();
          },
        },
        {
          id: 'nav-student-complaints',
          title: 'My Complaints',
          subtitle: 'View submitted tickets, audit history, and submit feedback',
          category: 'Navigation',
          icon: FileText,
          perform: () => {
            navigate('/student/complaints');
            onClose();
          },
        },
        {
          id: 'nav-student-notifications',
          title: 'Notifications',
          subtitle: 'Check recent SLA updates and status alerts',
          category: 'Navigation',
          icon: Bell,
          perform: () => {
            navigate('/student/notifications');
            onClose();
          },
        },
        {
          id: 'nav-student-profile',
          title: 'My Profile',
          subtitle: 'Manage user credentials and account details',
          category: 'Navigation',
          icon: User,
          perform: () => {
            navigate('/student/profile');
            onClose();
          },
        }
      );
    } else if (role === 'STAFF') {
      items.push(
        {
          id: 'nav-staff-dashboard',
          title: 'Staff Dashboard',
          subtitle: 'Operational queue, SLA timers, and department metrics',
          category: 'Navigation',
          icon: LayoutDashboard,
          perform: () => {
            navigate('/staff/dashboard');
            onClose();
          },
        },
        {
          id: 'nav-staff-complaints',
          title: 'Assigned Complaints',
          subtitle: 'Handle assigned tickets, update statuses, and post resolutions',
          category: 'Navigation',
          icon: FileText,
          perform: () => {
            navigate('/staff/complaints');
            onClose();
          },
        },
        {
          id: 'nav-staff-notifications',
          title: 'Notifications',
          subtitle: 'Department escalations, new assignments, and student responses',
          category: 'Navigation',
          icon: Bell,
          perform: () => {
            navigate('/staff/notifications');
            onClose();
          },
        },
        {
          id: 'nav-staff-profile',
          title: 'Staff Profile',
          subtitle: 'Department assignment and personal details',
          category: 'Navigation',
          icon: User,
          perform: () => {
            navigate('/staff/profile');
            onClose();
          },
        }
      );
    } else if (role === 'ADMIN') {
      items.push(
        {
          id: 'nav-admin-dashboard',
          title: 'Executive Dashboard',
          subtitle: 'Institutional KPIs, trends, and department intelligence',
          category: 'Navigation',
          icon: LayoutDashboard,
          perform: () => {
            navigate('/admin/dashboard');
            onClose();
          },
        },
        {
          id: 'nav-admin-complaints',
          title: 'Institution Complaints Directory',
          subtitle: 'Manage, assign, and audit grievances across all campus units',
          category: 'Navigation',
          icon: FileText,
          perform: () => {
            navigate('/admin/complaints');
            onClose();
          },
        },
        {
          id: 'nav-admin-reports',
          title: 'SLA Reports & Intelligence',
          subtitle: 'Generate management reports and export audit datasets',
          category: 'Navigation',
          icon: FileSpreadsheet,
          perform: () => {
            navigate('/admin/reports');
            onClose();
          },
        },
        {
          id: 'nav-admin-analytics',
          title: 'Deep Analytics Engine',
          subtitle: 'Category volume, department workload, and SLA compliance',
          category: 'Navigation',
          icon: BarChart3,
          perform: () => {
            navigate('/admin/analytics');
            onClose();
          },
        },
        {
          id: 'nav-admin-departments',
          title: 'Manage Campus Departments',
          subtitle: 'Add, reconfigure, or assign department leads',
          category: 'Navigation',
          icon: Building2,
          perform: () => {
            navigate('/admin/departments');
            onClose();
          },
        },
        {
          id: 'nav-admin-categories',
          title: 'Manage Grievance Categories',
          subtitle: 'Configure complaint taxonomy, SLA targets, and AI mappings',
          category: 'Navigation',
          icon: Tags,
          perform: () => {
            navigate('/admin/categories');
            onClose();
          },
        },
        {
          id: 'nav-admin-staff',
          title: 'Staff Directory & Workload',
          subtitle: 'Inspect staff assignments, resolution speed, and ratings',
          category: 'Navigation',
          icon: Users,
          perform: () => {
            navigate('/admin/staff');
            onClose();
          },
        },
        {
          id: 'nav-admin-users',
          title: 'All User Accounts',
          subtitle: 'Directory of students, faculty, and administrative users',
          category: 'Navigation',
          icon: Users,
          perform: () => {
            navigate('/admin/users');
            onClose();
          },
        },
        {
          id: 'nav-admin-settings',
          title: 'System Settings',
          subtitle: 'SLA thresholds, duplicate detection sensitivity, and mailers',
          category: 'Navigation',
          icon: Settings,
          perform: () => {
            navigate('/admin/settings');
            onClose();
          },
        }
      );
    }

    // --- Global Preferences & System Actions ---
    items.push(
      {
        id: 'pref-toggle-theme',
        title: theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
        subtitle: `Currently using ${theme} color palette`,
        category: 'Preferences',
        icon: theme === 'dark' ? Sun : Moon,
        perform: () => {
          toggleTheme();
          showToast(`Switched to ${theme === 'dark' ? 'light' : 'dark'} mode`, 'info');
          onClose();
        },
      },
      {
        id: 'pref-logout',
        title: 'Sign Out of ResolveX',
        subtitle: `Logged in as ${user?.email || 'authenticated user'}`,
        category: 'Preferences',
        icon: LogOut,
        perform: async () => {
          onClose();
          await logout();
          navigate('/login');
          showToast('Signed out successfully', 'info');
        },
      }
    );

    return items;
  }, [role, theme, user, navigate, onClose, toggleTheme, logout, showToast]);

  // Combine static actions with dynamic live complaint search results
  const allFilteredItems = useMemo<ActionItem[]>(() => {
    const q = query.trim().toLowerCase();

    // Add complaint search items if query is present
    const dynamicComplaintItems: ActionItem[] = complaintResults.map((c) => ({
      id: `complaint-${c.id}`,
      title: `${c.complaint_id}: ${c.title}`,
      subtitle: `${c.department_name || 'Department'} · Status: ${c.status} · Priority: ${c.priority}`,
      category: 'Complaints',
      icon: FileText,
      badge: c.priority,
      perform: () => {
        const targetPath =
          role === 'ADMIN'
            ? `/admin/complaints/${c.id}`
            : role === 'STAFF'
            ? `/staff/complaints/${c.id}`
            : `/student/complaints/${c.id}`;
        navigate(targetPath);
        onClose();
      },
    }));

    if (!q) {
      return baseActions;
    }

    // Filter static actions by title, subtitle, or category
    const filteredStatic = baseActions.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q)
    );

    return [...dynamicComplaintItems, ...filteredStatic];
  }, [baseActions, complaintResults, query, role, navigate, onClose]);

  // Reset selected index if items change or overflow
  useEffect(() => {
    if (selectedIndex >= allFilteredItems.length) {
      setSelectedIndex(0);
    }
  }, [allFilteredItems, selectedIndex]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-selected="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Keyboard navigation within command palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, allFilteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev <= 0 ? Math.max(0, allFilteredItems.length - 1) : prev - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = allFilteredItems[selectedIndex];
      if (selected) {
        selected.perform();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (query) {
        setQuery('');
      } else {
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 sm:px-6 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Search Input Bar */}
          <div className="relative flex items-center px-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0 ml-1" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type a command, page title, or complaint ID..."
              className="w-full px-3 py-4 bg-transparent text-sm sm:text-base text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <div className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-200/60 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-slate-300/40 dark:border-slate-700/60 ml-2">
              <span>ESC</span>
            </div>
          </div>

          {/* Results List */}
          <div ref={listRef} className="overflow-y-auto p-2 space-y-1 divide-y-0">
            {allFilteredItems.length === 0 ? (
              <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                <Search className="w-8 h-8 mx-auto mb-2 text-slate-400 dark:text-slate-600 opacity-60" />
                <p className="text-sm font-medium">No matching commands or grievances found</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Try searching with keywords like &quot;submit&quot;, &quot;Wi-Fi&quot;, &quot;reports&quot;, or &quot;theme&quot;
                </p>
              </div>
            ) : (
              allFilteredItems.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                const IconComponent = item.icon;

                return (
                  <button
                    key={item.id}
                    type="button"
                    data-selected={isSelected}
                    onClick={() => item.perform()}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-3 transition-colors cursor-pointer group ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                        }`}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-sm font-medium truncate ${
                              isSelected ? 'text-white' : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {item.title}
                          </p>
                          {item.badge && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                isSelected
                                  ? 'bg-white/20 text-white'
                                  : 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                        {item.subtitle && (
                          <p
                            className={`text-xs truncate ${
                              isSelected ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] font-medium uppercase tracking-wider ${
                          isSelected ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {item.category}
                      </span>
                      {isSelected && (
                        <CornerDownLeft className="w-3.5 h-3.5 text-indigo-200 animate-pulse" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Bottom Keyboard Navigation Hint Footer */}
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/70 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700 font-mono text-[10px]">
                  ↑
                </kbd>
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700 font-mono text-[10px]">
                  ↓
                </kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700 font-mono text-[10px]">
                  ↵
                </kbd>
                Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700 font-mono text-[10px]">
                  ESC
                </kbd>
                Close
              </span>
            </div>

            <span className="font-semibold text-slate-400 dark:text-slate-500">ResolveX Quick Jump</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CommandPalette;
