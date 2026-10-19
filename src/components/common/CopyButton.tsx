import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  label,
  className = '',
  size = 'sm',
}) => {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showToast(`Copied ${label || text} to clipboard`, 'info');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Failed to copy to clipboard', 'warning');
    }
  };

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? 'Copied!' : `Copy ${label || text}`}
      aria-label={copied ? 'Copied!' : `Copy ${label || text}`}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-mono font-medium transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${
        copied
          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
      } ${className}`}
    >
      {copied ? (
        <>
          <Check className={`${iconSize} text-emerald-600 dark:text-emerald-400 animate-in zoom-in-50 duration-150`} />
          <span className="text-[11px] font-sans font-semibold">Copied</span>
        </>
      ) : (
        <>
          <Copy className={`${iconSize} opacity-70 group-hover:opacity-100`} />
          <span className="text-[11px] font-sans">{label || text}</span>
        </>
      )}
    </button>
  );
};

export default CopyButton;
