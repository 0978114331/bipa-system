import { ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { UserRole } from '@/types';
import { Header } from '@/components/layout/Header';
import { DutyScheduleUserView } from '@/components/duty/DutyScheduleSystem';
import { ResidenceInfoPage } from '@/pages/public/ResidenceInfoPage';
import { PaymentStudentView } from '@/components/payment/PaymentManagementSystem';
import { AlertCircle } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  roles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles, roles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const { t, lang } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const isKhmer = lang === 'km';

  const requiredRoles = allowedRoles || roles;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f6fb] dark:bg-[#0b1120]">
        <div className="w-10 h-10 rounded-full border-4 border-blue-500/20 border-t-blue-600 animate-spin" />
      </div>
    );
  }

  const isAdminUser =
    profile &&
    ['super_admin', 'residence_admin', 'finance_admin', 'duty_manager'].includes(profile.role);

  const isDutyRoute =
    location.pathname.startsWith('/admin/duties') ||
    location.pathname.startsWith('/dashboard/duties') ||
    location.pathname === '/duties';

  if (isDutyRoute && !isAdminUser) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f4f6fb] dark:bg-[#0b1120] font-khmer">
        <Header />
        <div className="flex-1 w-full max-w-5xl mx-auto px-3.5 sm:px-6 pt-3 pb-24">
          <DutyScheduleUserView />
        </div>
      </div>
    );
  }

  const isPaymentRoute =
    location.pathname.startsWith('/admin/payments') ||
    location.pathname.startsWith('/dashboard/payments') ||
    location.pathname === '/payments';

  if (isPaymentRoute && !isAdminUser) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f4f6fb] dark:bg-[#0b1120] font-khmer">
        <Header />
        <div className="flex-1 w-full max-w-5xl mx-auto px-3.5 sm:px-6 pt-3 pb-24">
          <PaymentStudentView />
        </div>
      </div>
    );
  }

  const isResidenceRoute = location.pathname.startsWith('/admin/residences');
  if (isResidenceRoute && !isAdminUser) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f4f6fb] dark:bg-[#0b1120] font-khmer">
        <Header />
        <div className="flex-1">
          <ResidenceInfoPage />
        </div>
      </div>
    );
  }

  if (location.pathname.startsWith('/admin/leave-requests') && !isAdminUser) {
    return <Navigate to="/leave" replace />;
  }

  if (location.pathname.startsWith('/admin/attendance') && !isAdminUser) {
    return <Navigate to="/attendance" replace />;
  }

  if (location.pathname.startsWith('/admin/announcements') && !isAdminUser) {
    return <Navigate to="/announcements" replace />;
  }

  if (!user) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  if (requiredRoles && requiredRoles.length > 0) {
    const userRole = profile?.role || 'student';
    if (!requiredRoles.includes(userRole as UserRole)) {
      return (
        <div className="min-h-screen flex flex-col bg-[#f4f6fb] dark:bg-[#0b1120] font-khmer">
          <Header />
          <div className="max-w-md w-full mx-auto mt-8 px-4">
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-400 flex items-center justify-between gap-3 text-xs sm:text-sm font-bold shadow-sm">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{t('common.unauthorized') || 'អ្នកមិនមានសិទ្ធិធ្វើសកម្មភាពនេះទេ។'}</span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold shrink-0"
              >
                {isKhmer ? 'ត្រឡប់ទៅវិញ' : 'Back'}
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}