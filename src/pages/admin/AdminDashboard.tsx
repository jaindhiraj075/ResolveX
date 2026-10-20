import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  Star,
  Users,
  ShieldAlert,
  Bot,
  Layers,
  Sparkles,
  ArrowRight,
  Info,
  RefreshCw,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import AnimatedCounter from '../../components/common/AnimatedCounter';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AnalyticsDateFilter, { FilterState } from '../../components/analytics/AnalyticsDateFilter';
import RecurringIssuesIntelligence from '../../components/ai/RecurringIssuesIntelligence';
import complaintService from '../../services/complaintService';
import { useToast } from '../../context/ToastContext';
import { formatErrorMessage } from '../../utils/errorUtils';

export const AdminDashboard: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'trends' | 'departments' | 'sla' | 'staff' | 'ai' | 'recurring'>('trends');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);

  const [filters, setFilters] = useState<FilterState>({
    range: '30d',
    department_id: 'ALL',
  });

  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');

  // Analytics states
  const [overview, setOverview] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [statusDist, setStatusDist] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [deptAnalytics, setDeptAnalytics] = useState<any[]>([]);
  const [priorities, setPriorities] = useState<any[]>([]);
  const [slaData, setSlaData] = useState<any>(null);
  const [resolutionData, setResolutionData] = useState<any>(null);
  const [staffData, setStaffData] = useState<any[]>([]);
  const [feedbackData, setFeedbackData] = useState<any>(null);
  const [aiData, setAiData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDepartments = async () => {
    try {
      const opts = await complaintService.getOptions();
      setDepartments(opts.departments || []);
    } catch {
      // Ignore
    }
  };

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        range: filters.range !== 'custom' ? filters.range : undefined,
        start_date: filters.start_date,
        end_date: filters.end_date,
        department_id: filters.department_id !== 'ALL' ? filters.department_id : undefined,
        group_by: groupBy,
      };

      const [ov, tr, st, cat, dep, pri, sla, res, stf, fb, ai] = await Promise.all([
        complaintService.getAnalyticsOverview(params),
        complaintService.getAnalyticsTrends(params),
        complaintService.getAnalyticsStatus(params),
        complaintService.getAnalyticsCategories(params),
        complaintService.getAnalyticsDepartments(params),
        complaintService.getAnalyticsPriorities(params),
        complaintService.getAnalyticsSLA(params),
        complaintService.getAnalyticsResolution(params),
        complaintService.getAnalyticsStaff(params),
        complaintService.getAnalyticsFeedback(params),
        complaintService.getAnalyticsAI(params),
      ]);

      setOverview(ov);
      setTrends(tr || []);
      setStatusDist(st || []);
      setCategories(cat || []);
      setDeptAnalytics(dep || []);
      setPriorities(pri || []);
      setSlaData(sla);
      setResolutionData(res);
      setStaffData(stf || []);
      setFeedbackData(fb);
      setAiData(ai);
    } catch (err: any) {
      const msg = formatErrorMessage(err, 'Failed to load institutional analytics');
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, groupBy, showToast]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const blob = await complaintService.exportAnalyticsCSV({
        range: filters.range !== 'custom' ? filters.range : undefined,
        start_date: filters.start_date,
        end_date: filters.end_date,
        department_id: filters.department_id !== 'ALL' ? filters.department_id : undefined,
      });

      const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `resolvex_analytics_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('CSV report generated and downloaded', 'success');
    } catch {
      showToast('Failed to export CSV report', 'error');
    } finally {
      setExporting(false);
    }
  };

  const STATUS_COLORS: Record<string, string> = {
    PENDING: '#f59e0b',
    ASSIGNED: '#6366f1',
    IN_PROGRESS: '#3b82f6',
    INFORMATION_REQUIRED: '#ef4444',
    RESOLVED: '#10b981',
    REOPENED: '#f97316',
    CLOSED: '#64748b',
    CLOSED_AS_DUPLICATE: '#8b5cf6',
  };

  const PRIORITY_COLORS: Record<string, string> = {
    HIGH: '#ef4444',
    MEDIUM: '#f59e0b',
    LOW: '#10b981',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Management Intelligence & Analytics"
        description="Campus-wide grievance telemetry, SLA compliance, department workload, and student satisfaction metrics"
        badge={
          <Badge variant="purple" size="sm" dot>
            Enterprise Intelligence
          </Badge>
        }
      />

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center justify-between text-xs text-rose-700 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{typeof error === 'string' ? error : formatErrorMessage(error)}</span>
          </div>
          <button
            type="button"
            onClick={fetchAnalytics}
            className="flex items-center gap-1 font-semibold text-rose-700 dark:text-rose-300 hover:underline cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Global Filter Bar */}
      <AnalyticsDateFilter
        filters={filters}
        onChange={(newF) => setFilters(newF)}
        departments={departments}
        onExport={handleExportCSV}
        exporting={exporting}
      />

      {/* Operational Insights Section (Section 31) */}
      {overview?.insights && overview.insights.length > 0 && (
        <Card hoverElevation className="p-4 bg-gradient-to-r from-indigo-50/60 via-purple-50/40 to-slate-50/60 dark:from-indigo-950/20 dark:via-purple-950/10 dark:to-slate-900 border-indigo-100 dark:border-indigo-900/40">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shrink-0 shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="space-y-1.5 flex-1">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Operational Highlights & Signals
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-0.5">
                {overview.insights.map((insight: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                    <span>{insight}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Top 8 KPI Cards (Section 1) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Total Complaints */}
        <Card hoverElevation className="p-3.5 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</span>
          <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            <AnimatedCounter value={overview?.total_complaints || 0} />
          </p>
          <div className="mt-1 text-[10px] text-slate-500 flex items-center gap-1">
            <FileText className="w-3 h-3 text-indigo-500" />
            <span>Grievances</span>
          </div>
        </Card>

        {/* Pending */}
        <Card hoverElevation className="p-3.5 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Pending</span>
          <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
            <AnimatedCounter value={overview?.pending || 0} />
          </p>
          <span className="text-[10px] text-slate-400">Awaiting triage</span>
        </Card>

        {/* In Progress */}
        <Card hoverElevation className="p-3.5 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500">In Progress</span>
          <p className="text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
            <AnimatedCounter value={overview?.in_progress || 0} />
          </p>
          <span className="text-[10px] text-slate-400">Under work</span>
        </Card>

        {/* Resolved */}
        <Card hoverElevation className="p-3.5 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Resolved</span>
          <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            <AnimatedCounter value={overview?.resolved || 0} />
          </p>
          <span className="text-[10px] text-slate-400">Completed</span>
        </Card>

        {/* Overdue */}
        <Card hoverElevation className="p-3.5 flex flex-col justify-between border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Overdue</span>
          <p className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
            <AnimatedCounter value={overview?.overdue || 0} />
          </p>
          <span className="text-[10px] text-rose-500 font-medium">Past SLA</span>
        </Card>

        {/* Average Resolution Time */}
        <Card hoverElevation className="p-3.5 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg Resolution</span>
          <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            {overview?.average_resolution_hours || 0}h
          </p>
          <span className="text-[10px] text-slate-400">Per ticket</span>
        </Card>

        {/* SLA Compliance */}
        <Card hoverElevation className="p-3.5 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SLA Met</span>
          <p className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
            {overview?.sla_compliance || 100}%
          </p>
          <span className="text-[10px] text-slate-400">Resolution window</span>
        </Card>

        {/* Average Rating */}
        <Card hoverElevation className="p-3.5 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Satisfaction</span>
          <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 flex items-center gap-1">
            {overview?.average_rating ? overview.average_rating.toFixed(1) : '—'}
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          </p>
          <span className="text-[10px] text-slate-400">
            {overview?.feedback_count || 0} ratings
          </span>
        </Card>
      </div>

      {/* Navigation Tabs for Analytics Sections */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-semibold gap-4 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('trends')}
          className={`pb-2.5 transition-colors border-b-2 cursor-pointer shrink-0 ${
            activeTab === 'trends'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          Volume & Status Trends
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('departments')}
          className={`pb-2.5 transition-colors border-b-2 cursor-pointer shrink-0 ${
            activeTab === 'departments'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          Departments & Categories
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sla')}
          className={`pb-2.5 transition-colors border-b-2 cursor-pointer shrink-0 ${
            activeTab === 'sla'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          SLA & Resolution Speed
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('staff')}
          className={`pb-2.5 transition-colors border-b-2 cursor-pointer shrink-0 ${
            activeTab === 'staff'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          Staff Workload
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ai')}
          className={`pb-2.5 transition-colors border-b-2 cursor-pointer shrink-0 ${
            activeTab === 'ai'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          Satisfaction & AI Quality
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('recurring')}
          className={`pb-2.5 transition-colors border-b-2 cursor-pointer shrink-0 ${
            activeTab === 'recurring'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          Recurring Clusters (AI)
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner size="lg" message="Aggregating database analytics..." />
        </div>
      ) : (
        <>
          {/* TAB 1: Volume & Trends */}
          {activeTab === 'trends' && (
            <div className="space-y-6">
              {/* Complaints Trend Area Chart */}
              <Card hoverElevation className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Complaints Over Time
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Volume of tickets registered vs tickets resolved
                    </p>
                  </div>

                  {/* Group By selector */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
                    {(['day', 'week', 'month'] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGroupBy(g)}
                        className={`px-2.5 py-1 rounded-md font-medium capitalize cursor-pointer transition-colors ${
                          groupBy === g
                            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {trends.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                    No complaint trend records found for this timeframe.
                  </div>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorComplaints" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '12px',
                            border: 'none',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                        <Area
                          type="monotone"
                          dataKey="complaints"
                          name="Total Received"
                          stroke="#6366f1"
                          fillOpacity={1}
                          fill="url(#colorComplaints)"
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="resolved"
                          name="Resolved"
                          stroke="#10b981"
                          fillOpacity={1}
                          fill="url(#colorResolved)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>

              {/* Status and Priority Breakdown side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Status Donut */}
                <Card hoverElevation className="p-5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                    Grievance Status Distribution
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    Active vs closed tickets across the current filter scope
                  </p>

                  {statusDist.length === 0 ? (
                    <div className="h-56 flex items-center justify-center text-xs text-slate-400">
                      No status data available.
                    </div>
                  ) : (
                    <div className="h-64 w-full flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusDist}
                            dataKey="count"
                            nameKey="status"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={3}
                          >
                            {statusDist.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={STATUS_COLORS[entry.status] || '#94a3b8'}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1e293b',
                              borderRadius: '8px',
                              color: '#fff',
                              fontSize: '12px',
                              border: 'none',
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: '11px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </Card>

                {/* Priority Bar Chart */}
                <Card hoverElevation className="p-5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                    Priority Breakdown
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    Distribution of incoming grievances by severity tier
                  </p>

                  {priorities.length === 0 ? (
                    <div className="h-56 flex items-center justify-center text-xs text-slate-400">
                      No priority records.
                    </div>
                  ) : (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={priorities} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                          <XAxis dataKey="priority" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1e293b',
                              borderRadius: '8px',
                              color: '#fff',
                              fontSize: '12px',
                              border: 'none',
                            }}
                          />
                          <Bar dataKey="count" name="Complaints" radius={[6, 6, 0, 0]}>
                            {priorities.map((entry, index) => (
                              <Cell
                                key={`cell-p-${index}`}
                                fill={PRIORITY_COLORS[entry.priority] || '#6366f1'}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}

          {/* TAB 2: Departments & Categories */}
          {activeTab === 'departments' && (
            <div className="space-y-6">
              {/* Categories Horizontal Bar Chart */}
              <Card hoverElevation className="p-5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  Complaints by Category
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Campus facility areas generating the highest number of grievance reports
                </p>

                {categories.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-xs text-slate-400">
                    No category data available.
                  </div>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={categories}
                        layout="vertical"
                        margin={{ top: 10, right: 20, left: 30, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={120} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '12px',
                            border: 'none',
                          }}
                        />
                        <Bar dataKey="count" name="Total Tickets" fill="#6366f1" radius={[0, 6, 6, 0]} />
                        <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>

              {/* Departments Table */}
              <Card hoverElevation className="p-5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  Department Operational Matrix
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Comparative workload, resolution speed, and SLA performance by department
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-[11px] uppercase font-bold text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="pb-3">Department</th>
                        <th className="pb-3">Total Volume</th>
                        <th className="pb-3">Resolved</th>
                        <th className="pb-3">Pending</th>
                        <th className="pb-3">Overdue</th>
                        <th className="pb-3">Avg Resolution</th>
                        <th className="pb-3 text-right">SLA Met %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {deptAnalytics.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="py-3 font-semibold text-slate-900 dark:text-white">
                            {d.department}
                            <span className="ml-1 text-[10px] font-mono text-slate-400">({d.code})</span>
                          </td>
                          <td className="py-3 font-bold">{d.total}</td>
                          <td className="py-3 text-emerald-600 dark:text-emerald-400 font-semibold">{d.resolved}</td>
                          <td className="py-3 text-amber-600 dark:text-amber-400 font-semibold">{d.pending}</td>
                          <td className="py-3 font-bold">
                            {d.overdue > 0 ? (
                              <span className="text-rose-600 dark:text-rose-400">{d.overdue} overdue</span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                          <td className="py-3 font-mono">{d.avg_resolution_hours}h</td>
                          <td className="py-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {d.sla_compliance}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 3: SLA & Resolution Speed */}
          {activeTab === 'sla' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Resolved</span>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {slaData?.total_resolved || 0}
                  </p>
                  <span className="text-xs text-slate-500">Evaluated tickets</span>
                </Card>

                <Card className="p-4">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Resolved Within SLA</span>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {slaData?.sla_met || 0}
                  </p>
                  <span className="text-xs text-slate-500">Met deadline</span>
                </Card>

                <Card className="p-4">
                  <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400">SLA Breached</span>
                  <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                    {slaData?.sla_breached || 0}
                  </p>
                  <span className="text-xs text-slate-500">Exceeded standard cycle</span>
                </Card>

                <Card className="p-4">
                  <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">SLA Compliance Rate</span>
                  <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                    {slaData?.compliance_pct || 100}%
                  </p>
                  <span className="text-xs text-slate-500">Institutional target: 90%</span>
                </Card>
              </div>

              {/* Resolution Statistics */}
              <Card hoverElevation className="p-5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  Resolution Duration Metrics
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Real time elapsed from ticket creation to resolved status
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Average Duration</span>
                    <p className="text-lg font-black font-mono text-slate-900 dark:text-white mt-1">
                      {resolutionData?.avg_hours || 0} hours
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Median Duration</span>
                    <p className="text-lg font-black font-mono text-slate-900 dark:text-white mt-1">
                      {resolutionData?.median_hours || 0} hours
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                    <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Fastest Resolution</span>
                    <p className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-300 mt-1">
                      {resolutionData?.fastest_hours || 0} hours
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
                    <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">Slowest Resolution</span>
                    <p className="text-lg font-black font-mono text-amber-700 dark:text-amber-300 mt-1">
                      {resolutionData?.slowest_hours || 0} hours
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 4: Staff Workload */}
          {activeTab === 'staff' && (
            <Card hoverElevation className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Department Staff Operational Workload
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Active assigned volume, resolution counts, and student feedback per officer
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] uppercase font-bold text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="pb-3">Staff Member</th>
                      <th className="pb-3">Department</th>
                      <th className="pb-3">Active Tickets</th>
                      <th className="pb-3">Total Assigned</th>
                      <th className="pb-3">Resolved</th>
                      <th className="pb-3">Overdue</th>
                      <th className="pb-3">Avg Resolution</th>
                      <th className="pb-3">SLA Met %</th>
                      <th className="pb-3">Avg Rating</th>
                      <th className="pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {staffData.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3">
                          <p className="font-semibold text-slate-900 dark:text-white">{s.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{s.email}</p>
                        </td>
                        <td className="py-3 text-slate-600 dark:text-slate-300">{s.department}</td>
                        <td className="py-3 font-bold text-indigo-600 dark:text-indigo-400">
                          {s.active_count}
                        </td>
                        <td className="py-3">{s.assigned_total}</td>
                        <td className="py-3 text-emerald-600 dark:text-emerald-400 font-semibold">{s.resolved_count}</td>
                        <td className="py-3">
                          {s.overdue_count > 0 ? (
                            <span className="font-bold text-rose-600 dark:text-rose-400">{s.overdue_count}</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-3 font-mono">{s.avg_resolution_hours}h</td>
                        <td className="py-3 font-mono font-semibold">{s.sla_compliance}%</td>
                        <td className="py-3">
                          {s.avg_rating > 0 ? (
                            <span className="flex items-center gap-1 font-bold text-slate-900 dark:text-white">
                              {s.avg_rating} <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <Link
                            to={`/admin/staff/${s.id}`}
                            className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors"
                          >
                            <span>Inspect</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* TAB 5: Satisfaction & AI Quality */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              {/* Student Feedback Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card hoverElevation className="p-5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                    Student Resolution Satisfaction
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    Ratings distribution from verified resolution reviews
                  </p>

                  <div className="flex items-center gap-6 mb-4">
                    <div className="text-center p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60">
                      <p className="text-3xl font-black text-amber-600 dark:text-amber-400">
                        {feedbackData?.average_rating ? feedbackData.average_rating.toFixed(1) : '—'}
                      </p>
                      <div className="flex items-center justify-center gap-0.5 my-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i <= Math.round(feedbackData?.average_rating || 0)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-300 dark:text-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {feedbackData?.total_feedbacks || 0} reviews
                      </span>
                    </div>

                    <div className="flex-1 space-y-1.5 text-xs">
                      {feedbackData?.rating_distribution?.map((item: any) => (
                        <div key={item.stars} className="flex items-center gap-2">
                          <span className="w-12 text-slate-500 text-[11px] font-mono">{item.stars} Stars</span>
                          <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-amber-400 rounded-full"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                          <span className="w-8 text-right font-mono text-[10px] text-slate-400">
                            {item.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                    Feedback Response Rate: <strong>{feedbackData?.feedback_response_rate || 0}%</strong> of resolved tickets received student reviews.
                  </p>
                </Card>

                {/* Responsible AI Operations Telemetry (Section 16 & 17) */}
                <Card hoverElevation className="p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Bot className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      AI Processing & Duplicate Telemetry
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    Machine learning model inferences, confidence calibration, and human overrides
                  </p>

                  <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">AI Analyzed</span>
                      <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
                        {aiData?.ai_analyzed_count || 0}
                      </p>
                      <span className="text-[10px] text-slate-400">Automated routing</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Duplicate Detections</span>
                      <p className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">
                        {aiData?.duplicate_count || 0} ({aiData?.duplicate_rate || 0}%)
                      </p>
                      <span className="text-[10px] text-slate-400">Cosine similarity</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Low Confidence Flags</span>
                      <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
                        {aiData?.low_confidence_count || 0} ({aiData?.low_confidence_rate || 0}%)
                      </p>
                      <span className="text-[10px] text-slate-400">&lt;50% ML probability</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Human Overrides</span>
                      <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                        {aiData?.override_count || 0} ({aiData?.override_rate || 0}%)
                      </p>
                      <span className="text-[10px] text-slate-400">Staff/Admin corrections</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                    Note: Metrics reflect live operational decisions. Actual model accuracy is measured across verified validation benchmarks.
                  </p>
                </Card>
              </div>

              {/* Recurring Issue Intelligence embedded in AI Quality */}
              <RecurringIssuesIntelligence role="admin" />
            </div>
          )}

          {/* TAB 6: Recurring Issues Intelligence (Phase 9 Section 5) */}
          {activeTab === 'recurring' && (
            <div className="space-y-6">
              <RecurringIssuesIntelligence role="admin" />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
