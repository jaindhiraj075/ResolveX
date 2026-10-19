import React from 'react';

export type BadgeVariant =
  | 'slate'
  | 'blue'
  | 'indigo'
  | 'green'
  | 'amber'
  | 'rose'
  | 'purple'
  | 'yellow'
  | 'red'
  | 'gray';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'slate',
  size = 'md',
  dot = false,
  className = '',
}) => {
  // Normalize aliases
  const normalizedVariant =
    variant === 'yellow' ? 'amber' : variant === 'red' ? 'rose' : variant === 'gray' ? 'slate' : variant;

  const variants = {
    slate:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    blue:
      'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
    indigo:
      'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
    green:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    amber:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    rose:
      'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    purple:
      'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
  };

  const dotColors = {
    slate: 'bg-slate-500 dark:bg-slate-400',
    blue: 'bg-sky-500 dark:bg-sky-400',
    indigo: 'bg-indigo-500 dark:bg-indigo-400',
    green: 'bg-emerald-500 dark:bg-emerald-400',
    amber: 'bg-amber-500 dark:bg-amber-400',
    rose: 'bg-rose-500 dark:bg-rose-400',
    purple: 'bg-purple-500 dark:bg-purple-400',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border transition-all duration-200 select-none ${variants[normalizedVariant]} ${sizes[size]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${dotColors[normalizedVariant]}`} />}
      <span className="truncate">{children}</span>
    </span>
  );
};

export default Badge;
