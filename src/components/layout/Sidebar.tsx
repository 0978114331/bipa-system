import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, Building2, QrCode, DollarSign,
  CalendarClock, FileText, Package, Megaphone, Settings,
  GraduationCap, ClipboardList,
} from 'lucide-react';
import { UserRole } from '@/types';

interface NavItem {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
  roles: UserRole[];
}

export function Sidebar() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  const adminItems: NavItem[] = [
    { label: t('dashboard.overview'), path: '/admin', icon: LayoutDashboard, roles: ['super_admin', 'residence_admin', 'finance_admin', 'duty_manager'] },
    { label: t('feature.studentInfo'), path: '/admin/students', icon: Users, roles: ['super_admin', 'residence_admin'] },
    { label: t('feature.facilities'), path: '/admin/residences', icon: Building2, roles: ['super_admin', 'residence_admin'] },
    { label: t('feature.qrAttendance'), path: '/admin/attendance', icon: QrCode, roles: ['super_admin', 'residence_admin', 'duty_manager'] },
    { label: t('feature.payments'), path: '/admin/payments', icon: DollarSign, roles: ['super_admin', 'residence_admin', 'finance_admin'] },
    { label: t('feature.duty'), path: '/admin/duties', icon: CalendarClock, roles: ['super_admin', 'residence_admin', 'duty_manager'] },
    { label: t('feature.leave'), path: '/admin/leave-requests', icon: FileText, roles: ['super_admin', 'residence_admin'] },
    { label: t('feature.facilities') + ' (Assets)', path: '/admin/assets', icon: Package, roles: ['super_admin', 'residence_admin'] },
    { label: t('feature.announcements'), path: '/admin/announcements', icon: Megaphone, roles: ['super_admin', 'residence_admin', 'finance_admin', 'duty_manager'] },
    { label: t('settings.title'), path: '/admin/settings', icon: Settings, roles: ['super_admin'] },
  ];

  const studentItems: NavItem[] = [
    { label: t('dashboard.studentDashboard'), path: '/dashboard', icon: LayoutDashboard, roles: ['student'] },
    { label: t('feature.qrAttendance'), path: '/dashboard/scan', icon: QrCode, roles: ['student'] },
    { label: t('qr.history'), path: '/dashboard/attendance', icon: ClipboardList, roles: ['student'] },
    { label: t('feature.payments'), path: '/dashboard/payments', icon: DollarSign, roles: ['student'] },
    { label: t('feature.duty'), path: '/dashboard/duties', icon: CalendarClock, roles: ['student'] },
    { label: t('feature.leave'), path: '/dashboard/leave', icon: FileText, roles: ['student'] },
  ];

  const isAdminRole = profile && ['super_admin', 'residence_admin', 'finance_admin', 'duty_manager'].includes(profile.role);
  const items = isAdminRole ? adminItems : studentItems;
  const visibleItems = items.filter((item) => profile && item.roles.includes(profile.role));

  const isActive = (path: string) => {
    if (path === '/admin' || path === '/dashboard') return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="hidden lg:flex w-64 shrink-0 border-r bg-card flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-navy-gradient">
            <GraduationCap className="h-5 w-5 text-gold" />
          </div>
          <span className="text-sm font-semibold">
            {isAdminRole ? t('dashboard.adminDashboard') : t('dashboard.studentDashboard')}
          </span>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
        {visibleItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left',
              isActive(item.path)
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}