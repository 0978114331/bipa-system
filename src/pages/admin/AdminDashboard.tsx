import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Users,
  QrCode,
  DollarSign,
  FileText,
  CalendarClock,
  Building2,
  Package,
  Megaphone,
  LayoutTemplate,
  Settings,
  Eye,
  Heart,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowRight,
  PieChart,
  Mail,
  Shield,
  UserCircle
} from 'lucide-react';
import { initialStudents, BipaStudent } from './StudentListPage';
import { cn } from '@/lib/utils';

interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

export function AdminDashboard() {
  const { profile } = useAuth();
  const { lang } = useI18n();
  const navigate = useNavigate();
  const isKhmer = lang === 'km';

  const [students, setStudents] = useState<BipaStudent[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [presentToday, setPresentToday] = useState(0);
  const [pendingLeaves, setPendingLeaves] = useState(0);
  const [paidCount, setPaidCount] = useState(0);

  const [majorsData, setMajorsData] = useState<{ name: string; count: number; pct: number }[]>([]);
  const [gensData, setGensData] = useState<{ name: string; count: number; pct: number }[]>([]);
  const [newsStats, setNewsStats] = useState<
    { id: string; title: string; views: number; likes: number }[]
  >([]);

  const [activeMajorIdx, setActiveMajorIdx] = useState<number | null>(null);
  const [activeGenIdx, setActiveGenIdx] = useState<number | null>(null);

  const barColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e', '#06b6d4', '#84cc16'];

  const loadDashboardStats = async () => {
    let list: BipaStudent[] = [];
    const cached =
      localStorage.getItem('bipa_students_directory_v2') ||
      localStorage.getItem('bipa_students_directory');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed;
        }
      } catch {}
    }

    try {
      const { data } = await supabase.from('bipa_students').select('*');
      if (data && data.length > 0) {
        list = data.map((row: any) => ({
          id: String(row.id),
          student_code: row.student_code || '',
          full_name_km: row.full_name_km || row.full_name || '',
          full_name_en: row.full_name_en || row.full_name || '',
          gender_km: row.gender_km || row.gender || 'ប្រុស',
          gender_en: row.gender_en || 'M',
          dob: row.dob || '',
          major_km: row.major_km || row.major || '',
          major_en: row.major_en || row.major || '',
          generation_km: row.generation_km || row.generation || '',
          generation_en: row.generation_en || '',
          graduated_year_km: row.graduated_year_km || row.graduated_year || '',
          graduated_year_en: row.graduated_year_en || '',
          address_km: row.address_km || row.address || '',
          address_en: row.address_en || '',
          ethnicity_km: row.ethnicity_km || row.ethnicity || '',
          ethnicity_en: row.ethnicity_en || '',
          current_job_km: row.current_job_km || row.current_job || '',
          current_job_en: row.current_job_en || '',
          contact_number: row.contact_number || '',
          others_km: row.others_km || '',
          others_en: row.others_en || '',
        }));
      }
    } catch {}

    if (list.length === 0) {
      list = initialStudents;
    }
    setStudents(list);

    const mCounts: Record<string, number> = {};
    const gCounts: Record<string, number> = {};

    list.forEach((s) => {
      const m = s.major_km || 'មិនបញ្ជាក់';
      const g = s.generation_km || 'មិនបញ្ជាក់';
      mCounts[m] = (mCounts[m] || 0) + 1;
      gCounts[g] = (gCounts[g] || 0) + 1;
    });

    const totalSts = list.length || 1;

    const sortedMajors = Object.entries(mCounts)
      .map(([name, count]) => ({ name, count, pct: Math.round((count / totalSts) * 100) }))
      .sort((a, b) => b.count - a.count);

    const sortedGens = Object.entries(gCounts)
      .map(([name, count]) => ({ name, count, pct: Math.round((count / totalSts) * 100) }))
      .sort((a, b) => a.name.localeCompare(b.name));

    setMajorsData(sortedMajors);
    setGensData(sortedGens);

    const todayStr = new Date().toDateString();
    let attCount = 0;
    const savedAtt =
      localStorage.getItem('bipa_attendance_sync_v4') ||
      localStorage.getItem('bipa_attendance_v3');
    if (savedAtt) {
      try {
        const attList: any[] = JSON.parse(savedAtt);
        attCount = attList.filter(
          (r) =>
            (r.date === todayStr || r.attendance_date === todayStr) &&
            (r.status === 'វត្តមាន' || r.status === 'ចេញក្រៅ')
        ).length;
      } catch {}
    }

    try {
      const { data: dbAtt } = await supabase
        .from('bipa_attendance')
        .select('id, status')
        .eq('attendance_date', todayStr);
      if (dbAtt && dbAtt.length > 0) {
        const validAtt = dbAtt.filter(
          (r: any) => !String(r.status || '').includes('[HIDDEN]')
        ).length;
        if (validAtt > 0) attCount = validAtt;
      }
    } catch {}
    setPresentToday(attCount);

    try {
      const { data: leaves } = await supabase
        .from('leave_requests')
        .select('id, status')
        .eq('status', 'pending');
      if (leaves) setPendingLeaves(leaves.length);
    } catch {}

    try {
      const { data: payments } = await supabase
        .from('payments')
        .select('id, status')
        .eq('status', 'paid');
      if (payments) setPaidCount(payments.length);
    } catch {}

    try {
      const { data: profData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (profData) {
        setProfiles(profData);
      }
    } catch {}

    try {
      const { data: nData } = await supabase
        .from('bipa_home_news')
        .select('*')
        .order('views', { ascending: false })
        .limit(5);
      if (nData) {
        setNewsStats(
          nData.map((n: any) => ({
            id: String(n.id),
            title: isKhmer ? n.title_km : n.title_en || n.title_km,
            views: Number(n.views || 0),
            likes: Number(n.likes || 0)
          }))
        );
      }
    } catch {}
  };

  useEffect(() => {
    loadDashboardStats();
    window.addEventListener('students-updated', loadDashboardStats);
    window.addEventListener('attendance-updated', loadDashboardStats);
    window.addEventListener('home-content-updated', loadDashboardStats);
    return () => {
      window.removeEventListener('students-updated', loadDashboardStats);
      window.removeEventListener('attendance-updated', loadDashboardStats);
      window.removeEventListener('home-content-updated', loadDashboardStats);
    };
  }, [isKhmer]);

  const totalStudents = students.length;
  const maleCount = students.filter((s) => s.gender_km === 'ប្រុស' || s.gender_en === 'M').length;
  const femaleCount = students.filter(
    (s) => s.gender_km === 'ស្រី' || s.gender_en === 'F' || s.gender_km.toUpperCase() === 'FEMALE'
  ).length;
  const femalePercent = totalStudents > 0 ? Math.round((femaleCount / totalStudents) * 100) : 0;
  const malePercent = totalStudents > 0 ? 100 - femalePercent : 0;

  const quickModules = [
    {
      labelKm: 'បង្ហោះ Home',
      labelEn: 'Home CMS',
      path: '/admin?page=home-manager',
      icon: LayoutTemplate,
      color: 'text-amber-400 bg-amber-500/15 border-amber-500/30'
    },
    {
      labelKm: 'និស្សិត',
      labelEn: 'Students',
      path: '/admin/students',
      icon: Users,
      color: 'text-blue-400 bg-blue-500/15 border-blue-500/30'
    },
    {
      labelKm: 'វត្តមាន QR',
      labelEn: 'Attendance',
      path: '/admin/attendance',
      icon: QrCode,
      color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
    },
    {
      labelKm: 'បង់ប្រាក់',
      labelEn: 'Payments',
      path: '/admin/payments',
      icon: DollarSign,
      color: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30'
    },
    {
      labelKm: 'វេនកិច្ចការ',
      labelEn: 'Duties',
      path: '/admin/duties',
      icon: CalendarClock,
      color: 'text-purple-400 bg-purple-500/15 border-purple-500/30'
    },
    {
      labelKm: 'សំណើច្បាប់',
      labelEn: 'Leaves',
      path: '/admin/leave-requests',
      icon: FileText,
      color: 'text-rose-400 bg-rose-500/15 border-rose-500/30'
    },
    {
      labelKm: 'មណ្ឌល',
      labelEn: 'Residences',
      path: '/admin/residences',
      icon: Building2,
      color: 'text-indigo-400 bg-indigo-500/15 border-indigo-500/30'
    },
    {
      labelKm: 'សម្ភារៈ',
      labelEn: 'Assets',
      path: '/admin/assets',
      icon: Package,
      color: 'text-orange-400 bg-orange-500/15 border-orange-500/30'
    }
  ];

  const maxNewsEngagement = Math.max(
    ...newsStats.map((n) => Math.max(n.views, n.likes, 1)),
    10
  );

  const renderDonutChart = () => {
    let cumulativePercent = 0;
    return (
      <svg
        viewBox="0 0 36 36"
        className="w-36 h-36 sm:w-44 sm:h-44 drop-shadow-xl transform transition-transform duration-500 hover:scale-105"
      >
        {majorsData.map((slice, i) => {
          const dashArray = `${slice.pct} 100`;
          const dashOffset = 25 - cumulativePercent;
          cumulativePercent += slice.pct;
          const isActive = activeMajorIdx === i;

          return (
            <circle
              key={i}
              cx="18"
              cy="18"
              r="15.91549430918954"
              fill="transparent"
              stroke={barColors[i % barColors.length]}
              strokeWidth={isActive ? '5' : '3.5'}
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              className={cn(
                'cursor-pointer transition-all duration-300 outline-none',
                isActive ? 'opacity-100' : 'opacity-80 hover:opacity-100'
              )}
              onMouseEnter={() => setActiveMajorIdx(i)}
              onMouseLeave={() => setActiveMajorIdx(null)}
              onClick={() => setActiveMajorIdx(isActive ? null : i)}
            />
          );
        })}
        <text
          x="18"
          y="17"
          className="text-[5px] font-bold fill-white"
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          {activeMajorIdx !== null && majorsData[activeMajorIdx]
            ? majorsData[activeMajorIdx].pct + '%'
            : totalStudents}
        </text>
        <text
          x="18"
          y="21"
          className="text-[3px] font-medium fill-slate-400"
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          {activeMajorIdx !== null ? 'ភាគរយ' : 'សិស្សសរុប'}
        </text>
      </svg>
    );
  };

  const renderLineChart = () => {
    if (gensData.length === 0) return null;
    const maxCount = Math.max(...gensData.map((d) => d.count), 1);

    const points = gensData
      .map((d, i) => {
        const x = (i / (gensData.length - 1 || 1)) * 100;
        const y = 100 - (d.count / maxCount) * 80;
        return `${x},${y}`;
      })
      .join(' ');

    const areaPoints = `0,100 ${points} 100,100`;

    return (
      <div className="relative w-full h-36 sm:h-40 pt-4 px-2">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="gradientLine" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polyline points={areaPoints} fill="url(#gradientLine)" />
          <polyline
            points={points}
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {gensData.map((d, i) => {
            const x = (i / (gensData.length - 1 || 1)) * 100;
            const y = 100 - (d.count / maxCount) * 80;
            const isActive = activeGenIdx === i;
            return (
              <g
                key={i}
                className="cursor-pointer"
                onMouseEnter={() => setActiveGenIdx(i)}
                onMouseLeave={() => setActiveGenIdx(null)}
                onClick={() => setActiveGenIdx(isActive ? null : i)}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={isActive ? '4' : '2.5'}
                  fill="#0f172a"
                  stroke="#10b981"
                  strokeWidth="1.5"
                  className="transition-all duration-300"
                />
                {isActive && (
                  <text
                    x={x}
                    y={y - 8}
                    className="text-[6px] font-bold fill-white"
                    textAnchor="middle"
                  >
                    {d.count} នាក់
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-100 p-3.5 sm:p-6 pb-24 space-y-5 font-khmer">
      <div className="bg-[#162033] border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <Badge className="bg-[#eab308] hover:bg-[#eab308] text-slate-950 font-extrabold text-[10px] sm:text-xs px-2.5 py-0.5 rounded-md uppercase">
              {profile?.role ? profile.role.replace(/_/g, ' ') : 'SUPER ADMIN'}
            </Badge>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
              {isKhmer ? 'ទិដ្ឋភាពទូទៅ (Overview)' : 'Admin Overview'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              {isKhmer
                ? 'ប្រព័ន្ធគ្រប់គ្រងមណ្ឌលសិស្សនិស្សិត (BIPA)'
                : 'BIPA Student Residence Management System'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full lg:w-auto">
            <Button
              onClick={() => navigate('/admin/attendance')}
              className="bg-[#eab308] hover:bg-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm h-11 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 w-full"
            >
              <QrCode className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {isKhmer ? 'គ្រប់គ្រងវត្តមាន & QR' : 'Attendance & QR'}
              </span>
            </Button>

            <Button
              onClick={() => navigate('/admin?page=home-manager')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm h-11 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 w-full"
            >
              <LayoutTemplate className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {isKhmer ? 'គ្រប់គ្រងទំព័រដើម (Home)' : 'Manage Home'}
              </span>
            </Button>

            <Button
              onClick={() => navigate('/admin/announcements')}
              variant="outline"
              className="bg-[#0f172a] hover:bg-slate-800 border-slate-700 text-white font-bold text-xs sm:text-sm h-11 px-4 rounded-xl flex items-center justify-center gap-2 w-full"
            >
              <Megaphone className="h-4 w-4 text-amber-400 shrink-0" />
              <span className="truncate">
                {isKhmer ? 'បង្កើតសេចក្តីប្រកាស' : 'Announcements'}
              </span>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 sm:gap-3">
        {quickModules.map((mod, i) => {
          const IconComp = mod.icon;
          return (
            <button
              key={i}
              type="button"
              onClick={() => navigate(mod.path)}
              className="bg-[#162033] hover:bg-[#1e2b44] border border-slate-800/90 rounded-2xl p-2.5 sm:p-3 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
            >
              <div
                className={cn(
                  'w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center',
                  mod.color
                )}
              >
                <IconComp className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <span className="text-[10px] sm:text-xs font-bold text-slate-200 line-clamp-1">
                {isKhmer ? mod.labelKm : mod.labelEn}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <Card
          onClick={() => navigate('/admin/students')}
          className="bg-[#162033] border-slate-800 hover:border-slate-700 rounded-2xl cursor-pointer transition-all shadow-sm"
        >
          <CardContent className="p-4 flex items-center justify-between gap-2">
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-bold text-slate-400 truncate">
                {isKhmer ? 'និស្សិតសរុប' : 'Total Students'}
              </p>
              <p className="text-2xl sm:text-3xl font-black text-white">{totalStudents}</p>
              <p className="text-[11px] font-bold truncate">
                <span className="text-blue-400">
                  {isKhmer ? `ប្រុស ${maleCount}` : `M ${maleCount}`}
                </span>
                <span className="text-slate-500 mx-1">•</span>
                <span className="text-pink-400">
                  {isKhmer ? `ស្រី ${femaleCount}` : `F ${femaleCount}`}
                </span>
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => navigate('/admin/attendance')}
          className="bg-[#162033] border-slate-800 hover:border-slate-700 rounded-2xl cursor-pointer transition-all shadow-sm"
        >
          <CardContent className="p-4 flex items-center justify-between gap-2">
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-bold text-slate-400 truncate">
                {isKhmer ? 'វត្តមានថ្ងៃនេះ' : 'Attendance Today'}
              </p>
              <p className="text-2xl sm:text-3xl font-black text-white">{presentToday}</p>
              <p className="text-[11px] font-bold text-emerald-400 truncate flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {isKhmer ? `ក្នុងចំណោម ${totalStudents} នាក់` : `Of ${totalStudents} students`}
                </span>
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <QrCode className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => navigate('/admin/students')}
          className="bg-[#162033] border-slate-800 hover:border-slate-700 rounded-2xl cursor-pointer transition-all shadow-sm"
        >
          <CardContent className="p-4 flex items-center justify-between gap-2">
            <div className="space-y-1 min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-400 truncate">
                {isKhmer ? 'អត្រាភេទ' : 'Gender Ratio'}
              </p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-2xl sm:text-3xl font-black text-white">{femalePercent}%</p>
                <span className="text-[10px] font-bold text-pink-400 truncate">
                  {isKhmer ? 'ស្រី' : 'Female'}
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden flex mt-1">
                <div className="bg-blue-500 h-full" style={{ width: `${malePercent}%` }} />
                <div className="bg-pink-500 h-full" style={{ width: `${femalePercent}%` }} />
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400 shrink-0">
              <PieChart className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => navigate('/admin/leave-requests')}
          className="bg-[#162033] border-slate-800 hover:border-slate-700 rounded-2xl cursor-pointer transition-all shadow-sm"
        >
          <CardContent className="p-4 flex items-center justify-between gap-2">
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-bold text-slate-400 truncate">
                {isKhmer ? 'សំណើច្បាប់រង់ចាំ' : 'Pending Leaves'}
              </p>
              <p className="text-2xl sm:text-3xl font-black text-white">{pendingLeaves}</p>
              <p className="text-[11px] font-bold text-amber-400 truncate flex items-center gap-1">
                <Clock className="h-3 w-3 shrink-0" />
                <span>{isKhmer ? 'រង់ចាំអនុម័ត' : 'Awaiting Action'}</span>
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <FileText className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => navigate('/admin/payments')}
          className="bg-[#162033] border-slate-800 hover:border-slate-700 rounded-2xl cursor-pointer transition-all shadow-sm"
        >
          <CardContent className="p-4 flex items-center justify-between gap-2">
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-bold text-slate-400 truncate">
                {isKhmer ? 'ការបង់ប្រាក់ខែនេះ' : 'Monthly Payments'}
              </p>
              <p className="text-2xl sm:text-3xl font-black text-white">{paidCount}</p>
              <p className="text-[11px] font-bold text-cyan-400 truncate">
                {isKhmer ? 'បានបង់រួចរាល់' : 'Paid Students'}
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#162033] border-slate-800 rounded-2xl shadow-sm">
          <CardContent className="p-4 flex items-center justify-between gap-2">
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-bold text-slate-400 truncate">
                {isKhmer ? 'អ្នកប្រើប្រាស់' : 'System Users'}
              </p>
              <p className="text-2xl sm:text-3xl font-black text-white">
                {profiles.length || 1}
              </p>
              <p className="text-[11px] font-bold text-purple-400 truncate">
                {isKhmer ? 'គណនីក្នុងប្រព័ន្ធ' : 'Registered'}
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <UserCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="bg-[#162033] border-slate-800 rounded-2xl shadow-md flex flex-col">
          <CardHeader className="pb-3 border-b border-slate-800/80">
            <CardTitle className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <PieChart className="h-5 w-5 text-blue-400 shrink-0" />
              <span>{isKhmer ? 'ស្ថិតិសិស្សតាមជំនាញ' : 'Students by Major'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 flex-1 flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-6">
            <div className="shrink-0">
              {majorsData.length > 0 ? (
                renderDonutChart()
              ) : (
                <div className="text-slate-500 text-xs">គ្មានទិន្នន័យ</div>
              )}
            </div>

            <div className="w-full max-h-[190px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 space-y-2 pr-1">
              {majorsData.map((item, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'flex items-center justify-between p-2 rounded-xl transition-colors cursor-pointer',
                    activeMajorIdx === idx ? 'bg-slate-800' : 'hover:bg-slate-800/50'
                  )}
                  onMouseEnter={() => setActiveMajorIdx(idx)}
                  onMouseLeave={() => setActiveMajorIdx(null)}
                  onClick={() => setActiveMajorIdx(activeMajorIdx === idx ? null : idx)}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full shadow-sm shrink-0"
                      style={{ backgroundColor: barColors[idx % barColors.length] }}
                    />
                    <span className="text-xs font-semibold text-slate-200 truncate">
                      {item.name}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-300 bg-[#0b1120] px-2.5 py-1 rounded-lg border border-slate-800 shrink-0 ml-2">
                    {item.count} នាក់
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#162033] border-slate-800 rounded-2xl shadow-md flex flex-col">
          <CardHeader className="pb-3 border-b border-slate-800/80">
            <CardTitle className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-400 shrink-0" />
              <span>{isKhmer ? 'ស្ថិតិសិស្សតាមជំនាន់' : 'Students by Generation'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex-1 flex flex-col justify-between h-full">
            <div className="w-full h-full min-h-[150px] pb-2">
              {gensData.length > 0 ? (
                renderLineChart()
              ) : (
                <div className="text-center text-slate-500 pt-10 text-xs">គ្មានទិន្នន័យ</div>
              )}
            </div>

            <div className="w-full max-h-[95px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 flex flex-wrap gap-2 pt-3 border-t border-slate-800/80">
              {gensData.map((item, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold cursor-pointer transition-all',
                    activeGenIdx === idx
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                      : 'bg-[#0b1120] border-slate-800 text-slate-300 hover:border-slate-600'
                  )}
                  onMouseEnter={() => setActiveGenIdx(idx)}
                  onMouseLeave={() => setActiveGenIdx(null)}
                  onClick={() => setActiveGenIdx(activeGenIdx === idx ? null : idx)}
                >
                  <span>{item.name}</span>
                  <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-white">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card className="bg-[#162033] border-slate-800 rounded-2xl shadow-md lg:col-span-7">
          <CardHeader className="pb-3 border-b border-slate-800 flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400 shrink-0" />
                <span>
                  {isKhmer
                    ? 'ស្ថិតិអ្នកមើល និងចុចបេះដូងព័ត៌មានទំព័រដើម'
                    : 'Home News Engagement'}
                </span>
              </CardTitle>
            </div>
            <Button
              size="sm"
              onClick={() => navigate('/admin?page=home-manager')}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-8 px-3 rounded-lg shrink-0"
            >
              {isKhmer ? 'កែប្រែ Home' : 'Edit Home'}
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-3.5">
            {newsStats.length > 0 ? (
              newsStats.map((item, idx) => {
                const vPct = Math.round((item.views / maxNewsEngagement) * 100);
                const lPct = Math.round((item.likes / maxNewsEngagement) * 100);
                return (
                  <div key={item.id || idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold gap-2">
                      <span className="text-slate-200 truncate">{item.title}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-cyan-400 flex items-center gap-1">
                          <Eye className="h-3 w-3" /> {item.views}
                        </span>
                        <span className="text-rose-400 flex items-center gap-1">
                          <Heart className="h-3 w-3 fill-rose-500" /> {item.likes}
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2.5 bg-[#0b1120] rounded-full overflow-hidden flex gap-0.5 p-0.5 border border-slate-800">
                      <div
                        className="bg-cyan-400 h-full rounded-full"
                        style={{ width: `${Math.max(vPct, 4)}%` }}
                      />
                      <div
                        className="bg-rose-500 h-full rounded-full"
                        style={{ width: `${Math.max(lPct, 3)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-xs text-slate-400 py-8">
                {isKhmer ? 'មិនទាន់មានទិន្នន័យព័ត៌មាននៅឡើយទេ' : 'No news analytics available'}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#162033] border-slate-800 rounded-2xl shadow-md lg:col-span-5">
          <CardHeader className="pb-3 border-b border-slate-800">
            <CardTitle className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400 shrink-0" />
              <span>{isKhmer ? 'ការគ្រប់គ្រងរហ័សសម្រាប់ Admin' : 'Quick Admin Controls'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-2.5">
            <button
              onClick={() => navigate('/admin?page=home-manager')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-[#0f172a] hover:bg-slate-800/80 border border-slate-800 transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
                  <LayoutTemplate className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-white truncate">
                    {isKhmer ? 'បង្ហោះព័ត៌មាន & រូបភាព Banner' : 'Manage Home News & Banners'}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {isKhmer ? 'កែប្រែទំព័រដើម Logo និងឈ្មោះប្រព័ន្ធ' : 'Update Home CMS & Branding'}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
            </button>

            <button
              onClick={() => navigate('/admin/students')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-[#0f172a] hover:bg-slate-800/80 border border-slate-800 transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-white truncate">
                    {isKhmer ? 'គ្រប់គ្រងបញ្ជីឈ្មោះនិស្សិត' : 'Manage Student Directory'}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {isKhmer ? 'បន្ថែម កែប្រែ និងពិនិត្យព័ត៌មាននិស្សិត' : 'Add, edit and view students'}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
            </button>

            <button
              onClick={() => navigate('/admin/leave-requests')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-[#0f172a] hover:bg-slate-800/80 border border-slate-800 transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-white truncate">
                    {isKhmer ? 'ពិនិត្យ និងអនុម័តសំណើច្បាប់' : 'Approve Leave Requests'}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {isKhmer
                      ? `មានសំណើរង់ចាំចំនួន ${pendingLeaves}`
                      : `${pendingLeaves} pending requests`}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
            </button>

            <button
              onClick={() => navigate('/admin/settings')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-[#0f172a] hover:bg-slate-800/80 border border-slate-800 transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
                  <Settings className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-white truncate">
                    {isKhmer ? 'ការកំណត់ប្រព័ន្ធ (System Settings)' : 'System Settings'}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {isKhmer ? 'កំណត់សិទ្ធិ និងប្រព័ន្ធទូទៅ' : 'Configure roles & preferences'}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
            </button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#162033] border-slate-800 shadow-md rounded-2xl overflow-hidden">
        <CardHeader className="pb-4 border-b border-slate-800">
          <CardTitle className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-500 shrink-0" />
            <span>
              {isKhmer
                ? 'បញ្ជីអ្នកប្រើប្រាស់ក្នុងប្រព័ន្ធ (System Users)'
                : 'System Users Directory'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full max-h-[360px] overflow-x-auto overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
            <table className="w-full text-sm text-left min-w-[540px]">
              <thead className="bg-[#0f172a]/90 text-slate-400 text-xs uppercase font-semibold sticky top-0 z-10">
                <tr>
                  <th className="px-4 sm:px-6 py-3.5 sm:py-4">ឈ្មោះគណនី (Name)</th>
                  <th className="px-4 sm:px-6 py-3.5 sm:py-4">អ៊ីមែល (Email)</th>
                  <th className="px-4 sm:px-6 py-3.5 sm:py-4">សិទ្ធិ (Role)</th>
                  <th className="px-4 sm:px-6 py-3.5 sm:py-4 text-right">កាលបរិច្ឆេទបង្កើត</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {profiles.length > 0 ? (
                  profiles.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 sm:px-6 py-3 font-bold text-white flex items-center gap-3">
                        <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border border-slate-600 bg-slate-900 shadow-sm shrink-0">
                          <AvatarImage src={user.avatar_url ? user.avatar_url : undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs">
                            {user.display_name?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate max-w-[130px] sm:max-w-[200px]">
                          {user.display_name || 'គ្មានឈ្មោះ'}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 text-slate-300">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span className="truncate max-w-[150px] sm:max-w-[250px]">
                            {user.email || 'គ្មានអ៊ីមែល'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3">
                        <Badge
                          className={cn(
                            'font-bold uppercase text-[10px] whitespace-nowrap',
                            user.role?.includes('admin')
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          )}
                        >
                          {user.role?.replace(/_/g, ' ') || 'STUDENT'}
                        </Badge>
                      </td>
                      <td className="px-4 sm:px-6 py-3 text-slate-400 text-right text-xs whitespace-nowrap">
                        {user.created_at
                          ? new Date(user.created_at).toLocaleDateString('en-GB')
                          : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                      មិនទាន់មានទិន្នន័យអ្នកប្រើប្រាស់ក្នុងប្រព័ន្ធទេ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}