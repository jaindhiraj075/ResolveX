import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Mail,
  Lock,
  User,
  Phone,
  Hash,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';
import { formatErrorMessage } from '../../utils/errorUtils';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    student_id_number: '',
    phone: '',
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (apiError) setApiError(null);
  };

  // Validation rules
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const errors: Record<string, string> = {};

  if (!formData.full_name.trim()) {
    errors.full_name = 'Full name is required';
  }

  if (!formData.email.trim()) {
    errors.email = 'College email address is required';
  } else if (!emailRegex.test(formData.email.trim())) {
    errors.email = 'Please enter a valid email address';
  }

  if (!formData.password) {
    errors.password = 'Password is required';
  } else if (formData.password.length < 6) {
    errors.password = 'Password must be at least 6 characters long';
  }

  if (!formData.confirm_password) {
    errors.confirm_password = 'Password confirmation is required';
  } else if (formData.confirm_password !== formData.password) {
    errors.confirm_password = 'Passwords do not match';
  }

  const isFormValid = Object.keys(errors).length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    // Mark all as touched
    setTouched({
      full_name: true,
      email: true,
      password: true,
      confirm_password: true,
    });

    if (!isFormValid) {
      showToast('Please correct the validation errors below', 'warning');
      return;
    }

    setApiError(null);
    setLoading(true);

    try {
      await register({
        full_name: formData.full_name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: 'STUDENT',
        student_id_number: formData.student_id_number.trim() || undefined,
        phone: formData.phone.trim() || undefined,
      });

      showToast('Student account created successfully! Welcome to ResolveX.', 'success');
      navigate('/student/dashboard', { replace: true });
    } catch (err: any) {
      const message = formatErrorMessage(err, 'Registration failed. Please check your information.');
      setApiError(message);
      showToast(message, 'error', 'Registration Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-6">
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
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Create student account
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Submit grievances, track resolution timelines, and receive updates
          </p>
        </div>

        {/* Card */}
        <Card hoverElevation>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {apiError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <span>{typeof apiError === 'string' ? apiError : formatErrorMessage(apiError)}</span>
              </div>
            )}

            <Input
              label="Full Name *"
              name="full_name"
              type="text"
              value={formData.full_name}
              onChange={handleChange}
              onBlur={() => handleBlur('full_name')}
              placeholder="e.g. Dhiraj Jain"
              icon={<User className="w-4 h-4" />}
              error={touched.full_name ? errors.full_name : undefined}
              required
            />

            <Input
              label="College Email Address *"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={() => handleBlur('email')}
              placeholder="e.g. rollno@college.edu"
              icon={<Mail className="w-4 h-4" />}
              error={touched.email ? errors.email : undefined}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Student ID / Roll No"
                name="student_id_number"
                type="text"
                value={formData.student_id_number}
                onChange={handleChange}
                placeholder="e.g. 2024CS104"
                icon={<Hash className="w-4 h-4" />}
              />
              <Input
                label="Phone Number"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g. +91 9876543210"
                icon={<Phone className="w-4 h-4" />}
              />
            </div>

            {/* Password Field with Show/Hide */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="w-full">
                <label
                  htmlFor="reg-password"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
                >
                  Password *
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="reg-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={() => handleBlur('password')}
                    placeholder="Min. 6 chars"
                    required
                    className={`w-full rounded-lg border bg-white dark:bg-slate-900 pl-10 pr-10 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all duration-200 focus:outline-none focus:ring-2 ${
                      touched.password && errors.password
                        ? 'border-rose-300 dark:border-rose-800 focus:ring-rose-500/20 focus:border-rose-500'
                        : 'border-slate-300 dark:border-slate-700 focus:ring-indigo-500/20 focus:border-indigo-500 hover:border-slate-400 dark:hover:border-slate-600'
                    }`}
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
                {touched.password && errors.password && (
                  <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Confirm Password Field with Show/Hide */}
              <div className="w-full">
                <label
                  htmlFor="reg-confirm-password"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
                >
                  Confirm Password *
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="reg-confirm-password"
                    name="confirm_password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirm_password}
                    onChange={handleChange}
                    onBlur={() => handleBlur('confirm_password')}
                    placeholder="Repeat password"
                    required
                    className={`w-full rounded-lg border bg-white dark:bg-slate-900 pl-10 pr-10 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all duration-200 focus:outline-none focus:ring-2 ${
                      touched.confirm_password && errors.confirm_password
                        ? 'border-rose-300 dark:border-rose-800 focus:ring-rose-500/20 focus:border-rose-500'
                        : 'border-slate-300 dark:border-slate-700 focus:ring-indigo-500/20 focus:border-indigo-500 hover:border-slate-400 dark:hover:border-slate-600'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {touched.confirm_password && errors.confirm_password && (
                  <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
                    {errors.confirm_password}
                  </p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-3"
              size="md"
              loading={loading}
              disabled={loading}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Complete Registration
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;
