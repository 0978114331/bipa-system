import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  QrCode,
  KeyRound,
  Camera,
  ImageUp,
  Lock,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  Package,
  RefreshCw,
  Printer,
  Search,
  X,
  ShieldCheck,
  LogOut,
  Eye,
  EyeOff,
  UserPlus,
  Trash2,
  LayoutDashboard
} from 'lucide-react';
import { initialStudents, BipaStudent } from '@/pages/admin/StudentListPage';
import {
  fetchPaymentPayloadFromDb,
  loadCachedPaymentPayload,
  savePaymentPayloadToDb,
  KHMER_MONTHS,
  formatRiel,
  DEFAULT_MONTHLY_FEE
} from '@/components/payment/PaymentManagementSystem';
import {
  fetchRicePayloadFromDb,
  loadCachedRicePayload,
  saveRicePayloadToDb,
  KHMER_RICE_MONTHS,
  formatKg,
  getQuotaKgForMonth
} from '@/components/rice/RiceContributionSystem';
import { cn } from '@/lib/utils';

export interface StudentSecurityProfile {
  studentCode: string;
  fullNameKm: string;
  genderKm: string;
  majorKm: string;
  generationKm: string;
  secretCode: string;
  saltSeed: number;
  avatarDataUrl: string;
}

export interface StudentSecurityPayload {
  profiles: Record<string, StudentSecurityProfile>;
}

export const SECURITY_STORAGE_KEY = 'bipa_student_security_system_v2';
export const VERIFIED_TOKEN_KEY = 'bipa_verified_student_token_v2';

function normalizeCode(raw: string): string {
  let cleaned = String(raw || '').trim().replace(/\s+/g, '').toUpperCase();
  if (cleaned.startsWith('PIBA-')) cleaned = 'BIPA-' + cleaned.slice(5);
  else if (cleaned.startsWith('PIBA')) cleaned = 'BIPA-' + cleaned.slice(4);
  else if (/^\d{1,4}$/.test(cleaned)) cleaned = 'BIPA-' + cleaned.padStart(3, '0');
  return cleaned;
}

export function generateEncryptedCodeFromId(studentCode: string, salt = 2026): string {
  const clean = normalizeCode(studentCode);
  let hash = 2166136261 ^ salt;
  for (let i = 0; i < clean.length; i++) {
    hash ^= clean.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const unsigned = hash >>> 0;
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let part1 = '';
  let part2 = '';
  let temp = unsigned;
  for (let i = 0; i < 4; i++) {
    part1 += chars[temp % chars.length];
    temp = Math.floor(temp / chars.length);
  }
  let temp2 = (unsigned ^ (salt * 9973)) >>> 0;
  for (let i = 0; i < 4; i++) {
    part2 += chars[temp2 % chars.length];
    temp2 = Math.floor(temp2 / chars.length);
  }
  return `BP-${part1}-${part2}`;
}

export function buildStudentQrToken(studentCode: string, secretCode: string): string {
  return `BIPA-PASS:${normalizeCode(studentCode)}:${secretCode.trim()}`;
}

export function parseStudentQrToken(rawText: string): {
  studentCode: string;
  secretCode: string;
} | null {
  const clean = String(rawText || '').trim();
  if (clean.toUpperCase().startsWith('BIPA-PASS:')) {
    const parts = clean.split(':');
    if (parts.length >= 3) {
      return {
        studentCode: normalizeCode(parts[1]),
        secretCode: parts[2].trim().toUpperCase()
      };
    }
  }
  return null;
}

function getCombinedPaymentAndRiceStudentsMap(): Record<string, StudentSecurityProfile> {
  const map: Record<string, StudentSecurityProfile> = {};

  const addEntry = (
    codeRaw: string,
    nameKm: string,
    genderKm: string,
    majorKm: string,
    genKm: string
  ) => {
    const code = normalizeCode(codeRaw);
    if (!code) return;
    if (!map[code]) {
      map[code] = {
        studentCode: code,
        fullNameKm: nameKm || code,
        genderKm: genderKm || 'ប្រុស',
        majorKm: majorKm || 'ព័ត៌មានវិទ្យា',
        generationKm: genKm || 'សិស្សមណ្ឌល',
        saltSeed: 2026,
        secretCode: generateEncryptedCodeFromId(code, 2026),
        avatarDataUrl: localStorage.getItem(`bipa_avatar_${code}`) || ''
      };
    }
  };

  try {
    const payData = loadCachedPaymentPayload();
    (payData.residentStudents || []).forEach((s) => {
      addEntry(
        s.student_code,
        s.full_name_km,
        s.gender_km,
        s.major_km,
        s.generation_km
      );
    });
  } catch {}

  try {
    const riceData = loadCachedRicePayload();
    (riceData.residentStudents || []).forEach((s) => {
      addEntry(
        s.student_code,
        s.full_name_km,
        s.gender_km,
        s.major_km,
        s.generation_km
      );
    });
  } catch {}

  if (Object.keys(map).length === 0) {
    initialStudents.forEach((s: BipaStudent) => {
      addEntry(
        s.student_code,
        s.full_name_km,
        s.gender_km,
        s.major_km,
        s.generation_km
      );
    });
  }

  return map;
}

export function loadCachedSecurityPayload(): StudentSecurityPayload {
  const baseMap = getCombinedPaymentAndRiceStudentsMap();
  try {
    const raw =
      localStorage.getItem(SECURITY_STORAGE_KEY) ||
      localStorage.getItem('bipa_student_security_system_v1');
    if (!raw) return { profiles: baseMap };
    const parsed = JSON.parse(raw);
    const savedProfiles = parsed?.profiles || {};
    const merged: Record<string, StudentSecurityProfile> = { ...baseMap };

    Object.keys(savedProfiles).forEach((k) => {
      const code = normalizeCode(k);
      const item = savedProfiles[k];
      const seed = Number(item.saltSeed || 2026);
      merged[code] = {
        ...(merged[code] || {
          studentCode: code,
          fullNameKm: item.fullNameKm || code,
          genderKm: item.genderKm || 'ប្រុស',
          majorKm: item.majorKm || 'ព័ត៌មានវិទ្យា',
          generationKm: item.generationKm || 'សិស្សមណ្ឌល'
        }),
        ...item,
        studentCode: code,
        saltSeed: seed,
        secretCode: item.secretCode || generateEncryptedCodeFromId(code, seed),
        avatarDataUrl:
          item.avatarDataUrl || localStorage.getItem(`bipa_avatar_${code}`) || ''
      };
    });
    return { profiles: merged };
  } catch {
    return { profiles: baseMap };
  }
}

export async function fetchSecurityPayloadFromDb(): Promise<StudentSecurityPayload> {
  let current = loadCachedSecurityPayload();
  try {
    const { data: setRow } = await supabase
      .from('bipa_settings')
      .select('name_en')
      .eq('id', 'student_security_v2')
      .maybeSingle();

    if (setRow && setRow.name_en) {
      const parsed = JSON.parse(setRow.name_en);
      if (parsed && parsed.profiles) {
        const merged = { ...current.profiles };
        Object.keys(parsed.profiles).forEach((k) => {
          const code = normalizeCode(k);
          const item = parsed.profiles[k];
          const seed = Number(item.saltSeed || 2026);
          merged[code] = {
            ...(merged[code] || {}),
            ...item,
            studentCode: code,
            saltSeed: seed,
            secretCode: item.secretCode || generateEncryptedCodeFromId(code, seed)
          };
        });
        current = { profiles: merged };
        localStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify(current));
      }
    }
  } catch {}
  return current;
}

export async function saveSecurityPayloadToDb(
  payload: StudentSecurityPayload
): Promise<void> {
  const jsonStr = JSON.stringify(payload);
  localStorage.setItem(SECURITY_STORAGE_KEY, jsonStr);
  try {
    await supabase.from('bipa_settings').upsert({
      id: 'student_security_v2',
      logo_url: 'STUDENT_SECURITY',
      name_km: 'ប្រព័ន្ធសុវត្ថិភាពកូដសម្ងាត់និស្សិត',
      name_en: jsonStr
    });
  } catch {}
  window.dispatchEvent(new Event('student-security-updated'));
}

export function isStudentSessionVerified(
  payload: StudentSecurityPayload,
  rawCode?: string
): StudentSecurityProfile | null {
  const linkedCode = normalizeCode(
    rawCode || localStorage.getItem('bipa_linked_student_id') || ''
  );
  const verifiedToken =
    localStorage.getItem(VERIFIED_TOKEN_KEY) ||
    localStorage.getItem('bipa_verified_student_token_v1') ||
    '';
  if (!linkedCode || !verifiedToken) return null;

  const profile = payload.profiles[linkedCode];
  if (!profile) return null;

  const expectedToken = `${linkedCode}:${profile.secretCode}`;
  if (verifiedToken === expectedToken || verifiedToken.startsWith(`${linkedCode}:`)) {
    return profile;
  }
  return null;
}

export function setVerifiedStudentSession(profile: StudentSecurityProfile) {
  const code = normalizeCode(profile.studentCode);
  const token = `${code}:${profile.secretCode}`;
  localStorage.setItem('bipa_linked_student_id', code);
  localStorage.setItem(VERIFIED_TOKEN_KEY, token);
  localStorage.setItem('bipa_verified_student_token_v1', token);
  window.dispatchEvent(new Event('student-id-linked'));
  window.dispatchEvent(new Event('student-security-updated'));
  window.dispatchEvent(new Event('payment-system-updated'));
  window.dispatchEvent(new Event('rice-system-updated'));
}

export function clearVerifiedStudentSession() {
  localStorage.removeItem('bipa_linked_student_id');
  localStorage.removeItem(VERIFIED_TOKEN_KEY);
  localStorage.removeItem('bipa_verified_student_token_v1');
  window.dispatchEvent(new Event('student-id-linked'));
  window.dispatchEvent(new Event('student-security-updated'));
}

export function GoToDashboardPromptCard({ titleKm }: { titleKm: string }) {
  const navigate = useNavigate();
  return (
    <div className="max-w-md mx-auto mt-6 bg-white dark:bg-[#162033] text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl text-center space-y-4 font-khmer animate-in fade-in duration-200">
      <div className="w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto">
        <Lock className="h-6 w-6" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-base sm:text-lg font-black">{titleKm}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          ដើម្បីរក្សាសុវត្ថិភាព និងកុំឱ្យមានប្រអប់បំពេញច្រើនកន្លែង សូមចូលទៅភ្ជាប់កូដសម្ងាត់ ឬស្កេនកាត QR/Barcode របស់អ្នកតែម្តងនៅក្នុងផ្ទាំង «គ្រប់គ្រង (Dashboard)»។
        </p>
      </div>
      <Button
        type="button"
        onClick={() => navigate('/dashboard')}
        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs h-10 rounded-xl shadow-md"
      >
        <LayoutDashboard className="h-4 w-4 mr-2" />
        ចូលទៅកាន់ផ្ទាំងគ្រប់គ្រង (Dashboard) ដើម្បីភ្ជាប់កូដ
      </Button>
    </div>
  );
}

export function BarcodeSvg({
  value,
  hideText = false
}: {
  value: string;
  hideText?: boolean;
}) {
  const bars = useMemo(() => {
    const str = String(value || 'BIPA001');
    const pattern: number[] = [2, 1, 1, 2, 1, 2];
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      pattern.push(((code >> 0) & 1) + 1);
      pattern.push(((code >> 1) & 1) + 1);
      pattern.push(((code >> 2) & 1) + 1);
      pattern.push(((code >> 3) & 1) + 1);
      pattern.push(((code >> 4) & 1) + 1);
      pattern.push(1);
    }
    pattern.push(2, 1, 2, 1, 1, 2);
    return pattern;
  }, [value]);

  const totalUnits = bars.reduce((a, b) => a + b, 0);
  let currentX = 0;

  return (
    <div className="flex flex-col items-center bg-white px-3 py-2 rounded-xl border border-slate-200">
      <svg
        viewBox={`0 0 ${totalUnits} 38`}
        className="w-full max-w-[230px] h-10"
        preserveAspectRatio="none"
      >
        {bars.map((w, idx) => {
          const x = currentX;
          currentX += w;
          if (idx % 2 === 1) return null;
          return <rect key={idx} x={x} y={0} width={w} height={38} fill="#0f172a" />;
        })}
      </svg>
      {!hideText && (
        <span className="text-[10px] font-mono font-black tracking-[0.2em] text-slate-800 mt-1">
          {value}
        </span>
      )}
    </div>
  );
}

export function StudentVerificationGate({
  titleKm = 'ផ្ទៀងផ្ទាត់កូដសម្ងាត់ ឬស្កេន QR/Barcode ផ្ទាល់ខ្លួន',
  onVerified
}: {
  titleKm?: string;
  onVerified?: (profile: StudentSecurityProfile) => void;
}) {
  const [securityPayload, setSecurityPayload] = useState<StudentSecurityPayload>(() =>
    loadCachedSecurityPayload()
  );
  const [inputCodeOrPin, setInputCodeOrPin] = useState('');
  const [inputIdOptional, setInputIdOptional] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [scanningCamera, setScanningCamera] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSecurityPayloadFromDb().then(setSecurityPayload);
  }, []);

  const verifyByQrOrInput = (rawText: string, optionalId?: string): boolean => {
    const parsedQr = parseStudentQrToken(rawText);
    const profilesList = Object.values(securityPayload.profiles);

    if (parsedQr) {
      const matched = profilesList.find(
        (p) =>
          normalizeCode(p.studentCode) === parsedQr.studentCode &&
          p.secretCode.trim().toUpperCase() === parsedQr.secretCode
      );
      if (matched) {
        setErrorMsg('');
        setVerifiedStudentSession(matched);
        if (onVerified) onVerified(matched);
        return true;
      }
      setErrorMsg('កូដ QR/Barcode នេះមិនត្រឹមត្រូវ ឬត្រូវបានប្តូរថ្មី!');
      return false;
    }

    const pinClean = rawText.trim().toUpperCase();
    const idClean = optionalId ? normalizeCode(optionalId) : '';

    if (!pinClean) {
      setErrorMsg('សូមបញ្ចូលលេខកូដសម្ងាត់ ឬស្កេនកាត QR/Barcode របស់អ្នក!');
      return false;
    }

    const matchedByPin = profilesList.find((p) => {
      if (idClean && normalizeCode(p.studentCode) !== idClean) return false;
      return p.secretCode.trim().toUpperCase() === pinClean;
    });

    if (matchedByPin) {
      setErrorMsg('');
      setVerifiedStudentSession(matchedByPin);
      if (onVerified) onVerified(matchedByPin);
      return true;
    }

    setErrorMsg('លេខកូដសម្ងាត់មិនត្រឹមត្រូវទេ! សូមពិនិត្យលេខកូដ ឬស្កេនកាត QR/Barcode ម្តងទៀត។');
    return false;
  };

  useEffect(() => {
    let mounted = true;

    const startQrCam = async () => {
      if (!scanningCamera) return;
      await new Promise((r) => setTimeout(r, 150));
      if (!mounted || !document.getElementById('student-security-qr-reader')) return;

      try {
        const qr = new Html5Qrcode('student-security-qr-reader');
        scannerRef.current = qr;
        await qr.start(
          { facingMode: 'environment' },
          { fps: 25, aspectRatio: 1.0 },
          (decoded) => {
            const ok = verifyByQrOrInput(decoded);
            if (ok && scannerRef.current?.isScanning) {
              scannerRef.current
                .stop()
                .then(() => scannerRef.current?.clear())
                .catch(() => {});
              setScanningCamera(false);
            }
          },
          () => {}
        );
      } catch {
        if (mounted) {
          setErrorMsg('សូមបើកសិទ្ធិកាមេរ៉ា ឬជ្រើសរើសរូបភាពកាត QR ពីទូរស័ព្ទ។');
          setScanningCamera(false);
        }
      }
    };

    if (scanningCamera) startQrCam();

    return () => {
      mounted = false;
      if (scannerRef.current) {
        const sc = scannerRef.current;
        if (sc.isScanning) {
          sc.stop().then(() => sc.clear()).catch(() => {});
        }
        scannerRef.current = null;
      }
    };
  }, [scanningCamera, securityPayload]);

  const handleQrImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const qr = new Html5Qrcode('student-security-qr-hidden');
      const decoded = await qr.scanFile(file, true);
      verifyByQrOrInput(decoded);
    } catch {
      setErrorMsg('រូបភាពនេះមិនមានកូដ QR សម្គាល់ខ្លួនត្រឹមត្រូវទេ។');
    }
    e.target.value = '';
  };

  return (
    <div className="bipa-std-gate w-full max-w-md mx-auto bg-white dark:bg-[#162033] text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xl space-y-4 font-khmer animate-in fade-in duration-200">
      <style>{`
        .bipa-std-gate input {
          font-size: 12px !important;
        }
      `}</style>
      <div id="student-security-qr-hidden" className="hidden" />

      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
          <Lock className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
            {titleKm}
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            ភ្ជាប់តែម្តងនៅទីនេះ ប្រព័ន្ធនឹងស្គាល់ទិន្នន័យរបស់អ្នកនៅគ្រប់មុខងារទាំងអស់
          </p>
        </div>
      </div>

      {scanningCamera ? (
        <div className="space-y-3">
          <div className="relative w-60 h-60 mx-auto rounded-2xl overflow-hidden bg-slate-950 border-2 border-blue-500/50">
            <div id="student-security-qr-reader" className="w-full h-full" />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setScanningCamera(false)}
            className="w-full h-9 rounded-xl border-slate-300 dark:border-slate-700 text-xs font-bold"
          >
            <X className="h-4 w-4 mr-1.5" />
            បិទកាមេរ៉ាស្កេន
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setScanningCamera(true)}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md active:scale-95 transition-all"
          >
            <Camera className="h-4 w-4 shrink-0" />
            <span>ស្កេនកាត QR/Barcode</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-black active:scale-95 transition-all"
          >
            <ImageUp className="h-4 w-4 text-amber-500 shrink-0" />
            <span>ជ្រើសរើសរូបកាត QR</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleQrImageUpload}
            className="hidden"
          />
        </div>
      )}

      <div className="relative flex py-1 items-center">
        <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
        <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-400 uppercase">
          ឬ បំពេញអត្តលេខ និងកូដសម្ងាត់របស់អ្នក
        </span>
        <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
      </div>

      <div className="space-y-2.5">
        <div className="grid grid-cols-5 gap-2">
          <Input
            value={inputIdOptional}
            onChange={(e) => setInputIdOptional(e.target.value.toUpperCase())}
            placeholder="ឧ.អត្តលេខ (BIPA-001)"
            className="col-span-2 h-9 bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-black rounded-xl"
          />
          <Input
            type="password"
            value={inputCodeOrPin}
            onChange={(e) => setInputCodeOrPin(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') verifyByQrOrInput(inputCodeOrPin, inputIdOptional);
            }}
            placeholder="ឧ.បញ្ចូលកូដសម្ងាត់ (BP-XXXX-XXXX)..."
            className="col-span-3 h-9 bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-700 text-blue-600 dark:text-amber-400 text-xs font-black tracking-wider rounded-xl"
          />
        </div>

        <Button
          type="button"
          onClick={() => verifyByQrOrInput(inputCodeOrPin, inputIdOptional)}
          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs h-9 rounded-xl shadow-md"
        >
          <KeyRound className="h-3.5 w-3.5 mr-1.5" />
          ភ្ជាប់ទិន្នន័យផ្ទាល់ខ្លួនរបស់ខ្ញុំ
        </Button>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/90 border border-rose-200 dark:border-rose-500/50 text-rose-600 dark:text-rose-300 text-[11px] font-bold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}

export function AdminUserPasswordDashboard() {
  const [securityPayload, setSecurityPayload] = useState<StudentSecurityPayload>(() =>
    loadCachedSecurityPayload()
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCardStudent, setSelectedCardStudent] =
    useState<StudentSecurityProfile | null>(null);
  const [revealedCodes, setRevealedCodes] = useState<Record<string, boolean>>({});
  const [toastText, setToastText] = useState('');

  const [showAddBox, setShowAddBox] = useState(false);
  const [newStCode, setNewStCode] = useState('');
  const [newStNameKm, setNewStNameKm] = useState('');
  const [newStGender, setNewStGender] = useState('ប្រុស');
  const [newStMajor, setNewStMajor] = useState('');

  const syncFromPaymentAndRiceTables = async () => {
    const [secDb, payDb, riceDb] = await Promise.all([
      fetchSecurityPayloadFromDb(),
      fetchPaymentPayloadFromDb(),
      fetchRicePayloadFromDb()
    ]);

    const merged: Record<string, StudentSecurityProfile> = { ...secDb.profiles };

    const mergeResident = (s: {
      student_code: string;
      full_name_km: string;
      gender_km: string;
      major_km: string;
      generation_km: string;
    }) => {
      const code = normalizeCode(s.student_code);
      if (!code) return;
      const existing = merged[code];
      const seed = existing?.saltSeed || 2026;
      merged[code] = {
        studentCode: code,
        fullNameKm: s.full_name_km || existing?.fullNameKm || code,
        genderKm: s.gender_km || existing?.genderKm || 'ប្រុស',
        majorKm: s.major_km || existing?.majorKm || 'ព័ត៌មានវិទ្យា',
        generationKm: s.generation_km || existing?.generationKm || 'សិស្សមណ្ឌល',
        saltSeed: seed,
        secretCode: existing?.secretCode || generateEncryptedCodeFromId(code, seed),
        avatarDataUrl:
          existing?.avatarDataUrl || localStorage.getItem(`bipa_avatar_${code}`) || ''
      };
    };

    (payDb.residentStudents || []).forEach(mergeResident);
    (riceDb.residentStudents || []).forEach(mergeResident);

    const nextPayload = { profiles: merged };
    setSecurityPayload(nextPayload);
    await saveSecurityPayloadToDb(nextPayload);
  };

  useEffect(() => {
    syncFromPaymentAndRiceTables();
  }, []);

  const profilesList = useMemo(() => {
    return Object.values(securityPayload.profiles).sort((a, b) =>
      a.studentCode.localeCompare(b.studentCode)
    );
  }, [securityPayload.profiles]);

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return profilesList;
    const q = searchQuery.trim().toLowerCase();
    return profilesList.filter(
      (p) =>
        p.studentCode.toLowerCase().includes(q) ||
        p.fullNameKm.toLowerCase().includes(q)
    );
  }, [profilesList, searchQuery]);

  const showNotice = (msg: string) => {
    setToastText(msg);
    setTimeout(() => setToastText(''), 3200);
  };

  const handleAutoEncryptNewCode = async (studentCode: string) => {
    const existing = securityPayload.profiles[studentCode];
    if (!existing) return;
    const newSeed = Math.floor(1000 + Math.random() * 90000);
    const autoEncrypted = generateEncryptedCodeFromId(studentCode, newSeed);

    const nextPayload: StudentSecurityPayload = {
      profiles: {
        ...securityPayload.profiles,
        [studentCode]: {
          ...existing,
          saltSeed: newSeed,
          secretCode: autoEncrypted
        }
      }
    };
    setSecurityPayload(nextPayload);
    await saveSecurityPayloadToDb(nextPayload);
    showNotice(`បានបំប្លែងកូដសម្ងាត់ និង Barcode ថ្មីដោយស្វ័យប្រវត្តិសម្រាប់ ${studentCode}!`);
  };

  const handleAddStudentAndSyncAll = async () => {
    const cleanCode = normalizeCode(newStCode);
    if (!cleanCode || !newStNameKm.trim()) {
      showNotice('សូមបញ្ចូលអត្តលេខ (ID) និងឈ្មោះនិស្សិតជាមុនសិន!');
      return;
    }

    const seed = Math.floor(1000 + Math.random() * 9000);
    const newProfile: StudentSecurityProfile = {
      studentCode: cleanCode,
      fullNameKm: newStNameKm.trim(),
      genderKm: newStGender,
      majorKm: newStMajor.trim() || 'ព័ត៌មានវិទ្យា',
      generationKm: 'សិស្សមណ្ឌល',
      saltSeed: seed,
      secretCode: generateEncryptedCodeFromId(cleanCode, seed),
      avatarDataUrl: ''
    };

    const nextSecPayload: StudentSecurityPayload = {
      profiles: {
        ...securityPayload.profiles,
        [cleanCode]: newProfile
      }
    };
    setSecurityPayload(nextSecPayload);
    await saveSecurityPayloadToDb(nextSecPayload);

    try {
      const payData = await fetchPaymentPayloadFromDb();
      if (
        !(payData.residentStudents || []).some(
          (s) => normalizeCode(s.student_code) === cleanCode
        )
      ) {
        await savePaymentPayloadToDb({
          ...payData,
          residentStudents: [
            ...(payData.residentStudents || []),
            {
              id: `st-${Date.now()}`,
              student_code: cleanCode,
              full_name_km: newProfile.fullNameKm,
              full_name_en: newProfile.fullNameKm,
              gender_km: newProfile.genderKm,
              major_km: newProfile.majorKm,
              generation_km: newProfile.generationKm
            }
          ]
        });
      }
    } catch {}

    try {
      const riceData = await fetchRicePayloadFromDb();
      if (
        !(riceData.residentStudents || []).some(
          (s) => normalizeCode(s.student_code) === cleanCode
        )
      ) {
        await saveRicePayloadToDb({
          ...riceData,
          residentStudents: [
            ...(riceData.residentStudents || []),
            {
              id: `st-${Date.now()}`,
              student_code: cleanCode,
              full_name_km: newProfile.fullNameKm,
              full_name_en: newProfile.fullNameKm,
              gender_km: newProfile.genderKm,
              major_km: newProfile.majorKm,
              generation_km: newProfile.generationKm
            }
          ]
        });
      }
    } catch {}

    setNewStCode('');
    setNewStNameKm('');
    setNewStMajor('');
    setShowAddBox(false);
    showNotice(
      `បានបន្ថែម "${newProfile.fullNameKm}" (${cleanCode}) និងបង្កើតកូដសម្ងាត់ Auto រួចរាល់!`
    );
  };

  const handleDeleteStudentProfile = async (studentCode: string, nameKm: string) => {
    if (
      !window.confirm(`តើអ្នកពិតជាចង់លុប "${nameKm} (${studentCode})" ចេញពីតារាងមែនទេ?`)
    ) {
      return;
    }
    const copy = { ...securityPayload.profiles };
    delete copy[studentCode];
    const nextPayload = { profiles: copy };
    setSecurityPayload(nextPayload);
    await saveSecurityPayloadToDb(nextPayload);
    showNotice(`បានលុបឈ្មោះ "${nameKm}" ចេញពីតារាងរួចរាល់!`);
  };

  return (
    <div className="bipa-admin-sec-page space-y-5 font-khmer pb-28">
      <style>{`
        .bipa-admin-sec-page input,
        .bipa-admin-sec-page select {
          font-size: 12px !important;
        }
      `}</style>

      {toastText && (
        <div className="fixed top-20 right-4 z-[250] px-4 py-3 rounded-2xl bg-emerald-950/95 border border-emerald-500 text-emerald-300 shadow-2xl flex items-center gap-2 text-xs font-black">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastText}</span>
        </div>
      )}

      <div className="bg-white dark:bg-[#162033] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <Badge className="bg-amber-500 text-slate-950 font-extrabold px-2.5 py-0.5 text-[10px] sm:text-xs">
            AUTO-ENCRYPTED USER PASSCODE & BARCODE
          </Badge>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2 pt-1">
            <ShieldCheck className="h-6 w-6 text-amber-500 shrink-0" />
            <span>លេខសម្ងាត់ User និងបាកូដសម្គាល់ខ្លួននិស្សិត</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            ទាញឈ្មោះពីតារាងបង់ប្រាក់ និងតារាងបង់អង្ករដោយស្វ័យប្រវត្តិ និងបំប្លែងលេខកូដសម្ងាត់ Auto តាមរយៈ ID (បិទបាំងជាសម្ងាត់)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => setShowAddBox((p) => !p)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs h-9 px-3.5 rounded-xl shadow-sm"
          >
            <UserPlus className="h-4 w-4 mr-1.5" />
            បន្ថែមឈ្មោះសិស្សថ្មី
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={syncFromPaymentAndRiceTables}
            className="rounded-xl border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold h-9 px-3.5"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
            ទាញឈ្មោះពីតារាងប្រាក់/អង្ករ
          </Button>
        </div>
      </div>

      {showAddBox && (
        <div className="bg-white dark:bg-[#162033] border border-blue-500/40 rounded-2xl p-4 space-y-3 shadow-md animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <UserPlus className="h-4 w-4" />
              បន្ថែមសិស្សថ្មី និងបង្កើតលេខសម្ងាត់ + បាកូដ Auto
            </h4>
            <button
              type="button"
              onClick={() => setShowAddBox(false)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <Input
              value={newStCode}
              onChange={(e) => setNewStCode(e.target.value.toUpperCase())}
              placeholder="ឧ.បញ្ចូលអត្តលេខ (BIPA-025)..."
              className="h-9 rounded-xl bg-slate-50 dark:bg-[#0f172a] font-bold"
            />
            <Input
              value={newStNameKm}
              onChange={(e) => setNewStNameKm(e.target.value)}
              placeholder="ឧ.បញ្ចូលគោត្តនាម និងនាម..."
              className="h-9 rounded-xl bg-slate-50 dark:bg-[#0f172a] font-bold"
            />
            <select
              value={newStGender}
              onChange={(e) => setNewStGender(e.target.value)}
              className="h-9 rounded-xl px-3 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
            >
              <option value="ប្រុស">ភេទ៖ ប្រុស</option>
              <option value="ស្រី">ភេទ៖ ស្រី</option>
            </select>
            <div className="flex gap-2">
              <Input
                value={newStMajor}
                onChange={(e) => setNewStMajor(e.target.value)}
                placeholder="ឧ.បញ្ចូលជំនាញសិក្សា..."
                className="h-9 rounded-xl bg-slate-50 dark:bg-[#0f172a] flex-1"
              />
              <Button
                type="button"
                onClick={handleAddStudentAndSyncAll}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black h-9 px-4 rounded-xl shrink-0"
              >
                បញ្ចូល
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-[#162033] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ឧ.ស្វែងរកតាមអត្តលេខ ឬឈ្មោះនិស្សិត..."
              className="pl-9 h-9 rounded-xl bg-slate-50 dark:bg-[#0f172a]"
            />
          </div>
          <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs font-extrabold w-fit">
            ចំនួននិស្សិតក្នុងតារាង៖ {filteredList.length} នាក់
          </Badge>
        </div>

        <div className="w-full max-h-[520px] overflow-x-auto overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 scrollbar-thin">
          <table className="w-full text-xs text-left border-collapse min-w-[820px]">
            <thead className="sticky top-0 z-20">
              <tr className="bg-amber-400 text-slate-950 font-black">
                <th className="py-3 px-3 border border-amber-500/40 text-center w-12">ល.រ</th>
                <th className="py-3 px-3 border border-amber-500/40">អត្តលេខ (ID)</th>
                <th className="py-3 px-3 border border-amber-500/40">គោត្តនាម និងនាម</th>
                <th className="py-3 px-3 border border-amber-500/40 text-center">ភេទ</th>
                <th className="py-3 px-3 border border-amber-500/40 text-center">
                  កូដសម្ងាត់ Auto (បំប្លែងតាម ID)
                </th>
                <th className="py-3 px-3 border border-amber-500/40 text-center">
                  បាកូដសម្គាល់ខ្លួន (Barcode)
                </th>
                <th className="py-3 px-3 border border-amber-500/40 text-center">
                  សកម្មភាព & កាតស្កេន
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredList.map((st, idx) => {
                const isRevealed = Boolean(revealedCodes[st.studentCode]);
                const barcodeToken = `${st.studentCode}:${st.secretCode}`;

                return (
                  <tr
                    key={st.studentCode}
                    className="bg-white dark:bg-[#162033] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-2.5 px-3 border border-slate-200/70 dark:border-slate-800 text-center font-black">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 border border-slate-200/70 dark:border-slate-800 font-black text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {st.studentCode}
                    </td>
                    <td className="py-2.5 px-3 border border-slate-200/70 dark:border-slate-800 font-black text-slate-900 dark:text-white whitespace-nowrap">
                      {st.fullNameKm}
                    </td>
                    <td className="py-2.5 px-3 border border-slate-200/70 dark:border-slate-800 text-center font-bold">
                      {st.genderKm}
                    </td>
                    <td className="py-2.5 px-3 border border-slate-200/70 dark:border-slate-800 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-[#0f172a] px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                        <span className="font-mono text-[11px] font-black tracking-widest text-slate-700 dark:text-amber-400">
                          {isRevealed ? st.secretCode : 'BP-••••-••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setRevealedCodes((p) => ({
                              ...p,
                              [st.studentCode]: !p[st.studentCode]
                            }))
                          }
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                          title="បង្ហាញ/លាក់កូដ"
                        >
                          {isRevealed ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-2 px-3 border border-slate-200/70 dark:border-slate-800 text-center">
                      <div className="w-40 mx-auto">
                        <BarcodeSvg value={barcodeToken} hideText={!isRevealed} />
                      </div>
                    </td>
                    <td className="py-2.5 px-3 border border-slate-200/70 dark:border-slate-800 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAutoEncryptNewCode(st.studentCode)}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[11px] font-extrabold flex items-center gap-1"
                          title="បំប្លែងកូដសម្ងាត់ Auto ថ្មី"
                        >
                          <RefreshCw className="h-3 w-3" />
                          <span>បំប្លែងកូដថ្មី</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedCardStudent(st)}
                          className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-extrabold flex items-center gap-1 shadow-xs"
                        >
                          <QrCode className="h-3.5 w-3.5" />
                          <span>កាត QR & បាកូដ</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteStudentProfile(st.studentCode, st.fullNameKm)
                          }
                          className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500"
                          title="លុបឈ្មោះ"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCardStudent && (
        <div
          onClick={() => setSelectedCardStudent(null)}
          className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white text-slate-900 rounded-3xl p-5 shadow-2xl space-y-4 text-center border border-slate-200"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="text-left">
                <Badge className="bg-amber-400 text-slate-950 font-black text-[10px]">
                  {selectedCardStudent.studentCode}
                </Badge>
                <h4 className="text-base font-black text-slate-900 mt-0.5">
                  {selectedCardStudent.fullNameKm}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCardStudent(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center space-y-3">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(
                  buildStudentQrToken(
                    selectedCardStudent.studentCode,
                    selectedCardStudent.secretCode
                  )
                )}`}
                alt="Student QR"
                className="w-44 h-44 rounded-xl border border-slate-200 bg-white p-1"
              />

              <div className="w-full pt-1">
                <BarcodeSvg
                  value={`${selectedCardStudent.studentCode}:${selectedCardStudent.secretCode}`}
                  hideText={true}
                />
              </div>

              <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                សិស្សអាចស្កេនកាត QR នេះនៅក្នុងផ្ទាំង «គ្រប់គ្រង (Dashboard)» ដើម្បីបើកមើលទិន្នន័យផ្ទាល់ខ្លួនគ្រប់មុខងារ។
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => window.print()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black h-10 rounded-xl"
              >
                <Printer className="h-4 w-4 mr-1.5" />
                បោះពុម្ពកាតស្កេន
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedCardStudent(null)}
                className="text-xs font-bold h-10 rounded-xl"
              >
                បិទ
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminStudentSecurityModal({
  onClose
}: {
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[230] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 font-khmer animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl max-h-[92dvh] bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="p-4 bg-[#0f172a] text-white flex items-center justify-between shrink-0">
          <span className="text-sm font-black flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-amber-400" />
            គ្រប់គ្រងលេខសម្ងាត់ User និងបាកូដសិស្ស
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1 scrollbar-thin">
          <AdminUserPasswordDashboard />
        </div>
      </div>
    </div>
  );
}

export function StudentPersonalDashboard() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isAdmin = hasRole('super_admin', 'residence_admin', 'finance_admin', 'duty_manager');

  const currentYearStr = String(new Date().getFullYear());
  const currentMonthNum = new Date().getMonth() + 1;

  const [securityPayload, setSecurityPayload] = useState<StudentSecurityPayload>(() =>
    loadCachedSecurityPayload()
  );
  const [paymentPayload, setPaymentPayload] = useState(() => loadCachedPaymentPayload());
  const [ricePayload, setRicePayload] = useState(() => loadCachedRicePayload());
  const [selectedYear, setSelectedYear] = useState<string>(currentYearStr);

  const [verifiedProfile, setVerifiedProfile] = useState<StudentSecurityProfile | null>(() =>
    isStudentSessionVerified(loadCachedSecurityPayload())
  );
  const [showMySecurityCard, setShowMySecurityCard] = useState(false);

  const avatarFileRef = useRef<HTMLInputElement>(null);

  const loadAllDashboardData = async () => {
    const [secData, payData, rData] = await Promise.all([
      fetchSecurityPayloadFromDb(),
      fetchPaymentPayloadFromDb(),
      fetchRicePayloadFromDb()
    ]);
    setSecurityPayload(secData);
    setPaymentPayload(payData);
    setRicePayload(rData);
    setVerifiedProfile(isStudentSessionVerified(secData));
  };

  useEffect(() => {
    loadAllDashboardData();
    window.addEventListener('student-security-updated', loadAllDashboardData);
    window.addEventListener('payment-system-updated', loadAllDashboardData);
    window.addEventListener('rice-system-updated', loadAllDashboardData);
    return () => {
      window.removeEventListener('student-security-updated', loadAllDashboardData);
      window.removeEventListener('payment-system-updated', loadAllDashboardData);
      window.removeEventListener('rice-system-updated', loadAllDashboardData);
    };
  }, []);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !verifiedProfile) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const maxDim = 240;
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          }
        } else if (h > maxDim) {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);

        const code = normalizeCode(verifiedProfile.studentCode);
        localStorage.setItem(`bipa_avatar_${code}`, dataUrl);

        const updatedProfile: StudentSecurityProfile = {
          ...verifiedProfile,
          avatarDataUrl: dataUrl
        };
        const nextPayload: StudentSecurityPayload = {
          profiles: {
            ...securityPayload.profiles,
            [code]: updatedProfile
          }
        };
        setVerifiedProfile(updatedProfile);
        setSecurityPayload(nextPayload);
        await saveSecurityPayloadToDb(nextPayload);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const myPayMonths = useMemo(() => {
    if (!verifiedProfile) return [];
    const code = normalizeCode(verifiedProfile.studentCode);
    const monthsMap = paymentPayload.recordsByYear?.[selectedYear]?.[code]?.months || {};
    return KHMER_MONTHS.map((m) => {
      const rec = monthsMap[m.num];
      return {
        ...m,
        status: rec?.status || 'unpaid',
        amount: rec?.amount || paymentPayload.monthlyFeeRiel || DEFAULT_MONTHLY_FEE,
        paidDate: rec?.paidDate || ''
      };
    });
  }, [verifiedProfile, paymentPayload, selectedYear]);

  const myRiceMonths = useMemo(() => {
    if (!verifiedProfile) return [];
    const code = normalizeCode(verifiedProfile.studentCode);
    const monthsMap = ricePayload.recordsByYear?.[selectedYear]?.[code]?.months || {};
    return KHMER_RICE_MONTHS.map((m) => {
      const rec = monthsMap[m.num];
      const quota = getQuotaKgForMonth(ricePayload, selectedYear, m.num);
      return {
        ...m,
        status: rec?.status || 'unpaid',
        kgAmount: Number(rec?.kgAmount || quota),
        paidDate: rec?.paidDate || ''
      };
    });
  }, [verifiedProfile, ricePayload, selectedYear]);

  if (!verifiedProfile) {
    return (
      <div className="max-w-md mx-auto pt-4 pb-24 px-2 font-khmer space-y-4">
        <StudentVerificationGate
          titleKm="បញ្ចូលកូដសម្ងាត់ ឬស្កេន QR/Barcode ដើម្បីបើកទិន្នន័យគ្រប់មុខងារ"
          onVerified={(prof) => setVerifiedProfile(prof)}
        />
      </div>
    );
  }

  const paidMoneyMonths = myPayMonths.filter((m) => m.status === 'paid');
  const owedMoneyMonths = myPayMonths.filter((m) => m.status === 'owed');
  const totalPaidRiel = paidMoneyMonths.reduce((s, m) => s + m.amount, 0);
  const totalOwedRiel = owedMoneyMonths.reduce((s, m) => s + m.amount, 0);

  const paidRiceMonths = myRiceMonths.filter((m) => m.status === 'paid');
  const owedRiceMonths = myRiceMonths.filter((m) => m.status === 'owed');
  const totalPaidKg = paidRiceMonths.reduce((s, m) => s + m.kgAmount, 0);
  const totalOwedKg = owedRiceMonths.reduce((s, m) => s + m.kgAmount, 0);

  const currentAvatar =
    verifiedProfile.avatarDataUrl ||
    localStorage.getItem(`bipa_avatar_${verifiedProfile.studentCode}`) ||
    '';

  return (
    <div className="max-w-xl mx-auto space-y-4 font-khmer pb-24 pt-2">
      <div className="bg-white dark:bg-[#162033] text-slate-900 dark:text-white rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              <div
                onClick={() => avatarFileRef.current?.click()}
                style={{ width: '68px', height: '68px' }}
                className="rounded-full p-0.5 bg-gradient-to-tr from-blue-500 to-amber-400 cursor-pointer shadow-md overflow-hidden"
              >
                <div className="w-full h-full rounded-full bg-slate-100 dark:bg-[#0f172a] flex items-center justify-center overflow-hidden border-2 border-white dark:border-[#162033]">
                  {currentAvatar ? (
                    <img
                      src={currentAvatar}
                      alt={verifiedProfile.fullNameKm}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-black text-blue-600 dark:text-amber-400">
                      {verifiedProfile.fullNameKm.charAt(0)}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => avatarFileRef.current?.click()}
                className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-blue-600 text-white border-2 border-white dark:border-[#162033] flex items-center justify-center shadow"
                title="ប្តូររូប Profile"
              >
                <Camera className="h-3 w-3" />
              </button>
              <input
                ref={avatarFileRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-[#eab308] text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-md">
                  {verifiedProfile.studentCode}
                </Badge>
                <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                  {verifiedProfile.fullNameKm}
                </h1>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                ជំនាញ៖ {verifiedProfile.majorKm} • {verifiedProfile.generationKm}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => setShowMySecurityCard(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold"
                >
                  <QrCode className="h-3 w-3" />
                  <span>កាត QR & បាកូដខ្ញុំ</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearVerifiedStudentSession();
                    setVerifiedProfile(null);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[10px] font-extrabold"
                >
                  <LogOut className="h-3 w-3" />
                  <span>ប្តូរគណនី / ចាក់សោ</span>
                </button>
              </div>
            </div>
          </div>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="h-8 rounded-xl px-2.5 bg-slate-100 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 text-xs font-extrabold text-slate-900 dark:text-white shrink-0 self-start"
          >
            {['2025', '2026', '2027', '2028'].map((yr) => (
              <option key={yr} value={yr}>
                ឆ្នាំ {yr}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-[#162033] text-slate-900 dark:text-white rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-lg space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black">
                ទិន្នន័យបង់ប្រាក់ប្រចាំខែរបស់ខ្ញុំ ({selectedYear})
              </h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                តម្លៃមណ្ឌល៖ 50,000 ៛ / ខែ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/dashboard/payments')}
            className="px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-extrabold"
          >
            មើលលម្អិត →
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-[#0d332a]/85 border border-emerald-200 dark:border-emerald-500/30">
            <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
              ខែបានបង់ប្រាក់រួច
            </p>
            <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
              {paidMoneyMonths.length} ខែ
            </p>
            <p className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
              សរុប៖ {formatRiel(totalPaidRiel)}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-[#381624]/85 border border-rose-200 dark:border-rose-500/30">
            <p className="text-[10px] font-bold text-rose-700 dark:text-rose-300">
              ខែជំពាក់ប្រាក់មណ្ឌល
            </p>
            <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
              {owedMoneyMonths.length} ខែ
            </p>
            <p className="text-[11px] font-extrabold text-rose-600 dark:text-rose-400">
              ជំពាក់៖ {formatRiel(totalOwedRiel)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 pt-1">
          {myPayMonths.map((m) => (
            <div
              key={m.num}
              className={cn(
                'py-2 px-1.5 rounded-xl border text-center',
                m.status === 'paid'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                  : m.status === 'owed'
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300'
                  : m.num === currentMonthNum
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300'
                  : 'bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
              )}
            >
              <div className="text-[10px] font-black">ខែ{m.nameKm}</div>
              <div className="text-[9px] font-bold mt-0.5">
                {m.status === 'paid'
                  ? '✓ បង់រួច'
                  : m.status === 'owed'
                  ? '! ជំពាក់'
                  : 'មិនទាន់បង់'}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-[#162033] text-slate-900 dark:text-white rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-lg space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center">
              <Package className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black">
                ទិន្នន័យបង់អង្ករប្រចាំខែរបស់ខ្ញុំ ({selectedYear})
              </h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                ការរួមចំណែកអង្ករប្រចាំខែ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/?view=rice')}
            className="px-3 py-1 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-extrabold"
          >
            មើលលម្អិត →
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-[#0d332a]/85 border border-emerald-200 dark:border-emerald-500/30">
            <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
              ខែបានបង់អង្កររួច
            </p>
            <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
              {paidRiceMonths.length} ខែ
            </p>
            <p className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
              សរុប៖ {formatKg(totalPaidKg)}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-[#381624]/85 border border-rose-200 dark:border-rose-500/30">
            <p className="text-[10px] font-bold text-rose-700 dark:text-rose-300">
              ខែជំពាក់អង្ករមណ្ឌល
            </p>
            <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
              {owedRiceMonths.length} ខែ
            </p>
            <p className="text-[11px] font-extrabold text-rose-600 dark:text-rose-400">
              ជំពាក់៖ {formatKg(totalOwedKg)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 pt-1">
          {myRiceMonths.map((m) => (
            <div
              key={m.num}
              className={cn(
                'py-2 px-1.5 rounded-xl border text-center',
                m.status === 'paid'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                  : m.status === 'owed'
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300'
                  : m.num === currentMonthNum
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300'
                  : 'bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
              )}
            >
              <div className="text-[10px] font-black">ខែ{m.nameKm}</div>
              <div className="text-[9px] font-bold mt-0.5">
                {m.status === 'paid'
                  ? `✓ ${m.kgAmount}គីឡូ`
                  : m.status === 'owed'
                  ? `! ជំពាក់`
                  : `${m.kgAmount}គីឡូ`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {isAdmin && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-black shadow"
          >
            ចូលទៅកាន់ផ្ទាំងគ្រប់គ្រង Admin →
          </button>
        </div>
      )}

      {showMySecurityCard && (
        <div
          onClick={() => setShowMySecurityCard(false)}
          className="fixed inset-0 z-[240] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white text-slate-900 rounded-3xl p-5 shadow-2xl space-y-4 text-center"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="text-left">
                <Badge className="bg-amber-400 text-slate-950 font-black text-[10px]">
                  {verifiedProfile.studentCode}
                </Badge>
                <h4 className="text-base font-black text-slate-900 mt-0.5">
                  {verifiedProfile.fullNameKm}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowMySecurityCard(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center space-y-3">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(
                  buildStudentQrToken(
                    verifiedProfile.studentCode,
                    verifiedProfile.secretCode
                  )
                )}`}
                alt="My QR"
                className="w-44 h-44 rounded-xl border border-slate-200 bg-white p-1"
              />

              <div className="w-full">
                <BarcodeSvg
                  value={`${verifiedProfile.studentCode}:${verifiedProfile.secretCode}`}
                  hideText={true}
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={() => setShowMySecurityCard(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-black h-9 rounded-xl"
            >
              បិទផ្ទាំង
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}