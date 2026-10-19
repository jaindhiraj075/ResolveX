import React, { useState } from 'react';
import { Star, CheckCircle2, MessageSquare, Send } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import complaintService from '../../services/complaintService';
import { useToast } from '../../context/ToastContext';

interface FeedbackRatingProps {
  complaintId: string;
  initialFeedback?: {
    rating: number;
    comments?: string;
    created_at?: string;
  } | null;
  onFeedbackSubmitted?: (feedback: any) => void;
  canSubmit?: boolean;
}

export const FeedbackRating: React.FC<FeedbackRatingProps> = ({
  complaintId,
  initialFeedback,
  onFeedbackSubmitted,
  canSubmit = true,
}) => {
  const { showToast } = useToast();
  const [rating, setRating] = useState<number>(initialFeedback?.rating || 0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comments, setComments] = useState<string>(initialFeedback?.comments || '');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<boolean>(Boolean(initialFeedback));
  const [feedbackData, setFeedbackData] = useState(initialFeedback);

  const ratingLabels = ['Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      showToast('Please select a star rating from 1 to 5', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await complaintService.submitFeedback(complaintId, {
        rating,
        comments: comments.trim() || undefined,
      });
      setSubmitted(true);
      setFeedbackData({ rating, comments: comments.trim(), created_at: new Date().toISOString() });
      showToast('Thank you! Your resolution feedback has been recorded.', 'success');
      if (onFeedbackSubmitted) onFeedbackSubmitted(res);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to submit feedback';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // If already submitted (or read-only view)
  if (submitted && feedbackData) {
    return (
      <Card hoverElevation className="p-4 sm:p-5 border-emerald-100 dark:border-emerald-950/60 bg-emerald-50/20 dark:bg-emerald-950/10">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-emerald-100 dark:border-emerald-900/40">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Student Resolution Feedback
            </h3>
          </div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded">
            Submitted
          </span>
        </div>

        <div className="flex items-center gap-1.5 mb-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-5 h-5 ${
                star <= feedbackData.rating
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-slate-300 dark:text-slate-700'
              }`}
            />
          ))}
          <span className="ml-2 text-xs font-bold text-slate-700 dark:text-slate-200">
            {ratingLabels[feedbackData.rating - 1] || `${feedbackData.rating} Stars`}
          </span>
        </div>

        {feedbackData.comments && (
          <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
            &ldquo;{feedbackData.comments}&rdquo;
          </p>
        )}
      </Card>
    );
  }

  if (!canSubmit) {
    return null;
  }

  return (
    <Card hoverElevation className="p-4 sm:p-5 border-indigo-100 dark:border-indigo-900/40">
      <div className="pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          How was your resolution experience?
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Your rating helps college departments measure quality and service standards.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => {
              const active = (hoverRating || rating) >= star;
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 rounded transition-transform hover:scale-110 focus:outline-none cursor-pointer"
                  title={`${star} star`}
                  aria-label={`${star} star`}
                >
                  <Star
                    className={`w-6 h-6 transition-colors ${
                      active
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-300 dark:text-slate-600 hover:text-amber-300'
                    }`}
                  />
                </button>
              );
            })}
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 ml-2">
              {(hoverRating || rating) > 0 ? ratingLabels[(hoverRating || rating) - 1] : 'Rate 1 to 5 stars'}
            </span>
          </div>
        </div>

        <textarea
          rows={2}
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Optional remarks on response time, officer helpfulness, or resolution completeness..."
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={submitting}
            disabled={submitting || rating === 0}
            icon={<Send className="w-3.5 h-3.5" />}
          >
            Submit Feedback
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default FeedbackRating;
