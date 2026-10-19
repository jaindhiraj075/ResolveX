import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import useAuth from './hooks/useAuth';
import ProtectedRoute from './components/auth/ProtectedRoute';

const RoleDashboardRedirect: React.FC = () => {
  const { role, user } = useAuth();
  const currentRole = (role || user?.role || '').toUpperCase();
  if (currentRole === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
  if (currentRole === 'STAFF') return <Navigate to="/staff/dashboard" replace />;
  return <Navigate to="/student/dashboard" replace />;
};

// Layouts
import PublicLayout from './layouts/PublicLayout';
import StudentLayout from './layouts/StudentLayout';
import StaffLayout from './layouts/StaffLayout';
import AdminLayout from './layouts/AdminLayout';

// Public Pages
import LandingPage from './pages/public/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import AccessDeniedPage from './pages/AccessDeniedPage';
import NotFoundPage from './pages/NotFoundPage';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentComplaints from './pages/student/StudentComplaints';
import StudentSubmitComplaint from './pages/student/StudentSubmitComplaint';
import StudentComplaintDetails from './pages/student/StudentComplaintDetails';
import StudentNotifications from './pages/student/StudentNotifications';
import StudentProfile from './pages/student/StudentProfile';

// Staff Pages
import StaffDashboard from './pages/staff/StaffDashboard';
import StaffComplaints from './pages/staff/StaffComplaints';
import StaffComplaintDetails from './pages/staff/StaffComplaintDetails';
import StaffNotifications from './pages/staff/StaffNotifications';
import StaffProfile from './pages/staff/StaffProfile';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminComplaints from './pages/admin/AdminComplaints';
import AdminComplaintDetails from './pages/admin/AdminComplaintDetails';
import AdminUsers from './pages/admin/AdminUsers';
import AdminStaff from './pages/admin/AdminStaff';
import AdminDepartments from './pages/admin/AdminDepartments';
import AdminCategories from './pages/admin/AdminCategories';
import AdminReports from './pages/admin/AdminReports';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminStaffDetail from './pages/admin/AdminStaffDetail';
import AdminSettings from './pages/admin/AdminSettings';

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/403" element={<AccessDeniedPage />} />
              </Route>

              {/* Role-specific Dashboard Smart Redirect */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <RoleDashboardRedirect />
                  </ProtectedRoute>
                }
              />

              {/* Student Role Routes */}
              <Route
                element={
                  <ProtectedRoute allowedRoles={['STUDENT']}>
                    <StudentLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/student/dashboard" element={<StudentDashboard />} />
                <Route path="/student/submit" element={<StudentSubmitComplaint />} />
                <Route path="/student/complaints/new" element={<StudentSubmitComplaint />} />
                <Route path="/student/complaints" element={<StudentComplaints />} />
                <Route path="/student/complaints/:id" element={<StudentComplaintDetails />} />
                <Route path="/student/notifications" element={<StudentNotifications />} />
                <Route path="/student/profile" element={<StudentProfile />} />
              </Route>

              {/* Staff Role Routes */}
              <Route
                element={
                  <ProtectedRoute allowedRoles={['STAFF']}>
                    <StaffLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/staff/dashboard" element={<StaffDashboard />} />
                <Route path="/staff/complaints" element={<StaffComplaints />} />
                <Route path="/staff/complaints/:id" element={<StaffComplaintDetails />} />
                <Route path="/staff/notifications" element={<StaffNotifications />} />
                <Route path="/staff/profile" element={<StaffProfile />} />
              </Route>

              {/* Admin Role Routes */}
              <Route
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/complaints" element={<AdminComplaints />} />
                <Route path="/admin/complaints/:id" element={<AdminComplaintDetails />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/staff" element={<AdminStaff />} />
                <Route path="/admin/staff/:id" element={<AdminStaffDetail />} />
                <Route path="/admin/departments" element={<AdminDepartments />} />
                <Route path="/admin/categories" element={<AdminCategories />} />
                <Route path="/admin/reports" element={<AdminReports />} />
                <Route path="/admin/analytics" element={<AdminAnalytics />} />
                <Route path="/admin/settings" element={<AdminSettings />} />
              </Route>

              {/* 404 Fallback */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
