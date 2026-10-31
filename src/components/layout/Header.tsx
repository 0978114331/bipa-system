import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Home,
  Info,
  Building2,
  Megaphone,
  Phone,
  LogIn,
  UserPlus,
  LogOut,
  LayoutDashboard,
  User,
  Menu,
  Sun,
  Moon,
  Languages,
  GraduationCap,
  ChevronDown,
  Shield,
  QrCode,
  Eye,
  UserCheck,
  FileText,
  LayoutGrid,
  X,
  Check
} from 'lucide-react';
import { initialStudents, BipaStudent } from '@/pages/admin/StudentListPage';
import { TranslationKey } from '@/types';
import { cn } from '@/lib/utils';
import { DutyScheduleUserView, DutyRosterAdminPanel } from '@/components/duty/DutyScheduleSystem';
import { GlobalPaymentBadgeEnhancer } from '@/components/payment/PaymentManagementSystem';

const ATT_STORAGE_KEY = 'bipa_attendance_sync_v4';

export interface ScanProcessResult {
  ok: boolean;
  action?: 'OUT' | 'IN';
  studentName?: string;
  time?: string;
  shortTitle?: string;
  message: string;
}

const hasKhmerScript = (text?: string) => /[\u1780-\u17FF]/.test(String(text || ''));

export const normalizeGenderToKhmer = (raw?: string) => {
  const val = String(raw || '').trim();
  if (val === 'ស្រី' || val.toUpperCase() === 'F' || val.toUpperCase() === 'FEMALE') return 'ស្រី';
  return 'ប្រុស';
};

export const normalizeStudentCodeInput = (raw: string) => {
  let cleaned = String(raw || '').trim().replace(/\s+/g, '').toUpperCase();
  if (cleaned.startsWith('PIBA-')) {
    cleaned = 'BIPA-' + cleaned.slice(5);
  } else if (cleaned.startsWith('PIBA')) {
    cleaned = 'BIPA-' + cleaned.slice(4);
  } else if (/^\d{1,4}$/.test(cleaned)) {
    cleaned = 'BIPA-' + cleaned.padStart(3, '0');
  }
  return cleaned;
};

export async function resolveStudentByIdOrName(query: string): Promise<{
  code: string;
  nameKm: string;
  genderKm: string;
} | null> {
  const clean = normalizeStudentCodeInput(query);
  if (!clean) return null;

  let localList: BipaStudent[] = [];
  const savedDir =
    localStorage.getItem('bipa_students_directory_v2') ||
    localStorage.getItem('bipa_students_directory');
  if (savedDir) {
    try {
      const parsed = JSON.parse(savedDir);
      if (Array.isArray(parsed)) localList = parsed;
    } catch {}
  }

  let dbList: BipaStudent[] = [];
  try {
    const { data } = await supabase.from('bipa_students').select('*');
    if (data && data.length > 0) {
      dbList = data.map((r: any) => {
        const fb = initialStudents.find(
          (s) => s.student_code.toLowerCase() === String(r.student_code || '').trim().toLowerCase()
        );
        const gKm = normalizeGenderToKhmer(r.gender_km || fb?.gender_km || r.gender);
        const dbNameKm = hasKhmerScript(r.full_name_km)
          ? r.full_name_km
          : hasKhmerScript(r.full_name)
          ? r.full_name
          : fb?.full_name_km || r.full_name_km || r.full_name || '';

        return {
          id: String(r.id),
          student_code: String(r.student_code || fb?.student_code || '').trim().toUpperCase(),
          full_name_km: dbNameKm,
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
          others_en: r.others_en || ''
        };
      });
    }
  } catch {}

  const mapByCode = new Map<string, BipaStudent>();
  [...initialStudents, ...dbList, ...localList].forEach((s) => {
    const c = String(s.student_code || '').trim().toUpperCase();
    if (!c) return;
    const prev = mapByCode.get(c);
    const bestKm = hasKhmerScript(s.full_name_km)
      ? s.full_name_km
      : hasKhmerScript(prev?.full_name_km)
      ? prev!.full_name_km
      : s.full_name_km || prev?.full_name_km || s.full_name_en;
    const bestGender =
      s.gender_km === 'ស្រី' || prev?.gender_km === 'ស្រី'
        ? 'ស្រី'
        : normalizeGenderToKhmer(s.gender_km || prev?.gender_km);
    mapByCode.set(c, {
      ...s,
      student_code: c,
      full_name_km: bestKm,
      gender_km: bestGender
    });
  });

  const combined = Array.from(mapByCode.values());
  const rawDigits = clean.replace(/\D/g, '');

  const matched = combined.find((s) => {
    const sCode = normalizeStudentCodeInput(s.student_code || '');
    const sDigits = sCode.replace(/\D/g, '');
    const sNameKm = String(s.full_name_km || '').trim().toLowerCase();
    const sNameEn = String(s.full_name_en || '').trim().toLowerCase();
    return (
      sCode.toLowerCase() === clean.toLowerCase() ||
      (rawDigits.length > 0 && sDigits.length > 0 && Number(sDigits) === Number(rawDigits)) ||
      sNameKm === query.trim().toLowerCase() ||
      sNameEn === query.trim().toLowerCase()
    );
  });

  if (!matched) return null;

  const initMatch = initialStudents.find(
    (s) => s.student_code.toLowerCase() === matched.student_code.toLowerCase()
  );
  const khmerName = hasKhmerScript(matched.full_name_km)
    ? matched.full_name_km
    : initMatch?.full_name_km || matched.full_name_km || matched.full_name_en;
  const genderKm =
    initMatch?.gender_km === 'ស្រី' || matched.gender_km === 'ស្រី'
      ? 'ស្រី'
      : normalizeGenderToKhmer(matched.gender_km);

  return {
    code: matched.student_code,
    nameKm: khmerName,
    genderKm
  };
}

export async function processAttendanceScan(scannedCode: string): Promise<ScanProcessResult> {
  const raw = scannedCode.trim();
  const linkedId = (localStorage.getItem('bipa_linked_student_id') || '').trim();
  const isStationQr =
    raw.toUpperCase().startsWith('BIPA-STATION') ||
    raw.toUpperCase() === 'BIPA-QR' ||
    raw.toUpperCase() === 'BIPA-ATTENDANCE' ||
    raw.startsWith('http');

  if (isStationQr && !linkedId) {
    return {
      ok: false,
      shortTitle: 'សូមភ្ជាប់ ID សិន',
      message: 'សូមភ្ជាប់អត្តលេខសិស្ស (ID) របស់អ្នកជាមុនសិន មុនពេលស្កែន!'
    };
  }

  const lookupCode = normalizeStudentCodeInput(isStationQr ? linkedId : raw);
  if (!lookupCode) {
    return {
      ok: false,
      shortTitle: 'សូមភ្ជាប់ ID សិន',
      message: 'មិនឃើញអត្តលេខសិស្ស (ID) សម្រាប់ស្កែនទេ សូមភ្ជាប់ ID ជាមុនសិន!'
    };
  }

  const resolved = await resolveStudentByIdOrName(lookupCode);
  if (!resolved) {
    return {
      ok: false,
      shortTitle: 'មិនស្គាល់ ID ទេ',
      message: `រកមិនឃើញអត្តលេខ "${lookupCode}" ក្នុងបញ្ជីឈ្មោះនិស្សិតទេ!`
    };
  }

  if (linkedId && normalizeStudentCodeInput(linkedId) !== resolved.code) {
    localStorage.setItem('bipa_linked_student_id', resolved.code);
  }

  const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false });
  const todayStr = new Date().toDateString();

  let dbTodayRecords: any[] = [];
  try {
    const { data } = await supabase
      .from('bipa_attendance')
      .select('*')
      .eq('attendance_date', todayStr);
    if (data) dbTodayRecords = data;
  } catch {}

  const existingDb = dbTodayRecords.find(
    (r: any) => r.student_code && String(r.student_code).toLowerCase() === resolved.code.toLowerCase()
  );

  if (existingDb) {
    const isHidden = String(existingDb.status || '').includes('[HIDDEN]');
    const hasOut = existingDb.time_out && existingDb.time_out !== '--:--:--';
    const hasIn = existingDb.time_in && existingDb.time_in !== '--:--:--';

    if (isHidden) {
      await supabase
        .from('bipa_attendance')
        .update({
          full_name: resolved.nameKm,
          gender: resolved.genderKm,
          time_out: nowTime,
          time_in: '--:--:--',
          status: 'ចេញក្រៅ'
        })
        .eq('id', existingDb.id);
      window.dispatchEvent(new Event('attendance-updated'));
      return {
        ok: true,
        action: 'OUT',
        studentName: resolved.nameKm,
        time: nowTime,
        shortTitle: 'ស្កេនជោគជ័យ',
        message: `ស្កែនចេញជោគជ័យ! (${resolved.nameKm} - ${nowTime})`
      };
    }

    if (!hasOut) {
      await supabase
        .from('bipa_attendance')
        .update({
          full_name: resolved.nameKm,
          gender: resolved.genderKm,
          time_out: nowTime,
          status: 'ចេញក្រៅ'
        })
        .eq('id', existingDb.id);
      window.dispatchEvent(new Event('attendance-updated'));
      return {
        ok: true,
        action: 'OUT',
        studentName: resolved.nameKm,
        time: nowTime,
        shortTitle: 'ស្កេនជោគជ័យ',
        message: `ស្កែនចេញជោគជ័យ! (${resolved.nameKm} - ${nowTime})`
      };
    }

    if (!hasIn) {
      await supabase
        .from('bipa_attendance')
        .update({
          full_name: resolved.nameKm,
          gender: resolved.genderKm,
          time_in: nowTime,
          status: 'វត្តមាន'
        })
        .eq('id', existingDb.id);
      window.dispatchEvent(new Event('attendance-updated'));
      return {
        ok: true,
        action: 'IN',
        studentName: resolved.nameKm,
        time: nowTime,
        shortTitle: 'ស្កេនជោគជ័យ',
        message: `ស្កែនចូលជោគជ័យ! (${resolved.nameKm} - ${nowTime})`
      };
    }

    return {
      ok: false,
      shortTitle: 'ស្កេនរួចរាល់ហើយ',
      message: `${resolved.nameKm} បានស្កែនចេញ និងស្កែនចូលគ្រប់ ២ ដងរួចរាល់ហើយថ្ងៃនេះ!`
    };
  }

  const newId =
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
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
        attendance_date: todayStr
      }
    ]);
  } catch {}

  const saved = localStorage.getItem(ATT_STORAGE_KEY);
  const localArr: any[] = saved ? JSON.parse(saved) : [];
  localStorage.setItem(
    ATT_STORAGE_KEY,
    JSON.stringify([
      {
        id: newId,
        student_code: resolved.code,
        name: resolved.nameKm,
        gender: resolved.genderKm,
        time_out: nowTime,
        time_in: '--:--:--',
        status: 'ចេញក្រៅ',
        date: todayStr
      },
      ...localArr
    ])
  );

  window.dispatchEvent(new Event('attendance-updated'));
  return {
    ok: true,
    action: 'OUT',
    studentName: resolved.nameKm,
    time: nowTime,
    shortTitle: 'ស្កេនជោគជ័យ',
    message: `ស្កែនចេញជោគជ័យ! (${resolved.nameKm} - ${nowTime})`
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
  const [scanStage, setScanStage] = useState<'scanning' | 'processing' | 'success' | 'error'>(
    'scanning'
  );
  const [scanOverlayLabel, setScanOverlayLabel] = useState('');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingLockRef = useRef(false);

  const [systemLogoUrl, setSystemLogoUrl] = useState(
    'https://i.ibb.co/tphX7kd4/ce2e43f3-9d48-4d71-86a6-dd1ac3d77c49.png'
  );
  const [systemNameKm, setSystemNameKm] = useState('BIPA');
  const [systemNameEn, setSystemNameEn] = useState('BIPA');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase.from('bipa_settings').select('*').eq('id', '1').single();
        if (data) {
          setSystemLogoUrl(data.logo_url);
          setSystemNameKm(data.name_km);
          setSystemNameEn(data.name_en);
        }
      } catch {}
    };

    fetchSettings();

    window.addEventListener('system-settings-updated', fetchSettings);
    return () => window.removeEventListener('system-settings-updated', fetchSettings);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (mobileOpen || showScanner) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen, showScanner]);

  const mainNavItems = [
    { key: 'nav.home', path: '/', icon: Home, labelKm: 'ផ្ទះ', labelEn: 'Home' },
    { key: 'nav.attendance', path: '/attendance', icon: UserCheck, labelKm: 'វត្តមាន', labelEn: 'Attendance' },
    { key: 'nav.leave', path: '/leave', icon: FileText, labelKm: 'សុំច្បាប់', labelEn: 'Leave' },
    { key: 'nav.about', path: '/about', icon: Info, labelKm: 'អំពីយើង', labelEn: 'About' }
  ];

  const extraNavItems: { key: TranslationKey; path: string; icon: typeof Home; color: string }[] = [
    { key: 'nav.residence', path: '/residence-info', icon: Building2, color: 'text-cyan-500' },
    { key: 'nav.announcements', path: '/announcements', icon: Megaphone, color: 'text-amber-500' },
    { key: 'nav.contact', path: '/contact', icon: Phone, color: 'text-indigo-400' }
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
      setScanStage('scanning');
      setScanOverlayLabel('');

      await new Promise((r) => setTimeout(r, 100));
      if (!isMounted || !document.getElementById('global-qr-reader')) return;

      try {
        const html5QrCode = new Html5Qrcode('global-qr-reader', {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          useBarCodeDetectorIfSupported: true,
          verbose: false
        });
        scannerRef.current = html5QrCode;

        const onScanSuccess = async (decodedText: string) => {
          if (processingLockRef.current || !isMounted) return;
          processingLockRef.current = true;

          if (navigator.vibrate) {
            try {
              navigator.vibrate(40);
            } catch {}
          }

          setScanStage('processing');
          setScanOverlayLabel('កំពុងដំណើរការ...');

          const [res] = await Promise.all([
            processAttendanceScan(decodedText),
            new Promise((resolve) => setTimeout(resolve, 420))
          ]);

          if (!isMounted) return;

          if (res.ok) {
            setScanStage('success');
            setScanOverlayLabel(res.shortTitle || 'ស្កេនជោគជ័យ');
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
            }, 900);
          } else {
            setScanStage('error');
            setScanOverlayLabel(res.shortTitle || 'ស្កេនរួចរាល់ហើយ');
            setTimeout(() => {
              if (!isMounted) return;
              setScanStage('scanning');
              setScanOverlayLabel('');
              processingLockRef.current = false;
            }, 1500);
          }
        };

        const scanConfig = {
          fps: 30,
          aspectRatio: 1.0,
          disableFlip: false
        };

        try {
          await html5QrCode.start(
            { facingMode: 'environment' },
            {
              ...scanConfig,
              videoConstraints: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 }
              }
            },
            onScanSuccess,
            () => {}
          );
        } catch {
          const devices = await Html5Qrcode.getCameras();
          if (!devices || devices.length === 0) {
            setScanStage('error');
            setScanOverlayLabel('មិនឃើញកាមេរ៉ា');
            return;
          }
          const backCam =
            devices.find(
              (d) =>
                d.label.toLowerCase().includes('back') ||
                d.label.toLowerCase().includes('environment') ||
                d.label.toLowerCase().includes('rear')
            ) || devices[devices.length - 1];

          await html5QrCode.start(backCam.id, scanConfig, onScanSuccess, () => {});
        }
      } catch {
        if (isMounted) {
          setScanStage('error');
          setScanOverlayLabel('សូមបើកសិទ្ធិកាមេរ៉ា');
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

  const renderRole = (role?: string) => {
    if (!role) return 'STUDENT';
    return role.replace(/_/g, ' ').toUpperCase();
  };

  return (
    <>
      <style>{`
        @keyframes bipaSheetSlideUp {
          0% {
            opacity: 0;
            transform: translateY(100%);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-bipa-sheet-up {
          animation: bipaSheetSlideUp 0.26s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {showScanner && (
        <div className="fixed inset-0 z-[140] bg-[#070b14] flex flex-col items-center justify-center p-6 font-khmer select-none">
          <style>{`
            @keyframes scanLine {
              0% { top: 8%; }
              50% { top: 92%; }
              100% { top: 8%; }
            }
            .animate-scan {
              animation: scanLine 2.1s ease-in-out infinite;
            }
            #global-qr-reader {
              border: none !important;
              width: 100% !important;
              height: 100% !important;
            }
            #global-qr-reader video {
              width: 100% !important;
              height: 100% !important;
              object-fit: cover !important;
              border-radius: 1.5rem !important;
            }
            #global-qr-reader img,
            #global-qr-reader canvas,
            #global-qr-reader__dashboard,
            #global-qr-reader__header_message,
            #global-qr-reader__scan_region > div {
              display: none !important;
            }
          `}</style>

          <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-[24px] overflow-hidden bg-[#111827] shadow-[0_0_50px_rgba(0,0,0,0.85)] flex items-center justify-center">
            <div id="global-qr-reader" className="w-full h-full" />

            <div className="absolute top-0 left-0 w-11 h-11 border-t-[4px] border-l-[4px] border-white rounded-tl-[24px] z-10 pointer-events-none" />
            <div className="absolute top-0 right-0 w-11 h-11 border-t-[4px] border-r-[4px] border-white rounded-tr-[24px] z-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-11 h-11 border-b-[4px] border-l-[4px] border-white rounded-bl-[24px] z-10 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-11 h-11 border-b-[4px] border-r-[4px] border-white rounded-br-[24px] z-10 pointer-events-none" />

            {scanStage === 'scanning' && (
              <div className="absolute left-4 right-4 h-0.5 bg-emerald-400 shadow-[0_0_12px_#34d399] animate-scan z-20 pointer-events-none" />
            )}

            {scanStage !== 'scanning' && (
              <div className="absolute inset-0 z-30 bg-black/65 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center animate-in fade-in duration-150">
                {scanStage === 'processing' && (
                  <>
                    <div className="w-14 h-14 rounded-full border-4 border-white/20 border-t-white animate-spin mb-3.5" />
                    <span className="text-white font-extrabold text-sm sm:text-base tracking-wide drop-shadow">
                      {scanOverlayLabel || 'កំពុងដំណើរការ...'}
                    </span>
                  </>
                )}

                {scanStage === 'success' && (
                  <>
                    <div className="w-16 h-16 rounded-full bg-[#10b981] flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.55)] mb-3.5 animate-in zoom-in-75 duration-200">
                      <div className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center">
                        <Check className="h-4 w-4 text-white stroke-[3]" />
                      </div>
                    </div>
                    <span className="text-[#10b981] font-extrabold text-sm sm:text-base tracking-wide drop-shadow">
                      {scanOverlayLabel || 'ស្កេនជោគជ័យ'}
                    </span>
                  </>
                )}

                {scanStage === 'error' && (
                  <>
                    <div className="w-16 h-16 rounded-full bg-[#dc2626] flex items-center justify-center shadow-[0_0_25px_rgba(220,38,38,0.55)] mb-3.5 animate-in zoom-in-75 duration-200">
                      <X className="h-8 w-8 text-white stroke-[2.5]" />
                    </div>
                    <span className="text-[#ef4444] font-extrabold text-sm sm:text-base tracking-wide drop-shadow">
                      {scanOverlayLabel || 'ស្កេនរួចរាល់ហើយ'}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          <p className="text-slate-500 text-xs sm:text-sm font-medium mt-8 mb-5 tracking-wide">
            ដាក់កូដ QR ឱ្យចំកណ្តាល
          </p>

          <button
            type="button"
            onClick={() => setShowScanner(false)}
            className="flex items-center justify-center gap-2.5 px-7 py-3 rounded-2xl bg-[#111622] hover:bg-[#1a2234] text-white border border-white/10 shadow-lg text-xs sm:text-sm font-bold active:scale-95 transition-all"
          >
            <X className="h-4 w-4 text-slate-300" />
            <span>បិទកាមេរ៉ា</span>
          </button>
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
                    isActive(item.path)
                      ? 'bg-[#3b82f6] text-white shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
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
                    <DropdownMenuItem
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className="hover:bg-slate-800 cursor-pointer"
                    >
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
                        <span className="text-sm font-medium max-w-[100px] truncate leading-none">
                          {profile?.display_name || 'User'}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1 uppercase leading-none">
                          {renderRole(profile?.role)}
                        </span>
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
                    <DropdownMenuItem onClick={() => navigate('/dashboard')} className="hover:bg-slate-800 cursor-pointer">
                      <LayoutDashboard className="h-4 w-4 mr-3 text-slate-400" />
                      {t('nav.dashboard')}
                    </DropdownMenuItem>

                    {isAdminRoute ? (
                      <DropdownMenuItem onClick={() => navigate('/')} className="hover:bg-slate-800 cursor-pointer">
                        <Eye className="h-4 w-4 mr-3 text-slate-400" />
                        View Site
                      </DropdownMenuItem>
                    ) : (
                      isAdmin && (
                        <DropdownMenuItem onClick={() => navigate('/admin')} className="hover:bg-slate-800 cursor-pointer">
                          <Shield className="h-4 w-4 mr-3 text-slate-400" />
                          {t('dashboard.adminDashboard')}
                        </DropdownMenuItem>
                      )
                    )}

                    <DropdownMenuItem onClick={() => navigate('/profile')} className="hover:bg-slate-800 cursor-pointer">
                      <User className="h-4 w-4 mr-3 text-slate-400" />
                      {t('nav.profile')}
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="bg-slate-700" />
                    <div className="px-2 py-2 flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLang(lang === 'en' ? 'km' : 'en')}
                        className="text-slate-300 hover:text-white hover:bg-slate-800"
                      >
                        <Languages className="h-4 w-4 mr-2" />
                        {lang === 'en' ? 'KH' : 'EN'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleTheme}
                        className="text-slate-300 hover:text-white hover:bg-slate-800"
                      >
                        {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                      </Button>
                    </div>
                    <DropdownMenuSeparator className="bg-slate-700" />

                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="text-red-400 hover:bg-slate-800 hover:text-red-300 cursor-pointer"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      {t('nav.signOut')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="hidden md:flex items-center gap-2 font-khmer">
                  <Button variant="ghost" size="sm" onClick={() => navigate('/signin')} className="text-white hover:bg-white/10">
                    <LogIn className="h-4 w-4 mr-2" />
                    {t('nav.signIn')}
                  </Button>
                  <Button size="sm" onClick={() => navigate('/signup')} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold">
                    <UserPlus className="h-4 w-4 mr-2" />
                    {t('nav.createAccount')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 z-[95] bg-black/60 backdrop-blur-[2px] font-khmer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}
            className="fixed left-0 right-0 z-[96] mx-auto w-full max-w-md rounded-t-[28px] bg-white dark:bg-[#151e2e] border-t border-slate-200 dark:border-slate-700/80 shadow-[0_-12px_35px_rgba(0,0,0,0.3)] max-h-[75dvh] overflow-y-auto animate-bipa-sheet-up"
          >
            <div className="p-3.5 sm:p-4 pb-5 flex flex-col gap-3">
              <div
                onClick={() => setMobileOpen(false)}
                className="w-11 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto cursor-pointer"
              />

              {user ? (
                <div className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-[#1e2a3f] p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/70">
                  <div
                    onClick={() => {
                      navigate('/profile');
                      setMobileOpen(false);
                    }}
                    className="flex items-center gap-2.5 min-w-0 cursor-pointer"
                  >
                    <Avatar className="h-9 w-9 border border-slate-300 dark:border-slate-600 shrink-0">
                      <AvatarImage src={profile?.avatar_url ? profile.avatar_url : undefined} />
                      <AvatarFallback className="bg-[#3b82f6] text-white font-bold text-xs">
                        {profile?.display_name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {profile?.display_name || 'User'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                          {renderRole(profile?.role)}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {profile?.email || ''}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      handleSignOut();
                      setMobileOpen(false);
                    }}
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[10px] font-bold transition-all active:scale-95"
                  >
                    <LogOut className="h-3 w-3" />
                    <span>{t('nav.signOut')}</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigate('/signin');
                      setMobileOpen(false);
                    }}
                    className="h-9 rounded-xl border-slate-300 dark:border-slate-700 text-xs font-bold bg-white dark:bg-transparent"
                  >
                    <LogIn className="h-3.5 w-3.5 mr-1" /> {t('nav.signIn')}
                  </Button>
                  <Button
                    onClick={() => {
                      navigate('/signup');
                      setMobileOpen(false);
                    }}
                    className="h-9 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold"
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-1" /> {t('nav.createAccount')}
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLang(lang === 'en' ? 'km' : 'en')}
                  className="flex items-center justify-center gap-1.5 h-9 rounded-xl border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-[#1e2a3f]/60 text-slate-700 dark:text-slate-200 text-xs font-bold"
                >
                  <Languages className="h-3.5 w-3.5 text-blue-500" />
                  {lang === 'en' ? 'ខ្មែរ' : 'En'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleTheme}
                  className="flex items-center justify-center gap-1.5 h-9 rounded-xl border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-[#1e2a3f]/60 text-slate-700 dark:text-slate-200 text-xs font-bold"
                >
                  {theme === 'light' ? (
                    <Moon className="h-3.5 w-3.5 text-amber-500" />
                  ) : (
                    <Sun className="h-3.5 w-3.5 text-amber-400" />
                  )}
                  {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                </Button>
              </div>

              <div>
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-2 px-1">
                  Menu
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {user && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          navigate('/dashboard');
                          setMobileOpen(false);
                        }}
                        className={cn(
                          'flex flex-col items-center justify-center gap-1.5 py-2.5 px-1.5 rounded-xl border text-center transition-all active:scale-95',
                          isActive('/dashboard')
                            ? 'bg-blue-600/15 border-blue-500/60 text-blue-600 dark:text-white'
                            : 'bg-slate-50 dark:bg-[#1e2a3f]/90 hover:bg-slate-100 dark:hover:bg-[#25344d] border-slate-200/80 dark:border-slate-700/70 text-slate-700 dark:text-slate-200'
                        )}
                      >
                        <LayoutDashboard className="h-4 w-4 text-[#3b82f6]" />
                        <span className="text-[11px] font-bold line-clamp-1">{t('nav.dashboard')}</span>
                      </button>

                      {isAdminRoute ? (
                        <button
                          type="button"
                          onClick={() => {
                            navigate('/');
                            setMobileOpen(false);
                          }}
                          className="flex flex-col items-center justify-center gap-1.5 py-2.5 px-1.5 rounded-xl border bg-slate-50 dark:bg-[#1e2a3f]/90 hover:bg-slate-100 dark:hover:bg-[#25344d] border-slate-200/80 dark:border-slate-700/70 text-slate-700 dark:text-slate-200 text-center transition-all active:scale-95"
                        >
                          <Eye className="h-4 w-4 text-emerald-500" />
                          <span className="text-[11px] font-bold line-clamp-1">View Site</span>
                        </button>
                      ) : (
                        isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              navigate('/admin');
                              setMobileOpen(false);
                            }}
                            className="flex flex-col items-center justify-center gap-1.5 py-2.5 px-1.5 rounded-xl border bg-slate-50 dark:bg-[#1e2a3f]/90 hover:bg-slate-100 dark:hover:bg-[#25344d] border-slate-200/80 dark:border-slate-700/70 text-slate-700 dark:text-slate-200 text-center transition-all active:scale-95"
                          >
                            <Shield className="h-4 w-4 text-[#eab308]" />
                            <span className="text-[11px] font-bold line-clamp-1">
                              {t('dashboard.adminDashboard')}
                            </span>
                          </button>
                        )
                      )}
                    </>
                  )}

                  {extraNavItems.map((item) => (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => {
                        navigate(item.path);
                        setMobileOpen(false);
                      }}
                      className={cn(
                        'flex flex-col items-center justify-center gap-1.5 py-2.5 px-1.5 rounded-xl border text-center transition-all active:scale-95',
                        isActive(item.path)
                          ? 'bg-blue-600/15 border-blue-500/60 text-blue-600 dark:text-white'
                          : 'bg-slate-50 dark:bg-[#1e2a3f]/90 hover:bg-slate-100 dark:hover:bg-[#25344d] border-slate-200/80 dark:border-slate-700/70 text-slate-700 dark:text-slate-200'
                      )}
                    >
                      <item.icon className={cn('h-4 w-4', item.color)} />
                      <span className="text-[11px] font-bold line-clamp-1">{t(item.key)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white dark:bg-[#0f172a] border-t border-slate-200 dark:border-slate-800 flex items-center justify-around h-16 pb-safe px-1 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] font-khmer">
        <button
          type="button"
          onClick={() => {
            setMobileOpen(false);
            navigate('/');
          }}
          className={cn(
            'flex flex-col items-center justify-center w-full gap-1 transition-colors',
            isActive('/') && !mobileOpen ? 'text-[#3b82f6]' : 'text-slate-500 dark:text-slate-400'
          )}
        >
          <Home className="h-[22px] w-[22px]" />
          <span className="text-[10px] font-medium">{lang === 'km' ? 'ផ្ទះ' : 'Home'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMobileOpen(false);
            navigate('/attendance');
          }}
          className={cn(
            'flex flex-col items-center justify-center w-full gap-1 transition-colors',
            isActive('/attendance') && !mobileOpen ? 'text-[#3b82f6]' : 'text-slate-500 dark:text-slate-400'
          )}
        >
          <div
            className={cn(
              'p-1.5 rounded-full transition-colors',
              isActive('/attendance') && !mobileOpen ? 'bg-blue-50 dark:bg-blue-950/60' : ''
            )}
          >
            <UserCheck className="h-[20px] w-[20px]" />
          </div>
          <span className="text-[10px] font-bold">{lang === 'km' ? 'វត្តមាន' : 'Attendance'}</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="flex flex-col items-center justify-center shrink-0 -mt-7 mx-1"
        >
          <div
            className={cn(
              'text-white h-[52px] w-[52px] flex items-center justify-center rounded-full shadow-lg border-[4px] border-white dark:border-[#0f172a] transition-all active:scale-95',
              mobileOpen ? 'bg-[#3b82f6]' : 'bg-[#1e293b]'
            )}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </div>
          <span
            className={cn(
              'text-[10px] font-medium mt-1',
              mobileOpen ? 'text-[#3b82f6] font-bold' : 'text-slate-600 dark:text-slate-300'
            )}
          >
            {lang === 'km' ? 'ម៉ឺនុយ' : 'Menu'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMobileOpen(false);
            navigate('/leave');
          }}
          className={cn(
            'flex flex-col items-center justify-center w-full gap-1 transition-colors',
            isActive('/leave') && !mobileOpen ? 'text-[#3b82f6]' : 'text-slate-500 dark:text-slate-400'
          )}
        >
          <FileText className="h-[22px] w-[22px]" />
          <span className="text-[10px] font-medium">{lang === 'km' ? 'សុំច្បាប់' : 'Leave'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMobileOpen(false);
            navigate('/about');
          }}
          className={cn(
            'flex flex-col items-center justify-center w-full gap-1 transition-colors',
            isActive('/about') && !mobileOpen ? 'text-[#3b82f6]' : 'text-slate-500 dark:text-slate-400'
          )}
        >
          <Info className="h-[22px] w-[22px]" />
          <span className="text-[10px] font-medium">{lang === 'km' ? 'អំពីយើង' : 'About'}</span>
        </button>
      </div>

      {(location.pathname.startsWith('/admin/duties') ||
        location.pathname.startsWith('/dashboard/duties') ||
        location.pathname === '/duties') && (
        <div
          style={{ height: 'calc(100dvh - 4rem)' }}
          className={cn(
            'fixed top-16 sm:top-20 left-0 right-0 z-[85] bg-[#f4f6fb] dark:bg-[#0b1120] overflow-y-auto p-3 sm:p-6 pb-28 scrollbar-thin',
            isAdmin && location.pathname.startsWith('/admin') ? 'lg:left-64' : ''
          )}
        >
          {isAdmin && location.pathname.startsWith('/admin/duties') ? (
            <DutyRosterAdminPanel />
          ) : (
            <DutyScheduleUserView
              onSwitchToAdmin={isAdmin ? () => navigate('/admin/duties') : undefined}
            />
          )}
        </div>
      )}
      
      <GlobalPaymentBadgeEnhancer />
    </>
  );
}