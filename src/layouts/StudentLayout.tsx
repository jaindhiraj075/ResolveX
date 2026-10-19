import React from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  Bell,
  User,
} from 'lucide-react';
import RoleBaseLayout from './RoleBaseLayout';
import { NavItem } from '../components/layout/AppSidebar';

const studentNavItems: NavItem[] = [
  { name: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
  { name: 'Submit Complaint', path: '/student/submit', icon: PlusCircle },
  { name: 'My Complaints', path: '/student/complaints', icon: FileText },
  { name: 'Notifications', path: '/student/notifications', icon: Bell },
  { name: 'Profile', path: '/student/profile', icon: User },
];

export const StudentLayout: React.FC = () => {
  return <RoleBaseLayout navItems={studentNavItems} roleName="Student" />;
};

export default StudentLayout;
