import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Bot,
  AlertTriangle,
  CopyCheck,
  CheckCircle2,
  Sliders,
  ExternalLink,
  ShieldAlert,
  Info,
  MapPin,
  Clock,
  Layers,
  FileText,
  HelpCircle,
} from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';
import Modal from '../common/Modal';
import complaintService, { ComplaintItem } from '../../services/complaintService';
import { useToast } from '../../context/ToastContext';

interface AIAnalysisCardProps {
  complaint: ComplaintItem;
  canOverride?: boolean;
  onOverridden?: (updated: ComplaintItem) => void;
  categories?: Array<{ id: number; name: string }>;
  departments?: Array<{ id: number; name: string }>;
}

export const AIAnalysisCard: React.FC<AIAnalysisCardProps> = ({
  complaint,
  canOverride = false,
  onOverridden,
  categories = [],
  departments = [],
}) => {
  const { showToast } = useToast();
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideData, setOverrideData] = useState({
    category_id: complaint.category_id ? String(complaint.category_id) : '',
    department_id: complaint.department_id ? String(complaint.department_id) : '',
    priority: complaint.priority || 'MEDIUM',
    reason: '',
  });
  const [submittingOverride, setSubmittingOverride] = useState(false);

  const formatConfidence = (val?: number) => {
    if (val === undefined || val === null || val === 0) return '—';
    return `${Math.round(val * 100)}%`;
  };

  const isLowConfidence =
    (complaint.ai_category_confidence || 0) < 0.50 && !complaint.is_overridden;

  const requiresHumanReview =
    complaint.ai_human_review || isLowConfidence || complaint.is_potential_duplicate;

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideData.reason.trim()) {
      showToast('A recorded reason is required to audit AI classification overrides', 'warning');
      return;
    }

    setSubmittingOverride(true);
    try {
      const updated = await complaintService.overrideAI(complaint.complaint_id, {
        category_id: overrideData.category_id ? Number(overrideData.category_id) : undefined,
        department_id: overrideData.department_id ? Number(overrideData.department_id) : undefined,
        priority: overrideData.priority,
        reason: overrideData.reason.trim(),
      });
      showToast('Classification successfully overridden and audited', 'success');
      setOverrideModalOpen(false);
      if (onOverridden) onOverridden(updated);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to override classification';
      showToast(msg, 'error');
    } finally {
      setSubmittingOverride(false);
    }
  };

  const factorsList = Array.isArray(complaint.ai_factors)
    ? complaint.ai_factors
    : typeof complaint.ai_factors === 'string'
    ? (complaint.ai_factors as string).split(';').map((s) => s.trim()).filter(Boolean)
    : [];

  return (
    <>
      <Card
        hoverElevation
        className="border-indigo-100 dark:border-indigo-900/50 bg-gradient-to-br from-white via-indigo-50/20 to-sky-50/20 dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-900"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-indigo-100 dark:border-indigo-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  ResolveX Context-Aware AI Intelligence
                </h3>
                <Badge variant="indigo" size="sm">
                  NLP Core & Context Engine
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Situational impact evaluation, explainable routing, and duplicate intelligence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {complaint.location && (
              <Badge variant="gray" size="sm">
                <MapPin className="w-3 h-3 mr-1 text-indigo-500 inline" />
                {complaint.location}
              </Badge>
            )}

            {canOverride && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOverrideModalOpen(true)}
                icon={<Sliders className="w-3.5 h-3.5" />}
              >
                Override AI
              </Button>
            )}
          </div>
        </div>

        {/* Human Review Required Banner (Section 2) */}
        {requiresHumanReview && !complaint.is_overridden && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-900 dark:text-amber-200">
                  Human Verification Recommended
                </span>
                <p className="text-amber-800 dark:text-amber-300 mt-0.5">
                  This grievance involves context-dependent signals (such as safety hazards, limited description detail, or moderate similarity to existing tickets) flagged for staff or administrator confirmation.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Clarification Questions for Ambiguous/Incomplete Grievances (Phase 4 Sections 1 & 5) */}
        {complaint.clarification_questions && complaint.clarification_questions.length > 0 && !complaint.is_overridden && (
          <div className="mb-4 p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs">
            <div className="flex items-start gap-2.5">
              <HelpCircle className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <span className="font-bold text-sky-950 dark:text-sky-200 block">
                  Clarification Suggested by AI Engine
                </span>
                <p className="text-[11px] text-sky-800 dark:text-sky-300 leading-relaxed">
                  The initial grievance description contains missing or ambiguous details. Staff may ask the student:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-sky-900 dark:text-sky-200 font-medium">
                  {complaint.clarification_questions.map((q, idx) => (
                    <li key={idx}>{q}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Out-of-Taxonomy Alert (Phase 4 Section 5) */}
        {complaint.is_out_of_taxonomy && !complaint.is_overridden && (
          <div className="mb-4 p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">
                  Out-of-Taxonomy Topic Detected
                </span>
                <p className="text-[11px] text-purple-800 dark:text-purple-300 mt-0.5 leading-relaxed">
                  This grievance topic does not directly map to any configured categories or departments in the system. It has been routed to the administrative review queue with a low-confidence flag rather than being forced into an incorrect category.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Duplicate Banner: Confirmed vs Potential (Section 4) */}
        {complaint.is_duplicate && (
          <div
            className={`mb-4 p-3 rounded-xl border text-xs ${
              complaint.status === 'CLOSED_AS_DUPLICATE'
                ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <CopyCheck
                className={`w-4 h-4 shrink-0 mt-0.5 ${
                  complaint.status === 'CLOSED_AS_DUPLICATE'
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              />
              <div className="flex-1">
                <span
                  className={`font-bold ${
                    complaint.status === 'CLOSED_AS_DUPLICATE'
                      ? 'text-purple-900 dark:text-purple-200'
                      : 'text-amber-900 dark:text-amber-200'
                  }`}
                >
                  {complaint.status === 'CLOSED_AS_DUPLICATE'
                    ? 'Identical Duplicate Complaint Detected (Auto-Closed)'
                    : 'Potential Duplicate Incident Identified (Awaiting Staff Verification)'}
                </span>
                <p
                  className={`mt-0.5 ${
                    complaint.status === 'CLOSED_AS_DUPLICATE'
                      ? 'text-purple-800 dark:text-purple-300'
                      : 'text-amber-800 dark:text-amber-300'
                  }`}
                >
                  Cosine semantic similarity calculated at{' '}
                  <strong>{formatConfidence(complaint.duplicate_score)}</strong> match against existing ticket{' '}
                  <strong className="font-mono text-indigo-700 dark:text-indigo-400">
                    {complaint.original_complaint_readable_id || `#${complaint.original_complaint_id}`}
                  </strong>
                  .
                  {complaint.duplicate_reason && ` ${complaint.duplicate_reason}`}
                </p>
                {complaint.original_complaint_readable_id && (
                  <Link
                    to={`/student/complaints/${complaint.original_complaint_readable_id}`}
                    className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline mt-1.5"
                  >
                    <span>View matched existing ticket</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Override indicator */}
        {complaint.is_overridden && (
          <div className="mb-4 p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs flex items-center justify-between text-purple-800 dark:text-purple-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
              <span>
                Human operational override applied: {complaint.final_category || complaint.category_name} | {complaint.final_priority || complaint.priority}. Original AI predictions preserved in audit history.
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-900/60 px-2 py-0.5 rounded">
              Audited
            </span>
          </div>
        )}

        {/* AI Factual Executive Summary (Section 3) */}
        {complaint.ai_summary && (
          <div className="mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px] block mb-1">
                  AI Complaint Summary (Factual & Evidence-Preserved)
                </span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                  {complaint.ai_summary}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Prediction Metrics Grid (Section 2) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {/* Category */}
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
            <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider block mb-1">
              Category
            </span>
            <p className="font-bold text-slate-900 dark:text-white truncate">
              {complaint.ai_category || complaint.category_name || 'General'}
            </p>
            <p className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 mt-1">
              {formatConfidence(complaint.ai_category_confidence)} model confidence
            </p>
          </div>

          {/* Department */}
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
            <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider block mb-1">
              Department
            </span>
            <p className="font-bold text-slate-900 dark:text-white truncate">
              {complaint.ai_department || complaint.department_name || 'General'}
            </p>
            <p className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 mt-1">
              {formatConfidence(complaint.ai_department_confidence)} model confidence
            </p>
          </div>

          {/* Priority */}
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
            <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider block mb-1">
              Context Priority
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`font-black ${
                  complaint.priority === 'HIGH'
                    ? 'text-rose-600 dark:text-rose-400'
                    : complaint.priority === 'MEDIUM'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {complaint.priority}
              </span>
              {complaint.disruption_level && (
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {complaint.disruption_level}
                </span>
              )}
            </div>
            <p className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 mt-1">
              {formatConfidence(complaint.ai_priority_confidence)} assessment confidence
            </p>
          </div>

          {/* Duplicate Check */}
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
            <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider block mb-1">
              Incident Duplicate Check
            </span>
            <p className="font-bold text-slate-900 dark:text-white">
              {complaint.is_duplicate ? 'Match Found' : 'Unique Incident'}
            </p>
            <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1">
              {formatConfidence(complaint.duplicate_score)} similarity index
            </p>
          </div>
        </div>

        {/* AI Explainability: Decision Explanation & Context Factors (Section 1 & 2) */}
        {(complaint.ai_explanation || factorsList.length > 0) && (
          <div className="mt-4 p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-2 text-xs">
            {complaint.ai_explanation && (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5 mb-1">
                  <Info className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Decision Criteria & Rationale
                </span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                  {complaint.ai_explanation}
                </p>
              </div>
            )}

            {factorsList.length > 0 && (
              <div className="pt-1.5 border-t border-indigo-100/80 dark:border-indigo-900/40">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                  Important Factors Influencing Assessment
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {factorsList.map((factor, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 shadow-2xs"
                    >
                      <Sparkles className="w-2.5 h-2.5 mr-1 text-indigo-500 shrink-0" />
                      {factor}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-3 italic text-right">
          * AI recommendations provide operational decision support based on actual situation impact. Authorized staff may record overrides.
        </p>
      </Card>

      {/* Override Modal */}
      <Modal
        isOpen={overrideModalOpen}
        onClose={() => setOverrideModalOpen(false)}
        title="Override AI Classification & Priority"
      >
        <form onSubmit={handleOverrideSubmit} className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Specify the operational correction for this grievance. A recorded reason is required. The original AI analysis will remain preserved in the permanent audit history.
          </p>

          <div className="w-full">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Category
            </label>
            <select
              value={overrideData.category_id}
              onChange={(e) => setOverrideData({ ...overrideData, category_id: e.target.value })}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Target Department
            </label>
            <select
              value={overrideData.department_id}
              onChange={(e) => setOverrideData({ ...overrideData, department_id: e.target.value })}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Select Department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Priority
            </label>
            <select
              value={overrideData.priority}
              onChange={(e) => setOverrideData({ ...overrideData, priority: e.target.value as any })}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
            </select>
          </div>

          <div className="w-full">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Recorded Reason for Override *
            </label>
            <textarea
              rows={3}
              value={overrideData.reason}
              onChange={(e) => setOverrideData({ ...overrideData, reason: e.target.value })}
              placeholder="e.g. Electrical wiring requires physical campus maintenance electricians rather than standard IT support..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOverrideModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={submittingOverride}
              disabled={submittingOverride || !overrideData.reason.trim()}
            >
              Apply Audited Override
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default AIAnalysisCard;
