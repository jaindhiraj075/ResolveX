import React from 'react';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';

export const AdminDepartments: React.FC = () => {
  const departments = [
    { id: 1, name: 'IT / Network', code: 'IT_NET', desc: 'Campus IT infrastructure, Wi-Fi networks, and server systems' },
    { id: 2, name: 'Hostel Administration', code: 'HOSTEL', desc: 'Hostel accommodations, room maintenance, water, and mess' },
    { id: 3, name: 'Campus Maintenance', code: 'MAINT', desc: 'Electrical, plumbing, civil infrastructure, and facility upkeep' },
    { id: 4, name: 'CSE Lab', code: 'CSE_LAB', desc: 'Computer Science laboratories, hardware, and peripherals' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="College Departments"
        description="Department routing nodes configured in the system"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {departments.map((d) => (
          <Card key={d.id} title={d.name} subtitle={`Code: ${d.code}`} hoverElevation>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">{d.desc}</p>
            <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100 dark:border-slate-800">
              <Badge variant="green" size="sm">Active Routing Target</Badge>
              <span className="text-slate-400 dark:text-slate-500 tabular-nums">Database ID #{d.id}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminDepartments;
