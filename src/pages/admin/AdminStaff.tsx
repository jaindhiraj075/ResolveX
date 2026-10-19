import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import api from '../../services/api';
import Skeleton, { SkeletonTableRow } from '../../components/common/Skeleton';

export const AdminStaff: React.FC = () => {
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await api.get('/api/admin/staff');
        if (response.data?.data?.staff) {
          setStaffMembers(response.data.data.staff);
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    };
    fetchStaff();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Department Staff Management"
        description="Inspect authenticated department officers and system administrators"
      />

      <Card hoverElevation>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="pb-3 font-semibold">Staff Name</th>
                <th className="pb-3 font-semibold">College Email</th>
                <th className="pb-3 font-semibold">Department</th>
                <th className="pb-3 font-semibold">Role</th>
                <th className="pb-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {loading ? (
                <>
                  <SkeletonTableRow cols={5} />
                  <SkeletonTableRow cols={5} />
                </>
              ) : (
                staffMembers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 font-semibold text-slate-900 dark:text-white">{s.full_name}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">{s.email}</td>
                    <td className="py-3 text-slate-700 dark:text-slate-200">
                      {s.department_name || (s.role === 'ADMIN' ? 'System-Wide' : 'IT / Network')}
                    </td>
                    <td className="py-3">
                      <Badge variant={s.role === 'ADMIN' ? 'purple' : 'indigo'} size="sm">
                        {s.role}
                      </Badge>
                    </td>
                    <td className="py-3 text-emerald-600 dark:text-emerald-400 font-medium">
                      {s.is_active ? 'Active' : 'Inactive'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default AdminStaff;
