import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Building2,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Star,
  FileText,
  ArrowRight,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import complaintService from '../../services/complaintService';
import { useToast } from '../../context/ToastContext';

export const AdminStaffDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStaff = async () => {
      if (!id) return;
      try {
        const res = await complaintService.getStaffPerformanceDetail(Number(id));
        setData(res);
      } catch (err: any) {
        showToast('Staff member not found or access denied', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchStaff();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading officer workload profile..." />
      </div>
    );
  }

  if (!data || !data.staff) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <Card className="p-6">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Staff Member Not Found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
            The requested staff profile does not exist or has been removed.
          </p>
          <Link to="/admin/dashboard">
            <Button variant="outline" size="sm" icon={<ArrowLeft className="w-3.5 h-3.5" />}>
              Back to Dashboard
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const { staff, metrics, recent_complaints, feedbacks } = data;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back button */}
      <div>
        <Link
          to="/admin/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Management Intelligence</span>
        </Link>
      </div>

      {/* Profile Header Card */}
      <Card hoverElevation className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-lg ring-1 ring-indigo-500/20">
              {staff.full_name ? staff.full_name.charAt(0).toUpperCase() : 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                  {staff.full_name}
                </h1>
                <Badge variant={staff.role === 'ADMIN' ? 'purple' : 'indigo'} size="sm">
                  {staff.role}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  <span>{staff.email}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  <span>{staff.department_name || 'General Operations'}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Operational Metrics Grid (Section 13) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Active Workload</span>
            <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
              {metrics.active_count}
            </p>
            <span className="text-[10px] text-slate-400">Open tickets</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Resolved Total</span>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {metrics.resolved_count}
            </p>
            <span className="text-[10px] text-slate-400">Lifetime completed</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase">SLA Compliance</span>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {metrics.sla_compliance}%
            </p>
            <span className="text-[10px] text-slate-400">Target compliance</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Student Rating</span>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-1">
              {metrics.avg_rating > 0 ? metrics.avg_rating.toFixed(1) : '—'}
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            </p>
            <span className="text-[10px] text-slate-400">{metrics.feedback_count} reviews</span>
          </div>
        </div>
      </Card>

      {/* Recent Assigned Complaints */}
      <Card hoverElevation className="p-5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
          Recent Assigned Complaints
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Latest tickets assigned to this officer
        </p>

        {recent_complaints.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">No assigned complaints yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {recent_complaints.map((c: any) => (
              <div key={c.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {c.complaint_id}
                    </span>
                    <Badge variant={c.status === 'RESOLVED' ? 'green' : 'blue'} size="sm">
                      {c.status}
                    </Badge>
                  </div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                    {c.title}
                  </p>
                </div>
                <Link
                  to={`/admin/complaints/${c.complaint_id}`}
                  className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 shrink-0"
                >
                  <span>Audit</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Recent Student Feedback */}
      {feedbacks.length > 0 && (
        <Card hoverElevation className="p-5">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            Student Resolution Reviews
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Ratings and comments left by students on tickets handled by {staff.full_name}
          </p>

          <div className="space-y-2.5">
            {feedbacks.map((f: any) => (
              <div
                key={f.id}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs"
              >
                <div className="flex items-center gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i <= f.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-700'
                      }`}
                    />
                  ))}
                  <span className="text-[11px] font-mono text-slate-400 ml-2">
                    {f.created_at ? new Date(f.created_at).toLocaleDateString() : ''}
                  </span>
                </div>
                {f.comments && (
                  <p className="text-slate-600 dark:text-slate-300 italic">
                    &ldquo;{f.comments}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default AdminStaffDetail;
