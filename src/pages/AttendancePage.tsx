import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, MapPin, Save, Edit2, Trash2, Check, X, Printer, Share2, KeyRound, LogOut, LogIn, Plus, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { BipaStudent, initialStudents } from '@/pages/admin/StudentListPage';

export interface AttendanceRecord {
  id: string;
  student_code?: string;
  name: string;
  gender: string;
  time_out: string;
  time_in: string;
  status: string;
  date: string;
}

const ATT_STORAGE_KEY = 'bipa_attendance_sync_v4';

export function AttendancePage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('super_admin', 'residence_admin', 'finance_admin', 'duty_manager');

  const [time, setTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<AttendanceRecord[]>([]);
  const [directoryStudents, setDirectoryStudents] = useState<BipaStudent[]>([]);
  const [mapQuery, setMapQuery] = useState('Preah Sihanouk Raja Buddhist University, Phnom Penh');

  const [myStudentId, setMyStudentId] = useState(() => localStorage.getItem('bipa_linked_student_id') || '');
  const [tempStudentId, setTempStudentId] = useState('');
  const [idSavedMsg, setIdSavedMsg] = useState(false);

  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState('ប្រុស');
  const [newStatus, setNewStatus] = useState('ចេញក្រៅ');
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editGender, setEditGender] = useState('ប្រុស');
  const [editTimeOut, setEditTimeOut] = useState('');
  const [editTimeIn, setEditTimeIn] = useState('');
  const [editStatus, setEditStatus] = useState('វត្តមាន');

  const normalizeGenderKm = (raw?: string) => {
    const val = String(raw || '').trim();
    if (val === 'ស្រី' || val.toUpperCase() === 'F' || val.toUpperCase() === 'FEMALE') return 'ស្រី';
    return 'ប្រុស';
  };

  const resolveKhmerStudentInfo = (code: string | undefined, rawName: string, rawGender: string, dir: BipaStudent[]) => {
    const cleanCode = String(code || '').trim().toLowerCase();
    const cleanName = String(rawName || '').trim().toLowerCase();

    const foundDir = dir.find(
      (d) =>
        (cleanCode && d.student_code.toLowerCase() === cleanCode) ||
        (cleanName && d.full_name_en.toLowerCase() === cleanName) ||
        (cleanName && d.full_name_km.toLowerCase() === cleanName)
    );
    const foundInit = initialStudents.find(
      (d) =>
        (cleanCode && d.student_code.toLowerCase() === cleanCode) ||
        (cleanName && d.full_name_en.toLowerCase() === cleanName) ||
        (cleanName && d.full_name_km.toLowerCase() === cleanName)
    );

    const nameKm = foundDir?.full_name_km || foundInit?.full_name_km || rawName;
    const genderKm = foundDir
      ? normalizeGenderKm(foundDir.gender_km)
      : foundInit
      ? normalizeGenderKm(foundInit.gender_km)
      : normalizeGenderKm(rawGender);
    const finalCode = (foundDir?.student_code || foundInit?.student_code || code || '').toUpperCase();

    return { nameKm, genderKm, finalCode };
  };

  const loadData = async () => {
    const todayStr = new Date().toDateString();
    let dirList: BipaStudent[] = [];

    const savedDir = localStorage.getItem('bipa_students_directory_v2') || localStorage.getItem('bipa_students_directory');
    if (savedDir) {
      try {
        const parsed = JSON.parse(savedDir);
        if (Array.isArray(parsed) && parsed.length > 0) dirList = parsed;
      } catch {}
    }

    try {
      const { data: dbStudents } = await supabase
        .from('bipa_students')
        .select('*')
        .order('student_code', { ascending: true });
      if (dbStudents && dbStudents.length > 0) {
        const dbMapped: BipaStudent[] = dbStudents.map((r: any) => {
          const fb = initialStudents.find((s) => s.student_code.toLowerCase() === String(r.student_code || '').toLowerCase());
          const gKm = normalizeGenderKm(r.gender_km || r.gender || fb?.gender_km);
          return {
            id: String(r.id),
            student_code: String(r.student_code || fb?.student_code || '').toUpperCase(),
            full_name_km: r.full_name_km || fb?.full_name_km || r.full_name || '',
            full_name_en: r.full_name_en || fb?.full_name_en || r.full_name || '',
            gender_km: gKm,
            gender_en: gKm === 'ស្រី' ? 'F' : 'M',
            dob: r.dob || '',
            major_km: r.major_km || '',
            major_en: r.major_en || '',
            generation_km: r.generation_km || '',
            generation_en: r.generation_en || '',
            graduated_year_km: r.graduated_year_km || '',
            graduated_year_en: r.graduated_year_en || '',
            address_km: r.address_km || '',
            address_en: r.address_en || '',
            ethnicity_km: r.ethnicity_km || '',
            ethnicity_en: r.ethnicity_en || '',
            current_job_km: r.current_job_km || '',
            current_job_en: r.current_job_en || '',
            contact_number: r.contact_number || '',
            others_km: r.others_km || '',
            others_en: r.others_en || '',
          };
        });
        if (dbMapped.length >= dirList.length) {
          dirList = dbMapped;
        }
      }
    } catch {}

    if (dirList.length === 0) dirList = initialStudents;
    setDirectoryStudents(dirList);

    try {
      const { data: dbAtt, error } = await supabase
        .from('bipa_attendance')
        .select('*')
        .eq('attendance_date', todayStr)
        .order('created_at', { ascending: false });

      if (!error && dbAtt) {
        const mapped: AttendanceRecord[] = dbAtt.map((r: any) => {
          const resolved = resolveKhmerStudentInfo(r.student_code, r.full_name || '', r.gender || '', dirList);
          return {
            id: String(r.id),
            student_code: resolved.finalCode,
            name: resolved.nameKm,
            gender: resolved.genderKm,
            time_out: r.time_out || '--:--:--',
            time_in: r.time_in || '--:--:--',
            status: r.status || 'ចេញក្រៅ',
            date: r.attendance_date,
          };
        });
        setStudents(mapped);

        const localRaw = localStorage.getItem(ATT_STORAGE_KEY);
        let otherDays: AttendanceRecord[] = [];
        if (localRaw) {
          try {
            const parsed: AttendanceRecord[] = JSON.parse(localRaw);
            otherDays = parsed.filter((item) => item.date !== todayStr);
          } catch {}
        }
        localStorage.setItem(ATT_STORAGE_KEY, JSON.stringify([...mapped, ...otherDays]));
        return;
      }
    } catch {}

    const localSaved = localStorage.getItem(ATT_STORAGE_KEY);
    if (localSaved) {
      try {
        const parsed: AttendanceRecord[] = JSON.parse(localSaved);
        const todayOnly = parsed
          .filter((item) => item.date === todayStr)
          .map((item) => {
            const resolved = resolveKhmerStudentInfo(item.student_code, item.name, item.gender, dirList);
            return {
              ...item,
              student_code: resolved.finalCode,
              name: resolved.nameKm,
              gender: resolved.genderKm,
            };
          });
        setStudents(todayOnly);
      } catch {
        setStudents([]);
      }
    } else {
      setStudents([]);
    }

    const savedMap = localStorage.getItem('bipa_map_location');
    if (savedMap) setMapQuery(savedMap);
  };

  useEffect(() => {
    localStorage.removeItem('bipa_attendance_records');
    localStorage.removeItem('bipa_attendance_v3');
    loadData();
    const clockTimer = setInterval(() => setTime(new Date()), 1000);
    const syncTimer = setInterval(() => loadData(), 2000);
    window.addEventListener('attendance-updated', loadData);
    window.addEventListener('students-updated', loadData);
    window.addEventListener('storage', loadData);

    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearInterval(clockTimer);
      clearInterval(syncTimer);
      window.removeEventListener('attendance-updated', loadData);
      window.removeEventListener('students-updated', loadData);
      window.removeEventListener('storage', loadData);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const saveStudentsLocal = (updatedToday: AttendanceRecord[]) => {
    setStudents(updatedToday);
    const todayStr = new Date().toDateString();
    let otherDays: AttendanceRecord[] = [];
    const saved = localStorage.getItem(ATT_STORAGE_KEY);
    if (saved) {
      try {
        const parsed: AttendanceRecord[] = JSON.parse(saved);
        otherDays = parsed.filter((r) => r.date !== todayStr);
      } catch {}
    }
    localStorage.setItem(ATT_STORAGE_KEY, JSON.stringify([...updatedToday, ...otherDays]));
    window.dispatchEvent(new Event('attendance-updated'));
  };

  const handleSaveMyId = () => {
    if (!tempStudentId.trim()) return;
    const finalId = tempStudentId.trim().toUpperCase();
    setMyStudentId(finalId);
    localStorage.setItem('bipa_linked_student_id', finalId);
    setTempStudentId('');
    setIdSavedMsg(true);
    setTimeout(() => setIdSavedMsg(false), 2500);
  };

  const handleAddStudent = async () => {
    if (!newName.trim()) return;
    const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false });
    const todayStr = new Date().toDateString();

    const matchedDir = directoryStudents.find(
      (d) =>
        d.student_code.toLowerCase() === newName.trim().toLowerCase() ||
        d.full_name_km === newName.trim() ||
        d.full_name_en.toLowerCase() === newName.trim().toLowerCase()
    );

    const resolved = resolveKhmerStudentInfo(
      matchedDir?.student_code || newName.trim(),
      matchedDir?.full_name_km || newName.trim(),
      matchedDir?.gender_km || newGender,
      directoryStudents
    );

    const targetCode = resolved.finalCode;
    const targetName = resolved.nameKm;
    const targetGender = matchedDir ? resolved.genderKm : newGender;

    const existingIndex = students.findIndex(
      (s) =>
        (s.student_code && targetCode && s.student_code.toLowerCase() === targetCode.toLowerCase()) ||
        s.name === targetName
    );

    if (existingIndex >= 0) {
      const updated = [...students];
      const current = { ...updated[existingIndex] };
      if (!current.time_out || current.time_out === '--:--:--') {
        current.time_out = nowTime;
        current.status = newStatus;
      } else {
        current.time_in = nowTime;
        current.status = 'វត្តមាន';
      }
      current.name = targetName;
      current.gender = targetGender;
      current.student_code = targetCode;
      updated[existingIndex] = current;
      saveStudentsLocal(updated);
      try {
        await supabase.from('bipa_attendance').update({
          full_name: targetName,
          gender: targetGender,
          time_out: current.time_out,
          time_in: current.time_in,
          status: current.status,
        }).eq('id', current.id);
      } catch {}
    } else {
      const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
      const newRecord: AttendanceRecord = {
        id: newId,
        student_code: targetCode,
        name: targetName,
        gender: targetGender,
        time_out: nowTime,
        time_in: '--:--:--',
        status: newStatus,
        date: todayStr,
      };
      saveStudentsLocal([newRecord, ...students]);
      try {
        await supabase.from('bipa_attendance').insert([{
          id: newId,
          student_code: targetCode,
          full_name: targetName,
          gender: targetGender,
          time_out: nowTime,
          time_in: '--:--:--',
          status: newStatus,
          attendance_date: todayStr,
        }]);
      } catch {}
    }
    setNewName('');
    setShowPicker(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('តើអ្នកពិតជាចង់លុបទិន្នន័យនេះចេញពីតារាងមែនទេ?')) return;
    const target = students.find((s) => s.id === id);
    const filtered = students.filter((s) => s.id !== id);
    saveStudentsLocal(filtered);
    try {
      await supabase.from('bipa_attendance').delete().eq('id', id);
      if (target?.student_code) {
        await supabase
          .from('bipa_attendance')
          .delete()
          .eq('attendance_date', new Date().toDateString())
          .eq('student_code', target.student_code);
      }
    } catch {}
  };

  const handleClearAll = async () => {
    if (!window.confirm('តើអ្នកពិតជាចង់លុបឈ្មោះក្នុងតារាងវត្តមានថ្ងៃនេះទាំងអស់មែនទេ?')) return;
    const todayStr = new Date().toDateString();
    saveStudentsLocal([]);
    try {
      await supabase.from('bipa_attendance').delete().eq('attendance_date', todayStr);
    } catch {}
  };

  const startEdit = (student: AttendanceRecord) => {
    setEditingId(student.id);
    setEditName(student.name);
    setEditGender(student.gender);
    setEditTimeOut(student.time_out || '--:--:--');
    setEditTimeIn(student.time_in || '--:--:--');
    setEditStatus(student.status);
  };

  const saveEdit = async (id: string) => {
    const updated = students.map((s) =>
      s.id === id ? { ...s, name: editName, gender: editGender, time_out: editTimeOut, time_in: editTimeIn, status: editStatus } : s
    );
    saveStudentsLocal(updated);
    setEditingId(null);
    try {
      await supabase.from('bipa_attendance').update({
        full_name: editName,
        gender: editGender,
        time_out: editTimeOut,
        time_in: editTimeIn,
        status: editStatus,
      }).eq('id', id);
    } catch {}
  };

  const todayStr = new Date().toDateString();
  const todayData = students.filter(
    (s) =>
      s.date === todayStr &&
      (s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.student_code && s.student_code.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const filteredDirectoryForPicker = directoryStudents.filter((stu) => {
    const q = newName.toLowerCase().trim();
    if (!q) return true;
    return (
      stu.student_code.toLowerCase().includes(q) ||
      stu.full_name_km.toLowerCase().includes(q) ||
      stu.full_name_en.toLowerCase().includes(q)
    );
  });

  const totalCount = todayData.length;
  const presentCount = todayData.filter((s) => s.status === 'វត្តមាន' || s.status === 'ចេញក្រៅ').length;
  const leaveCount = todayData.filter((s) => s.status === 'ច្បាប់').length;
  const absentCount = todayData.filter((s) => s.status === 'អវត្តមាន').length;

  const handleBotShare = () => {
    const reportText = `📊 របាយការណ៍វត្តមានប្រចាំថ្ងៃ (${time.toLocaleDateString('en-GB')})\n\nសិស្សស្គែនសរុប: ${totalCount} នាក់\n✅ វត្តមាន/ចេញ-ចូល: ${presentCount} នាក់\n📝 ច្បាប់: ${leaveCount} នាក់\n❌ អវត្តមាន: ${absentCount} នាក់`;
    navigator.clipboard.writeText(reportText).then(() => {
      alert('បានចម្លងរបាយការណ៍វត្តមានចូល Clipboard ជោគជ័យ!');
    });
  };

  const handlePrintDocument = () => {
    const printWindow = window.open('', '_blank', 'width=850,height=900');
    if (!printWindow) {
      window.print();
      return;
    }
    const rowsHtml = todayData
      .map(
        (stu, i) => `<tr>
          <td style="text-align:center;">${i + 1}</td>
          <td style="padding-left:12px; font-weight:600;">${stu.name}</td>
          <td style="text-align:center;">${stu.gender}</td>
          <td style="text-align:center; color:#d97706; font-weight:600;">${stu.time_out || '--:--:--'}</td>
          <td style="text-align:center; color:#16a34a; font-weight:600;">${stu.time_in || '--:--:--'}</td>
          <td style="text-align:center;">
            <span style="padding:4px 8px; border-radius:12px; font-size:11px; font-weight:600; border: 1px solid #ccc;">${stu.status}</span>
          </td>
        </tr>`
      )
      .join('');

    printWindow.document.write(`<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>របាយការណ៍វត្តមានប្រចាំថ្ងៃ</title>
          <link href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;600;700&display=swap" rel="stylesheet">
          <style>
            @page { size: A4 portrait; margin: 14mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: 'Kantumruy Pro', sans-serif; margin: 0; color: #000; }
            .header-title { text-align: center; color: #1e40af; margin-bottom: 18px; }
            .header-title h1 { margin: 0 0 5px 0; font-size: 21px; }
            .header-title p { margin: 0; font-size: 13px; color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
            th { background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1; padding: 9px 5px; text-align: center; white-space: nowrap; }
            td { border-bottom: 1px solid #e2e8f0; padding: 8px 5px; white-space: nowrap; }
            .summary { display: flex; justify-content: space-between; margin-top: 22px; font-size: 13px; font-weight: 600; }
            .summary div { padding: 8px 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="header-title">
            <h1>របាយការណ៍វត្តមានសិស្សប្រចាំថ្ងៃ (ចេញ-ចូល)</h1>
            <p>កាលបរិច្ឆេទ: ${time.toLocaleDateString('en-GB')} | BIPA Admin</p>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width:45px;">ល.រ</th>
                <th style="text-align:left; padding-left:12px;">ឈ្មោះសិស្ស</th>
                <th style="width:65px;">ភេទ</th>
                <th style="width:110px;">ម៉ោងស្គែនចេញ (១)</th>
                <th style="width:110px;">ម៉ោងស្គែនចូល (២)</th>
                <th style="width:95px;">ស្ថានភាព</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="6" style="text-align:center; padding: 28px; color:#94a3b8;">មិនមានទិន្នន័យ</td></tr>'}
            </tbody>
          </table>
          <div class="summary">
            <div style="color:#2563eb; background:#eff6ff;">សិស្សសរុប: ${totalCount}</div>
            <div style="color:#16a34a; background:#f0fdf4;">វត្តមាន: ${presentCount}</div>
            <div style="color:#d97706; background:#fffbeb;">ច្បាប់: ${leaveCount}</div>
            <div style="color:#dc2626; background:#fef2f2;">អវត្តមាន: ${absentCount}</div>
          </div>
          <script>
            window.onload = function() { setTimeout(function() { window.focus(); window.print(); window.close(); }, 300); };
          </script>
        </body>
      </html>`);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] dark:bg-[#0b1120] pb-24 font-khmer flex justify-center">
      <div className="w-full max-w-4xl p-3 sm:p-6 space-y-4">
        <div className="w-full h-40 sm:h-48 rounded-2xl overflow-hidden relative shadow-md border border-slate-200 dark:border-slate-800 bg-slate-200">
          <iframe
            title="Location Map"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
          />
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-3 left-3 bg-white dark:bg-[#0f172a] px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 text-xs font-semibold text-[#3b82f6] border border-slate-100 dark:border-slate-700"
          >
            ផែនទី <MapPin className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="bg-gradient-to-r from-[#2563eb] to-[#4f46e5] rounded-2xl p-6 text-center shadow-lg text-white">
          <div className="text-4xl sm:text-5xl font-extrabold tracking-wider">
            {time.toLocaleTimeString('en-US', { hour12: false })}
          </div>
          <div className="text-sm text-blue-100 mt-2 font-medium">
            {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>

        <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <KeyRound className="h-4 w-4 text-amber-500" /> ភ្ជាប់អត្តលេខសិស្ស (ID) របស់អ្នកសម្រាប់ស្គែន
            </span>
          </div>

          {myStudentId ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-[#0f172a] p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-sm font-bold text-emerald-500 flex items-center gap-2">
                <Check className="h-5 w-5" /> បានភ្ជាប់ ID រួចរាល់៖ {myStudentId}
              </span>
              <Button
                variant="outline"
                onClick={() => {
                  setTempStudentId(myStudentId);
                  setMyStudentId('');
                  localStorage.removeItem('bipa_linked_student_id');
                }}
                className="h-9 border-slate-300 dark:border-slate-600 text-xs font-bold w-full sm:w-auto"
              >
                ផ្លាស់ប្តូរ ID
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                type="text"
                value={tempStudentId}
                onChange={(e) => setTempStudentId(e.target.value.toUpperCase())}
                placeholder="វាយបញ្ចូលតែ ID សុទ្ធ (ឧ. BIPA-001)..."
                className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-slate-700 px-3 bg-slate-50 dark:bg-[#0f172a] text-sm font-bold uppercase"
              />
              <Button
                onClick={handleSaveMyId}
                className="h-11 px-6 bg-[#3b82f6] hover:bg-blue-600 text-white font-bold rounded-xl shadow-md shrink-0"
              >
                ភ្ជាប់ ID
              </Button>
            </div>
          )}

          {idSavedMsg && (
            <p className="text-emerald-500 text-xs font-bold text-center">បានភ្ជាប់ ID ជោគជ័យ!</p>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ស្វែងរកឈ្មោះក្នុងតារាងវត្តមាន..."
            className="pl-10 bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-700 h-11 rounded-xl shadow-sm text-sm"
          />
        </div>

        {isAdmin && (
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <div className="flex items-center gap-2 text-[#0284c7] font-bold text-sm">
              <Plus className="h-4 w-4" /> បន្ថែមវត្តមានដោយដៃ (Admin)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div ref={pickerRef} className="relative">
                <div className="relative">
                  <input
                    type="text"
                    value={newName}
                    onFocus={() => setShowPicker(true)}
                    onChange={(e) => {
                      setNewName(e.target.value);
                      setShowPicker(true);
                    }}
                    placeholder="ជ្រើសរើស ID ឬវាយឈ្មោះខ្មែរ..."
                    className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-600 pl-3 pr-8 bg-slate-50 dark:bg-[#0f172a] text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPicker(!showPicker)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>

                {showPicker && (
                  <div className="absolute left-0 right-0 top-11 z-50 bg-[#1e293b] border border-slate-600 rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-slate-700/60">
                    {filteredDirectoryForPicker.length > 0 ? (
                      filteredDirectoryForPicker.map((stu) => (
                        <button
                          type="button"
                          key={stu.id}
                          onClick={() => {
                            setNewName(stu.student_code);
                            setNewGender(normalizeGenderKm(stu.gender_km));
                            setShowPicker(false);
                          }}
                          className="w-full text-left px-3.5 py-2.5 hover:bg-slate-700/70 transition-colors flex flex-col"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-extrabold text-white">{stu.student_code}</span>
                            <span className="text-[11px] text-amber-400 font-semibold">{normalizeGenderKm(stu.gender_km)}</span>
                          </div>
                          <span className="text-xs text-slate-300 mt-0.5">{stu.full_name_km}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-center text-xs text-slate-400">
                        មិនមានឈ្មោះក្នុងបញ្ជីទេ
                      </div>
                    )}
                  </div>
                )}
              </div>

              <select
                value={newGender}
                onChange={(e) => setNewGender(e.target.value)}
                className="h-10 rounded-lg border border-slate-200 dark:border-slate-600 px-3 bg-slate-50 dark:bg-[#0f172a] text-sm text-slate-900 dark:text-white"
              >
                <option value="ប្រុស">ប្រុស</option>
                <option value="ស្រី">ស្រី</option>
              </select>

              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="h-10 rounded-lg border border-slate-200 dark:border-slate-600 px-3 bg-slate-50 dark:bg-[#0f172a] text-sm text-slate-900 dark:text-white"
              >
                <option value="ចេញក្រៅ">ស្គែនចេញ (លើកទី១)</option>
                <option value="វត្តមាន">ស្គែនចូល (លើកទី២)</option>
                <option value="ច្បាប់">ច្បាប់</option>
                <option value="អវត្តមាន">អវត្តមាន</option>
              </select>
            </div>
            <Button onClick={handleAddStudent} className="w-full h-10 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl">
              <Save className="h-4 w-4 mr-2" /> រក្សាទុក
            </Button>
          </div>
        )}

        <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
          <div className="bg-slate-50 dark:bg-[#0f172a] rounded-xl p-3.5 mb-4 border border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-y-2 text-[11px] sm:text-xs text-slate-600 dark:text-slate-400">
            <div><span className="font-bold mr-1">អ្នកគ្រប់គ្រង:</span> <span className="text-slate-900 dark:text-white">BIPA Admin</span></div>
            <div className="text-right"><span className="font-bold mr-1">វេន:</span> <span className="text-amber-500 font-bold">ចេញ-ចូលប្រចាំថ្ងៃ</span></div>
            <div><span className="font-bold mr-1">ម៉ោងកំណត់:</span> <span className="text-[#3b82f6] font-bold">7:30-21:00</span></div>
            <div className="text-right"><span className="font-bold mr-1">កាលបរិច្ឆេទ:</span> <span className="text-slate-900 dark:text-white">{time.toLocaleDateString('en-GB')}</span></div>
          </div>

          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="bg-[#0284c7] text-white flex items-center px-3.5 py-3 font-bold text-xs sm:text-sm whitespace-nowrap">
              <div className="flex-1">ឈ្មោះសិស្ស (ម៉ោងចេញ / ម៉ោងចូល)</div>
              <div className="w-14 text-center">ភេទ</div>
              <div className="w-20 text-center">ស្ថានភាព</div>
              {isAdmin && <div className="w-16 text-center">សកម្មភាព</div>}
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-[#0f172a] max-h-[340px] overflow-y-auto">
              {todayData.length > 0 ? (
                todayData.map((student) => (
                  <div key={student.id} className="flex items-center px-3.5 py-3 text-xs sm:text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    {editingId === student.id ? (
                      <div className="w-full space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 text-xs" />
                          <select value={editGender} onChange={(e) => setEditGender(e.target.value)} className="h-8 text-xs border rounded px-2 bg-transparent">
                            <option value="ប្រុស">ប្រុស</option>
                            <option value="ស្រី">ស្រី</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <Input value={editTimeOut} onChange={(e) => setEditTimeOut(e.target.value)} className="h-8 text-xs" />
                          <Input value={editTimeIn} onChange={(e) => setEditTimeIn(e.target.value)} className="h-8 text-xs" />
                          <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="h-8 text-xs border rounded px-1 bg-transparent">
                            <option value="ចេញក្រៅ">ចេញក្រៅ</option>
                            <option value="វត្តមាន">វត្តមាន</option>
                            <option value="ច្បាប់">ច្បាប់</option>
                            <option value="អវត្តមាន">អវត្តមាន</option>
                          </select>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" onClick={() => saveEdit(student.id)} className="h-7 bg-emerald-600 text-white text-xs px-3">
                            <Check className="h-3.5 w-3.5 mr-1" /> រក្សាទុក
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-7 text-xs px-2">
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="font-bold text-slate-900 dark:text-white truncate">
                            {student.name}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 text-[10px] mt-0.5">
                            <span className="text-amber-500 font-semibold flex items-center gap-1 whitespace-nowrap">
                              <LogOut className="h-2.5 w-2.5" /> ចេញ: {student.time_out || '--:--:--'}
                            </span>
                            <span className="text-emerald-500 font-semibold flex items-center gap-1 whitespace-nowrap">
                              <LogIn className="h-2.5 w-2.5" /> ចូល: {student.time_in || '--:--:--'}
                            </span>
                          </div>
                        </div>
                        <div className="w-14 text-center text-slate-700 dark:text-slate-300 text-xs">{student.gender}</div>
                        <div className="w-20 flex justify-center shrink-0">
                          <span className={cn(
                            'text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap border',
                            student.status === 'វត្តមាន' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                            student.status === 'ចេញក្រៅ' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                            student.status === 'ច្បាប់' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                            'bg-red-500/10 text-red-500 border-red-500/20'
                          )}>
                            {student.status}
                          </span>
                        </div>
                        {isAdmin && (
                          <div className="w-16 flex justify-center gap-2.5 shrink-0">
                            <button onClick={() => startEdit(student)} className="text-blue-500 hover:text-blue-400">
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDelete(student.id)} className="text-red-500 hover:text-red-400">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-slate-400 text-xs">មិនទាន់មានទិន្នន័យវត្តមានថ្ងៃនេះទេ</div>
              )}
            </div>
          </div>

          <div className="h-[1px] bg-slate-200 dark:bg-slate-800 my-4" />

          <div className="grid grid-cols-4 gap-2 text-[10px] sm:text-xs font-bold">
            <div className="bg-blue-500/10 text-blue-500 py-2.5 px-1 rounded-xl text-center border border-blue-500/20">ស.សរុប: {totalCount}</div>
            <div className="bg-emerald-500/10 text-emerald-500 py-2.5 px-1 rounded-xl text-center border border-emerald-500/20">វត្តមាន: {presentCount}</div>
            <div className="bg-amber-500/10 text-amber-500 py-2.5 px-1 rounded-xl text-center border border-amber-500/20">ច្បាប់: {leaveCount}</div>
            <div className="bg-red-500/10 text-red-500 py-2.5 px-1 rounded-xl text-center border border-red-500/20">អវត្តមាន: {absentCount}</div>
          </div>
        </div>

        <div className="flex justify-center pt-1">
          <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 px-5 py-2 rounded-full text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 shadow-sm">
            សិស្សស្កែនសរុប៖ <span className="ml-1 px-2.5 py-0.5 rounded bg-slate-100 dark:bg-[#0f172a] text-slate-900 dark:text-white">{totalCount}</span>
          </div>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap justify-center gap-3 pt-1">
            <Button onClick={handleClearAll} className="bg-[#dc2626] hover:bg-red-700 text-white rounded-xl px-4 h-10 text-xs font-bold">
              <Trash2 className="h-4 w-4 mr-1.5" /> លុបទាំងអស់
            </Button>
            <Button onClick={handlePrintDocument} className="bg-slate-700 hover:bg-slate-600 text-white rounded-xl px-4 h-10 text-xs font-bold">
              <Printer className="h-4 w-4 mr-1.5" /> PDF
            </Button>
            <Button onClick={handleBotShare} className="bg-[#0284c7] hover:bg-sky-600 text-white rounded-xl px-4 h-10 text-xs font-bold">
              <Share2 className="h-4 w-4 mr-1.5" /> bot
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}