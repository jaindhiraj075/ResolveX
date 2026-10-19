import React from 'react';
import Badge from '../common/Badge';
import { Clock, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';

interface SLAStatusBadgeProps {
  status: 'ON_TRACK' | 'DUE_SOON' | 'OVERDUE' | 'RESOLVED' | string;
  escalationLevel?: number;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export const SLAStatusBadge: React.FC<SLAStatusBadgeProps> = ({
  status,
  escalationLevel = 0,
  size = 'sm',
  showIcon = true,
}) => {
  const normStatus = (status || '').toUpperCase();

  switch (normStatus) {
    case 'OVERDUE':
      return (
        <Badge
          variant="red"
          size={size}
          dot
          className="font-medium"
        >
          {escalationLevel >= 2 ? (
            <span className="flex items-center gap-1">
              {showIcon && <AlertCircle className="w-3 h-3 text-rose-500 animate-pulse" />}
              <span>Overdue (Escalated L2)</span>
            </span>
          ) : escalationLevel === 1 ? (
            <span className="flex items-center gap-1">
              {showIcon && <AlertTriangle className="w-3 h-3 text-rose-500" />}
              <span>Overdue (Escalated L1)</span>
            </span>
          ) : (
            <span className="flex items-center gap-1">
              {showIcon && <AlertTriangle className="w-3 h-3 text-rose-500" />}
              <span>Overdue</span>
            </span>
          )}
        </Badge>
      );

    case 'DUE_SOON':
      return (
        <Badge
          variant="yellow"
          size={size}
          dot
          className="font-medium"
        >
          <span className="flex items-center gap-1">
            {showIcon && <Clock className="w-3 h-3 text-amber-500" />}
            <span>Due Soon</span>
          </span>
        </Badge>
      );

    case 'ON_TRACK':
      return (
        <Badge
          variant="green"
          size={size}
          dot
          className="font-medium"
        >
          <span className="flex items-center gap-1">
            {showIcon && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
            <span>On Track</span>
          </span>
        </Badge>
      );

    case 'RESOLVED':
      return (
        <Badge
          variant="blue"
          size={size}
          className="font-medium"
        >
          <span>SLA Met</span>
        </Badge>
      );

    default:
      return (
        <Badge variant="gray" size={size}>
          <span>{status || 'Unknown'}</span>
        </Badge>
      );
  }
};

export default SLAStatusBadge;
