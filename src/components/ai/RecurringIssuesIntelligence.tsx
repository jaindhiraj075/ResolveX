import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Building,
  Sparkles,
  TrendingUp,
  ShieldAlert,
} from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';
import LoadingSpinner from '../common/LoadingSpinner';
import EmptyState from '../common/EmptyState';
import complaintService, { RecurringCluster } from '../../services/complaintService';
import { useToast } from '../../context/ToastContext';

interface RecurringIssuesIntelligenceProps {
  role?: 'staff' | 'admin';
}

export const RecurringIssuesIntelligence: React.FC<RecurringIssuesIntelligenceProps> = ({
  role = 'admin',
}) => {
  const { showToast } = useToast();
  const [clusters, setClusters] = useState<RecurringCluster[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClusters = async () => {
    setLoading(true);
    try {
      const data = await complaintService.getRecurringIssues();
      setClusters(data || []);
    } catch {
      showToast('Failed to load recurring issue clusters', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClusters();
  }, []);

  const complaintLinkPrefix = role === 'staff' ? '/staff/complaints' : '/admin/complaints';

  return (
    <Card
      hoverElevation
      className="border-indigo-100 dark:border-indigo-900/50 bg-gradient-to-br from-white via-slate-50/50 to-indigo-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20"
      title="Recurring Issue & Geographic Cluster Intelligence"
      subtitle="Evidence-backed failure patterns grouped by department, category, and verified campus physical location"
      headerAction={
        <Button
          variant="outline"
          size="sm"
          onClick={fetchClusters}
          disabled={loading}
          icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
        >
          Re-Analyze Clusters
        </Button>
      }
    >
      {loading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner size="md" message="Scanning database for recurring campus failure patterns..." />
        </div>
      ) : clusters.length === 0 ? (
        <EmptyState
          icon={<Layers className="w-8 h-8 text-indigo-500" />}
          title="No recurring infrastructure clusters detected"
          description="ResolveX analyzes complaints grouped by physical location and category. A minimum sample size of 2 verified localized incidents is required before identifying systemic patterns."
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 text-xs text-slate-500">
            <span>
              Identified <strong>{clusters.length}</strong> active systemic cluster{clusters.length > 1 ? 's' : ''} with valid sample size
            </span>
            <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
              Zero-speculation verified data
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clusters.map((cluster, idx) => (
              <div
                key={`${cluster.category}-${cluster.location}-${idx}`}
                className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-2xs hover:border-indigo-200 dark:hover:border-indigo-800 transition-all flex flex-col justify-between space-y-3"
              >
                {/* Cluster Header */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {cluster.category}
                      </span>
                      <Badge variant="indigo" size="sm">
                        <MapPin className="w-3 h-3 mr-1 inline" />
                        {cluster.location}
                      </Badge>
                    </div>

                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                      {cluster.incident_count} Incidents ({cluster.unresolved_count} Active)
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    <span>Handling Department: <strong>{cluster.department}</strong></span>
                    <span>•</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">
                      {Math.round(cluster.confidence * 100)}% pattern confidence
                    </span>
                  </p>
                </div>

                {/* Grounded Insight Box */}
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans text-[11px]">
                      {cluster.insight}
                    </p>
                  </div>
                </div>

                {/* Recommended Operational Action */}
                <div className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-xs">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300 block mb-0.5">
                        Recommended Department Action
                      </span>
                      <p className="text-emerald-800 dark:text-emerald-300 leading-relaxed text-[11px]">
                        {cluster.recommended_action}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Linked Ticket IDs */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">
                      Linked Tickets:
                    </span>
                    {cluster.complaint_ids.slice(0, 4).map((cid) => (
                      <Link
                        key={cid}
                        to={`${complaintLinkPrefix}/${cid}`}
                        className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded"
                      >
                        {cid}
                      </Link>
                    ))}
                    {cluster.complaint_ids.length > 4 && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        +{cluster.complaint_ids.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default RecurringIssuesIntelligence;
