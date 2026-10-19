import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Search,
  Filter,
  PlusCircle,
  ArrowRight,
  Clock,
  Inbox,
  AlertTriangle,
  Building2,
  Calendar,
  X,
  ArrowUpDown,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import EmptyState from '../../components/common/EmptyState';
import Skeleton, { SkeletonTableRow } from '../../components/common/Skeleton';
import SLAStatusBadge from '../../components/sla/SLAStatusBadge';
import CopyButton from '../../components/common/CopyButton';
import complaintService, { ComplaintItem } from '../../services/complaintService';

export const StudentComplaints: React.FC = () => {
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority_desc'>('newest');

  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);

  const fetchOptions = async () => {
    try {
      const opts = await complaintService.getOptions();
      setCategories(opts.categories || []);
      setDepartments(opts.departments || []);
    } catch {
      // Fallback
    }
  };

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const data = await complaintService.getComplaints({
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
        category_id: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        department_id: departmentFilter !== 'ALL' ? departmentFilter : undefined,
      });
      setComplaints(data || []);
    } catch {
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [statusFilter, priorityFilter, categoryFilter, departmentFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchComplaints();
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setCategoryFilter('ALL');
    setDepartmentFilter('ALL');
    setSortBy('newest');
  };

  const isFiltered =
    search.trim() !== '' ||
    statusFilter !== 'ALL' ||
    priorityFilter !== 'ALL' ||
    categoryFilter !== 'ALL' ||
    departmentFilter !== 'ALL';

  // Client-side sort on loaded complaints
  const sortedComplaints = useMemo(() => {
    const list = [...complaints];
    const priorityWeights: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };

    switch (sortBy) {
      case 'oldest':
        return list.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      case 'priority_desc':
        return list.sort(
          (a, b) => (priorityWeights[b.priority] || 0) - (priorityWeights[a.priority] || 0)
        );
      case 'newest':
      default:
        return list.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }
  }, [complaints, sortBy]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="yellow" size="sm" dot>Pending</Badge>;
      case 'ASSIGNED':
        return <Badge variant="indigo" size="sm" dot>Assigned</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="blue" size="sm" dot>In Progress</Badge>;
      case 'INFORMATION_REQUIRED':
        return <Badge variant="red" size="sm" dot>Info Required</Badge>;
      case 'RESOLVED':
        return <Badge variant="green" size="sm" dot>Resolved</Badge>;
      case 'REOPENED':
        return <Badge variant="purple" size="sm" dot>Reopened</Badge>;
      case 'CLOSED':
        return <Badge variant="gray" size="sm">Closed</Badge>;
      default:
        return <Badge variant="gray" size="sm">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return <Badge variant="red" size="sm">HIGH</Badge>;
      case 'MEDIUM':
        return <Badge variant="yellow" size="sm">MEDIUM</Badge>;
      case 'LOW':
        return <Badge variant="green" size="sm">LOW</Badge>;
      default:
        return <Badge variant="gray" size="sm">{priority}</Badge>;
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Grievance History"
        description="Track the status, SLA timers, and resolution updates of all your submitted complaints"
        badge={
          <Badge variant="indigo" size="sm">
            {sortedComplaints.length} Tickets
          </Badge>
        }
        actions={
          <Link to="/student/submit">
            <Button variant="primary" size="md" className="flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4" />
              <span>Raise Complaint</span>
            </Button>
          </Link>
        }
      />

      {/* Filter and Search Bar */}
      <Card hoverElevation>
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search by title, complaint ID, or keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={<Search className="w-4 h-4" />}
                aria-label="Search my complaints"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button type="submit" variant="primary" size="md">
                Search
              </Button>
              {isFiltered && (
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={handleResetFilters}
                  className="flex items-center gap-1.5"
                >
                  <X className="w-4 h-4" />
                  <span>Reset</span>
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by category"
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Department Filter */}
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              aria-label="Filter by department"
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="INFORMATION_REQUIRED">Info Required</option>
              <option value="RESOLVED">Resolved</option>
              <option value="REOPENED">Reopened</option>
              <option value="CLOSED">Closed</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              aria-label="Filter by priority"
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>

            {/* Sorting Filter */}
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3" />
                Sort:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sort complaints by"
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="priority_desc">Priority (High to Low)</option>
              </select>
            </div>
          </div>
        </form>
      </Card>

      {/* Complaints List / Table */}
      {loading ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="pb-3 font-semibold">Complaint ID</th>
                  <th className="pb-3 font-semibold">Title</th>
                  <th className="pb-3 font-semibold">Department</th>
                  <th className="pb-3 font-semibold">Priority</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">SLA Status</th>
                  <th className="pb-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <SkeletonTableRow cols={7} />
                <SkeletonTableRow cols={7} />
                <SkeletonTableRow cols={7} />
              </tbody>
            </table>
          </div>
        </Card>
      ) : sortedComplaints.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Inbox className="w-6 h-6" />}
            title="No complaints found"
            description="You haven't submitted any grievances matching the selected filters."
            action={
              isFiltered ? (
                <Button variant="secondary" size="sm" onClick={handleResetFilters}>
                  Clear all filters
                </Button>
              ) : (
                <Link to="/student/submit">
                  <Button variant="primary" size="md">
                    Submit your first grievance
                  </Button>
                </Link>
              )
            }
          />
        </Card>
      ) : (
        <>
          {/* Mobile Card Layout (< md) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {sortedComplaints.map((item) => (
              <Card key={item.id} hoverElevation className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CopyButton text={item.complaint_id} />
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {formatDate(item.created_at)}
                    </span>
                  </div>
                  {getStatusBadge(item.status)}
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-2">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{item.department_name || 'General'}</span>
                    <span>·</span>
                    <span>{item.category_name || 'Grievance'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    {getPriorityBadge(item.priority)}
                    <SLAStatusBadge
                      status={item.sla_status || item.sla_info?.sla_status || 'ON_TRACK'}
                      escalationLevel={item.escalation_level}
                    />
                  </div>
                  <Link
                    to={`/student/complaints/${item.complaint_id}`}
                    className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
                  >
                    <span>View Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block">
            <Card hoverElevation>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm" role="table">
                  <thead className="text-xs uppercase text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="pb-3 font-semibold">Complaint ID</th>
                      <th className="pb-3 font-semibold">Title</th>
                      <th className="pb-3 font-semibold">Department</th>
                      <th className="pb-3 font-semibold">Priority</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold">SLA Status</th>
                      <th className="pb-3 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {sortedComplaints.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group focus-within:bg-slate-50 dark:focus-within:bg-slate-800/50"
                      >
                        <td className="py-3.5 font-mono font-bold">
                          <CopyButton text={item.complaint_id} />
                        </td>
                        <td className="py-3.5 font-semibold text-slate-900 dark:text-white max-w-xs truncate">
                          <Link
                            to={`/student/complaints/${item.complaint_id}`}
                            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus-visible:outline-none focus-visible:underline"
                          >
                            {item.title}
                          </Link>
                        </td>
                        <td className="py-3.5 text-slate-600 dark:text-slate-300">
                          {item.department_name || 'General'}
                        </td>
                        <td className="py-3.5">{getPriorityBadge(item.priority)}</td>
                        <td className="py-3.5">{getStatusBadge(item.status)}</td>
                        <td className="py-3.5">
                          <SLAStatusBadge
                            status={item.sla_status || item.sla_info?.sla_status || 'ON_TRACK'}
                            escalationLevel={item.escalation_level}
                          />
                        </td>
                        <td className="py-3.5 text-right">
                          <Link
                            to={`/student/complaints/${item.complaint_id}`}
                            className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 rounded p-1"
                          >
                            <span>View Details</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default StudentComplaints;
