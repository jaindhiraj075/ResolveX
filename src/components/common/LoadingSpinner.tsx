import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  fullHeight?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  message,
  fullHeight = false,
}) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 p-6 text-slate-500 dark:text-slate-400 ${
        fullHeight ? 'min-h-[300px]' : ''
      }`}
    >
      <Loader2 className={`${sizes[size]} animate-spin text-indigo-600 dark:text-indigo-400`} />
      {message && (
        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;
