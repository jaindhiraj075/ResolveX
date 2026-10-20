import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';
import { formatErrorMessage } from '../../utils/errorUtils';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from = (location.state as any)?.from?.pathname;

  // Detect if app is running on a static remote host (e.g. Vercel) without configured backend URL
  const isVercelOrStatic =
    typeof window !== 'undefined' &&
    window.location.hostname.includes('vercel.app') &&
    !(import.meta.env.VITE_API_BASE_URL || '').trim();

  const safeErrorString: string | null = error
    ? typeof error === 'string'
      ? error
      : formatErrorMessage(error, 'Authentication failed')
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!email.trim() || !password) {
      setError('Please provide both email address and password');
      showToast('Please provide both email and password', 'warning');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await login({ email: email.trim(), password });
      const user = response?.data?.user || response?.user;
      const token = response?.data?.token || response?.token;
      const success = response?.success ?? (Boolean(user) && Boolean(token));

      if (!success || !user || !token) {
        const rawMsg =
          response?.data?.message ||
          response?.message ||
          response?.data?.error ||
          response?.error ||
          'Authentication failed: Invalid credentials or response';
        throw new Error(typeof rawMsg === 'string' ? rawMsg : formatErrorMessage(rawMsg));
      }

      const userRole = (user.role || '').toUpperCase();
      showToast(`Welcome back, ${user.full_name || 'User'}!`, 'success');

      // Navigate to intended destination or role-based dashboard
      const isPathAllowedForRole = (pathStr: string, r: string) => {
        if (!pathStr || pathStr.includes('/login') || pathStr === '/403') return false;
        if (r === 'ADMIN') return pathStr.startsWith('/admin');
        if (r === 'STAFF') return pathStr.startsWith('/staff');
        if (r === 'STUDENT') return pathStr.startsWith('/student');
        return false;
      };

      if (from && isPathAllowedForRole(from, userRole)) {
        navigate(from, { replace: true });
      } else if (userRole === 'ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else if (userRole === 'STAFF') {
        navigate('/staff/dashboard', { replace: true });
      } else {
        navigate('/student/dashboard', { replace: true });
      }
    } catch (err: any) {
      const message = formatErrorMessage(err, 'Unable to log in. Please check your credentials.');
      setError(message);
      showToast(message, 'error', 'Authentication Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (demoEmail: string, demoPass: string, label: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
    showToast(`Pre-filled ${label} credentials`, 'info');
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-4 group">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-200">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Resolve<span className="text-indigo-600 dark:text-indigo-400">X</span>
            </span>
          </Link>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Sign in to your account</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Access your grievance workspace, tracking timeline, and department queue
          </p>
        </div>

        {/* Demo Fast Selection */}
        <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50 text-left">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300 block mb-2">
            Demo Credentials (Click to pre-fill)
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleDemoFill('student@resolvex.edu', 'Student@123', 'Student')}
              className="px-2 py-1.5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-md text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 active:scale-[0.98] transition-all cursor-pointer"
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill('staff@resolvex.edu', 'Staff@123', 'Staff')}
              className="px-2 py-1.5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-md text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 active:scale-[0.98] transition-all cursor-pointer"
            >
              Staff (IT)
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill('admin@resolvex.edu', 'Admin@123', 'Admin')}
              className="px-2 py-1.5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-md text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 active:scale-[0.98] transition-all cursor-pointer"
            >
              Admin
            </button>
          </div>
        </div>

        {/* Informational Banner for Vercel Deployments without configured backend */}
        {isVercelOrStatic && !safeErrorString && (
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="font-semibold text-amber-900 dark:text-amber-100">
                Backend Deployment Configuration Required
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                Vercel is hosting the static frontend. To connect live authentication, deploy the Flask backend in <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900/60 rounded font-mono text-[10px]">/backend</code> (e.g. Render/Railway) and configure <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900/60 rounded font-mono text-[10px]">VITE_API_BASE_URL</code> in Vercel project settings.
              </p>
            </div>
          </div>
        )}

        {/* Login Card */}
        <Card hoverElevation>
          <form onSubmit={handleSubmit} className="space-y-4">
            {safeErrorString && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="font-semibold">{safeErrorString}</p>
                  {(safeErrorString.includes('HTTP 404') || safeErrorString.includes('VITE_API_BASE_URL') || safeErrorString.includes('backend service') || safeErrorString.includes('Backend')) && (
                    <p className="text-[11px] text-rose-600/90 dark:text-rose-400/90 leading-relaxed">
                      Configuration Note: On static hosts (like Vercel), ensure your Python Flask backend is deployed and its URL is set as <code className="px-1 py-0.5 bg-rose-100 dark:bg-rose-900/50 rounded font-mono text-[10px]">VITE_API_BASE_URL</code> in environment variables.
                    </p>
                  )}
                </div>
              </div>
            )}

            <Input
              label="College Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. student@resolvex.edu"
              icon={<Mail className="w-4 h-4" />}
              autoComplete="email"
              required
            />

            <div className="w-full">
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-10 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 hover:border-slate-400 dark:hover:border-slate-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500/20"
                />
                <span>Remember this session</span>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              size="md"
              loading={loading}
              disabled={loading}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to Workspace
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Don&apos;t have an account?{' '}
              <Link
                to="/register"
                className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
              >
                Create student account
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
