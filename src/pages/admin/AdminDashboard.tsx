import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { supabase } from '@/lib/supabase';
import { Student, LeaveRequest } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Building2, QrCode, DollarSign, FileText, Package, Megaphone, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AdminDashboard() {
  const { profile } = useAuth();
  const { t, isKhmer } = useI18n();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalStudents: 0,
    boysCount: 0,
    girlsCount: 0,
    availableBeds: 0,
    pendingLeaves: 0,
    unpaidPayments: 0,
    damagedAssets: 0,
  });
  const [recentStudents, setRecentStudents] = useState<Student[]>([]);
  const [pendingLeaveList, setPendingLeaveList] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminStats = async () => {
      setLoading(true);
      const [studentsRes, bedsRes, leavesRes, paymentsRes, assetsRes] = await Promise.all([
        supabase.from('students').select('*').order('created_at', { ascending: false }),
        supabase.from('beds').select('id, status').eq('status', 'available'),
        supabase.from('leave_requests').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
        supabase.from('monthly_payments').select('id, status').in('status', ['unpaid', 'overdue']),
        supabase.from('assets').select('id, condition').eq('condition', 'damaged'),
      ]);

      const allStudents = (studentsRes.data as Student[]) || [];
      setRecentStudents(allStudents.slice(0, 5));
      setPendingLeaveList(((leavesRes.data as LeaveRequest[]) || []).slice(0, 5));

      setStats({
        totalStudents: allStudents.length,
        boysCount: allStudents.filter(s => s.residence_type === 'boys').length,
        girlsCount: allStudents.filter(s => s.residence_type === 'girls').length,
        availableBeds: bedsRes.data?.length || 0,
        pendingLeaves: leavesRes.data?.length || 0,
        unpaidPayments: paymentsRes.data?.length || 0,
        damagedAssets: assetsRes.data?.length || 0,
      });
      setLoading(false);
    };

    fetchAdminStats();
  }, []);

  if (loading) {
    return <div className="p-6 text-muted-foreground">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-navy-gradient text-white p-6 rounded-xl shadow">
        <div>
          <Badge className="bg-gold text-navy font-bold mb-2 uppercase">{profile?.role.replace('_', ' ')}</Badge>
          <h1 className={cn('text-2xl font-bold', isKhmer && 'font-khmer')}>
            {t('dashboard.adminDashboard')}
          </h1>
          <p className="text-sm text-white/70 mt-1">
            {t('system.nameFull')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => navigate('/admin/attendance')} className="bg-gold-gradient text-navy font-semibold">
            <QrCode className="h-4 w-4 mr-2" />
            {t('qr.generateCode')}
          </Button>
          <Button variant="outline" onClick={() => navigate('/admin/announcements')} className="border-white/30 text-white hover:bg-white/10">
            <Megaphone className="h-4 w-4 mr-2" />
            {t('announcement.create')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:border-primary" onClick={() => navigate('/admin/students')}>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">{t('dashboard.totalStudents')}</div>
              <div className="text-2xl font-bold mt-1">{stats.totalStudents}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {t('common.male')}: {stats.boysCount} | {t('common.female')}: {stats.girlsCount}
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary" onClick={() => navigate('/admin/residences')}>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">{t('dashboard.availableBeds')}</div>
              <div className="text-2xl font-bold mt-1">{stats.availableBeds}</div>
              <div className="text-xs text-muted-foreground mt-1">{t('feature.facilities')}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center">
              <Building2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary" onClick={() => navigate('/admin/leave-requests')}>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">{t('dashboard.pendingLeaves')}</div>
              <div className="text-2xl font-bold mt-1">{stats.pendingLeaves}</div>
              <div className="text-xs text-amber-600 mt-1">{t('common.pending')}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <FileText className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary" onClick={() => navigate('/admin/payments')}>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">{t('dashboard.paymentSummary')}</div>
              <div className="text-2xl font-bold mt-1">{stats.unpaidPayments}</div>
              <div className="text-xs text-destructive mt-1">{t('common.unpaid')} / {t('common.overdue')}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <DollarSign className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-navy" />
              {t('feature.studentInfo')}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/students')}>{t('common.view')}</Button>
          </CardHeader>
          <CardContent>
            {recentStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">{t('common.noData')}</p>
            ) : (
              <div className="space-y-3">
                {recentStudents.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border text-sm">
                    <div>
                      <div className="font-medium">{s.khmer_name || s.english_name}</div>
                      <div className="text-xs text-muted-foreground">ID: {s.student_id} | {s.major || '-'}</div>
                    </div>
                    <Badge variant={s.status === 'active' ? 'default' : 'secondary'}>{s.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-navy" />
              {t('dashboard.pendingLeaves')} ({stats.pendingLeaves}) & {t('dashboard.damagedAssets')} ({stats.damagedAssets})
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/leave-requests')}>{t('common.view')}</Button>
          </CardHeader>
          <CardContent>
            {pendingLeaveList.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">{t('common.noData')}</p>
            ) : (
              <div className="space-y-3">
                {pendingLeaveList.map((leave) => (
                  <div key={leave.id} className="flex items-center justify-between p-3 rounded-lg border text-sm">
                    <div>
                      <div className="font-medium">{leave.reason}</div>
                      <div className="text-xs text-muted-foreground">{new Date(leave.departure_date).toLocaleDateString()}</div>
                    </div>
                    <Badge variant="secondary">{leave.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}