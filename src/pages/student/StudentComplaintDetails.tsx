import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Copy,
  Paperclip,
  Clock,
  Calendar,
  Building2,
  Tags,
  UserCheck,
  AlertCircle,
  Send,
  RotateCcw,
  Star,
  CheckCircle2,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ComplaintTimeline from '../../components/complaint/ComplaintTimeline';
import AIAnalysisCard from '../../components/ai/AIAnalysisCard';
import SLACard from '../../components/sla/SLACard';
import FeedbackRating from '../../components/feedback/FeedbackRating';
import ReopenComplaintModal from '../../components/complaint/ReopenComplaintModal';
import CopyButton from '../../components/common/CopyButton';
import complaintService, { ComplaintItem } from '../../services/complaintService';
import { useToast } from '../../context/ToastContext';

export const StudentComplaintDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [complaint, setComplaint] = useState<ComplaintItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [responseMessage, setResponseMessage] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [reopenModalOpen, setReopenModalOpen] = useState(false);

  const fetchDetails = async () => {
    if (!id) return;
    try {
      const data = await complaintService.getComplaint(id);
      setComplaint(data);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Complaint not found or access denied';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleCopyId = (cid: string) => {
    navigator.clipboard.writeText(cid);
    showToast('Complaint ID copied', 'info');
  };

  const handleRespond = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !responseMessage.trim()) return;

    setSubmittingResponse(true);
    try {
      await complaintService.respondInfo(id, responseMessage.trim());
      showToast('Information submitted successfully! Status updated to In Progress.', 'success');
      setResponseMessage('');
      await fetchDetails();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to submit response';
      showToast(msg, 'error');
    } finally {
      setSubmittingResponse(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading grievance timeline..." />
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <Card>
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Complaint Not Found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
            The requested grievance record does not exist or you do not have permission to view it.
          </p>
          <Link to="/student/complaints">
            <Button variant="outline" size="sm" icon={<ArrowLeft className="w-3.5 h-3.5" />}>
              Back to My Complaints
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="yellow" size="md" dot>Pending Review</Badge>;
      case 'ASSIGNED':
        return <Badge variant="indigo" size="md" dot>Assigned to Staff</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="blue" size="md" dot>In Progress</Badge>;
      case 'INFORMATION_REQUIRED':
        return <Badge variant="red" size="md" dot>Information Required</Badge>;
      case 'RESOLVED':
        return <Badge variant="green" size="md" dot>Resolved</Badge>;
      case 'REOPENED':
        return <Badge variant="amber" size="md" dot>Reopened</Badge>;
      case 'CLOSED':
        return <Badge variant="gray" size="md">Closed</Badge>;
      case 'CLOSED_AS_DUPLICATE':
        return <Badge variant="amber" size="md" dot>Duplicate Closed</Badge>;
      default:
        return <Badge variant="gray" size="md">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return <Badge variant="red" size="sm">HIGH PRIORITY</Badge>;
      case 'MEDIUM':
        return <Badge variant="yellow" size="sm">MEDIUM PRIORITY</Badge>;
      case 'LOW':
        return <Badge variant="green" size="sm">LOW PRIORITY</Badge>;
      default:
        return <Badge variant="gray" size="sm">{priority}</Badge>;
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
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const latestStaffMessage = complaint.messages
    ?.filter((m) => m.sender_role === 'STAFF' || m.sender_role === 'ADMIN')
    ?.slice(-1)[0];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back button and quick actions */}
      <div className="flex items-center justify-between">
        <Link
          to="/student/complaints"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Complaints</span>
        </Link>

        <div className="flex items-center gap-2">
          {getPriorityBadge(complaint.priority)}
          {getStatusBadge(complaint.status)}
        </div>
      </div>

      {/* Main Header Card */}
      <Card hoverElevation className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <CopyButton text={complaint.complaint_id} size="md" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {complaint.title}
            </h1>
          </div>

          <div className="flex flex-col sm:items-end gap-2 shrink-0">
            <div className="text-left sm:text-right text-xs text-slate-400 dark:text-slate-500 font-mono">
              <p>Submitted: {formatDate(complaint.created_at)}</p>
              {complaint.resolved_at && (
                <p className="text-emerald-600 dark:text-emerald-400 font-medium">
                  Resolved: {formatDate(complaint.resolved_at)}
                </p>
              )}
            </div>

            {/* Reopen Action Button if RESOLVED (Section 23) */}
            {complaint.status === 'RESOLVED' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReopenModalOpen(true)}
                icon={<RotateCcw className="w-3.5 h-3.5 text-amber-500" />}
              >
                Reopen Complaint
              </Button>
            )}
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-b border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <span className="text-slate-400 uppercase font-semibold text-[10px] block mb-1">Department</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {complaint.department_name || 'General Department'}
            </span>
          </div>

          <div>
            <span className="text-slate-400 uppercase font-semibold text-[10px] block mb-1">Category</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {complaint.category_name || 'General'}
            </span>
          </div>

          <div>
            <span className="text-slate-400 uppercase font-semibold text-[10px] block mb-1">Assigned Officer</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {complaint.assigned_staff_name || 'Pending assignment'}
            </span>
          </div>

          <div>
            <span className="text-slate-400 uppercase font-semibold text-[10px] block mb-1">Resolution</span>
            <span className={`font-semibold ${complaint.resolved_at ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
              {complaint.status === 'REOPENED' ? 'Reopened by you' : complaint.resolved_at ? 'Resolved' : 'Active / Pending'}
            </span>
          </div>
        </div>

        {/* Reopened Banner Notice if applicable */}
        {complaint.status === 'REOPENED' && (
          <div className="my-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300">
            <span className="font-bold flex items-center gap-1.5 mb-1">
              <RotateCcw className="w-4 h-4 text-amber-600" />
              <span>Complaint Reopened for Re-Investigation</span>
            </span>
            <p className="leading-relaxed">
              Reason provided: &ldquo;{complaint.reopen_reason || 'Issue still persists'}&rdquo;
            </p>
          </div>
        )}

        {/* Description */}
        <div className="pt-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Description
          </h3>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
            {complaint.description}
          </p>
        </div>

        {/* Attachments */}
        {complaint.attachments && complaint.attachments.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Attached Evidence ({complaint.attachments.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {complaint.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs"
                >
                  <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-xs">
                    {att.file_name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* SLA Target Card (Section 6 & 31) */}
      <SLACard slaInfo={complaint.sla_info} isStudent={true} />

      {/* Resolution Quality & Feedback Section (Sections 17-22) */}
      {(complaint.status === 'RESOLVED' || complaint.feedback) && (
        <FeedbackRating
          complaintId={complaint.complaint_id}
          initialFeedback={complaint.feedback}
          canSubmit={complaint.status === 'RESOLVED'}
          onFeedbackSubmitted={(fb) => setComplaint({ ...complaint, feedback: fb })}
        />
      )}

      {/* AI Analysis Card Component */}
      <AIAnalysisCard complaint={complaint} canOverride={false} />

      {/* Action Required: Information Request Response Box */}
      {complaint.status === 'INFORMATION_REQUIRED' && (
        <Card hoverElevation className="border-amber-300 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Additional Information Required by Staff
              </h3>
              {latestStaffMessage ? (
                <p className="text-xs text-amber-800 dark:text-amber-300/90 mt-1 leading-relaxed bg-white/60 dark:bg-slate-900/60 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                  &ldquo;{latestStaffMessage.message}&rdquo;
                </p>
              ) : (
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                  Department staff has requested further clarification regarding this complaint.
                </p>
              )}

              {/* Student Response Form */}
              <form onSubmit={handleRespond} className="mt-4 space-y-3">
                <textarea
                  rows={3}
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                  placeholder="Provide the requested details here to resume investigation..."
                  className="w-full rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  required
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={submittingResponse}
                  disabled={submittingResponse || !responseMessage.trim()}
                  icon={<Send className="w-3.5 h-3.5" />}
                >
                  Submit Information
                </Button>
              </form>
            </div>
          </div>
        </Card>
      )}

      {/* Complaint Timeline Section */}
      <Card title="Grievance Lifecycle Timeline" subtitle="Chronological audit log of events, SLA transitions, and status updates">
        <ComplaintTimeline
          events={complaint.history || []}
          currentStatus={complaint.status}
        />
      </Card>

      {/* Reopen Complaint Modal (Section 23 & 24) */}
      <ReopenComplaintModal
        isOpen={reopenModalOpen}
        onClose={() => setReopenModalOpen(false)}
        complaintId={complaint.complaint_id}
        priority={complaint.priority}
        onReopened={(updated) => setComplaint(updated)}
      />
    </div>
  );
};

export default StudentComplaintDetails;
