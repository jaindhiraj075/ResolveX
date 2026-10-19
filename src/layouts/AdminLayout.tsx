import React from 'react';
import {
  LayoutDashboard,
  FileText,
  Users,
  Building2,
  Tags,
  FileSpreadsheet,
  BarChart3,
  Settings,
} from 'lucide-react';
import RoleBaseLayout from './RoleBaseLayout';
import { NavItem } from '../components/layout/AppSidebar';

const adminNavItems: NavItem[] = [
  { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'All Complaints', path: '/admin/complaints', icon: FileText },
  { name: 'Users', path: '/admin/users', icon: Users },
  { name: 'Staff', path: '/admin/staff', icon: Users },
  { name: 'Departments', path: '/admin/departments', icon: Building2 },
  { name: 'Categories', path: '/admin/categories', icon: Tags },
  { name: 'Reports', path: '/admin/reports', icon: FileSpreadsheet },
  { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
  { name: 'Settings', path: '/admin/settings', icon: Settings },
];

export const AdminLayout: React.FC = () => {
  return <RoleBaseLayout navItems={adminNavItems} roleName="Admin" />;
};

export default AdminLayout;
