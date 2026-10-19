import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Copy,
  Paperclip,
  CheckCircle2,
  Clock,
  UserCheck,
  Building2,
  AlertCircle,
  UserPlus,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ComplaintTimeline from '../../components/complaint/ComplaintTimeline';
import AIAnalysisCard from '../../components/ai/AIAnalysisCard';
import SLACard from '../../components/sla/SLACard';
import FeedbackRating from '../../components/feedback/FeedbackRating';
import CopyButton from '../../components/common/CopyButton';
import complaintService, { ComplaintItem } from '../../services/complaintService';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export const AdminComplaintDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [complaint, setComplaint] = useState<ComplaintItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);

  // Staff assignment modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [staffList, setStaffList] = useState<Array<{ id: number; full_name: string; email: string; role: string }>>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [assignNotes, setAssignNotes] = useState('');
  const [assigning, setAssigning] = useState(false);

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
      const msg = err.response?.data?.message || 'Complaint not found';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffList = async () => {
    try {
      const res = await api.get('/api/admin/staff');
      const staff = res.data?.data?.staff || [];
      setStaffList(staff);
      if (staff.length > 0 && !selectedStaffId) {
        setSelectedStaffId(String(staff[0].id));
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    fetchOptions();
    fetchDetails();
    fetchStaffList();
  }, [id]);

  const handleCopyId = (cid: string) => {
    navigator.clipboard.writeText(cid);
    showToast('Complaint ID copied', 'info');
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedStaffId) return;

    setAssigning(true);
    try {
      await complaintService.assignComplaint(id, Number(selectedStaffId), assignNotes.trim() || undefined);
      showToast('Complaint assigned to staff officer successfully!', 'success');
      setAssignModalOpen(false);
      setAssignNotes('');
      await fetchDetails();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to assign complaint';
      showToast(msg, 'error');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading complaint details..." />
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
            The requested grievance record does not exist.
          </p>
          <Link to="/admin/complaints">
            <Button variant="outline" size="sm" icon={<ArrowLeft className="w-3.5 h-3.5" />}>
              Back to All Complaints
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
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/admin/complaints"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Complaints</span>
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

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAssignModalOpen(true)}
              icon={<UserPlus className="w-3.5 h-3.5" />}
            >
              {complaint.assigned_staff_name ? 'Reassign Staff' : 'Assign Staff'}
            </Button>
          </div>
        </div>

        {/* Info Grid */}
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
            <span className="text-slate-400 uppercase font-semibold text-[10px] block mb-1">Current Assignee</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              {complaint.assigned_staff_name || 'Unassigned'}
            </span>
          </div>
        </div>

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

      {/* SLA Status Card */}
      <SLACard slaInfo={complaint.sla_info} isStudent={false} />

      {/* Resolution Feedback if present */}
      {complaint.feedback && (
        <FeedbackRating
          complaintId={complaint.complaint_id}
          initialFeedback={complaint.feedback}
          canSubmit={false}
        />
      )}

      {/* AI Analysis Component with Override Capability */}
      <AIAnalysisCard
        complaint={complaint}
        canOverride={true}
        onOverridden={(updated) => setComplaint(updated)}
        categories={categories}
        departments={departments}
      />

      {/* Messages / Communication History */}
      {complaint.messages && complaint.messages.length > 0 && (
        <Card title="Grievance Correspondence" subtitle="Communications logged for this complaint">
          <div className="space-y-3">
            {complaint.messages.map((m) => (
              <div
                key={m.id}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs leading-relaxed"
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

      {/* Complete Audit Timeline */}
      <Card title="Grievance Lifecycle Audit Timeline" subtitle="Full chronological record of events, assignments, and status transitions">
        <ComplaintTimeline
          events={complaint.history || []}
          currentStatus={complaint.status}
        />
      </Card>

      {/* Modal: Assign Staff */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Complaint to Department Staff"
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select an active staff member to take ownership of this grievance. The complaint status will transition to <strong>ASSIGNED</strong> and the staff officer will receive an in-app notification.
          </p>

          <div className="w-full">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Select Staff Officer *
            </label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
              required
            >
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} ({s.email}) — {s.role}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Assignment Directive / Note (Optional)
            </label>
            <textarea
              rows={3}
              value={assignNotes}
              onChange={(e) => setAssignNotes(e.target.value)}
              placeholder="e.g. Please verify network switch in Hostel Block A, high priority..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={assigning}
              disabled={assigning || !selectedStaffId}
              icon={<UserCheck className="w-3.5 h-3.5" />}
            >
              Confirm Assignment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminComplaintDetails;
