import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Copy,
  Paperclip,
  CheckCircle2,
  Clock,
  User,
  Building2,
  Tags,
  AlertCircle,
  Play,
  HelpCircle,
  CheckCircle,
  Send,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ComplaintTimeline from '../../components/complaint/ComplaintTimeline';
import AIAnalysisCard from '../../components/ai/AIAnalysisCard';
import SLACard from '../../components/sla/SLACard';
import FeedbackRating from '../../components/feedback/FeedbackRating';
import CopyButton from '../../components/common/CopyButton';
import complaintService, { ComplaintItem } from '../../services/complaintService';
import { useToast } from '../../context/ToastContext';

export const StaffComplaintDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [complaint, setComplaint] = useState<ComplaintItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);

  // Modals state
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  const [requestingInfo, setRequestingInfo] = useState(false);

  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [resolutionDetails, setResolutionDetails] = useState('');
  const [resolving, setResolving] = useState(false);

  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchOptions = async () => {
    try {
      const opts = await complaintService.getOptions();
      setCategories(opts.categories || []);
      setDepartments(opts.departments || []);
    } catch {
      // Fallback
    }
  };

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
    fetchOptions();
    fetchDetails();
  }, [id]);

  const handleCopyId = (cid: string) => {
    navigator.clipboard.writeText(cid);
    showToast('Complaint ID copied', 'info');
  };

  const handleStartWork = async () => {
    if (!id) return;
    setUpdatingStatus(true);
    try {
      await complaintService.updateStaffStatus(id, 'IN_PROGRESS', 'Staff initiated investigation and active work.');
      showToast('Status updated to In Progress', 'success');
      await fetchDetails();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update status';
      showToast(msg, 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSendInfoRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !infoMessage.trim()) return;

    setRequestingInfo(true);
    try {
      await complaintService.requestInfo(id, infoMessage.trim());
      showToast('Information request sent to student', 'success');
      setInfoModalOpen(false);
      setInfoMessage('');
      await fetchDetails();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to request information';
      showToast(msg, 'error');
    } finally {
      setRequestingInfo(false);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !resolutionSummary.trim()) return;

    setResolving(true);
    try {
      await complaintService.resolveComplaint(id, resolutionSummary.trim(), resolutionDetails.trim() || undefined);
      showToast('Complaint resolved successfully!', 'success');
      setResolveModalOpen(false);
      setResolutionSummary('');
      setResolutionDetails('');
      await fetchDetails();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to resolve complaint';
      showToast(msg, 'error');
    } finally {
      setResolving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading department complaint..." />
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
            The complaint record could not be loaded or is not assigned to your department.
          </p>
          <Link to="/staff/complaints">
            <Button variant="outline" size="sm" icon={<ArrowLeft className="w-3.5 h-3.5" />}>
              Back to Assigned Complaints
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
        return <Badge variant="indigo" size="md" dot>Assigned</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="blue" size="md" dot>In Progress</Badge>;
      case 'INFORMATION_REQUIRED':
        return <Badge variant="red" size="md" dot>Information Required</Badge>;
      case 'RESOLVED':
        return <Badge variant="green" size="md" dot>Resolved</Badge>;
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/staff/complaints"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Assigned Complaints</span>
        </Link>

        <div className="flex items-center gap-2">
          {getPriorityBadge(complaint.priority)}
          {getStatusBadge(complaint.status)}
        </div>
      </div>

      {/* Main Details Card */}
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

          <div className="text-left sm:text-right text-xs text-slate-400 dark:text-slate-500 font-mono shrink-0">
            <p>Submitted: {formatDate(complaint.created_at)}</p>
            {complaint.resolved_at && (
              <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
                Resolved: {formatDate(complaint.resolved_at)}
              </p>
            )}
          </div>
        </div>

        {/* Student & Department Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-b border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <span className="text-slate-400 uppercase font-semibold text-[10px] block mb-1">Student</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {complaint.student_name || 'Student'}
            </span>
            <span className="block text-[11px] text-slate-400 truncate">
              {complaint.student_email || ''}
            </span>
          </div>

          <div>
            <span className="text-slate-400 uppercase font-semibold text-[10px] block mb-1">Department</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {complaint.department_name || 'Unassigned'}
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
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              {complaint.assigned_staff_name || 'Self-assigned / Department'}
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="pt-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Complaint Description
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

        {/* Staff Action Buttons */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
          {(complaint.status === 'PENDING' || complaint.status === 'ASSIGNED' || complaint.status === 'REOPENED') && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleStartWork}
              loading={updatingStatus}
              icon={<Play className="w-3.5 h-3.5" />}
            >
              Start Work (Mark In Progress)
            </Button>
          )}

          {complaint.status === 'IN_PROGRESS' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInfoModalOpen(true)}
                icon={<HelpCircle className="w-3.5 h-3.5" />}
              >
                Request Information
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setResolveModalOpen(true)}
                icon={<CheckCircle className="w-3.5 h-3.5" />}
              >
                Resolve Complaint
              </Button>
            </>
          )}

          {complaint.status === 'INFORMATION_REQUIRED' && (
            <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-medium">
              <Clock className="w-4 h-4" />
              <span>Awaiting student response to information request</span>
            </div>
          )}

          {complaint.status === 'RESOLVED' && (
            <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Grievance successfully resolved and documented</span>
            </div>
          )}
        </div>
      </Card>

      {/* SLA Card */}
      <SLACard slaInfo={complaint.sla_info} isStudent={false} />

      {/* Student Resolution Feedback Display */}
      {complaint.feedback && (
        <FeedbackRating
          complaintId={complaint.complaint_id}
          initialFeedback={complaint.feedback}
          canSubmit={false}
        />
      )}

      {/* AI Intelligence Layer with Override Capability (Section 18 & 20) */}
      <AIAnalysisCard
        complaint={complaint}
        canOverride={true}
        onOverridden={(updated) => setComplaint(updated)}
        categories={categories}
        departments={departments}
      />

      {/* Messages / Communication History if any */}
      {complaint.messages && complaint.messages.length > 0 && (
        <Card title="Grievance Correspondence" subtitle="Communications between student and staff">
          <div className="space-y-3">
            {complaint.messages.map((m) => (
              <div
                key={m.id}
                className={`p-3 rounded-xl border text-xs leading-relaxed ${
                  m.sender_role === 'STUDENT'
                    ? 'bg-sky-50/60 dark:bg-sky-950/30 border-sky-200 dark:border-sky-900/50'
                    : 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900 dark:text-white">
                    {m.sender_name || 'User'} ({m.sender_role})
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {formatDate(m.created_at)}
                  </span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{m.message}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Timeline Audit Log */}
      <Card title="Grievance Lifecycle Timeline" subtitle="Audit trail of department actions and status transitions">
        <ComplaintTimeline
          events={complaint.history || []}
          currentStatus={complaint.status}
        />
      </Card>

      {/* Modal 1: Request Information */}
      <Modal
        isOpen={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
        title="Request Additional Information from Student"
      >
        <form onSubmit={handleSendInfoRequest} className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Specify the missing details or diagnostics needed from the student to continue resolution. The ticket status will transition to <strong>INFORMATION_REQUIRED</strong>.
          </p>
          <textarea
            rows={4}
            value={infoMessage}
            onChange={(e) => setInfoMessage(e.target.value)}
            placeholder="e.g. Please confirm your room number or if the Wi-Fi issue occurs on mobile devices too..."
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setInfoModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={requestingInfo}
              disabled={requestingInfo || !infoMessage.trim()}
              icon={<Send className="w-3.5 h-3.5" />}
            >
              Send Request
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Resolve Complaint */}
      <Modal
        isOpen={resolveModalOpen}
        onClose={() => setResolveModalOpen(false)}
        title="Resolve Complaint"
      >
        <form onSubmit={handleResolveSubmit} className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Document the resolution action taken. The complaint status will transition to <strong>RESOLVED</strong> and the student will be notified.
          </p>
          <Input
            label="Resolution Summary *"
            value={resolutionSummary}
            onChange={(e: any) => setResolutionSummary(e.target.value)}
            placeholder="e.g. Access point rebooted and router firmware upgraded"
            required
          />
          <div className="w-full">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Resolution Details / Post-Action Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={resolutionDetails}
              onChange={(e) => setResolutionDetails(e.target.value)}
              placeholder="e.g. Tested network bandwidth; 120 Mbps verified on Hostel Block A 3rd floor..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setResolveModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={resolving}
              disabled={resolving || !resolutionSummary.trim()}
              icon={<CheckCircle className="w-3.5 h-3.5" />}
            >
              Complete & Resolve
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StaffComplaintDetails;
