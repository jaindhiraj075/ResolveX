import React from 'react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import SLAStatusBadge from './SLAStatusBadge';
import { Clock, ShieldAlert, CheckCircle2, AlertTriangle, Calendar } from 'lucide-react';

export interface SLAInfo {
  priority: string;
  sla_hours?: number;
  created_at?: string;
  sla_due_at?: string;
  resolved_at?: string;
  sla_status: 'ON_TRACK' | 'DUE_SOON' | 'OVERDUE' | 'RESOLVED' | string;
  remaining_seconds: number;
  is_overdue: boolean;
  escalation_level: number;
}

interface SLACardProps {
  slaInfo?: SLAInfo;
  isStudent?: boolean;
}

export const SLACard: React.FC<SLACardProps> = ({ slaInfo, isStudent = false }) => {
  if (!slaInfo) return null;

  const {
    priority,
    sla_hours = 48,
    sla_due_at,
    resolved_at,
    sla_status,
    remaining_seconds,
    is_overdue,
    escalation_level,
  } = slaInfo;

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const formatRemainingTime = (seconds: number) => {
    if (sla_status === 'RESOLVED') return 'Target Met';
    const absSec = Math.abs(seconds);
    const hrs = Math.floor(absSec / 3600);
    const mins = Math.floor((absSec % 3600) / 60);

    if (seconds < 0) {
      return `Overdue by ${hrs > 0 ? `${hrs}h ` : ''}${mins}m`;
    }
    return `${hrs > 0 ? `${hrs}h ` : ''}${mins}m remaining`;
  };

  // Calculate elapsed progress percentage
  const totalSeconds = (sla_hours || 48) * 3600;
  const elapsedSeconds = Math.max(0, totalSeconds - Math.max(0, remaining_seconds));
  const progressPercent = Math.min(100, Math.round((elapsedSeconds / totalSeconds) * 100));

  return (
    <Card hoverElevation className="p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            SLA Resolution Target
          </h3>
          <span className="text-[11px] font-mono text-slate-400">
            ({sla_hours}h standard target)
          </span>
        </div>

        <SLAStatusBadge
          status={sla_status}
          escalationLevel={escalation_level}
          size="md"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
            Priority Tier
          </span>
          <span className="font-bold text-slate-900 dark:text-white">
            {priority} ({sla_hours}h SLA)
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
            Expected Deadline
          </span>
          <span className="font-bold text-slate-900 dark:text-white truncate">
            {formatDateTime(sla_due_at)}
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
            Time Assessment
          </span>
          <span
            className={`font-bold font-mono ${
              is_overdue
                ? 'text-rose-600 dark:text-rose-400'
                : sla_status === 'DUE_SOON'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {formatRemainingTime(remaining_seconds)}
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
            {isStudent ? 'Current Status' : 'Escalation Level'}
          </span>
          <span className="font-bold text-slate-900 dark:text-white">
            {isStudent
              ? sla_status === 'RESOLVED'
                ? 'Completed'
                : is_overdue
                ? 'Under Priority Review'
                : 'Active Resolution'
              : escalation_level >= 2
              ? 'Level 2 (Critical)'
              : escalation_level === 1
              ? 'Level 1 (Overdue)'
              : 'Level 0 (Normal)'}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      {sla_status !== 'RESOLVED' && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            <span>SLA Window Elapsed</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                is_overdue
                  ? 'bg-rose-500'
                  : sla_status === 'DUE_SOON'
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Escalation note for staff/admin if level > 0 */}
      {!isStudent && escalation_level > 0 && (
        <div className="mt-3 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>
            {escalation_level >= 2
              ? 'Critical Level 2 Escalation: Overdue window has exceeded 2x the standard cycle. Department head notified.'
              : 'Level 1 Escalation: SLA deadline passed. Assigned officer and administrator notified.'}
          </span>
        </div>
      )}
    </Card>
  );
};

export default SLACard;
