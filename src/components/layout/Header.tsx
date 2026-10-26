import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Home, Info, Building2, Megaphone, Phone, LogIn, UserPlus,
  LogOut, LayoutDashboard, User, Menu, Sun, Moon, Languages,
  GraduationCap, ChevronDown, Shield, QrCode, Eye, UserCheck, FileText, LayoutGrid, X, ImageUp, CheckCircle2, AlertCircle
} from 'lucide-react';
import { initialStudents, BipaStudent } from '@/pages/admin/StudentListPage';
import { TranslationKey } from '@/types';
import { cn } from '@/lib/utils';

const ATT_STORAGE_KEY = 'bipa_attendance_sync_v4';

export interface ScanProcessResult {
  ok: boolean;
  action?: 'OUT' | 'IN';
  studentName?: string;
  time?: string;
  message: string;
}

export async function resolveStudentByIdOrName(query: string): Promise<{
  code: string;
  nameKm: string;
  genderKm: string;
} | null> {
  const clean = query.trim();
  if (!clean) return null;

  let dirList: BipaStudent[] = [];
  const savedDir = localStorage.getItem('bipa_students_directory_v2') || localStorage.getItem('bipa_students_directory');
  if (savedDir) {
    try {
      const parsed = JSON.parse(savedDir);
      if (Array.isArray(parsed)) dirList = parsed;
    } catch {}
  }

  try {
    const { data } = await supabase.from('bipa_students').select('*');
    if (data && data.length > 0) {
      dirList = data.map((r: any) => {
        const fb = initialStudents.find(
          (s) => s.student_code.toLowerCase() === String(r.student_code || '').toLowerCase()
        );
        const rawGender = String(r.gender_km || r.gender || fb?.gender_km || 'ប្រុស').trim();
        const isFemale = rawGender === 'ស្រី' || rawGender.toUpperCase() === 'F' || rawGender.toUpperCase() === 'FEMALE';
        return {
          id: String(r.id),
          student_code: String(r.student_code || fb?.student_code || '').toUpperCase(),
          full_name_km: r.full_name_km || fb?.full_name_km || r.full_name || '',
          full_name_en: r.full_name_en || fb?.full_name_en || r.full_name || '',
          gender_km: isFemale ? 'ស្រី' : 'ប្រុស',
          gender_en: isFemale ? 'F' : 'M',
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
    }
  } catch {}

  const combined = [...dirList, ...initialStudents];
  const matched = combined.find(
    (s) =>
      (s.student_code && s.student_code.toLowerCase() === clean.toLowerCase()) ||
      (s.full_name_km && s.full_name_km.trim() === clean) ||
      (s.full_name_en && s.full_name_en.toLowerCase() === clean.toLowerCase())
  );

  if (!matched) return null;

  const initMatch = initialStudents.find(
    (s) => s.student_code.toLowerCase() === matched.student_code.toLowerCase()
  );
  const rawG = String(matched.gender_km || initMatch?.gender_km || 'ប្រុស').trim();
  const isF = rawG === 'ស្រី' || rawG.toUpperCase() === 'F';
  const khmerName = matched.full_name_km || initMatch?.full_name_km || matched.full_name_en;

  return {
    code: matched.student_code.toUpperCase(),
    nameKm: khmerName,
    genderKm: isF ? 'ស្រី' : 'ប្រុស',
  };
}

export async function processAttendanceScan(scannedCode: string): Promise<ScanProcessResult> {
  const raw = scannedCode.trim();
  const linkedId = (localStorage.getItem('bipa_linked_student_id') || '').trim();
  const isStationQr =
    raw.toUpperCase().startsWith('BIPA-STATION') ||
    raw.toUpperCase() === 'BIPA-QR' ||
    raw.toUpperCase() === 'BIPA-ATTENDANCE';

  if (isStationQr && !linkedId) {
    return {
      ok: false,
      message: 'សូមភ្ជាប់អត្តលេខសិស្ស (ID) របស់អ្នកជាមុនសិន មុនពេលស្កែន!',
    };
  }

  const lookupCode = (isStationQr ? linkedId : raw).trim().toUpperCase();
  if (!lookupCode) {
    return {
      ok: false,
      message: 'មិនឃើញអត្តលេខសិស្ស (ID) សម្រាប់ស្កែនទេ សូមភ្ជាប់ ID ជាមុនសិន!',
    };
  }

  const resolved = await resolveStudentByIdOrName(lookupCode);
  if (!resolved) {
    return {
      ok: false,
      message: `រកមិនឃើញអត្តលេខ "${lookupCode}" ក្នុងបញ្ជីឈ្មោះនិស្សិតទេ!`,
    };
  }

  const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false });
  const todayStr = new Date().toDateString();

  let allRecords: any[] = [];
  const saved = localStorage.getItem(ATT_STORAGE_KEY);
  if (saved) {
    try {
      allRecords = JSON.parse(saved);
    } catch {}
  }

  try {
    const { data: dbToday } = await supabase
      .from('bipa_attendance')
      .select('*')
      .eq('attendance_date', todayStr);
    if (dbToday && dbToday.length > 0) {
      const otherDays = allRecords.filter((r) => r.date !== todayStr);
      const mappedDb = dbToday.map((r: any) => ({
        id: String(r.id),
        student_code: r.student_code,
        name: r.full_name,
        gender: r.gender,
        time_out: r.time_out || '--:--:--',
        time_in: r.time_in || '--:--:--',
        status: r.status || 'ចេញក្រៅ',
        date: r.attendance_date,
      }));
      allRecords = [...mappedDb, ...otherDays];
    }
  } catch {}

  const existingIdx = allRecords.findIndex(
    (r: any) =>
      r.date === todayStr &&
      r.student_code &&
      String(r.student_code).toLowerCase() === resolved.code.toLowerCase()
  );

  if (existingIdx >= 0) {
    const current = { ...allRecords[existingIdx] };
    const hasOut = current.time_out && current.time_out !== '--:--:--';
    const hasIn = current.time_in && current.time_in !== '--:--:--';

    if (!hasOut) {
      current.time_out = nowTime;
      current.status = 'ចេញក្រៅ';
      current.name = resolved.nameKm;
      current.gender = resolved.genderKm;
      allRecords[existingIdx] = current;
      localStorage.setItem(ATT_STORAGE_KEY, JSON.stringify(allRecords));
      try {
        await supabase
          .from('bipa_attendance')
          .update({
            full_name: resolved.nameKm,
            gender: resolved.genderKm,
            time_out: nowTime,
            status: 'ចេញក្រៅ',
          })
          .eq('id', current.id);
      } catch {}
      window.dispatchEvent(new Event('attendance-updated'));
      return {
        ok: true,
        action: 'OUT',
        studentName: resolved.nameKm,
        time: nowTime,
        message: `ស្កែនចេញជោគជ័យ! (${resolved.nameKm} - ${nowTime})`,
      };
    }

    if (!hasIn) {
      current.time_in = nowTime;
      current.status = 'វត្តមាន';
      current.name = resolved.nameKm;
      current.gender = resolved.genderKm;
      allRecords[existingIdx] = current;
      localStorage.setItem(ATT_STORAGE_KEY, JSON.stringify(allRecords));
      try {
        await supabase
          .from('bipa_attendance')
          .update({
            full_name: resolved.nameKm,
            gender: resolved.genderKm,
            time_in: nowTime,
            status: 'វត្តមាន',
          })
          .eq('id', current.id);
      } catch {}
      window.dispatchEvent(new Event('attendance-updated'));
      return {
        ok: true,
        action: 'IN',
        studentName: resolved.nameKm,
        time: nowTime,
        message: `ស្កែនចូលជោគជ័យ! (${resolved.nameKm} - ${nowTime})`,
      };
    }

    return {
      ok: false,
      message: `${resolved.nameKm} បានស្កែនចេញ និងស្កែនចូលគ្រប់ ២ ដងរួចរាល់ហើយថ្ងៃនេះ!`,
    };
  }

  const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
  const newEntry = {
    id: newId,
    student_code: resolved.code,
    name: resolved.nameKm,
    gender: resolved.genderKm,
    time_out: nowTime,
    time_in: '--:--:--',
    status: 'ចេញក្រៅ',
    date: todayStr,
  };
  const updatedAll = [newEntry, ...allRecords];
  localStorage.setItem(ATT_STORAGE_KEY, JSON.stringify(updatedAll));

  try {
    await supabase.from('bipa_attendance').insert([
      {
        id: newId,
        student_code: resolved.code,
        full_name: resolved.nameKm,
        gender: resolved.genderKm,
        time_out: nowTime,
        time_in: '--:--:--',
        status: 'ចេញក្រៅ',
        attendance_date: todayStr,
      },
    ]);
  } catch {}

  window.dispatchEvent(new Event('attendance-updated'));
  return {
    ok: true,
    action: 'OUT',
    studentName: resolved.nameKm,
    time: nowTime,
    message: `ស្កែនចេញជោគជ័យ! (${resolved.nameKm} - ${nowTime})`,
  };
}

export function Header() {
  const { user, profile, signOut, hasRole } = useAuth();
  const { t, lang, setLang } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processingLockRef = useRef(false);

  const systemLogoUrl = "https://i.ibb.co/tphX7kd4/ce2e43f3-9d48-4d71-86a6-dd1ac3d77c49.png";
  const systemNameEn = "BIPA";
  const systemNameKm = "BIPA";

  const mainNavItems = [
    { key: 'nav.home', path: '/', icon: Home, labelKm: 'ផ្ទះ', labelEn: 'Home' },
    { key: 'nav.attendance', path: '/attendance', icon: UserCheck, labelKm: 'វត្តមាន', labelEn: 'Attendance' },
    { key: 'nav.leave', path: '/leave', icon: FileText, labelKm: 'សុំច្បាប់', labelEn: 'Leave' },
    { key: 'nav.about', path: '/about', icon: Info, labelKm: 'អំពីយើង', labelEn: 'About' },
  ];

  const extraNavItems: { key: TranslationKey; path: string; icon: typeof Home }[] = [
    { key: 'nav.residence', path: '/residence-info', icon: Building2 },
    { key: 'nav.announcements', path: '/announcements', icon: Megaphone },
    { key: 'nav.contact', path: '/contact', icon: Phone },
  ];

  const isActive = (path: string) => location.pathname === path;
  const isAdmin = hasRole('super_admin', 'residence_admin', 'finance_admin', 'duty_manager');
  const isAdminRoute = location.pathname.startsWith('/admin');

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  useEffect(() => {
    let isMounted = true;

    const startCamera = async () => {
      if (!showScanner) return;
      processingLockRef.current = false;

      const linkedId = (localStorage.getItem('bipa_linked_student_id') || '').trim();
      if (!linkedId) {
        setScanFeedback({
          type: 'error',
          text: 'អ្នកមិនទាន់បានភ្ជាប់អត្តលេខសិស្ស (ID) ទេ! សូមភ្ជាប់ ID ក្នុងទំព័រវត្តមានជាមុនសិន។',
        });
      } else {
        setScanFeedback(null);
      }

      await new Promise((r) => setTimeout(r, 250));
      if (!isMounted || !document.getElementById('global-qr-reader')) return;

      try {
        const html5QrCode = new Html5Qrcode('global-qr-reader');
        scannerRef.current = html5QrCode;

        const devices = await Html5Qrcode.getCameras();
        if (!devices || devices.length === 0) {
          setScanFeedback({
            type: 'error',
            text: 'រកមិនឃើញកាមេរ៉ាទេ សូមប្រើប៊ូតុងជ្រើសរើសរូប QR ខាងក្រោម។',
          });
          return;
        }

        const backCam = devices.find(
          (d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment')
        );
        const cameraId = backCam ? backCam.id : devices[0].id;

        await html5QrCode.start(
          cameraId,
          { fps: 10, qrbox: { width: 220, height: 220 } },
          async (decodedText) => {
            if (processingLockRef.current) return;
            processingLockRef.current = true;

            const res = await processAttendanceScan(decodedText);
            if (!isMounted) return;

            if (res.ok) {
              setScanFeedback({ type: 'success', text: res.message });
              setTimeout(() => {
                if (scannerRef.current?.isScanning) {
                  scannerRef.current
                    .stop()
                    .then(() => scannerRef.current?.clear())
                    .catch(() => {});
                }
                if (isMounted) {
                  setShowScanner(false);
                  navigate('/attendance');
                }
              }, 1400);
            } else {
              setScanFeedback({ type: 'error', text: res.message });
              setTimeout(() => {
                processingLockRef.current = false;
              }, 2200);
            }
          },
          () => {}
        );
      } catch {
        if (isMounted) {
          setScanFeedback({
            type: 'error',
            text: 'សូមអនុញ្ញាតសិទ្ធិកាមេរ៉ា (Allow Camera) ឬជ្រើសរើសរូបភាព QR ខាងក្រោម។',
          });
        }
      }
    };

    if (showScanner) {
      startCamera();
    }

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        const sc = scannerRef.current;
        if (sc.isScanning) {
          sc.stop().then(() => sc.clear()).catch(() => {});
        } else {
          try {
            sc.clear();
          } catch {}
        }
        scannerRef.current = null;
      }
    };
  }, [showScanner, navigate]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const html5QrCode = scannerRef.current || new Html5Qrcode('global-qr-reader');
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop();
      }
      const decodedText = await html5QrCode.scanFile(file, true);
      const res = await processAttendanceScan(decodedText);
      if (res.ok) {
        setScanFeedback({ type: 'success', text: res.message });
        setTimeout(() => {
          setShowScanner(false);
          navigate('/attendance');
        }, 1300);
      } else {
        setScanFeedback({ type: 'error', text: res.message });
      }
    } catch {
      setScanFeedback({
        type: 'error',
        text: 'រូបភាពនេះមិនមានកូដ QR ត្រឹមត្រូវទេ សូមជ្រើសរើសរូបម្តងទៀត។',
      });
    }
    e.target.value = '';
  };

  const renderRole = (role?: string) => {
    if (!role) return 'STUDENT';
    return role.replace(/_/g, ' ').toUpperCase();
  };

  const currentLinkedId = localStorage.getItem('bipa_linked_student_id') || '';

  return (
    <>
      {showScanner && (
        <div className="fixed inset-0 z-[100] bg-[#09090b] flex flex-col items-center justify-center p-4 font-khmer">
          <style>{`
            @keyframes scanLine {
              0% { top: 8%; }
              50% { top: 92%; }
              100% { top: 8%; }
            }
            .animate-scan {
              animation: scanLine 2.5s ease-in-out infinite;
            }
            #global-qr-reader video {
              width: 100% !important;
              height: 100% !important;
              object-fit: cover !important;
              border-radius: 1rem;
            }
          `}</style>

          <div className="mb-3 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
            អត្តលេខសិស្សបច្ចុប្បន្ន៖{' '}
            <span className={cn('font-bold', currentLinkedId ? 'text-emerald-400' : 'text-red-400')}>
              {currentLinkedId || 'មិនទាន់ភ្ជាប់ ID'}
            </span>
          </div>

          <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-2xl overflow-hidden mb-5 bg-slate-900 flex items-center justify-center">
            <div id="global-qr-reader" className="w-full h-full" />
            <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-white rounded-tl-2xl z-10 pointer-events-none" />
            <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-white rounded-tr-2xl z-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-white rounded-bl-2xl z-10 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-white rounded-br-2xl z-10 pointer-events-none" />
            <div className="absolute left-4 right-4 h-0.5 bg-green-400 shadow-[0_0_12px_#4ade80] animate-scan z-20 pointer-events-none" />
          </div>

          {scanFeedback ? (
            <div
              className={cn(
                'max-w-xs w-full px-4 py-3 rounded-xl mb-5 text-xs font-bold flex items-center gap-2.5 border shadow-lg',
                scanFeedback.type === 'success'
                  ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300'
                  : 'bg-red-950/90 border-red-500 text-red-300'
              )}
            >
              {scanFeedback.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
              )}
              <span className="leading-relaxed">{scanFeedback.text}</span>
            </div>
          ) : (
            <p className="text-slate-400 text-xs mb-6">
              ស្កែនលើកទី១ = ម៉ោងចេញ | ស្កែនលើកទី២ = ម៉ោងចូល
            </p>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          <div className="flex items-center gap-3">
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-full px-5 py-5 shadow-lg text-xs font-bold"
            >
              <ImageUp className="h-4 w-4 mr-2" />
              ជ្រើសរើសរូប QR
            </Button>

            <Button
              onClick={() => setShowScanner(false)}
              className="bg-white/10 hover:bg-white/20 text-white rounded-full px-6 py-5 border border-white/10 shadow-lg text-xs font-bold"
            >
              <X className="h-4 w-4 mr-2" />
              បិទកាមេរ៉ា
            </Button>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-50 bg-[#0f172a] text-white shadow-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden shrink-0 bg-white">
                {systemLogoUrl ? (
                  <img src={systemLogoUrl} alt="Logo" className="w-full h-full object-contain p-0.5" />
                ) : (
                  <div className="flex items-center justify-center w-full h-full bg-gold-gradient">
                    <GraduationCap className="h-6 w-6 text-navy" />
                  </div>
                )}
              </div>
              <div className="text-left flex flex-col justify-center font-khmer">
                <div className="text-base sm:text-xl font-bold leading-tight tracking-wide">
                  {lang === 'km' ? systemNameKm : systemNameEn}
                </div>
              </div>
            </button>

            <div className="hidden md:flex items-center bg-[#1e293b] rounded-full px-2 py-1.5 shadow-inner border border-slate-700/50">
              {mainNavItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-all duration-300 font-khmer',
                    isActive(item.path) ? 'bg-[#3b82f6] text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{lang === 'km' ? item.labelKm : item.labelEn}</span>
                </button>
              ))}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all duration-300 font-khmer">
                    <LayoutGrid className="h-4 w-4" />
                    <span>{lang === 'km' ? 'ម៉ឺនុយ' : 'Menu'}</span>
                    <ChevronDown className="h-3 w-3 opacity-70" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-[#1e293b] border-slate-700 text-white font-khmer">
                  {extraNavItems.map((item) => (
                    <DropdownMenuItem key={item.path} onClick={() => navigate(item.path)} className="hover:bg-slate-800 cursor-pointer">
                      <item.icon className="h-4 w-4 mr-3 text-slate-400" />
                      {t(item.key)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center md:mr-2 md:border-r border-slate-700 md:pr-4">
                <Button
                  onClick={() => setShowScanner(true)}
                  className="bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.4)] w-10 h-10 sm:w-11 sm:h-11 border-0 p-0 flex items-center justify-center transition-transform hover:scale-105"
                >
                  <QrCode className="h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
              </div>

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="hidden md:flex text-white hover:bg-slate-800 gap-2 px-2 h-11 rounded-xl">
                      <Avatar className="h-8 w-8 border border-slate-600">
                        <AvatarImage src={profile?.avatar_url ? profile.avatar_url : undefined} />
                        <AvatarFallback className="bg-[#eab308] text-[#0f172a] text-xs font-bold">
                          {profile?.display_name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col items-start justify-center">
                        <span className="text-sm font-medium max-w-[100px] truncate leading-none">{profile?.display_name || 'User'}</span>
                        <span className="text-[10px] text-slate-400 mt-1 uppercase leading-none">{renderRole(profile?.role)}</span>
                      </div>
                      <ChevronDown className="h-4 w-4 opacity-50 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-[#1e293b] border-slate-700 text-white font-khmer">
                    <DropdownMenuLabel>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium">{profile?.display_name || 'User'}</span>
                        <span className="text-xs text-slate-400">{profile?.email || ''}</span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-slate-700" />
                    <DropdownMenuItem onClick={() => navigate('/dashboard')} className="hover:bg-slate-800 cursor-pointer"><LayoutDashboard className="h-4 w-4 mr-3 text-slate-400" />{t('nav.dashboard')}</DropdownMenuItem>
                    
                    {isAdminRoute ? (
                      <DropdownMenuItem onClick={() => navigate('/')} className="hover:bg-slate-800 cursor-pointer"><Eye className="h-4 w-4 mr-3 text-slate-400" />View Site</DropdownMenuItem>
                    ) : (
                      isAdmin && <DropdownMenuItem onClick={() => navigate('/admin')} className="hover:bg-slate-800 cursor-pointer"><Shield className="h-4 w-4 mr-3 text-slate-400" />{t('dashboard.adminDashboard')}</DropdownMenuItem>
                    )}

                    <DropdownMenuItem onClick={() => navigate('/profile')} className="hover:bg-slate-800 cursor-pointer"><User className="h-4 w-4 mr-3 text-slate-400" />{t('nav.profile')}</DropdownMenuItem>
                    
                    <DropdownMenuSeparator className="bg-slate-700" />
                    <div className="px-2 py-2 flex items-center justify-between">
                      <Button variant="ghost" size="sm" onClick={() => setLang(lang === 'en' ? 'km' : 'en')} className="text-slate-300 hover:text-white hover:bg-slate-800">
                        <Languages className="h-4 w-4 mr-2" />
                        {lang === 'en' ? 'KH' : 'EN'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={toggleTheme} className="text-slate-300 hover:text-white hover:bg-slate-800">
                        {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                      </Button>
                    </div>
                    <DropdownMenuSeparator className="bg-slate-700" />

                    <DropdownMenuItem onClick={handleSignOut} className="text-red-400 hover:bg-slate-800 hover:text-red-300 cursor-pointer"><LogOut className="h-4 w-4 mr-3" />{t('nav.signOut')}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="hidden md:flex items-center gap-2 font-khmer">
                  <Button variant="ghost" size="sm" onClick={() => navigate('/signin')} className="text-white hover:bg-white/10"><LogIn className="h-4 w-4 mr-2" />{t('nav.signIn')}</Button>
                  <Button size="sm" onClick={() => navigate('/signup')} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold"><UserPlus className="h-4 w-4 mr-2" />{t('nav.createAccount')}</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#0f172a] border-t border-slate-200 dark:border-slate-800 flex items-center justify-around h-16 pb-safe px-1 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] font-khmer">
        <button onClick={() => navigate('/')} className={cn("flex flex-col items-center justify-center w-full gap-1 transition-colors", isActive('/') ? "text-[#3b82f6]" : "text-slate-500 dark:text-slate-400")}>
          <Home className="h-[22px] w-[22px]" />
          <span className="text-[10px] font-medium">{lang === 'km' ? 'ផ្ទះ' : 'Home'}</span>
        </button>

        <button onClick={() => navigate('/attendance')} className={cn("flex flex-col items-center justify-center w-full gap-1 transition-colors", isActive('/attendance') ? "text-[#3b82f6]" : "text-slate-500 dark:text-slate-400")}>
          <div className={cn("p-1.5 rounded-full transition-colors", isActive('/attendance') ? "bg-blue-50 dark:bg-blue-950/60" : "")}>
            <UserCheck className="h-[20px] w-[20px]" />
          </div>
          <span className="text-[10px] font-bold">{lang === 'km' ? 'វត្តមាន' : 'Attendance'}</span>
        </button>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center shrink-0 -mt-7 mx-1">
              <div className="bg-[#1e293b] text-white h-[52px] w-[52px] flex items-center justify-center rounded-full shadow-lg border-[4px] border-white dark:border-[#0f172a] transition-transform active:scale-95">
                <Menu className="h-6 w-6" />
              </div>
              <span className="text-[10px] font-medium mt-1 text-slate-600 dark:text-slate-300">{lang === 'km' ? 'ម៉ឺនុយ' : 'Menu'}</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto bg-white dark:bg-[#0f172a] p-0 border-t border-slate-200 dark:border-slate-800 font-khmer">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <SheetDescription className="sr-only">Mobile navigation links</SheetDescription>
            <div className="p-5 flex flex-col gap-4">
              {user && (
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                  <Avatar className="h-10 w-10 border border-slate-200 dark:border-slate-600">
                    <AvatarImage src={profile?.avatar_url ? profile.avatar_url : undefined} />
                    <AvatarFallback className="bg-[#3b82f6] text-white font-bold">
                      {profile?.display_name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-800 dark:text-white">{profile?.display_name || 'User'}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{profile?.email || ''}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-2">
                <Button variant="outline" size="sm" onClick={() => setLang(lang === 'en' ? 'km' : 'en')} className="flex items-center justify-center gap-2 h-10 border-slate-200 dark:border-slate-700 bg-transparent text-slate-700 dark:text-slate-200">
                  <Languages className="h-4 w-4" />
                  {lang === 'en' ? 'ប្តូរជាខ្មែរ' : 'English'}
                </Button>
                <Button variant="outline" size="sm" onClick={toggleTheme} className="flex items-center justify-center gap-2 h-10 border-slate-200 dark:border-slate-700 bg-transparent text-slate-700 dark:text-slate-200">
                  {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                </Button>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-1">Menu</div>

                {user && (
                  <>
                    <Button variant="ghost" onClick={() => { navigate('/dashboard'); setMobileOpen(false); }} className="w-full justify-start h-12 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
                      <LayoutDashboard className="h-5 w-5 mr-3 text-[#3b82f6]" /> {t('nav.dashboard')}
                    </Button>
                    {isAdminRoute ? (
                      <Button variant="ghost" onClick={() => { navigate('/'); setMobileOpen(false); }} className="w-full justify-start h-12 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <Eye className="h-5 w-5 mr-3 text-emerald-500" /> View Site
                      </Button>
                    ) : (
                      isAdmin && <Button variant="ghost" onClick={() => { navigate('/admin'); setMobileOpen(false); }} className="w-full justify-start h-12 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <Shield className="h-5 w-5 mr-3 text-[#eab308]" /> {t('dashboard.adminDashboard')}
                      </Button>
                    )}
                  </>
                )}

                {extraNavItems.map((item) => (
                  <Button key={item.path} variant="ghost" onClick={() => { navigate(item.path); setMobileOpen(false); }} className="w-full justify-start h-12 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <item.icon className="h-5 w-5 mr-3 text-slate-400" /> {t(item.key)}
                  </Button>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                {user ? (
                  <Button variant="ghost" onClick={() => { handleSignOut(); setMobileOpen(false); }} className="w-full justify-start h-12 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
                    <LogOut className="h-5 w-5 mr-3" /> {t('nav.signOut')}
                  </Button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" onClick={() => { navigate('/signin'); setMobileOpen(false); }} className="w-full h-11 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200">
                      <LogIn className="h-4 w-4 mr-2" /> {t('nav.signIn')}
                    </Button>
                    <Button onClick={() => { navigate('/signup'); setMobileOpen(false); }} className="w-full h-11 bg-[#3b82f6] hover:bg-[#2563eb] text-white">
                      <UserPlus className="h-4 w-4 mr-2" /> {t('nav.createAccount')}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <button onClick={() => navigate('/leave')} className={cn("flex flex-col items-center justify-center w-full gap-1 transition-colors", isActive('/leave') ? "text-[#3b82f6]" : "text-slate-500 dark:text-slate-400")}>
          <FileText className="h-[22px] w-[22px]" />
          <span className="text-[10px] font-medium">{lang === 'km' ? 'សុំច្បាប់' : 'Leave'}</span>
        </button>

        <button onClick={() => navigate('/about')} className={cn("flex flex-col items-center justify-center w-full gap-1 transition-colors", isActive('/about') ? "text-[#3b82f6]" : "text-slate-500 dark:text-slate-400")}>
          <Info className="h-[22px] w-[22px]" />
          <span className="text-[10px] font-medium">{lang === 'km' ? 'អំពីយើង' : 'About'}</span>
        </button>
      </div>
    </>
  );
}