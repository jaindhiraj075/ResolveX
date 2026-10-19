import React, { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { RotateCcw, AlertTriangle } from 'lucide-react';
import complaintService, { ComplaintItem } from '../../services/complaintService';
import { useToast } from '../../context/ToastContext';

interface ReopenComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  complaintId: string;
  priority?: string;
  onReopened?: (updated: ComplaintItem) => void;
}

export const ReopenComplaintModal: React.FC<ReopenComplaintModalProps> = ({
  isOpen,
  onClose,
  complaintId,
  priority = 'MEDIUM',
  onReopened,
}) => {
  const { showToast } = useToast();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      showToast('Please provide a specific reason for reopening', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const updated = await complaintService.reopenComplaint(complaintId, reason.trim());
      showToast('Complaint reopened. A new SLA cycle has started.', 'success');
      setReason('');
      onClose();
      if (onReopened) onReopened(updated);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to reopen complaint';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reopen Resolved Complaint">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Starting New SLA Cycle</p>
            <p className="leading-relaxed">
              Reopening will transition this ticket to <strong>REOPENED</strong> and notify the department officer. A fresh resolution SLA window will begin based on its {priority} priority.
            </p>
          </div>
        </div>

        <div className="w-full">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Why are you reopening this complaint? *
          </label>
          <textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain what remains unresolved or why the previous resolution was incomplete..."
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            required
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={submitting}
            disabled={submitting || !reason.trim()}
            icon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Confirm Reopen
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ReopenComplaintModal;
