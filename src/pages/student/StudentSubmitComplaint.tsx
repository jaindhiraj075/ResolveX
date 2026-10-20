import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  CheckCircle2,
  Copy,
  Paperclip,
  X,
  FileText,
  Building2,
  Tags,
  AlertTriangle,
  ArrowRight,
  Upload,
  Bot,
  Sparkles,
  CopyCheck,
  ExternalLink,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import AIAnalysisCard from '../../components/ai/AIAnalysisCard';
import complaintService, { ComplaintPayload, ComplaintItem } from '../../services/complaintService';
import { useToast } from '../../context/ToastContext';
import { formatErrorMessage } from '../../utils/errorUtils';

export const StudentSubmitComplaint: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    department_id: '',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH',
  });

  const [attachment, setAttachment] = useState<{
    file_name: string;
    file_size: number;
    file_type: string;
  } | null>(null);

  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: number; name: string; department_id?: number }>>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submissionStep, setSubmissionStep] = useState<string>('idle');

  const [createdComplaint, setCreatedComplaint] = useState<ComplaintItem | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const opts = await complaintService.getOptions();
        setDepartments(opts.departments || []);
        setCategories(opts.categories || []);
      } catch {
        setDepartments([
          { id: 1, name: 'IT / Network' },
          { id: 2, name: 'Hostel Administration' },
          { id: 3, name: 'Campus Maintenance' },
          { id: 4, name: 'CSE Lab' },
        ]);
        setCategories([
          { id: 1, name: 'Wi-Fi & Internet' },
          { id: 2, name: 'Hostel & Living' },
          { id: 3, name: 'Campus Infrastructure' },
          { id: 4, name: 'Lab & Equipment' },
        ]);
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchOptions();
  }, []);

  const errors: Record<string, string> = {};
  if (!formData.title.trim()) errors.title = 'Complaint title is required';
  else if (formData.title.trim().length < 3) errors.title = 'Title must be at least 3 characters';
  else if (formData.title.trim().length > 200) errors.title = 'Title must not exceed 200 characters';

  if (!formData.description.trim()) errors.description = 'Detailed description is required';
  else if (formData.description.trim().length < 10) errors.description = 'Description must be at least 10 characters';
  else if (formData.description.trim().length > 5000) errors.description = 'Description must not exceed 5000 characters';

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedExts = ['pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx'];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      if (!allowedExts.includes(ext)) {
        showToast(`Invalid file format (.${ext}). Allowed: PDF, PNG, JPG, JPEG, DOC, DOCX`, 'error');
        e.target.value = '';
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        showToast('Attachment exceeds 5MB limit', 'warning');
        e.target.value = '';
        return;
      }

      setAttachment({
        file_name: file.name,
        file_size: file.size,
        file_type: file.type || 'application/octet-stream',
      });
      showToast(`Attached ${file.name}`, 'info');
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleCopyId = (cid: string) => {
    navigator.clipboard.writeText(cid);
    showToast('Complaint ID copied', 'info');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setTouched({
      title: true,
      description: true,
      category_id: true,
      department_id: true,
    });

    if (Object.keys(errors).length > 0) {
      showToast('Please complete all required fields', 'warning');
      return;
    }

    setSubmitting(true);
    setSubmissionStep('processing');

    try {
      const payload: ComplaintPayload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category_id: formData.category_id ? Number(formData.category_id) : undefined,
        department_id: formData.department_id ? Number(formData.department_id) : undefined,
        priority: formData.priority,
        attachment: attachment
          ? {
              file_name: attachment.file_name,
              file_size: attachment.file_size,
              file_type: attachment.file_type,
            }
          : undefined,
      };

      const res = await complaintService.createComplaint(payload);
      const created = res.data?.complaint || res.data;
      setCreatedComplaint(created);

      if (created.is_duplicate) {
        showToast('Complaint recorded & flagged as duplicate', 'warning');
      } else {
        showToast('Complaint analyzed & registered successfully!', 'success');
      }
    } catch (err: any) {
      const msg = formatErrorMessage(err, 'Failed to submit complaint');
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
      setSubmissionStep('idle');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category_id: categories.length > 0 ? String(categories[0].id) : '',
      department_id: departments.length > 0 ? String(departments[0].id) : '',
      priority: 'MEDIUM',
    });
    setAttachment(null);
    setTouched({});
    setCreatedComplaint(null);
  };

  if (createdComplaint) {
    const isDuplicate = Boolean(createdComplaint.is_duplicate);

    return (
      <div className="max-w-3xl mx-auto py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.24 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 text-center shadow-lg dark:shadow-none"
        >
          <div
            className={`w-16 h-16 rounded-2xl border flex items-center justify-center mx-auto mb-4 shadow-xs ${
              isDuplicate
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-800/50 text-amber-600 dark:text-amber-400'
                : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {isDuplicate ? <CopyCheck className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
          </div>

          <span
            className={`text-[11px] font-mono font-bold uppercase tracking-wider ${
              isDuplicate ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {isDuplicate
              ? '✓ Duplicate Complaint Detected & Linked'
              : '✓ Complaint Submitted Successfully'}
          </span>

          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {isDuplicate ? 'Logged as Known Campus Issue' : 'Grievance Registered in College Pipeline'}
          </h2>

          {/* Complaint ID Box */}
          <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 inline-flex items-center gap-3 max-w-sm mx-auto">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500 text-left">
                Complaint ID
              </p>
              <p className="text-lg font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {createdComplaint.complaint_id}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleCopyId(createdComplaint.complaint_id)}
              className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 transition-colors cursor-pointer"
              title="Copy Complaint ID"
              aria-label="Copy Complaint ID"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>

          {isDuplicate && createdComplaint.original_complaint_readable_id && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 max-w-lg mx-auto text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
              <span>
                Matches active ticket:{' '}
                <strong className="font-mono">{createdComplaint.original_complaint_readable_id}</strong> (
                {Math.round((createdComplaint.duplicate_score || 0) * 100)}% similarity)
              </span>
              <Link
                to={`/student/complaints/${createdComplaint.original_complaint_readable_id}`}
                className="font-bold underline flex items-center gap-1"
              >
                <span>Track Original</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          )}

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 max-w-md mx-auto leading-relaxed">
            {isDuplicate
              ? 'Our NLP similarity model identified that another student has recently reported this exact issue. Both records are linked for administrative consolidation.'
              : 'Your complaint has been parsed through our AI NLP intelligence pipeline and assigned to the relevant department.'}
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to={`/student/complaints/${createdComplaint.complaint_id}`} className="w-full sm:w-auto">
              <Button variant="primary" className="w-full sm:w-auto" icon={<ArrowRight className="w-4 h-4" />}>
                View Complaint & Timeline
              </Button>
            </Link>
            <Link to="/student/dashboard" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto">
                Back to Dashboard
              </Button>
            </Link>
            <Button variant="ghost" className="w-full sm:w-auto" onClick={resetForm}>
              Submit Another
            </Button>
          </div>
        </motion.div>

        {/* Real AI Result Card (Section 11) */}
        <AIAnalysisCard complaint={createdComplaint} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Submit a New Complaint"
        description="File an issue regarding hostel, Wi-Fi, computer labs, or college infrastructure"
        badge={
          <Badge variant="indigo" size="sm" dot>
            AI Intelligence Pipeline
          </Badge>
        }
      />

      <Card hoverElevation>
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Title */}
          <Input
            label="Complaint Title *"
            name="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            onBlur={() => handleBlur('title')}
            placeholder="e.g. Wi-Fi dropping frequently in Hostel Block B"
            icon={<FileText className="w-4 h-4" />}
            error={touched.title ? errors.title : undefined}
            required
          />

          {/* Description */}
          <div className="w-full">
            <label
              htmlFor="comp-description"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
            >
              Detailed Description *
            </label>
            <textarea
              id="comp-description"
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              onBlur={() => handleBlur('description')}
              placeholder="Describe the issue, exact campus location, room or lab number, and when it started occurring..."
              className={`w-full rounded-lg border bg-white dark:bg-slate-900 p-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all duration-200 focus:outline-none focus:ring-2 ${
                touched.description && errors.description
                  ? 'border-rose-300 dark:border-rose-800 focus:ring-rose-500/20 focus:border-rose-500'
                  : 'border-slate-300 dark:border-slate-700 focus:ring-indigo-500/20 focus:border-indigo-500 hover:border-slate-400 dark:hover:border-slate-600'
              }`}
              required
            />
            {touched.description && errors.description && (
              <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
                {errors.description}
              </p>
            )}
          </div>

          {/* Category & Department (AI-Recommended by default, optional override) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="w-full">
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="comp-category"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
                >
                  Category
                </label>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                  AI-recommended by default
                </span>
              </div>
              <select
                id="comp-category"
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                onBlur={() => handleBlur('category_id')}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
              >
                <option value="">✨ Auto-detect by AI Engine (Recommended)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full">
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="comp-department"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
                >
                  Target Department
                </label>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                  AI-recommended by default
                </span>
              </div>
              <select
                id="comp-department"
                value={formData.department_id}
                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                onBlur={() => handleBlur('department_id')}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
              >
                <option value="">✨ Auto-route by AI Engine (Recommended)</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Context-Aware AI Priority Assessment (Phase 9 Section 1 & 6) */}
          <div className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
            <div className="flex items-start gap-2.5">
              <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Context-Aware AI Priority Evaluation
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Authoritative priority is objectively assigned by the backend AI engine based on operational disruption, safety risks, lecture/exam impact, and affected population.
                </p>
                <div className="pt-1.5">
                  <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1">
                    Include Operational Context (click to append to description):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Ongoing lecture or class affected',
                      'Active examination or submission deadline',
                      'Electrical sparking or safety hazard',
                      'Affects entire hostel block or floor',
                      'No alternative workaround available',
                      'Manual workaround exists',
                    ].map((ctx) => (
                      <button
                        key={ctx}
                        type="button"
                        onClick={() => {
                          if (!formData.description.includes(ctx)) {
                            setFormData((prev) => ({
                              ...prev,
                              description: prev.description
                                ? `${prev.description.trim()} Note: ${ctx}.`
                                : `${ctx}.`,
                            }));
                          }
                        }}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                      >
                        + {ctx}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Attachment Upload */}
          <div className="w-full pt-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Supporting Attachment (Optional)
            </label>

            {!attachment ? (
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors cursor-pointer bg-slate-50/50 dark:bg-slate-950/30">
                <Upload className="w-5 h-5 text-slate-400 mb-1" />
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  Upload screenshot, photo or PDF
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Max file size: 10MB (.png, .jpg, .pdf, .docx)
                </span>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept="image/*,.pdf,.doc,.docx"
                  className="hidden"
                />
              </label>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/50">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                    <Paperclip className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {attachment.file_name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {formatFileSize(attachment.file_size)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeAttachment}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  title="Remove attachment"
                  aria-label="Remove attachment"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Form Actions with Real AI Pipeline Indicator */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Real-time TF-IDF & Cosine Duplicate Screening</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <Link to="/student/dashboard">
                <Button type="button" variant="ghost" size="md">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={submitting}
                disabled={submitting}
                icon={<Bot className="w-4 h-4" />}
              >
                {submitting ? 'Analyzing & Submitting...' : 'Submit & Analyze'}
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default StudentSubmitComplaint;
