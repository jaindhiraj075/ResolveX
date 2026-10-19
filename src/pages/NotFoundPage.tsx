import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import Button from '../components/common/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 transition-colors">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">404</h1>
      <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mt-1">Page Not Found</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-2 mb-6">
        The requested grievance page or administrative route does not exist.
      </p>
      <Link to="/">
        <Button icon={<ArrowLeft className="w-4 h-4" />}>
          Return to Homepage
        </Button>
      </Link>
    </div>
  );
};

export default NotFoundPage;
