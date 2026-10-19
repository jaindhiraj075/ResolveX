import React from 'react';
import { Link } from 'react-router-dom';
import { AlertOctagon, RotateCcw, Home } from 'lucide-react';
import Button from '../components/common/Button';

export const ServerErrorPage: React.FC = () => {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl dark:shadow-none animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto mb-5 shadow-xs">
          <AlertOctagon className="w-8 h-8" />
        </div>

        <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
          500 Server Error
        </span>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
          Something Went Wrong
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 mb-6 leading-relaxed">
          The system encountered an unexpected condition. Our administrative telemetry has logged this event. Please try reloading or check back shortly.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <Button
            variant="primary"
            className="w-full sm:w-auto"
            onClick={handleReload}
            icon={<RotateCcw className="w-4 h-4" />}
          >
            Reload Page
          </Button>
          <Link to="/" className="w-full sm:w-auto">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              icon={<Home className="w-4 h-4" />}
            >
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ServerErrorPage;
