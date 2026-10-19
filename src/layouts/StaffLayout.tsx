import React from 'react';
import {
  LayoutDashboard,
  FileText,
  Bell,
  User,
} from 'lucide-react';
import RoleBaseLayout from './RoleBaseLayout';
import { NavItem } from '../components/layout/AppSidebar';

const staffNavItems: NavItem[] = [
  { name: 'Dashboard', path: '/staff/dashboard', icon: LayoutDashboard },
  { name: 'Assigned Complaints', path: '/staff/complaints', icon: FileText },
  { name: 'Notifications', path: '/staff/notifications', icon: Bell },
  { name: 'Profile', path: '/staff/profile', icon: User },
];

export const StaffLayout: React.FC = () => {
  return <RoleBaseLayout navItems={staffNavItems} roleName="Staff" />;
};

export default StaffLayout;
