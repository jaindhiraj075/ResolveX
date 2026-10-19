import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import api from '../../services/api';
import Skeleton, { SkeletonTableRow } from '../../components/common/Skeleton';

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get('/api/admin/users');
        if (response.data?.data?.users) {
          setUsers(response.data.data.users);
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Accounts Directory"
        description="Manage authenticated roles, account activations, and college directory mappings"
      />

      <Card hoverElevation>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="pb-3 font-semibold">User ID</th>
                <th className="pb-3 font-semibold">Full Name</th>
                <th className="pb-3 font-semibold">College Email</th>
                <th className="pb-3 font-semibold">Assigned Role</th>
                <th className="pb-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {loading ? (
                <>
                  <SkeletonTableRow cols={5} />
                  <SkeletonTableRow cols={5} />
                  <SkeletonTableRow cols={5} />
                </>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 font-mono text-slate-500 dark:text-slate-400">#{u.id}</td>
                    <td className="py-3 font-semibold text-slate-900 dark:text-white">{u.full_name}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">{u.email}</td>
                    <td className="py-3">
                      <Badge variant={u.role === 'ADMIN' ? 'purple' : u.role === 'STAFF' ? 'indigo' : 'green'} size="sm">
                        {u.role}
                      </Badge>
                    </td>
                    <td className="py-3 text-emerald-600 dark:text-emerald-400 font-medium">
                      {u.is_active ? 'Active' : 'Inactive'}
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

export default AdminUsers;
