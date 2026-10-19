import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Building2,
  CheckCircle2,
  Clock,
  Star,
  Bot,
  Filter,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AnalyticsDateFilter, { FilterState } from '../../components/analytics/AnalyticsDateFilter';
import complaintService from '../../services/complaintService';
import { useToast } from '../../context/ToastContext';

type ReportType = 'summary' | 'departments' | 'sla' | 'feedback' | 'ai';

export const AdminReports: React.FC = () => {
  const { showToast } = useToast();
  const [reportType, setReportType] = useState<ReportType>('summary');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);

  const [filters, setFilters] = useState<FilterState>({
    range: '30d',
    department_id: 'ALL',
  });

  const [reportData, setReportData] = useState<any>(null);

  const fetchDepartments = async () => {
    try {
      const opts = await complaintService.getOptions();
      setDepartments(opts.departments || []);
    } catch {
      // Ignore
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const params = {
        range: filters.range !== 'custom' ? filters.range : undefined,
        start_date: filters.start_date,
        end_date: filters.end_date,
        department_id: filters.department_id !== 'ALL' ? filters.department_id : undefined,
      };

      if (reportType === 'summary') {
        const [ov, st, pri, cat] = await Promise.all([
          complaintService.getAnalyticsOverview(params),
          complaintService.getAnalyticsStatus(params),
          complaintService.getAnalyticsPriorities(params),
          complaintService.getAnalyticsCategories(params),
        ]);
        setReportData({ overview: ov, status: st, priorities: pri, categories: cat });
      } else if (reportType === 'departments') {
        const data = await complaintService.getAnalyticsDepartments(params);
        setReportData({ departments: data });
      } else if (reportType === 'sla') {
        const [sla, res] = await Promise.all([
          complaintService.getAnalyticsSLA(params),
          complaintService.getAnalyticsResolution(params),
        ]);
        setReportData({ sla, resolution: res });
      } else if (reportType === 'feedback') {
        const fb = await complaintService.getAnalyticsFeedback(params);
        setReportData({ feedback: fb });
      } else if (reportType === 'ai') {
        const ai = await complaintService.getAnalyticsAI(params);
        setReportData({ ai });
      }
    } catch (err: any) {
      showToast('Failed to generate report', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [reportType, filters]);

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
      a.download = `resolvex_report_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('Report CSV successfully generated', 'success');
    } catch {
      showToast('Failed to export CSV', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const reportTypes = [
    { id: 'summary', label: 'Complaint Summary', icon: FileText, desc: 'Institutional volume, statuses, and categories' },
    { id: 'departments', label: 'Department Performance', icon: Building2, desc: 'Volume, resolution speed, and SLA compliance' },
    { id: 'sla', label: 'SLA Audit Report', icon: Clock, desc: 'SLA met vs breached, due soon, and overdue' },
    { id: 'feedback', label: 'Student Satisfaction', icon: Star, desc: 'Rating distributions and feedback response rates' },
    { id: 'ai', label: 'AI Operations & Duplicates', icon: Bot, desc: 'Automated classifications, confidence, and overrides' },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto print:p-0 print:m-0 print:max-w-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <PageHeader
          title="Institutional Reports & Audit Center"
          description="Generate structured compliance summaries, performance audits, and exportable datasets"
          badge={
            <Badge variant="purple" size="sm" dot>
              Official Auditing
            </Badge>
          }
        />

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            icon={<Printer className="w-3.5 h-3.5" />}
          >
            Print Report
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleExportCSV}
            loading={exporting}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Printable Letterhead (Only visible in Print) */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-6">
        <h1 className="text-xl font-bold uppercase tracking-wider text-slate-900">
          ResolveX — College Grievance Management System
        </h1>
        <p className="text-xs text-slate-600">
          Institutional Report: {reportTypes.find((r) => r.id === reportType)?.label} | Generated on {new Date().toLocaleString()}
        </p>
      </div>

      {/* Date & Department Filter */}
      <div className="print:hidden">
        <AnalyticsDateFilter
          filters={filters}
          onChange={(newF) => setFilters(newF)}
          departments={departments}
        />
      </div>

      {/* Report Type Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 print:hidden">
        {reportTypes.map((r) => {
          const Icon = r.icon;
          const active = reportType === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setReportType(r.id as ReportType)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                active
                  ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <Icon className={`w-4 h-4 mb-1.5 ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
              <p className={`text-xs font-bold ${active ? 'text-indigo-900 dark:text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                {r.label}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                {r.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* Report Content Card */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner size="lg" message="Compiling official audit dataset..." />
        </div>
      ) : (
        <Card hoverElevation className="p-6">
          <div className="pb-4 mb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {reportTypes.find((r) => r.id === reportType)?.label}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Data generated from verified database records for the selected date window
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Generated: {new Date().toLocaleDateString()}
            </span>
          </div>

          {/* 1. Summary Report */}
          {reportType === 'summary' && reportData?.overview && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 uppercase text-[10px] font-bold block mb-1">Total Volume</span>
                  <span className="text-xl font-bold">{reportData.overview.total_complaints}</span>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                  <span className="text-emerald-600 dark:text-emerald-400 uppercase text-[10px] font-bold block mb-1">Resolved</span>
                  <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{reportData.overview.resolved}</span>
                </div>
                <div className="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
                  <span className="text-amber-600 dark:text-amber-400 uppercase text-[10px] font-bold block mb-1">Pending</span>
                  <span className="text-xl font-bold text-amber-600 dark:text-amber-400">{reportData.overview.pending}</span>
                </div>
                <div className="p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                  <span className="text-indigo-600 dark:text-indigo-400 uppercase text-[10px] font-bold block mb-1">SLA Compliance</span>
                  <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{reportData.overview.sla_compliance}%</span>
                </div>
              </div>

              {/* Status table */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Status Breakdown
                </h3>
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] uppercase border-b border-slate-100 dark:border-slate-800 text-slate-400">
                    <tr>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Count</th>
                      <th className="pb-2 text-right">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {reportData.status?.map((s: any) => (
                      <tr key={s.status} className="py-2">
                        <td className="py-2 font-semibold">{s.status}</td>
                        <td className="py-2 font-bold">{s.count}</td>
                        <td className="py-2 text-right font-mono">{s.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. Department Performance */}
          {reportType === 'departments' && reportData?.departments && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[11px] uppercase border-b border-slate-100 dark:border-slate-800 text-slate-400">
                  <tr>
                    <th className="pb-2.5">Department</th>
                    <th className="pb-2.5">Code</th>
                    <th className="pb-2.5">Total Volume</th>
                    <th className="pb-2.5">Resolved</th>
                    <th className="pb-2.5">Pending</th>
                    <th className="pb-2.5">Overdue</th>
                    <th className="pb-2.5">Avg Resolution Time</th>
                    <th className="pb-2.5 text-right">SLA Compliance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {reportData.departments.map((d: any) => (
                    <tr key={d.id}>
                      <td className="py-2.5 font-bold text-slate-900 dark:text-white">{d.department}</td>
                      <td className="py-2.5 font-mono text-slate-400">{d.code}</td>
                      <td className="py-2.5 font-semibold">{d.total}</td>
                      <td className="py-2.5 text-emerald-600 dark:text-emerald-400 font-semibold">{d.resolved}</td>
                      <td className="py-2.5 text-amber-600 dark:text-amber-400">{d.pending}</td>
                      <td className="py-2.5 font-bold text-rose-600 dark:text-rose-400">{d.overdue}</td>
                      <td className="py-2.5 font-mono">{d.avg_resolution_hours}h</td>
                      <td className="py-2.5 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {d.sla_compliance}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 3. SLA Report */}
          {reportType === 'sla' && reportData?.sla && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 uppercase text-[10px] font-bold block mb-1">Total Resolved</span>
                  <span className="text-xl font-bold">{reportData.sla.total_resolved}</span>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                  <span className="text-emerald-600 dark:text-emerald-400 uppercase text-[10px] font-bold block mb-1">SLA Met</span>
                  <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{reportData.sla.sla_met}</span>
                </div>
                <div className="p-3 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40">
                  <span className="text-rose-600 dark:text-rose-400 uppercase text-[10px] font-bold block mb-1">SLA Breached</span>
                  <span className="text-xl font-bold text-rose-600 dark:text-rose-400">{reportData.sla.sla_breached}</span>
                </div>
                <div className="p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                  <span className="text-indigo-600 dark:text-indigo-400 uppercase text-[10px] font-bold block mb-1">Compliance Rate</span>
                  <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{reportData.sla.compliance_pct}%</span>
                </div>
              </div>

              {reportData.resolution && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Resolution Time Benchmarks
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                      <span className="text-slate-400 block text-[10px]">Average Duration</span>
                      <span className="font-bold font-mono">{reportData.resolution.avg_hours} hours</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                      <span className="text-slate-400 block text-[10px]">Median Duration</span>
                      <span className="font-bold font-mono">{reportData.resolution.median_hours} hours</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                      <span className="text-slate-400 block text-[10px]">Fastest Recorded</span>
                      <span className="font-bold font-mono text-emerald-600">{reportData.resolution.fastest_hours} hours</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                      <span className="text-slate-400 block text-[10px]">Slowest Recorded</span>
                      <span className="font-bold font-mono text-amber-600">{reportData.resolution.slowest_hours} hours</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. Feedback Report */}
          {reportType === 'feedback' && reportData?.feedback && (
            <div className="space-y-6">
              <div className="flex items-center gap-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <div className="text-center pr-6 border-r border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Average Rating</span>
                  <p className="text-3xl font-black text-amber-500 mt-1">
                    {reportData.feedback.average_rating ? reportData.feedback.average_rating.toFixed(1) : '—'}
                  </p>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {reportData.feedback.total_feedbacks} verified ratings
                  </span>
                </div>
                <div className="flex-1 text-xs">
                  <p className="font-bold text-slate-900 dark:text-white mb-1">
                    Student Resolution Survey Audit
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    Feedback response rate: <strong>{reportData.feedback.feedback_response_rate}%</strong> of resolved complaints have received feedback from students.
                  </p>
                </div>
              </div>

              <table className="w-full text-left text-xs">
                <thead className="text-[11px] uppercase border-b border-slate-100 dark:border-slate-800 text-slate-400">
                  <tr>
                    <th className="pb-2">Star Rating</th>
                    <th className="pb-2">Student Reviews</th>
                    <th className="pb-2 text-right">Percentage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {reportData.feedback.rating_distribution?.map((d: any) => (
                    <tr key={d.stars}>
                      <td className="py-2 font-semibold flex items-center gap-1">
                        <span>{d.stars} Stars</span>
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      </td>
                      <td className="py-2 font-bold">{d.count}</td>
                      <td className="py-2 text-right font-mono">{d.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 5. AI Operations Report */}
          {reportType === 'ai' && reportData?.ai && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 uppercase text-[10px] font-bold block mb-1">AI Analyzed</span>
                  <span className="text-xl font-bold">{reportData.ai.ai_analyzed_count}</span>
                </div>
                <div className="p-3 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40">
                  <span className="text-purple-600 dark:text-purple-400 uppercase text-[10px] font-bold block mb-1">Duplicate Detections</span>
                  <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                    {reportData.ai.duplicate_count} ({reportData.ai.duplicate_rate}%)
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
                  <span className="text-amber-600 dark:text-amber-400 uppercase text-[10px] font-bold block mb-1">Low Confidence (&lt;50%)</span>
                  <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                    {reportData.ai.low_confidence_count} ({reportData.ai.low_confidence_rate}%)
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                  <span className="text-indigo-600 dark:text-indigo-400 uppercase text-[10px] font-bold block mb-1">Human Overrides</span>
                  <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                    {reportData.ai.override_count} ({reportData.ai.override_rate}%)
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-600 dark:text-slate-300">
                <p className="font-semibold text-slate-900 dark:text-white mb-1">
                  Responsible AI Policy & Operational Integrity
                </p>
                <p className="leading-relaxed">
                  ResolveX utilizes domain-tuned TF-IDF + Logistic Regression inference with human-in-the-loop validation. Tickets flagged with &lt;50% category probability trigger active operational reviews. Human overrides permanently preserve original model recommendations for transparency and continuous evaluation.
                </p>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default AdminReports;
