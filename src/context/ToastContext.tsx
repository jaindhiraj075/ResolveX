import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { toastVariants } from '../config/motion';

import { formatErrorMessage } from '../utils/errorUtils';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (message: any, type?: ToastType, title?: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: any, type: ToastType = 'info', title?: string, duration = 3500) => {
      const safeMessage = typeof message === 'string' ? message : formatErrorMessage(message);
      const safeTitle = typeof title === 'string' ? title : title ? formatErrorMessage(title) : undefined;
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastItem = { id, type, title: safeTitle, message: safeMessage, duration };
      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      {/* Toast Render Viewport with Motion AnimatePresence */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        <AnimatePresence>
          {toasts.map((toast) => {
            const icons = {
              success: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />,
              error: <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />,
              warning: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />,
              info: <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />,
            };

            const borders = {
              success: 'border-emerald-200 dark:border-emerald-800/80',
              error: 'border-rose-200 dark:border-rose-800/80',
              warning: 'border-amber-200 dark:border-amber-800/80',
              info: 'border-indigo-200 dark:border-indigo-800/80',
            };

            return (
              <motion.div
                key={toast.id}
                layout
                variants={toastVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                role="alert"
                className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-900 border ${borders[toast.type]} shadow-lg dark:shadow-slate-950/50 text-slate-800 dark:text-slate-200 select-none`}
              >
                <div className="mt-0.5">{icons[toast.type]}</div>
                <div className="flex-1 min-w-0">
                  {toast.title && (
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                      {typeof toast.title === 'string' ? toast.title : formatErrorMessage(toast.title)}
                    </h4>
                  )}
                  <p className={`text-xs ${toast.title ? 'mt-0.5 text-slate-600 dark:text-slate-400' : 'font-medium'}`}>
                    {typeof toast.message === 'string' ? toast.message : formatErrorMessage(toast.message)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-md transition-colors cursor-pointer"
                  aria-label="Dismiss toast notification"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastContext;
