import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { supabase } from '@/lib/supabase';
import { Student, AttendanceRecord, MonthlyPayment, DutySchedule, LeaveRequest, Announcement } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { QrCode, DollarSign, CalendarClock, FileText, Building2, Megaphone, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StudentDashboard() {
  const { user, profile } = useAuth();
  const { t, isKhmer } = useI18n();
  const navigate = useNavigate();

  const [student, setStudent] = useState<Student | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [payments, setPayments] = useState<MonthlyPayment[]>([]);
  const [duties, setDuties] = useState<DutySchedule[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchStudentData = async () => {
      setLoading(true);
      const { data: studentData } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      const { data: noticeData } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(3);

      setAnnouncements((noticeData as Announcement[]) || []);

      if (studentData) {
        const s = studentData as Student;
        setStudent(s);

        const [attRes, payRes, dutyRes, leaveRes] = await Promise.all([
          supabase.from('attendance_records').select('*').eq('student_id', s.id).order('recorded_at', { ascending: false }).limit(5),
          supabase.from('monthly_payments').select('*').eq('student_id', s.id).order('year', { ascending: false }).order('month', { ascending: false }).limit(3),
          supabase.from('duty_schedules').select('*').eq('student_id', s.id).order('scheduled_date', { ascending: true }).limit(5),
          supabase.from('leave_requests').select('*').eq('student_id', s.id).order('created_at', { ascending: false }).limit(5),
        ]);

        setAttendance((attRes.data as AttendanceRecord[]) || []);
        setPayments((payRes.data as MonthlyPayment[]) || []);
        setDuties((dutyRes.data as DutySchedule[]) || []);
        setLeaves((leaveRes.data as LeaveRequest[]) || []);
      }
      setLoading(false);
    };

    fetchStudentData();
  }, [user]);

  if (loading) {
    return <div className="p-6 text-muted-foreground">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-navy-gradient text-white p-6 rounded-xl shadow">
        <div>
          <Badge className="bg-gold/20 text-gold border-gold/30 mb-2">{t('role.student')}</Badge>
          <h1 className={cn('text-2xl font-bold', isKhmer && 'font-khmer')}>
            {t('dashboard.welcome')}, {student?.khmer_name || profile?.display_name}
          </h1>
          <p className="text-sm text-white/70 mt-1">
            {student ? `${t('student.id')}: ${student.student_id} | ${t('common.bed')}: ${student.bed_number || '-'}` : 'Account not linked to a student record yet'}
          </p>
        </div>
        <Button onClick={() => navigate('/dashboard/scan')} className="bg-gold-gradient text-navy font-semibold shrink-0">
          <QrCode className="h-4 w-4 mr-2" />
          {t('dashboard.scanQR')}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t('common.residence')}</div>
              <div className="text-lg font-bold capitalize">{student?.residence_type || '-'}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-lg bg-green-500/10 text-green-600 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t('dashboard.recentAttendance')}</div>
              <div className="text-lg font-bold">{attendance.length}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t('dashboard.paymentStatus')}</div>
              <div className="text-lg font-bold capitalize">{payments[0]?.status || t('common.noData')}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t('dashboard.upcomingDuties')}</div>
              <div className="text-lg font-bold">{duties.filter(d => d.status === 'pending').length}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-navy" />
              {t('dashboard.upcomingDuties')}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/duties')}>{t('common.view')}</Button>
          </CardHeader>
          <CardContent>
            {duties.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">{t('common.noData')}</p>
            ) : (
              <div className="space-y-3">
                {duties.map((duty) => (
                  <div key={duty.id} className="flex items-center justify-between p-3 rounded-lg border text-sm">
                    <div>
                      <div className="font-medium">{duty.scheduled_date}</div>
                      <div className="text-xs text-muted-foreground">{duty.location || 'Residence'}</div>
                    </div>
                    <Badge variant={duty.status === 'completed' ? 'default' : 'secondary'}>{duty.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-navy" />
              {t('dashboard.leaveStatus')}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/leave')}>{t('common.view')}</Button>
          </CardHeader>
          <CardContent>
            {leaves.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">{t('common.noData')}</p>
            ) : (
              <div className="space-y-3">
                {leaves.map((leave) => (
                  <div key={leave.id} className="flex items-center justify-between p-3 rounded-lg border text-sm">
                    <div>
                      <div className="font-medium truncate max-w-[200px]">{leave.reason}</div>
                      <div className="text-xs text-muted-foreground">{new Date(leave.departure_date).toLocaleDateString()}</div>
                    </div>
                    <Badge variant={leave.status === 'approved' ? 'default' : leave.status === 'rejected' ? 'destructive' : 'secondary'}>
                      {leave.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-navy" />
            {t('dashboard.recentAnnouncements')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">{t('announcement.noAnnouncements')}</p>
          ) : (
            <div className="space-y-3">
              {announcements.map((item) => (
                <div key={item.id} className="p-3 rounded-lg border">
                  <div className="font-medium text-sm">{isKhmer && item.title_km ? item.title_km : item.title}</div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {isKhmer && item.content_km ? item.content_km : item.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}