import { useState, useEffect } from 'react';
import { Search, MapPin, Plus, Save, Edit2, Trash2, Check, X, Printer, Share2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { initialStudents, BipaStudent } from '@/pages/admin/StudentListPage';
import { cn } from '@/lib/utils';

interface AttendanceRecord {
  id: number;
  student_code?: string;
  name: string;
  gender: string;
  time: string;
  status: string;
  date: string;
}

export function AttendancePage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('super_admin', 'residence_admin', 'finance_admin', 'duty_manager');

  const [time, setTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<AttendanceRecord[]>([]);
  const [directoryStudents, setDirectoryStudents] = useState<BipaStudent[]>([]);
  const [mapQuery, setMapQuery] = useState('Preah Sihanouk Raja Buddhist University, Phnom Penh');

  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState('ប្រុស');
  const [newStatus, setNewStatus] = useState('វត្តមាន');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editGender, setEditGender] = useState('ប្រុស');
  const [editStatus, setEditStatus] = useState('វត្តមាន');

  const loadData = () => {
    const todayStr = new Date().toDateString();
    const savedDir = localStorage.getItem('bipa_students_directory_v2') || localStorage.getItem('bipa_students_directory');
    let dirList: BipaStudent[] = initialStudents;
    if (savedDir) {
      try {
        const parsed = JSON.parse(savedDir);
        if (Array.isArray(parsed) && parsed.length > 0) {
          dirList = parsed;
        }
      } catch {}
    }
    setDirectoryStudents(dirList);

    const savedRecords = localStorage.getItem('bipa_attendance_records');
    let existingToday: AttendanceRecord[] = [];
    if (savedRecords) {
      try {
        const parsed: AttendanceRecord[] = JSON.parse(savedRecords);
        existingToday = parsed.filter((item) => item.date === todayStr);
      } catch {}
    }

    const syncedList: AttendanceRecord[] = dirList.map((stu, idx) => {
      const found = existingToday.find(
        (r) =>
          (r.student_code && r.student_code.toLowerCase() === stu.student_code.toLowerCase()) ||
          r.name === stu.full_name_km ||
          r.name === stu.full_name_en ||
          r.name.includes(stu.student_code)
      );
      if (found) {
        return {
          ...found,
          student_code: stu.student_code,
          name: stu.full_name_km || stu.full_name_en,
          gender: stu.gender_km || 'ប្រុស',
        };
      }
      return {
        id: Number(stu.id) || Date.now() + idx,
        student_code: stu.student_code,
        name: stu.full_name_km || stu.full_name_en,
        gender: stu.gender_km || 'ប្រុស',
        time: '--:--:--',
        status: 'អវត្តមាន',
        date: todayStr,
      };
    });

    const extraScanned = existingToday.filter(
      (r) =>
        !syncedList.some(
          (s) =>
            (s.student_code && r.student_code && s.student_code.toLowerCase() === r.student_code.toLowerCase()) ||
            s.name === r.name
        )
    );

    const finalList = [...extraScanned, ...syncedList];
    setStudents(finalList);
    localStorage.setItem('bipa_attendance_records', JSON.stringify(finalList));

    const savedMap = localStorage.getItem('bipa_map_location');
    if (savedMap) {
      setMapQuery(savedMap);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(() => setTime(new Date()), 1000);
    window.addEventListener('attendance-updated', loadData);
    window.addEventListener('students-updated', loadData);
    return () => {
      clearInterval(timer);
      window.removeEventListener('attendance-updated', loadData);
      window.removeEventListener('students-updated', loadData);
    };
  }, []);

  const saveStudents = (updated: AttendanceRecord[]) => {
    setStudents(updated);
    localStorage.setItem('bipa_attendance_records', JSON.stringify(updated));
    window.dispatchEvent(new Event('attendance-updated'));
  };

  const handleAddStudent = () => {
    if (!newName.trim()) return;
    const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false });
    const todayStr = new Date().toDateString();

    const matchedDir = directoryStudents.find(
      (d) =>
        d.student_code.toLowerCase() === newName.trim().toLowerCase() ||
        d.full_name_km === newName.trim() ||
        d.full_name_en.toLowerCase() === newName.trim().toLowerCase()
    );

    const targetCode = matchedDir?.student_code;
    const targetName = matchedDir ? matchedDir.full_name_km || matchedDir.full_name_en : newName.trim();
    const targetGender = matchedDir ? matchedDir.gender_km : newGender;

    const existingIndex = students.findIndex(
      (s) =>
        (targetCode && s.student_code === targetCode) ||
        s.name.toLowerCase() === targetName.toLowerCase()
    );

    if (existingIndex >= 0) {
      const updated = [...students];
      updated[existingIndex] = {
        ...updated[existingIndex],
        status: newStatus,
        time: nowTime,
        gender: targetGender,
      };
      saveStudents(updated);
    } else {
      const newRecord: AttendanceRecord = {
        id: Date.now(),
        student_code: targetCode,
        name: targetName,
        gender: targetGender,
        time: nowTime,
        status: newStatus,
        date: todayStr,
      };
      saveStudents([newRecord, ...students]);
    }
    setNewName('');
  };

  const handleDelete = (id: number) => {
    saveStudents(students.filter((s) => s.id !== id));
  };

  const handleClearAll = () => {
    if (window.confirm('តើអ្នកពិតជាចង់កំណត់វត្តមានថ្ងៃនេះឡើងវិញទាំងអស់មែនទេ?')) {
      const resetList = students.map((s) => ({
        ...s,
        status: 'អវត្តមាន',
        time: '--:--:--',
      }));
      saveStudents(resetList);
    }
  };

  const startEdit = (student: AttendanceRecord) => {
    setEditingId(student.id);
    setEditName(student.name);
    setEditGender(student.gender);
    setEditStatus(student.status);
  };

  const saveEdit = (id: number) => {
    const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false });
    const updated = students.map((s) =>
      s.id === id ? { ...s, name: editName, gender: editGender, status: editStatus, time: nowTime } : s
    );
    saveStudents(updated);
    setEditingId(null);
  };

  const todayStr = new Date().toDateString();
  const todayData = students.filter(
    (s) =>
      s.date === todayStr &&
      (s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.student_code && s.student_code.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const totalCount = todayData.length;
  const presentCount = todayData.filter((s) => s.status === 'វត្តមាន').length;
  const leaveCount = todayData.filter((s) => s.status === 'ច្បាប់').length;
  const absentCount = todayData.filter((s) => s.status === 'អវត្តមាន').length;

  return (
    <div className="min-h-screen bg-[#f1f5f9] dark:bg-[#0b1120] pb-24 font-khmer">
      <div className="max-w-xl mx-auto p-3 sm:p-4 space-y-3.5">
        <div className="w-full h-36 rounded-2xl overflow-hidden relative shadow-sm border border-slate-200 dark:border-slate-800 bg-slate-200">
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
            className="absolute top-3 left-3 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg shadow flex items-center gap-1.5 text-xs font-semibold text-[#0284c7] hover:bg-slate-50"
          >
            ផែនទី <MapPin className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="bg-gradient-to-r from-[#2563eb] to-[#4f46e5] rounded-2xl p-5 text-center shadow-md text-white">
          <div className="text-3xl sm:text-4xl font-extrabold tracking-wider">{time.toLocaleTimeString('en-US', { hour12: false })}</div>
          <div className="text-xs text-blue-100 mt-1">
            {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ស្វែងរកឈ្មោះ ឬ ID (ឧ. BIPA-001)..."
            className="pl-10 bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-700 h-11 rounded-xl shadow-sm text-sm"
          />
        </div>

        {isAdmin && (
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <div className="flex items-center gap-2 text-[#0284c7] font-bold text-sm">
              <Plus className="h-4 w-4" /> ចុះវត្តមានដោយដៃ (Admin)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                list="bipa-student-options"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="ជ្រើសរើស ឬវាយឈ្មោះ/ID..."
                className="h-10 rounded-md border border-slate-200 dark:border-slate-700 px-3 bg-slate-50 dark:bg-[#0f172a] text-sm"
              />
              <datalist id="bipa-student-options">
                {directoryStudents.map((stu) => (
                  <option key={stu.id} value={stu.full_name_km}>
                    {stu.student_code} - {stu.full_name_en}
                  </option>
                ))}
              </datalist>

              <select
                value={newGender}
                onChange={(e) => setNewGender(e.target.value)}
                className="h-10 rounded-md border border-slate-200 dark:border-slate-700 px-3 bg-slate-50 dark:bg-[#0f172a] text-sm"
              >
                <option value="ប្រុស">ប្រុស</option>
                <option value="ស្រី">ស្រី</option>
              </select>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="h-10 rounded-md border border-slate-200 dark:border-slate-700 px-3 bg-slate-50 dark:bg-[#0f172a] text-sm"
              >
                <option value="វត្តមាន">វត្តមាន</option>
                <option value="ច្បាប់">ច្បាប់</option>
                <option value="អវត្តមាន">អវត្តមាន</option>
              </select>
            </div>
            <Button onClick={handleAddStudent} className="w-full h-10 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl">
              <Save className="h-4 w-4 mr-2" /> រក្សាទុក
            </Button>
          </div>
        )}

        <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-700 p-3.5 sm:p-5">
          <div className="bg-slate-50/80 dark:bg-slate-800/40 rounded-xl p-3 mb-4 border border-slate-100 dark:border-slate-700/50 grid grid-cols-2 gap-y-2 text-[11px] sm:text-xs text-slate-700 dark:text-slate-300">
            <div className="flex items-center whitespace-nowrap">
              <span className="font-bold text-slate-600 dark:text-slate-400 mr-1.5">អ្នកគ្រប់គ្រង:</span>
              <span>BIPA Admin</span>
            </div>
            <div className="flex items-center justify-end whitespace-nowrap">
              <span className="font-bold text-slate-600 dark:text-slate-400 mr-1.5">វេន:</span>
              <span className="text-amber-500 font-bold">ប្រចាំថ្ងៃ</span>
            </div>
            <div className="flex items-center whitespace-nowrap">
              <span className="font-bold text-slate-600 dark:text-slate-400 mr-1.5">ម៉ោងកំណត់:</span>
              <span className="text-[#0284c7] font-bold">7:30-21:00</span>
            </div>
            <div className="flex items-center justify-end whitespace-nowrap">
              <span className="font-bold text-slate-600 dark:text-slate-400 mr-1.5">កាលបរិច្ឆេទ:</span>
              <span className="font-medium">{time.toLocaleDateString('en-GB')}</span>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="bg-[#0284c7] text-white flex items-center px-3 py-2.5 font-bold text-xs whitespace-nowrap">
              <div className="flex-1">ឈ្មោះសិស្ស</div>
              <div className="w-12 text-center">ភេទ</div>
              <div className="w-20 text-center">ស្ថានភាព</div>
              {isAdmin && <div className="w-16 text-center">សកម្មភាព</div>}
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-[#1e293b]">
              {todayData.length > 0 ? (
                todayData.map((student) => (
                  <div key={student.id} className="flex items-center px-3 py-2.5 text-xs sm:text-sm hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    {editingId === student.id ? (
                      <>
                        <div className="flex-1 pr-2">
                          <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 text-xs" />
                        </div>
                        <div className="w-12 px-0.5">
                          <select value={editGender} onChange={(e) => setEditGender(e.target.value)} className="w-full h-8 text-[11px] border rounded bg-transparent">
                            <option value="ប្រុស">ប្រុស</option>
                            <option value="ស្រី">ស្រី</option>
                          </select>
                        </div>
                        <div className="w-20 px-0.5">
                          <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="w-full h-8 text-[11px] border rounded bg-transparent">
                            <option value="វត្តមាន">វត្តមាន</option>
                            <option value="ច្បាប់">ច្បាប់</option>
                            <option value="អវត្តមាន">អវត្តមាន</option>
                          </select>
                        </div>
                        <div className="w-16 flex justify-center gap-2">
                          <button onClick={() => saveEdit(student.id)} className="text-emerald-500 hover:text-emerald-600"><Check className="h-4 w-4" /></button>
                          <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="font-bold text-slate-800 dark:text-white truncate">
                            {student.name}
                            {student.student_code && (
                              <span className="ml-1.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                                ({student.student_code})
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 whitespace-nowrap">Time: {student.time}</div>
                        </div>
                        <div className="w-12 text-center text-slate-600 dark:text-slate-300 whitespace-nowrap text-xs">{student.gender}</div>
                        <div className="w-20 flex justify-center shrink-0">
                          <span
                            className={cn(
                              'text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap',
                              student.status === 'វត្តមាន'
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60'
                                : student.status === 'ច្បាប់'
                                ? 'bg-amber-50 text-amber-600 border border-amber-200/60'
                                : 'bg-red-50 text-red-600 border border-red-200/60'
                            )}
                          >
                            {student.status}
                          </span>
                        </div>
                        {isAdmin && (
                          <div className="w-16 flex justify-center gap-2.5 shrink-0">
                            <button onClick={() => startEdit(student)} className="text-blue-500 hover:text-blue-700">
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => handleDelete(student.id)} className="text-red-500 hover:text-red-700">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">មិនទាន់មានទិន្នន័យវត្តមានថ្ងៃនេះទេ</div>
              )}
            </div>
          </div>

          <div className="h-0.5 bg-[#0284c7] my-4 rounded-full opacity-80" />

          <div className="grid grid-cols-4 gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-bold">
            <div className="bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 py-2 px-1 rounded-xl text-center border border-blue-100 dark:border-blue-900 whitespace-nowrap">
              ស.សរុប: {totalCount}
            </div>
            <div className="bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 py-2 px-1 rounded-xl text-center border border-emerald-100 dark:border-emerald-900 whitespace-nowrap">
              វត្តមាន: {presentCount}
            </div>
            <div className="bg-amber-50/80 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 py-2 px-1 rounded-xl text-center border border-amber-100 dark:border-amber-900 whitespace-nowrap">
              ច្បាប់: {leaveCount}
            </div>
            <div className="bg-red-50/80 dark:bg-red-950/40 text-red-600 dark:text-red-400 py-2 px-1 rounded-xl text-center border border-red-100 dark:border-red-900 whitespace-nowrap">
              អវត្តមាន: {absentCount}
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-1">
          <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 px-5 py-2 rounded-2xl text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 shadow-sm flex items-center gap-2">
            សិស្សសរុប៖ <span className="bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-lg text-slate-900 dark:text-white">{totalCount}</span>
          </div>
        </div>

        {isAdmin && (
          <div className="flex justify-center gap-2.5 pt-1">
            <Button onClick={handleClearAll} className="bg-[#dc2626] hover:bg-red-700 text-white rounded-xl px-4 h-10 text-xs font-bold shadow-sm">
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> លុប
            </Button>
            <Button onClick={() => window.print()} className="bg-[#1e293b] hover:bg-slate-800 text-white rounded-xl px-4 h-10 text-xs font-bold shadow-sm">
              <Printer className="h-3.5 w-3.5 mr-1.5" /> PDF
            </Button>
            <Button className="bg-[#0284c7] hover:bg-sky-700 text-white rounded-xl px-4 h-10 text-xs font-bold shadow-sm">
              <Share2 className="h-3.5 w-3.5 mr-1.5" /> bot
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}