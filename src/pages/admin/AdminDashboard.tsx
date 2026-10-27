import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Building2, QrCode, Megaphone, BarChart3, PieChart, Mail, Shield, UserCircle, TrendingUp } from 'lucide-react';
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
  const navigate = useNavigate();
  const [students, setStudents] = useState<BipaStudent[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [presentToday, setPresentToday] = useState(0);
  

  const [majorsData, setMajorsData] = useState<{ name: string; count: number; pct: number }[]>([]);
  const [gensData, setGensData] = useState<{ name: string; count: number; pct: number }[]>([]);

  const [activeMajorIdx, setActiveMajorIdx] = useState<number | null>(null);
  const [activeGenIdx, setActiveGenIdx] = useState<number | null>(null);

  const barColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e', '#06b6d4', '#84cc16'];

  const loadDashboardStats = async () => {
    let list: BipaStudent[] = [];
    const cached = localStorage.getItem('bipa_students_directory_v2') || localStorage.getItem('bipa_students_directory');
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
    
    list.forEach(s => {
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

    const savedAtt = localStorage.getItem('bipa_attendance_v3');
    if (savedAtt) {
      try {
        const attList: any[] = JSON.parse(savedAtt);
        const todayStr = new Date().toDateString();
        const count = attList.filter((r) => r.date === todayStr && (r.status === 'វត្តមាន' || r.status === 'ចេញក្រៅ')).length;
        setPresentToday(count);
      } catch {}
    }

    try {
      const { data: profData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (profData) {
        setProfiles(profData);
      }
    } catch {}
  };

  useEffect(() => {
    loadDashboardStats();
    window.addEventListener('students-updated', loadDashboardStats);
    window.addEventListener('attendance-updated', loadDashboardStats);
    return () => {
      window.removeEventListener('students-updated', loadDashboardStats);
      window.removeEventListener('attendance-updated', loadDashboardStats);
    };
  }, []);

  const totalStudents = students.length;
  const maleCount = students.filter((s) => s.gender_km === 'ប្រុស' || s.gender_en === 'M').length;
  const femaleCount = students.filter((s) => s.gender_km === 'ស្រី' || s.gender_en === 'F' || s.gender_km.toUpperCase() === 'FEMALE').length;
  const femalePercent = totalStudents > 0 ? Math.round((femaleCount / totalStudents) * 100) : 0;
  const malePercent = totalStudents > 0 ? 100 - femalePercent : 0;

  const renderDonutChart = () => {
    let cumulativePercent = 0;
    return (
      <svg viewBox="0 0 36 36" className="w-40 h-40 sm:w-48 sm:h-48 drop-shadow-xl transform transition-transform duration-500 hover:scale-105">
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
              strokeWidth={isActive ? "5" : "3.5"}
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              className={cn("cursor-pointer transition-all duration-300 outline-none", isActive ? "opacity-100" : "opacity-80 hover:opacity-100")}
              onMouseEnter={() => setActiveMajorIdx(i)}
              onMouseLeave={() => setActiveMajorIdx(null)}
            />
          );
        })}
        <text x="18" y="17" className="text-[5px] font-bold fill-white" textAnchor="middle" alignmentBaseline="middle">
          {activeMajorIdx !== null ? majorsData[activeMajorIdx].pct + '%' : totalStudents}
        </text>
        <text x="18" y="21" className="text-[3px] font-medium fill-slate-400" textAnchor="middle" alignmentBaseline="middle">
          {activeMajorIdx !== null ? 'ភាគរយ' : 'សិស្សសរុប'}
        </text>
      </svg>
    );
  };

  const renderLineChart = () => {
    if (gensData.length === 0) return null;
    const maxCount = Math.max(...gensData.map((d) => d.count), 1);
    
    const points = gensData.map((d, i) => {
      const x = (i / (gensData.length - 1 || 1)) * 100;
      const y = 100 - (d.count / maxCount) * 80; 
      return `${x},${y}`;
    }).join(' ');

    const areaPoints = `0,100 ${points} 100,100`;

    return (
      <div className="relative w-full h-40 pt-4">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="gradientLine" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polyline points={areaPoints} fill="url(#gradientLine)" />
          <polyline points={points} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          
          {gensData.map((d, i) => {
            const x = (i / (gensData.length - 1 || 1)) * 100;
            const y = 100 - (d.count / maxCount) * 80;
            const isActive = activeGenIdx === i;
            return (
              <g key={i} className="cursor-pointer" onMouseEnter={() => setActiveGenIdx(i)} onMouseLeave={() => setActiveGenIdx(null)}>
                <circle cx={x} cy={y} r={isActive ? "4" : "2.5"} fill="#0f172a" stroke="#10b981" strokeWidth="1.5" className="transition-all duration-300" />
                {isActive && (
                  <text x={x} y={y - 8} className="text-[6px] font-bold fill-white" textAnchor="middle">
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
    <div className="p-4 sm:p-6 font-khmer space-y-6">
      <div className="bg-[#1e293b] border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <Badge className="bg-[#eab308] text-[#0f172a] font-bold px-3 py-1 hover:bg-[#eab308] mb-3 inline-flex">
            SUPER ADMIN
          </Badge>
          <h1 className="text-2xl font-bold text-white tracking-wide">ទិដ្ឋភាពទូទៅ (Overview)</h1>
          <p className="text-sm text-slate-400 mt-1">ប្រព័ន្ធគ្រប់គ្រងមណ្ឌលសិស្សនិស្សិត (BIPA)</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => navigate('/admin/attendance')}
            className="bg-[#eab308] hover:bg-yellow-500 text-[#0f172a] font-bold shadow-md h-11 px-5 rounded-xl"
          >
            <QrCode className="h-4 w-4 mr-2" /> គ្រប់គ្រងវត្តមាន & QR
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="bg-[#0f172a] border-blue-500/40 text-blue-400 hover:bg-slate-800 shadow-md h-11 px-5 rounded-xl font-bold"
          >
            គ្រប់គ្រងទំព័រដើម (Home)
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/admin/announcements')}
            className="bg-[#0f172a] border-slate-700 text-white hover:bg-slate-800 shadow-md h-11 px-5 rounded-xl"
          >
            <Megaphone className="h-4 w-4 mr-2" /> បង្កើតសេចក្តីប្រកាស
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="bg-[#1e293b] border-slate-800 shadow-md">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">និស្សិតសរុប</p>
              <p className="text-3xl font-extrabold text-white my-1">{totalStudents}</p>
              <p className="text-xs text-slate-400 mt-2 font-medium">
                <span className="text-blue-400">ប្រុស {maleCount}</span> • <span className="text-pink-400">ស្រី {femaleCount}</span>
              </p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
              <Users className="h-7 w-7" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1e293b] border-slate-800 shadow-md">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">វត្តមានថ្ងៃនេះ</p>
              <p className="text-3xl font-extrabold text-white my-1">{presentToday}</p>
              <p className="text-xs text-emerald-400 mt-2 font-medium">
                បានស្កែនក្នុងចំណោម {totalStudents} នាក់
              </p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <Building2 className="h-7 w-7" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1e293b] border-slate-800 shadow-md">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">អត្រាភេទ</p>
              <div className="flex items-end gap-2 my-1">
                <p className="text-3xl font-extrabold text-white">{femalePercent}%</p>
                <p className="text-sm font-bold text-pink-400 mb-1">ជានិស្សិតស្រី</p>
              </div>
              <div className="w-full bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden flex">
                <div className="bg-blue-500 h-full" style={{ width: `${malePercent}%` }}></div>
                <div className="bg-pink-500 h-full" style={{ width: `${femalePercent}%` }}></div>
              </div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-pink-500/10 flex items-center justify-center text-pink-400 border border-pink-500/20">
              <PieChart className="h-7 w-7" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1e293b] border-slate-800 shadow-md">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">អ្នកប្រើប្រាស់ (Users)</p>
              <p className="text-3xl font-extrabold text-white my-1">{profiles.length || 1}</p>
              <p className="text-xs text-purple-400 mt-2 font-medium">
                គណនីក្នុងប្រព័ន្ធ
              </p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
              <UserCircle className="h-7 w-7" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#1e293b] border-slate-800 shadow-md flex flex-col">
          <CardHeader className="pb-4 border-b border-slate-800/50">
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              <PieChart className="h-5 w-5 text-blue-400" /> ស្ថិតិសិស្សតាមជំនាញ
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 flex-1 flex flex-col md:flex-row items-center justify-center gap-8">
            <div className="flex-shrink-0">
              {majorsData.length > 0 ? renderDonutChart() : <div className="text-slate-500">គ្មានទិន្នន័យ</div>}
            </div>
            
            <div className="w-full max-h-[180px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 space-y-3 pr-2">
              {majorsData.map((item, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer hover:bg-slate-800/50"
                  onMouseEnter={() => setActiveMajorIdx(idx)}
                  onMouseLeave={() => setActiveMajorIdx(null)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: barColors[idx % barColors.length] }}></div>
                    <span className="text-xs font-semibold text-slate-200">{item.name}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-400 bg-slate-900 px-2 py-1 rounded-md border border-slate-700">
                    {item.count} នាក់
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1e293b] border-slate-800 shadow-md flex flex-col">
          <CardHeader className="pb-2 border-b border-slate-800/50">
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-400" /> ស្ថិតិសិស្សតាមជំនាន់
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex-1 flex flex-col justify-between h-full">
            <div className="w-full h-full min-h-[160px] pb-2">
              {gensData.length > 0 ? renderLineChart() : <div className="text-center text-slate-500 pt-10">គ្មានទិន្នន័យ</div>}
            </div>
            
            <div className="w-full max-h-[90px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 flex flex-wrap gap-2 pt-3 border-t border-slate-800/80">
              {gensData.map((item, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium cursor-pointer transition-all",
                    activeGenIdx === idx ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" : "bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500"
                  )}
                  onMouseEnter={() => setActiveGenIdx(idx)}
                  onMouseLeave={() => setActiveGenIdx(null)}
                >
                  <span>{item.name}</span>
                  <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-white">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#1e293b] border-slate-800 shadow-md">
        <CardHeader className="pb-4 border-b border-slate-800">
          <CardTitle className="text-base font-bold text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-500" /> បញ្ជីអ្នកប្រើប្រាស់ក្នុងប្រព័ន្ធ (System Users)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full max-h-[350px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#0f172a]/80 text-slate-400 text-xs uppercase font-semibold sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4">ឈ្មោះគណនី (Name)</th>
                  <th className="px-6 py-4">អ៊ីមែល (Email)</th>
                  <th className="px-6 py-4">សិទ្ធិ (Role)</th>
                  <th className="px-6 py-4 text-right">កាលបរិច្ឆេទបង្កើត</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {profiles.length > 0 ? profiles.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-3 font-bold text-white flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-slate-600 bg-slate-900 shadow-sm">
                        <AvatarImage src={user.avatar_url ? user.avatar_url : undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs">
                          {user.display_name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate max-w-[150px] sm:max-w-[200px]">{user.display_name || 'គ្មានឈ្មោះ'}</span>
                    </td>
                    <td className="px-6 py-3 text-slate-300">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span className="truncate max-w-[150px] sm:max-w-[250px]">{user.email || 'គ្មានអ៊ីមែល'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <Badge className={cn(
                        "font-bold uppercase text-[10px] whitespace-nowrap",
                        user.role?.includes('admin') ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      )}>
                        {user.role?.replace(/_/g, ' ') || 'STUDENT'}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-slate-400 text-right text-xs whitespace-nowrap">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString('en-GB') : '-'}
                    </td>
                  </tr>
                )) : (
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