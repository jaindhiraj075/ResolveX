import React from 'react';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';

export const AdminCategories: React.FC = () => {
  const categories = [
    { id: 1, name: 'Wi-Fi & Internet', dept: 'IT / Network', desc: 'Connectivity, router faults, captive portal issues' },
    { id: 2, name: 'Hostel & Living', dept: 'Hostel Administration', desc: 'Room repairs, hot water, furniture, sanitation' },
    { id: 3, name: 'Campus Infrastructure', dept: 'Campus Maintenance', desc: 'Power outages, air conditioning, civil repairs' },
    { id: 4, name: 'Lab & Equipment', dept: 'CSE Lab', desc: 'Workstations, projectors, compiler setups' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grievance Categories"
        description="Classification taxonomy used by the AI Model for routing"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((c) => (
          <Card key={c.id} title={c.name} subtitle={`Target Dept: ${c.dept}`} hoverElevation>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">{c.desc}</p>
            <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100 dark:border-slate-800">
              <Badge variant="indigo" size="sm">NLP Target Class</Badge>
              <span className="text-slate-400 dark:text-slate-500 tabular-nums">Class #{c.id}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminCategories;
