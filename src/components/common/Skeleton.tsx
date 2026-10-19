import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'rounded';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = 'h-4 w-full',
  variant = 'rounded',
}) => {
  const variantStyles = {
    rectangular: 'rounded-none',
    circular: 'rounded-full',
    rounded: 'rounded-lg',
  };

  return (
    <div
      className={`animate-shimmer bg-slate-200/70 dark:bg-slate-800/80 ${variantStyles[variant]} ${className}`}
      aria-hidden="true"
    />
  );
};

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-8" variant="circular" />
      </div>
      <Skeleton className="h-7 w-16" />
      <Skeleton className="h-3 w-36" />
    </div>
  );
};

export const SkeletonTableRow: React.FC<{ cols?: number }> = ({ cols = 5 }) => {
  return (
    <tr className="border-b border-slate-100 dark:border-slate-800/60">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-3 px-4">
          <Skeleton className={`h-3 ${i === 0 ? 'w-16' : i === 1 ? 'w-3/4' : 'w-20'}`} />
        </td>
      ))}
    </tr>
  );
};

export default Skeleton;
