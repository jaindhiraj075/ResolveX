import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  PlusCircle,
  Inbox,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import AnimatedCounter from '../../components/common/AnimatedCounter';
import EmptyState from '../../components/common/EmptyState';
import complaintService, { ComplaintItem } from '../../services/complaintService';
import { formatErrorMessage } from '../../utils/errorUtils';
import { staggerContainer, staggerItem } from '../../config/motion';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const shouldReduceMotion = useReducedMotion();
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecent = useCallback(async () => {
    try {
      setError(null);
      const data = await complaintService.getComplaints();
      setComplaints(data || []);
    } catch (err: any) {
      setError(formatErrorMessage(err, 'Unable to load your complaints'));
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecent();
    const interval = setInterval(fetchRecent, 30000);
    return () => clearInterval(interval);
  }, [fetchRecent]);

  const total = complaints.length;
  const pending = complaints.filter((c) => c.status === 'PENDING').length;
  const inProgress = complaints.filter(
    (c) => c.status === 'IN_PROGRESS' || c.status === 'ASSIGNED' || c.status === 'INFORMATION_REQUIRED'
  ).length;
  const resolved = complaints.filter((c) => c.status === 'RESOLVED' || c.status === 'CLOSED').length;

  const stats = [
    {
      label: 'Total Complaints',
      value: total,
      icon: FileText,
      color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-100 dark:border-indigo-900/50',
    },
    {
      label: 'Pending',
      value: pending,
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900/50',
    },
    {
      label: 'In Progress',
      value: inProgress,
      icon: AlertCircle,
      color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-100 dark:border-sky-900/50',
    },
    {
      label: 'Resolved',
      value: resolved,
      icon: CheckCircle,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/50',
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="yellow" size="sm" dot>Pending</Badge>;
      case 'ASSIGNED':
        return <Badge variant="indigo" size="sm" dot>Assigned</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="blue" size="sm" dot>In Progress</Badge>;
      case 'INFORMATION_REQUIRED':
        return <Badge variant="red" size="sm" dot>Info Required</Badge>;
      case 'RESOLVED':
        return <Badge variant="green" size="sm" dot>Resolved</Badge>;
      default:
        return <Badge variant="gray" size="sm">{status}</Badge>;
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.full_name || 'Student'}`}
        description="Monitor submitted grievances, check real-time SLA timelines, and track department resolution"
        badge={
          <Badge variant="green" size="sm" dot>
            Student Account
          </Badge>
        }
        actions={
          <Link to="/student/submit">
            <Button icon={<PlusCircle className="w-4 h-4" />}>
              Submit Complaint
            </Button>
          </Link>
        }
      />

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center justify-between text-xs text-rose-700 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{typeof error === 'string' ? error : formatErrorMessage(error)}</span>
          </div>
          <button
            type="button"
            onClick={fetchRecent}
            className="flex items-center gap-1 font-semibold text-rose-700 dark:text-rose-300 hover:underline cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Summary Cards with Staggered Entrance */}
      <motion.div
        variants={shouldReduceMotion ? undefined : staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <motion.div key={stat.label} variants={shouldReduceMotion ? undefined : staggerItem}>
              <Card className="p-4 sm:p-5" hoverElevation>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      <AnimatedCounter value={stat.value} />
                    </p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${stat.color} transition-colors`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Recent Complaints Section */}
      <Card
        title="Recent Complaints"
        subtitle="Complaints linked to your verified student account"
        headerAction={
          complaints.length > 0 ? (
            <Link
              to="/student/complaints"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1"
            >
              <span>View all ({complaints.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : undefined
        }
      >
        {complaints.length === 0 ? (
          <EmptyState
            icon={<Inbox className="w-6 h-6" />}
            title="No complaints filed yet"
            description="When you encounter an issue with campus Wi-Fi, hostel maintenance, labs, or infrastructure, click the button below to submit a grievance."
            action={
              <Link to="/student/submit">
                <Button size="sm" icon={<PlusCircle className="w-3.5 h-3.5" />}>
                  Submit Your First Complaint
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {complaints.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 p-2 rounded-lg transition-colors group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {item.complaint_id}
                    </span>
                    {getStatusBadge(item.status)}
                    <span className="text-[11px] text-slate-400 font-medium">
                      {item.department_name}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {item.description}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <span className="text-[11px] font-mono text-slate-400">
                    {formatDate(item.created_at)}
                  </span>
                  <Link to={`/student/complaints/${item.complaint_id}`}>
                    <Button variant="outline" size="sm" className="group-hover:border-indigo-300">
                      <span>Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default StudentDashboard;
