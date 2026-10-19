import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  CheckCircle2,
  Clock,
  UserCheck,
  MessageSquare,
  AlertCircle,
  FileCheck2,
  RotateCcw,
} from 'lucide-react';
import { staggerContainer, staggerItem } from '../../config/motion';

export interface TimelineEvent {
  id: number;
  action: string;
  from_status?: string;
  to_status?: string;
  performed_by_name?: string;
  notes?: string;
  created_at: string;
}

interface ComplaintTimelineProps {
  events: TimelineEvent[];
  currentStatus: string;
}

export const ComplaintTimeline: React.FC<ComplaintTimelineProps> = ({ events, currentStatus }) => {
  const shouldReduceMotion = useReducedMotion();

  const getEventIcon = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('submit')) return <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
    if (act.includes('assign')) return <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
    if (act.includes('info') || act.includes('respond')) return <MessageSquare className="w-4 h-4 text-sky-600 dark:text-sky-400" />;
    if (act.includes('resolve') || act.includes('close')) return <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    if (act.includes('reopen')) return <RotateCcw className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
    return <FileCheck2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
  };

  const formatDate = (isoString: string) => {
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

  if (!events || events.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
        No timeline events recorded yet.
      </div>
    );
  }

  return (
    <motion.div
      variants={shouldReduceMotion ? undefined : staggerContainer}
      initial="initial"
      animate="animate"
      className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800"
    >
      {events.map((evt, idx) => {
        const isLatest = idx === events.length - 1;

        return (
          <motion.div
            key={evt.id || idx}
            variants={shouldReduceMotion ? undefined : staggerItem}
            className="relative flex items-start gap-4 group"
          >
            {/* Timeline Node */}
            <div
              className={`absolute -left-6 mt-1 w-6 h-6 rounded-full flex items-center justify-center bg-white dark:bg-slate-900 border-2 ${
                isLatest
                  ? 'border-indigo-600 dark:border-indigo-400 ring-4 ring-indigo-50 dark:ring-indigo-950/50'
                  : 'border-slate-300 dark:border-slate-700'
              } transition-colors shrink-0`}
            >
              {getEventIcon(evt.action)}
            </div>

            {/* Event Details */}
            <div className="flex-1 bg-white dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {evt.action}
                </span>
                <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                  {formatDate(evt.created_at)}
                </span>
              </div>

              {evt.notes && (
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-1 whitespace-pre-wrap">
                  {evt.notes}
                </p>
              )}

              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                <span>By: {evt.performed_by_name || 'System'}</span>
                {evt.to_status && (
                  <span className="font-semibold text-slate-600 dark:text-slate-300 uppercase">
                    Status: {evt.to_status}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
};

export default ComplaintTimeline;
