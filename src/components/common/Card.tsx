import React, { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  headerAction?: React.ReactNode;
  hoverElevation?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  actions,
  headerAction,
  hoverElevation = false,
  className = '',
  ...props
}) => {
  const renderedActions = actions || headerAction;

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs dark:shadow-none overflow-hidden transition-all duration-200 ${
        hoverElevation
          ? 'hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700'
          : ''
      } ${className}`}
      {...props}
    >
      {(title || subtitle || renderedActions) && (
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-4">
          <div>
            {title && (
              <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          {renderedActions && <div className="flex items-center gap-2">{renderedActions}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
};

export default Card;
