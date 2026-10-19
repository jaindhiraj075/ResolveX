import React, { useState } from 'react';
import { Calendar, Filter, Download, RotateCcw } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';

export interface FilterState {
  range: string;
  start_date?: string;
  end_date?: string;
  department_id?: string;
  priority?: string;
  status?: string;
}

interface AnalyticsDateFilterProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  departments?: Array<{ id: number; name: string }>;
  onExport?: () => void;
  exporting?: boolean;
}

export const AnalyticsDateFilter: React.FC<AnalyticsDateFilterProps> = ({
  filters,
  onChange,
  departments = [],
  onExport,
  exporting = false,
}) => {
  const [showCustom, setShowCustom] = useState(filters.range === 'custom');

  const presets = [
    { label: 'Today', value: 'today' },
    { label: 'Last 7 Days', value: '7d' },
    { label: 'Last 30 Days', value: '30d' },
    { label: 'Last 90 Days', value: '90d' },
    { label: 'This Year', value: 'year' },
    { label: 'Custom', value: 'custom' },
  ];

  const handlePresetClick = (val: string) => {
    if (val === 'custom') {
      setShowCustom(true);
      onChange({ ...filters, range: 'custom' });
    } else {
      setShowCustom(false);
      onChange({ ...filters, range: val, start_date: undefined, end_date: undefined });
    }
  };

  return (
    <Card hoverElevation className="p-3 sm:p-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Preset Range Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1 hidden sm:inline">
            Range:
          </span>
          {presets.map((p) => {
            const active = filters.range === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => handlePresetClick(p.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  active
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Filters and Export Button */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Department Select */}
          {departments.length > 0 && (
            <select
              value={filters.department_id || 'ALL'}
              onChange={(e) => onChange({ ...filters, department_id: e.target.value })}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}

          {/* Export CSV action */}
          {onExport && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onExport}
              loading={exporting}
              icon={<Download className="w-3.5 h-3.5 text-indigo-500" />}
            >
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Custom Date Range Picker */}
      {showCustom && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3 text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400 font-medium">From:</span>
            <input
              type="date"
              value={filters.start_date || ''}
              onChange={(e) => onChange({ ...filters, start_date: e.target.value })}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400 font-medium">To:</span>
            <input
              type="date"
              value={filters.end_date || ''}
              onChange={(e) => onChange({ ...filters, end_date: e.target.value })}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>
      )}
    </Card>
  );
};

export default AnalyticsDateFilter;
