import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, Inbox } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import Skeleton from '../../components/common/Skeleton';
import complaintService from '../../services/complaintService';
import { useToast } from '../../context/ToastContext';

export const StaffNotifications: React.FC = () => {
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      const data = await complaintService.getNotifications();
      setNotifications(data.notifications || []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkRead = async (id: number) => {
    try {
      await complaintService.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      showToast('Notification marked as read', 'info');
    } catch {
      // Ignored
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Just now';
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Department Notifications"
        description="Alerts regarding new assignments, student responses, and priority complaints"
        badge={
          <Badge variant="indigo" size="sm">
            {notifications.filter((n) => !n.is_read).length} Unread
          </Badge>
        }
      />

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Inbox className="w-6 h-6" />}
            title="No department alerts"
            description="You have no unread notifications. New assignments and student responses will appear here."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card
              key={n.id}
              hoverElevation
              className={`transition-all ${
                !n.is_read
                  ? 'border-l-4 border-l-indigo-600 dark:border-l-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20'
                  : ''
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      !n.is_read
                        ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {n.title}
                      </h4>
                      {!n.is_read && (
                        <Badge variant="indigo" size="sm">
                          New
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      {n.message}
                    </p>
                    <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-1.5">
                      {formatDate(n.created_at)}
                    </p>
                  </div>
                </div>

                {!n.is_read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkRead(n.id)}
                    className="shrink-0 text-xs"
                  >
                    Mark read
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default StaffNotifications;
