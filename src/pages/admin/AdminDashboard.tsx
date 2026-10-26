import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Building2, QrCode, Megaphone } from 'lucide-react';
import { initialStudents, BipaStudent } from './StudentListPage';

export function AdminDashboard() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<BipaStudent[]>([]);
  const [presentToday, setPresentToday] = useState(0);

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
      if (data && data.length >= list.length && data.length > 0) {
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

    const savedAtt = localStorage.getItem('bipa_attendance_records');
    if (savedAtt) {
      try {
        const attList: any[] = JSON.parse(savedAtt);
        const todayStr = new Date().toDateString();
        const count = attList.filter((r) => r.date === todayStr && r.status === 'វត្តមាន').length;
        setPresentToday(count);
      } catch {}
    }
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
  const femaleCount = students.filter((s) => s.gender_km === 'ស្រី' || s.gender_en === 'F').length;

  return (
    <div className="p-4 sm:p-6 font-khmer space-y-6">
      <div className="bg-[#1e293b] border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <Badge className="bg-[#eab308] text-[#0f172a] font-bold hover:bg-[#eab308] mb-2">
            SUPER ADMIN
          </Badge>
          <h1 className="text-2xl font-bold text-white">ផ្ទាំងគ្រប់គ្រង</h1>
          <p className="text-sm text-slate-400 mt-1">ប្រព័ន្ធគ្រប់គ្រងអន្តេវាសិកដ្ឋានសិស្សនិស្សិត (BIPA)</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => navigate('/admin/attendance')}
            className="bg-[#eab308] hover:bg-yellow-500 text-[#0f172a] font-bold"
          >
            <QrCode className="h-4 w-4 mr-2" /> បង្កើតកូដ QR & វត្តមាន
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/admin/announcements')}
            className="bg-[#0f172a] border-slate-700 text-white hover:bg-slate-800"
          >
            <Megaphone className="h-4 w-4 mr-2" /> បង្កើតសេចក្តីប្រកាស
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          onClick={() => navigate('/admin/students')}
          className="bg-[#1e293b] border-slate-800 cursor-pointer hover:border-blue-500/50 transition-colors"
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">សិស្សនិស្សិតសរុប</p>
              <p className="text-3xl font-extrabold text-white my-1">{totalStudents}</p>
              <p className="text-xs text-slate-400">
                ប្រុស: {maleCount} | ស្រី: {femaleCount}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => navigate('/admin/attendance')}
          className="bg-[#1e293b] border-slate-800 cursor-pointer hover:border-emerald-500/50 transition-colors"
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">វត្តមានថ្ងៃនេះ</p>
              <p className="text-3xl font-extrabold text-white my-1">{presentToday}</p>
              <p className="text-xs text-emerald-400">ក្នុងចំណោម {totalStudents} នាក់</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Building2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#1e293b] border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white">ព័ត៌មានសិស្សនិស្សិត ({totalStudents})</h2>
              <button
                onClick={() => navigate('/admin/students')}
                className="text-xs text-blue-400 hover:underline"
              >
                មើលទាំងអស់
              </button>
            </div>

            <div className="divide-y divide-slate-800">
              {students.slice(0, 6).map((stu) => (
                <div key={stu.id} className="py-2.5 flex items-center justify-between text-xs sm:text-sm">
                  <div>
                    <span className="font-bold text-white">{stu.full_name_km}</span>
                    <span className="text-slate-400 ml-2">({stu.student_code})</span>
                  </div>
                  <div className="text-slate-400">
                    {stu.major_km} • <span className="text-amber-400">{stu.generation_km}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1e293b] border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white">សំណើផ្សេងៗកំពុងរង់ចាំ</h2>
              <button
                onClick={() => navigate('/admin/leave-requests')}
                className="text-xs text-blue-400 hover:underline"
              >
                មើល
              </button>
            </div>
            <div className="py-12 text-center text-slate-500 text-sm">មិនមានទិន្នន័យ</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}