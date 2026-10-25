import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { I18nProvider, useI18n } from '@/contexts/I18nContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Toaster } from '@/components/ui/toaster';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { AttendancePage as UserAttendancePage } from '@/pages/AttendancePage';
import { AttendancePage as AdminAttendancePage } from '@/pages/admin/AttendancePage';
import { StudentListPage } from '@/pages/admin/StudentListPage';

import { PublicLayout } from '@/components/layout/PublicLayout';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

import { SignInPage } from '@/pages/auth/SignInPage';
import { SignUpPage } from '@/pages/auth/SignUpPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';

import { HomePage } from '@/pages/public/HomePage';
import { AboutPage } from '@/pages/public/AboutPage';
import { AnnouncementsPage } from '@/pages/public/AnnouncementsPage';
import { ContactPage } from '@/pages/public/ContactPage';
import { ResidenceInfoPage } from '@/pages/public/ResidenceInfoPage';

import { StudentDashboard } from '@/pages/student/StudentDashboard';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { TranslationKey, UserRole } from '@/types';

const ADMIN_ROLES: UserRole[] = ['super_admin', 'residence_admin', 'finance_admin', 'duty_manager'];

function RoleBasedRedirect() {
  const { profile, loading } = useAuth();
  if (loading) return null;
  if (profile && ADMIN_ROLES.includes(profile.role)) {
    return <Navigate to="/admin" replace />;
  }
  return (
    <DashboardLayout>
      <StudentDashboard />
    </DashboardLayout>
  );
}

function ModulePlaceholder({ titleKey }: { titleKey: TranslationKey }) {
  const { t } = useI18n();
  return (
    <div className="max-w-3xl mx-auto p-4 pb-24 space-y-4 font-khmer">
      <h1 className="text-2xl font-bold">{t(titleKey)}</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t(titleKey)}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
        </CardContent>
      </Card>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <Routes>
              <Route path="/signin" element={<SignInPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
              <Route path="/attendance" element={<PublicLayout><UserAttendancePage /></PublicLayout>} />
              <Route path="/leave" element={<PublicLayout><ModulePlaceholder titleKey="feature.leave" /></PublicLayout>} />
              <Route path="/about" element={<PublicLayout><AboutPage /></PublicLayout>} />
              <Route path="/residence-info" element={<PublicLayout><ResidenceInfoPage /></PublicLayout>} />
              <Route path="/announcements" element={<PublicLayout><AnnouncementsPage /></PublicLayout>} />
              <Route path="/contact" element={<PublicLayout><ContactPage /></PublicLayout>} />

              <Route path="/profile" element={<ProtectedRoute><DashboardLayout><ModulePlaceholder titleKey="nav.profile" /></DashboardLayout></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><RoleBasedRedirect /></ProtectedRoute>} />
              <Route path="/dashboard/scan" element={<ProtectedRoute roles={['student']}><DashboardLayout><ModulePlaceholder titleKey="feature.qrAttendance" /></DashboardLayout></ProtectedRoute>} />
              <Route path="/dashboard/attendance" element={<ProtectedRoute roles={['student']}><DashboardLayout><ModulePlaceholder titleKey="qr.history" /></DashboardLayout></ProtectedRoute>} />
              <Route path="/dashboard/payments" element={<ProtectedRoute roles={['student']}><DashboardLayout><ModulePlaceholder titleKey="feature.payments" /></DashboardLayout></ProtectedRoute>} />
              <Route path="/dashboard/duties" element={<ProtectedRoute roles={['student']}><DashboardLayout><ModulePlaceholder titleKey="feature.duty" /></DashboardLayout></ProtectedRoute>} />
              <Route path="/dashboard/leave" element={<ProtectedRoute roles={['student']}><DashboardLayout><ModulePlaceholder titleKey="feature.leave" /></DashboardLayout></ProtectedRoute>} />

              <Route path="/admin" element={<ProtectedRoute roles={ADMIN_ROLES}><DashboardLayout><AdminDashboard /></DashboardLayout></ProtectedRoute>} />
              
              <Route path="/admin/students" element={<ProtectedRoute roles={['super_admin', 'residence_admin']}><DashboardLayout><StudentListPage /></DashboardLayout></ProtectedRoute>} />
              
              <Route path="/admin/residences" element={<ProtectedRoute roles={['super_admin', 'residence_admin']}><DashboardLayout><ModulePlaceholder titleKey="feature.facilities" /></DashboardLayout></ProtectedRoute>} />
              <Route path="/admin/attendance" element={<ProtectedRoute roles={['super_admin', 'residence_admin', 'duty_manager']}><DashboardLayout><AdminAttendancePage /></DashboardLayout></ProtectedRoute>} />
              <Route path="/admin/payments" element={<ProtectedRoute roles={['super_admin', 'residence_admin', 'finance_admin']}><DashboardLayout><ModulePlaceholder titleKey="feature.payments" /></DashboardLayout></ProtectedRoute>} />
              <Route path="/admin/duties" element={<ProtectedRoute roles={['super_admin', 'residence_admin', 'duty_manager']}><DashboardLayout><ModulePlaceholder titleKey="feature.duty" /></DashboardLayout></ProtectedRoute>} />
              <Route path="/admin/leave-requests" element={<ProtectedRoute roles={['super_admin', 'residence_admin']}><DashboardLayout><ModulePlaceholder titleKey="feature.leave" /></DashboardLayout></ProtectedRoute>} />
              <Route path="/admin/assets" element={<ProtectedRoute roles={['super_admin', 'residence_admin']}><DashboardLayout><ModulePlaceholder titleKey="feature.facilities" /></DashboardLayout></ProtectedRoute>} />
              <Route path="/admin/announcements" element={<ProtectedRoute roles={ADMIN_ROLES}><DashboardLayout><ModulePlaceholder titleKey="feature.announcements" /></DashboardLayout></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute roles={['super_admin']}><DashboardLayout><ModulePlaceholder titleKey="settings.title" /></DashboardLayout></ProtectedRoute>} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Toaster />
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;