import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, Inbox, ArrowRight, Clock, AlertTriangle, ShieldAlert } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import Skeleton from '../../components/common/Skeleton';
import complaintService from '../../services/complaintService';
import { useToast } from '../../context/ToastContext';

export const StudentNotifications: React.FC = () => {
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

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

  const handleMarkAllRead = async () => {
    try {
      await complaintService.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      showToast('All notifications marked as read', 'success');
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

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const filteredNotifs = filter === 'UNREAD' ? notifications.filter((n) => !n.is_read) : notifications;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <PageHeader
          title="Notification Center"
          description="Real-time alerts regarding SLA progress, officer assignments, and resolution updates"
          badge={
            <Badge variant="indigo" size="sm">
              {unreadCount} Unread
            </Badge>
          }
        />

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            icon={<CheckCheck className="w-3.5 h-3.5" />}
          >
            Mark all read
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            filter === 'ALL'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('UNREAD')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            filter === 'UNREAD'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : filteredNotifs.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Inbox className="w-6 h-6" />}
            title="No notifications"
            description="You are all caught up! Updates about your complaints will appear here automatically."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifs.map((n) => (
            <Card
              key={n.id}
              hoverElevation
              className={`transition-all ${
                !n.is_read
                  ? 'border-l-4 border-l-indigo-600 dark:border-l-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20'
                  : ''
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
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
                    <div className="flex items-center gap-3 mt-2 text-[11px] font-mono text-slate-400 dark:text-slate-500">
                      <span>{formatDate(n.created_at)}</span>
                      {n.reference_id && (
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                          Ticket: {n.reference_id}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {n.reference_id && (
                    <Link to={`/student/complaints/${n.reference_id}`}>
                      <Button variant="outline" size="sm" icon={<ArrowRight className="w-3 h-3" />}>
                        View
                      </Button>
                    </Link>
                  )}

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
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentNotifications;
