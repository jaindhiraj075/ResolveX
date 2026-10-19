import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import {
  Brain,
  GitBranch,
  CopyCheck,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  UserCheck,
} from 'lucide-react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import AnimatedCounter from '../../components/common/AnimatedCounter';
import useAuth from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { staggerContainer, staggerItem } from '../../config/motion';

export const LandingPage: React.FC = () => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const handleQuickDemo = async (email: string, pass: string, targetPath: string, roleName: string) => {
    try {
      showToast(`Signing in as ${roleName}...`, 'info');
      await login({ email, password: pass });
      showToast(`Signed in as ${roleName}`, 'success');
      navigate(targetPath);
    } catch {
      showToast('Could not sign in with demo credentials. Please try manually.', 'error');
      navigate('/login');
    }
  };

  const featureCards = [
    {
      icon: Brain,
      color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50',
      title: 'AI-Powered Categorization',
      description:
        'Natural Language Processing analyzes student grievances in real-time, automatically assigning appropriate tags and categories with high confidence.',
    },
    {
      icon: GitBranch,
      color: 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400 border-sky-100 dark:border-sky-900/50',
      title: 'Smart Department Routing',
      description:
        'Complaints are dispatched automatically to the designated department (IT/Network, Hostel, Maintenance, CSE Lab) eliminating bureaucratic delays.',
    },
    {
      icon: CopyCheck,
      color: 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 border-purple-100 dark:border-purple-900/50',
      title: 'Duplicate Detection',
      description:
        'Cosine similarity algorithms detect redundant issues across campus (e.g. Wi-Fi outage in Block A), grouping reports to optimize resolution bandwidth.',
    },
    {
      icon: Clock,
      color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50',
      title: 'Transparent Complaint Tracking',
      description:
        'Students and administrators monitor end-to-end status lifecycles with SLA timelines, history audit trails, and accountable staff assignments.',
    },
  ];

  return (
    <div className="space-y-20 py-8 sm:py-16">
      {/* Hero Section with Staggered Entrance */}
      <motion.section
        variants={shouldReduceMotion ? undefined : staggerContainer}
        initial="initial"
        animate="animate"
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
      >
        <motion.div variants={shouldReduceMotion ? undefined : staggerItem} className="inline-flex items-center gap-2 mb-6">
          <Badge variant="indigo" size="md" dot>
            Phase 2: Authentication & Role Dashboards Active
          </Badge>
        </motion.div>

        <motion.h1
          variants={shouldReduceMotion ? undefined : staggerItem}
          className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight"
        >
          AI-Powered Intelligent <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-sky-600 dark:from-indigo-400 dark:to-sky-400">
            College Complaint Management
          </span>
        </motion.h1>

        <motion.p
          variants={shouldReduceMotion ? undefined : staggerItem}
          className="mt-4 text-xl sm:text-2xl font-medium text-slate-600 dark:text-slate-300 max-w-2xl mx-auto"
        >
          Raise it. Track it. Resolve it.
        </motion.p>

        <motion.p
          variants={shouldReduceMotion ? undefined : staggerItem}
          className="mt-3 text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed"
        >
          ResolveX transforms college grievance redressal with automated routing,
          role-based operational workflows, and intelligent duplicate suppression.
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          variants={shouldReduceMotion ? undefined : staggerItem}
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Link to="/student/submit">
            <Button size="lg" icon={<ArrowRight className="w-4 h-4" />}>
              Submit a Complaint
            </Button>
          </Link>
          <Link to="/student/complaints">
            <Button variant="outline" size="lg">
              Track Complaint
            </Button>
          </Link>
        </motion.div>

        {/* Quick Demo Access Bar */}
        <motion.div
          variants={shouldReduceMotion ? undefined : staggerItem}
          className="mt-12 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs max-w-3xl mx-auto text-left transition-colors duration-200"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80 mb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Instant Demo Accounts (One-Click Sign In)</span>
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">Development Environment</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => handleQuickDemo('student@resolvex.edu', 'Student@123', '/student/dashboard', 'Student')}
              className="p-3 text-left rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/40 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Student Portal</span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400/80 mt-1 truncate">student@resolvex.edu</p>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('staff@resolvex.edu', 'Staff@123', '/staff/dashboard', 'Staff Member')}
              className="p-3 text-left rounded-lg bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/40 hover:bg-indigo-100/60 dark:hover:bg-indigo-950/40 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300">Staff Portal (IT)</span>
                <ArrowRight className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-[11px] text-indigo-700 dark:text-indigo-400/80 mt-1 truncate">staff@resolvex.edu</p>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('admin@resolvex.edu', 'Admin@123', '/admin/dashboard', 'Administrator')}
              className="p-3 text-left rounded-lg bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-800/40 hover:bg-purple-100/60 dark:hover:bg-purple-950/40 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-800 dark:text-purple-300">Admin Console</span>
                <ArrowRight className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-[11px] text-purple-700 dark:text-purple-400/80 mt-1 truncate">admin@resolvex.edu</p>
            </button>
          </div>
        </motion.div>
      </motion.section>

      {/* Feature Cards Grid with Stagger */}
      <motion.section
        variants={shouldReduceMotion ? undefined : staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: '-50px' }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Engineered for Campus Governance
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
            Built from the ground up to replace disorganized email threads and manual paper registers with an auditable digital pipeline.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featureCards.map((feat) => {
            const Icon = feat.icon;
            return (
              <motion.div key={feat.title} variants={shouldReduceMotion ? undefined : staggerItem}>
                <Card hoverElevation className="h-full">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center border ${feat.color} mb-4 transition-colors`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">{feat.title}</h3>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">{feat.description}</p>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* Key Metric Highlights with Stagger */}
      <motion.section
        variants={shouldReduceMotion ? undefined : staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: '-40px' }}
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <motion.div variants={shouldReduceMotion ? undefined : staggerItem}>
            <Card className="p-4" hoverElevation>
              <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                <AnimatedCounter value={4} />
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
                Active Departments
              </p>
            </Card>
          </motion.div>
          <motion.div variants={shouldReduceMotion ? undefined : staggerItem}>
            <Card className="p-4" hoverElevation>
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                <AnimatedCounter value={96.4} suffix="%" />
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
                SLA Compliance
              </p>
            </Card>
          </motion.div>
          <motion.div variants={shouldReduceMotion ? undefined : staggerItem}>
            <Card className="p-4" hoverElevation>
              <p className="text-3xl font-bold text-sky-600 dark:text-sky-400">
                <AnimatedCounter value={11} />
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
                Relational Tables
              </p>
            </Card>
          </motion.div>
          <motion.div variants={shouldReduceMotion ? undefined : staggerItem}>
            <Card className="p-4" hoverElevation>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                <AnimatedCounter value={24} suffix="h" />
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
                High Priority SLA
              </p>
            </Card>
          </motion.div>
        </div>
      </motion.section>

      {/* Architecture Highlights */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 dark:bg-slate-900/90 rounded-2xl p-8 sm:p-10 text-white shadow-xl border border-slate-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <span className="text-xs uppercase tracking-wider text-indigo-400 font-semibold">
                Technical Architecture
              </span>
              <h3 className="text-2xl font-bold mt-1">Multi-Role Architecture Built for Scale</h3>
              <p className="text-sm text-slate-300 mt-2 max-w-xl leading-relaxed">
                Powered by Python Flask, SQLAlchemy ORM, and JWT authentication on the backend, paired with React 19 and Tailwind CSS on the frontend.
              </p>
            </div>
            <div className="shrink-0 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Zero Plaintext Passwords (Werkzeug Hashing)</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Normalized Relational Schema (11 Tables)</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Strict Role-Based Access Control</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
