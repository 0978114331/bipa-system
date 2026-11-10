import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  QrCode,
  Camera,
  ImageUp,
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
  ChevronLeft,
  ChevronRight,
  Sun,
  Globe,
  Phone,
  User,
  FileText,
  Headphones,
  Info,
  ArrowRight,
  Contact
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

export type StudentUserCategory = 'សិស្ស' | 'និស្សិត' | 'ពិសេស';

export interface StudentSecurityProfile {
  studentCode: string;
  lastNameKm: string;
  firstNameKm: string;
  fullNameKm: string;
  genderKm: string;
  userTypeKm: StudentUserCategory;
  phoneNumber: string;
  majorKm: string;
  generationKm: string;
  secretCode: string;
  saltSeed: number;
  avatarDataUrl: string;
}

export interface StudentSecurityPayload {
  profiles: Record<string, StudentSecurityProfile>;
  deletedCodes?: string[];
}

export const SECURITY_STORAGE_KEY = 'bipa_student_security_system_v3';
export const DELETED_USERS_STORAGE_KEY = 'bipa_deleted_security_users_v1';
export const VERIFIED_TOKEN_KEY = 'bipa_verified_student_token_v2';

function normalizeCode(raw: string): string {
  let cleaned = String(raw || '').trim().replace(/\s+/g, '').toUpperCase();
  if (cleaned.startsWith('PIBA-')) cleaned = 'BIPA-' + cleaned.slice(5);
  else if (cleaned.startsWith('PIBA')) cleaned = 'BIPA-' + cleaned.slice(4);
  else if (/^\d{1,3}$/.test(cleaned)) cleaned = 'BIPA-' + cleaned.padStart(3, '0');
  return cleaned;
}

export function getLocalDeletedCodes(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_USERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((c) => normalizeCode(c)) : [];
  } catch {
    return [];
  }
}

export function saveLocalDeletedCodes(codes: string[]) {
  const unique = Array.from(new Set(codes.map((c) => normalizeCode(c)).filter(Boolean)));
  localStorage.setItem(DELETED_USERS_STORAGE_KEY, JSON.stringify(unique));
}

export function splitKhmerFullName(fullName: string): { lastName: string; firstName: string } {
  const parts = String(fullName || '').trim().split(/\s+/);
  if (parts.length <= 1) {
    return { lastName: parts[0] || '', firstName: '' };
  }
  return {
    lastName: parts[0],
    firstName: parts.slice(1).join(' ')
  };
}

export function generateDefaultPhone(studentCode: string): string {
  const digits = studentCode.replace(/\D/g, '') || '1';
  const num = Number(digits);
  if (num === 15) return '0978114331';
  const suffix = String((num * 13579 + 8114300) % 9000000).padStart(7, '0');
  return `097${suffix}`;
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
  if (clean.includes(':BP-') || clean.includes(':')) {
    const parts = clean.split(':');
    if (parts.length >= 2 && parts[0].toUpperCase().includes('BIPA')) {
      return {
        studentCode: normalizeCode(parts[0]),
        secretCode: parts[1].trim().toUpperCase()
      };
    }
  }
  return null;
}

function getCombinedPaymentAndRiceStudentsMap(
  deletedCodesList: string[] = []
): Record<string, StudentSecurityProfile> {
  const deletedSet = new Set(deletedCodesList.map((c) => normalizeCode(c)));
  const map: Record<string, StudentSecurityProfile> = {};

  const addEntry = (
    codeRaw: string,
    nameKm: string,
    genderKm: string,
    majorKm: string,
    genKm: string,
    phoneRaw?: string
  ) => {
    const code = normalizeCode(codeRaw);
    if (!code || deletedSet.has(code)) return;
    if (!map[code]) {
      const cleanName = (nameKm || code).replace(/\(ប្រធាន\)/g, '').trim();
      const { lastName, firstName } = splitKhmerFullName(cleanName);
      map[code] = {
        studentCode: code,
        lastNameKm: lastName,
        firstNameKm: firstName,
        fullNameKm: cleanName,
        genderKm: genderKm || 'ប្រុស',
        userTypeKm: 'សិស្ស',
        phoneNumber: phoneRaw || generateDefaultPhone(code),
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

  initialStudents.forEach((s: BipaStudent) => {
    addEntry(
      s.student_code,
      s.full_name_km,
      s.gender_km,
      s.major_km,
      s.generation_km,
      s.contact_number
    );
  });

  return map;
}

export function loadCachedSecurityPayload(): StudentSecurityPayload {
  const localDeleted = getLocalDeletedCodes();
  try {
    const raw =
      localStorage.getItem(SECURITY_STORAGE_KEY) ||
      localStorage.getItem('bipa_student_security_system_v2') ||
      localStorage.getItem('bipa_student_security_system_v1');

    if (!raw) {
      return {
        profiles: getCombinedPaymentAndRiceStudentsMap(localDeleted),
        deletedCodes: localDeleted
      };
    }

    const parsed = JSON.parse(raw);
    const combinedDeleted = Array.from(
      new Set(
        [
          ...localDeleted,
          ...(Array.isArray(parsed?.deletedCodes) ? parsed.deletedCodes : [])
        ].map((c: string) => normalizeCode(c))
      )
    );
    saveLocalDeletedCodes(combinedDeleted);

    const deletedSet = new Set(combinedDeleted);
    const baseMap = getCombinedPaymentAndRiceStudentsMap(combinedDeleted);
    const savedProfiles = parsed?.profiles || {};
    const merged: Record<string, StudentSecurityProfile> = { ...baseMap };

    Object.keys(savedProfiles).forEach((k) => {
      const code = normalizeCode(k);
      if (!code || deletedSet.has(code)) {
        delete merged[code];
        return;
      }
      const item = savedProfiles[k];
      const seed = Number(item.saltSeed || 2026);
      const fullName =
        item.fullNameKm ||
        `${item.lastNameKm || ''} ${item.firstNameKm || ''}`.trim() ||
        baseMap[code]?.fullNameKm ||
        code;
      const split = splitKhmerFullName(fullName);

      merged[code] = {
        ...(merged[code] || {}),
        ...item,
        studentCode: code,
        lastNameKm: item.lastNameKm !== undefined ? item.lastNameKm : split.lastName,
        firstNameKm: item.firstNameKm !== undefined ? item.firstNameKm : split.firstName,
        fullNameKm: fullName,
        userTypeKm: item.userTypeKm || 'សិស្ស',
        phoneNumber:
          item.phoneNumber || baseMap[code]?.phoneNumber || generateDefaultPhone(code),
        saltSeed: seed,
        secretCode: item.secretCode || generateEncryptedCodeFromId(code, seed),
        avatarDataUrl:
          item.avatarDataUrl || localStorage.getItem(`bipa_avatar_${code}`) || ''
      };
    });

    return {
      profiles: merged,
      deletedCodes: combinedDeleted
    };
  } catch {
    return {
      profiles: getCombinedPaymentAndRiceStudentsMap(localDeleted),
      deletedCodes: localDeleted
    };
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
        const combinedDeleted = Array.from(
          new Set(
            [
              ...getLocalDeletedCodes(),
              ...(current.deletedCodes || []),
              ...(Array.isArray(parsed.deletedCodes) ? parsed.deletedCodes : [])
            ].map((c: string) => normalizeCode(c))
          )
        );
        saveLocalDeletedCodes(combinedDeleted);
        const deletedSet = new Set(combinedDeleted);

        const merged: Record<string, StudentSecurityProfile> = {};
        Object.keys(current.profiles).forEach((k) => {
          const code = normalizeCode(k);
          if (!deletedSet.has(code)) {
            merged[code] = current.profiles[k];
          }
        });

        Object.keys(parsed.profiles).forEach((k) => {
          const code = normalizeCode(k);
          if (!code || deletedSet.has(code)) {
            delete merged[code];
            return;
          }
          const item = parsed.profiles[k];
          const seed = Number(item.saltSeed || 2026);
          const fullName =
            item.fullNameKm ||
            `${item.lastNameKm || ''} ${item.firstNameKm || ''}`.trim() ||
            merged[code]?.fullNameKm ||
            code;
          const split = splitKhmerFullName(fullName);

          merged[code] = {
            ...(merged[code] || {}),
            ...item,
            studentCode: code,
            lastNameKm: item.lastNameKm !== undefined ? item.lastNameKm : split.lastName,
            firstNameKm: item.firstNameKm !== undefined ? item.firstNameKm : split.firstName,
            fullNameKm: fullName,
            userTypeKm: item.userTypeKm || 'សិស្ស',
            phoneNumber:
              item.phoneNumber || merged[code]?.phoneNumber || generateDefaultPhone(code),
            saltSeed: seed,
            secretCode: item.secretCode || generateEncryptedCodeFromId(code, seed),
            avatarDataUrl:
              item.avatarDataUrl ||
              merged[code]?.avatarDataUrl ||
              localStorage.getItem(`bipa_avatar_${code}`) ||
              ''
          };
        });

        current = {
          profiles: merged,
          deletedCodes: combinedDeleted
        };
        localStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify(current));
      }
    }
  } catch {}
  return current;
}

export async function saveSecurityPayloadToDb(
  payload: StudentSecurityPayload
): Promise<void> {
  const deletedList = Array.from(
    new Set([...getLocalDeletedCodes(), ...(payload.deletedCodes || [])])
  );
  saveLocalDeletedCodes(deletedList);

  const cleanProfiles: Record<string, StudentSecurityProfile> = {};
  const delSet = new Set(deletedList);
  Object.keys(payload.profiles || {}).forEach((k) => {
    const code = normalizeCode(k);
    if (!delSet.has(code)) {
      cleanProfiles[code] = payload.profiles[k];
    }
  });

  const finalPayload: StudentSecurityPayload = {
    profiles: cleanProfiles,
    deletedCodes: deletedList
  };

  const jsonStr = JSON.stringify(finalPayload);
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

  if (verifiedToken.toUpperCase().startsWith(`${linkedCode}:`)) {
    return profile;
  }
  return null;
}

export function hasActiveStudentQrAccess(): boolean {
  const linkedCode = normalizeCode(localStorage.getItem('bipa_linked_student_id') || '');
  const verifiedToken =
    localStorage.getItem(VERIFIED_TOKEN_KEY) ||
    localStorage.getItem('bipa_verified_student_token_v1') ||
    '';
  if (!linkedCode || !verifiedToken) return false;
  return verifiedToken.toUpperCase().startsWith(`${linkedCode}:`);
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
  window.dispatchEvent(new Event('leave-system-updated'));
}

export function clearVerifiedStudentSession() {
  localStorage.removeItem('bipa_linked_student_id');
  localStorage.removeItem(VERIFIED_TOKEN_KEY);
  localStorage.removeItem('bipa_verified_student_token_v1');
  localStorage.removeItem('bipa_student_code');
  localStorage.removeItem('student_id');
  window.dispatchEvent(new Event('student-id-linked'));
  window.dispatchEvent(new Event('student-security-updated'));
  window.dispatchEvent(new Event('payment-system-updated'));
  window.dispatchEvent(new Event('rice-system-updated'));
  window.dispatchEvent(new Event('leave-system-updated'));
  window.dispatchEvent(new Event('attendance-updated'));
}

export function BarcodeSvg({
  value,
  hideText = false,
  height = 38
}: {
  value: string;
  hideText?: boolean;
  height?: number;
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
    <div className="flex flex-col items-center bg-white px-2.5 py-1.5 rounded-xl border border-slate-200">
      <svg
        viewBox={`0 0 ${totalUnits} ${height}`}
        className="w-full max-w-[240px]"
        style={{ height: `${height}px` }}
        preserveAspectRatio="none"
      >
        {bars.map((w, idx) => {
          const x = currentX;
          currentX += w;
          if (idx % 2 === 1) return null;
          return <rect key={idx} x={x} y={0} width={w} height={height} fill="#0f172a" />;
        })}
      </svg>
      {!hideText && (
        <span className="text-[9.5px] font-mono tracking-[0.18em] text-slate-800 mt-1">
          {value}
        </span>
      )}
    </div>
  );
}

export function GoToDashboardPromptCard({ titleKm }: { titleKm?: string }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lang } = useI18n();
  const isKh = lang === 'km';
  const [openDirectLogin, setOpenDirectLogin] = useState(false);

  if (openDirectLogin) {
    return (
      <StudentVerificationGate
        titleKm={titleKm}
        onClose={() => setOpenDirectLogin(false)}
      />
    );
  }

  return (
    <div className="max-w-sm mx-auto mt-6 bg-white dark:bg-[#162033] text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-md text-center space-y-3 font-khmer animate-in fade-in duration-200">
      <div className="w-12 h-12 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 mx-auto">
        <QrCode className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <h2 className="font-moul-kh text-xs sm:text-sm text-slate-900 dark:text-white">
          {isKh ? 'សូមស្កេនកាត QR សិស្ស' : 'Student Verification'}
        </h2>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          {isKh
            ? 'សូមស្កេនកាត QR ឬបញ្ចូលកូដសម្ងាត់ដើម្បីមើលព័ត៌មានផ្ទាល់ខ្លួន។'
            : 'Scan your QR card or enter your code to view personal data.'}
        </p>
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => setOpenDirectLogin(true)}
          className="w-full sm:w-auto px-5 py-2 rounded-full bg-[#f59e0b] hover:bg-[#d97706] text-white text-xs transition-all active:scale-95"
        >
          {isKh ? 'ស្កេន QR / បញ្ចូលកូដ' : 'Scan QR / Code'}
        </button>
        {!user && (
          <button
            type="button"
            onClick={() => navigate('/signin')}
            className="w-full sm:w-auto px-4 py-2 rounded-full border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs transition-all active:scale-95"
          >
            {isKh ? 'ចូលគណនី App' : 'App Sign In'}
          </button>
        )}
      </div>
    </div>
  );
}

export function StudentVerificationGate({
  onVerified,
  onClose
}: {
  titleKm?: string;
  onVerified?: (profile: StudentSecurityProfile) => void;
  onClose?: () => void;
}) {
  const navigate = useNavigate();
  const { lang } = useI18n();
  const isKh = lang === 'km';

  const [securityPayload, setSecurityPayload] = useState<StudentSecurityPayload>(() =>
    loadCachedSecurityPayload()
  );
  const [logoUrl, setLogoUrl] = useState(
    'https://i.ibb.co/tphX7kd4/ce2e43f3-9d48-4d71-86a6-dd1ac3d77c49.png'
  );
  const [phoneOrIdInput, setPhoneOrIdInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<StudentUserCategory>('សិស្ស');
  const [errorMsg, setErrorMsg] = useState('');
  const [scanningCamera, setScanningCamera] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSecurityPayloadFromDb().then(setSecurityPayload);
    supabase
      .from('bipa_settings')
      .select('logo_url')
      .eq('id', '1')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.logo_url) setLogoUrl(data.logo_url);
      });
  }, []);

  const verifyByQrOrCredentials = (rawScannedOrPass: string, rawPhoneOrId?: string): boolean => {
    const parsedQr = parseStudentQrToken(rawScannedOrPass);
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
      setErrorMsg(isKh ? 'កាត QR មិនត្រឹមត្រូវទេ!' : 'Invalid QR card!');
      return false;
    }

    const passClean = rawScannedOrPass.trim().toUpperCase();
    const userIdentifier = String(rawPhoneOrId || '').trim();
    const digitsOnlyPhone = userIdentifier.replace(/\D/g, '');

    if (!passClean && !userIdentifier) {
      setErrorMsg(
        isKh
          ? 'សូមបញ្ចូលលេខទូរស័ព្ទ និងពាក្យសម្ងាត់ ឬស្កេន QR!'
          : 'Please enter phone & password or scan QR!'
      );
      return false;
    }

    const matchedProfile = profilesList.find((p) => {
      const codeMatch =
        userIdentifier && normalizeCode(p.studentCode) === normalizeCode(userIdentifier);
      const pDigits = (p.phoneNumber || '').replace(/\D/g, '');
      const phoneMatch =
        digitsOnlyPhone.length >= 6 &&
        (pDigits === digitsOnlyPhone ||
          pDigits.endsWith(digitsOnlyPhone.replace(/^855/, '').replace(/^0/, '')));

      const secretMatch = p.secretCode.trim().toUpperCase() === passClean;

      if (userIdentifier) {
        return (codeMatch || phoneMatch) && secretMatch;
      }
      return secretMatch;
    });

    if (matchedProfile) {
      setErrorMsg('');
      setVerifiedStudentSession(matchedProfile);
      if (onVerified) onVerified(matchedProfile);
      return true;
    }

    setErrorMsg(
      isKh
        ? 'លេខទូរស័ព្ទ ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវទេ!'
        : 'Incorrect phone number or password!'
    );
    return false;
  };

  useEffect(() => {
    let mounted = true;

    const startQrCam = async () => {
      if (!scanningCamera) return;
      await new Promise((r) => setTimeout(r, 180));
      if (!mounted || !document.getElementById('bipa-login-qr-reader')) return;

      try {
        const qr = new Html5Qrcode('bipa-login-qr-reader', {
          useBarCodeDetectorIfSupported: true,
          verbose: false
        });
        scannerRef.current = qr;
        await qr.start(
          { facingMode: 'environment' },
          { fps: 24, disableFlip: false },
          (decoded) => {
            const ok = verifyByQrOrCredentials(decoded);
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
          setErrorMsg(
            isKh
              ? 'សូមអនុញ្ញាតសិទ្ធិកាមេរ៉ា ឬជ្រើសរើសរូប QR។'
              : 'Please allow camera access or upload QR image.'
          );
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
      const qr = new Html5Qrcode('bipa-login-qr-hidden');
      const decoded = await qr.scanFile(file, true);
      verifyByQrOrCredentials(decoded);
    } catch {
      setErrorMsg(isKh ? 'រូបភាពនេះគ្មានកូដ QR ត្រឹមត្រូវទេ។' : 'Invalid QR image.');
    }
    e.target.value = '';
  };

  const roleLabels: { key: StudentUserCategory; labelKm: string; labelEn: string }[] = [
    { key: 'សិស្ស', labelKm: 'សិស្ស', labelEn: 'Student' },
    { key: 'និស្សិត', labelKm: 'និស្សិត', labelEn: 'Student' },
    { key: 'ពិសេស', labelKm: 'ពិសេស', labelEn: 'Special' }
  ];

  return (
    <div className="fixed inset-0 z-[210] bg-[#f8f9fa] dark:bg-[#0b1120] text-slate-900 dark:text-white flex flex-col justify-between p-5 sm:p-8 font-khmer overflow-y-auto animate-in fade-in duration-200">
      <div id="bipa-login-qr-hidden" className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleQrImageUpload}
        className="hidden"
      />

      <div className="w-full max-w-md mx-auto flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={() => (onClose ? onClose() : navigate('/'))}
          className="p-2 -ml-2 rounded-full text-slate-800 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="w-full max-w-md mx-auto my-auto py-5 space-y-6">
        <div className="flex flex-col items-center justify-center">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white shadow-md border border-slate-200/80 p-1.5 flex items-center justify-center overflow-hidden">
            <img
              src={logoUrl}
              alt="BIPA Logo"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {scanningCamera ? (
          <div className="bg-white dark:bg-[#162033] p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-3 text-center">
            <p className="text-xs text-slate-700 dark:text-slate-200">
              {isKh ? 'ដាក់កាត QR ឱ្យចំកាមេរ៉ា' : 'Center your QR card'}
            </p>
            <div className="relative w-60 h-60 mx-auto rounded-2xl overflow-hidden bg-slate-950 border-2 border-amber-500">
              <div id="bipa-login-qr-reader" className="w-full h-full" />
            </div>
            <div className="flex items-center justify-center gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-xl h-8 px-3"
              >
                <ImageUp className="h-3.5 w-3.5 mr-1.5" />
                {isKh ? 'ជ្រើសរើសរូប' : 'Upload QR'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setScanningCamera(false)}
                className="text-xs rounded-xl h-8 px-3.5"
              >
                {isKh ? 'បិទកាមេរ៉ា' : 'Close'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            <div className="flex items-center h-11 px-3 rounded-xl bg-white dark:bg-[#162033] border border-slate-300/90 dark:border-slate-700 shadow-2xs focus-within:border-amber-500 transition-colors">
              <div className="flex items-center gap-1.5 pr-2.5 border-r border-slate-200 dark:border-slate-700 shrink-0 select-none">
                <span className="text-xs">🇰🇭</span>
                <span className="text-xs text-slate-800 dark:text-slate-200">+855 ▾</span>
              </div>

              <input
                type="text"
                value={phoneOrIdInput}
                onChange={(e) => setPhoneOrIdInput(e.target.value)}
                placeholder={isKh ? 'លេខទូរស័ព្ទ ឬ ID' : 'Phone or ID'}
                style={{ fontSize: '12px' }}
                className="flex-1 h-10 px-2.5 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
              />

              <button
                type="button"
                onClick={() => setScanningCamera(true)}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              >
                <QrCode className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center h-11 px-3.5 rounded-xl bg-white dark:bg-[#162033] border border-slate-300/90 dark:border-slate-700 shadow-2xs focus-within:border-amber-500 transition-colors">
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    verifyByQrOrCredentials(passwordInput, phoneOrIdInput);
                  }
                }}
                placeholder={isKh ? 'ពាក្យសម្ងាត់' : 'Password'}
                style={{ fontSize: '12px' }}
                className="flex-1 h-10 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
              />

              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="p-1.5 -mr-1 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between pt-0.5 px-1">
              <div className="flex items-center gap-4">
                {roleLabels.map((roleOption) => {
                  const active = selectedRole === roleOption.key;
                  return (
                    <button
                      key={roleOption.key}
                      type="button"
                      onClick={() => setSelectedRole(roleOption.key)}
                      className="flex items-center gap-1.5 text-xs text-slate-800 dark:text-slate-200"
                    >
                      <span
                        className={cn(
                          'w-4 h-4 rounded-full flex items-center justify-center border transition-all',
                          active
                            ? 'border-[#f59e0b] bg-[#f59e0b] text-white'
                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                        )}
                      >
                        {active && (
                          <CheckCircle2 className="h-3.5 w-3.5 fill-[#f59e0b] text-white" />
                        )}
                      </span>
                      <span>{isKh ? roleOption.labelKm : roleOption.labelEn}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
              >
                <ImageUp className="h-3.5 w-3.5" />
                <span>{isKh ? 'រូប QR' : 'QR Image'}</span>
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/90 border border-rose-200 dark:border-rose-500/50 text-rose-600 dark:text-rose-300 text-[11px] flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => verifyByQrOrCredentials(passwordInput, phoneOrIdInput)}
                className="w-full h-11 rounded-full bg-[#f59e0b] hover:bg-[#d97706] text-white text-xs sm:text-sm shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 active:scale-98 transition-all"
              >
                <span>{isKh ? 'ចូលប្រព័ន្ធ' : 'Sign In'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="h-4" />
    </div>
  );
}

export function AdminA4BarcodeSheetModal({
  profiles,
  logoUrl,
  onClose
}: {
  profiles: StudentSecurityProfile[];
  logoUrl: string;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 font-khmer overflow-y-auto animate-in fade-in duration-200"
    >
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          #bipa-a4-multi-barcode-sheet,
          #bipa-a4-multi-barcode-sheet * {
            visibility: visible !important;
          }
          #bipa-a4-multi-barcode-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .bipa-cut-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .no-print-header {
            display: none !important;
          }
        }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[94dvh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-700"
      >
        <div className="no-print-header p-4 bg-[#0f172a] border-b border-slate-800 text-white flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <Printer className="h-4 w-4 text-amber-400" />
            <div>
              <h3 className="font-moul-kh text-xs text-white">
                បោះពុម្ពកាត QR & បាកូដនិស្សិត (A4)
              </h3>
              <p className="text-[11px] text-slate-400">
                សរុប {profiles.length} កាត សម្រាប់កាត់ចែកនិស្សិត
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => window.print()}
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs h-8 px-3.5 rounded-xl shadow"
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              បោះពុម្ព (A4)
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-4 sm:p-6 bg-slate-800/70 flex justify-center flex-1 scrollbar-thin">
          <div
            id="bipa-a4-multi-barcode-sheet"
            className="w-full max-w-[210mm] bg-white text-slate-900 p-4 sm:p-6 shadow-2xl rounded-sm"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {profiles.map((st) => {
                const token = buildStudentQrToken(st.studentCode, st.secretCode);
                return (
                  <div
                    key={st.studentCode}
                    className="bipa-cut-card border-2 border-dashed border-slate-400 rounded-2xl p-3.5 bg-white flex flex-col justify-between gap-2.5"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <img
                          src={logoUrl}
                          alt="BIPA"
                          className="w-8 h-8 rounded-full object-contain border border-slate-200 p-0.5"
                        />
                        <div>
                          <div className="font-moul-kh text-[10px] text-slate-900 leading-tight">
                            សមាគមជនជាតិដើមភាគតិចព្នង (BIPA)
                          </div>
                          <div className="text-[9.5px] text-amber-600">
                            បណ្ណស្កេនព័ត៌មាននិស្សិត
                          </div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px]">
                        {st.studentCode}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-1 text-xs flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {st.avatarDataUrl ? (
                            <img
                              src={st.avatarDataUrl}
                              alt=""
                              className="w-11 h-11 rounded-full object-cover border border-slate-300 shrink-0"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-amber-500 text-white text-sm flex items-center justify-center shrink-0">
                              {st.fullNameKm.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-moul-kh text-xs text-slate-900 truncate">
                              {st.fullNameKm}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              ប្រភេទ៖ {st.userTypeKm || 'សិស្ស'}
                            </div>
                          </div>
                        </div>

                        <div className="pt-1 space-y-0.5 text-[10.5px]">
                          <div>
                            <span className="text-slate-500">ទូរស័ព្ទ៖ </span>
                            <span className="text-slate-900">{st.phoneNumber}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">កូដ៖ </span>
                            <span className="font-mono text-blue-700">{st.secretCode}</span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col items-center">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=6&data=${encodeURIComponent(
                            token
                          )}`}
                          alt="QR"
                          style={{ width: '112px', height: '112px' }}
                          className="rounded-xl border border-slate-200 p-1 bg-white"
                        />
                      </div>
                    </div>

                    <div className="pt-0.5">
                      <BarcodeSvg
                        value={`${st.studentCode}:${st.secretCode}`}
                        hideText={false}
                        height={26}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminUserPasswordDashboard() {
  const [securityPayload, setSecurityPayload] = useState<StudentSecurityPayload>(() =>
    loadCachedSecurityPayload()
  );
  const [logoUrl, setLogoUrl] = useState(
    'https://i.ibb.co/tphX7kd4/ce2e43f3-9d48-4d71-86a6-dd1ac3d77c49.png'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCardStudent, setSelectedCardStudent] =
    useState<StudentSecurityProfile | null>(null);
  const [showA4PrintAllModal, setShowA4PrintAllModal] = useState(false);
  const [revealedCodes, setRevealedCodes] = useState<Record<string, boolean>>({});
  const [toastText, setToastText] = useState('');

  const [showAddBox, setShowAddBox] = useState(false);
  const [newStCode, setNewStCode] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newUserType, setNewUserType] = useState<StudentUserCategory>('សិស្ស');

  const rowAvatarInputRef = useRef<HTMLInputElement>(null);
  const [uploadingForCode, setUploadingForCode] = useState<string | null>(null);

  const syncFromPaymentAndRiceTables = async () => {
    const [secDb, payDb, riceDb] = await Promise.all([
      fetchSecurityPayloadFromDb(),
      fetchPaymentPayloadFromDb(),
      fetchRicePayloadFromDb()
    ]);

    try {
      const { data: setRow } = await supabase
        .from('bipa_settings')
        .select('logo_url')
        .eq('id', '1')
        .maybeSingle();
      if (setRow?.logo_url) setLogoUrl(setRow.logo_url);
    } catch {}

    const combinedDeleted = Array.from(
      new Set(
        [...getLocalDeletedCodes(), ...(secDb.deletedCodes || [])].map((c) =>
          normalizeCode(c)
        )
      )
    );
    const deletedSet = new Set(combinedDeleted);

    const merged: Record<string, StudentSecurityProfile> = {};
    Object.keys(secDb.profiles || {}).forEach((k) => {
      const code = normalizeCode(k);
      if (!deletedSet.has(code)) {
        merged[code] = secDb.profiles[k];
      }
    });

    const mergeResident = (s: {
      student_code: string;
      full_name_km: string;
      gender_km: string;
      major_km: string;
      generation_km: string;
    }) => {
      const code = normalizeCode(s.student_code);
      if (!code || deletedSet.has(code)) return;
      const existing = merged[code];
      const seed = existing?.saltSeed || 2026;
      const cleanFull = (s.full_name_km || existing?.fullNameKm || code)
        .replace(/\(ប្រធាន\)/g, '')
        .trim();
      const split = splitKhmerFullName(cleanFull);

      merged[code] = {
        studentCode: code,
        lastNameKm: existing?.lastNameKm || split.lastName,
        firstNameKm: existing?.firstNameKm || split.firstName,
        fullNameKm: cleanFull,
        genderKm: s.gender_km || existing?.genderKm || 'ប្រុស',
        userTypeKm: existing?.userTypeKm || 'សិស្ស',
        phoneNumber: existing?.phoneNumber || generateDefaultPhone(code),
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

    const nextPayload: StudentSecurityPayload = {
      profiles: merged,
      deletedCodes: combinedDeleted
    };
    setSecurityPayload(nextPayload);
    await saveSecurityPayloadToDb(nextPayload);
  };

  useEffect(() => {
    syncFromPaymentAndRiceTables();
  }, []);

  const profilesList = useMemo(() => {
    const deletedSet = new Set(
      [...getLocalDeletedCodes(), ...(securityPayload.deletedCodes || [])].map((c) =>
        normalizeCode(c)
      )
    );
    return Object.values(securityPayload.profiles)
      .filter((p) => !deletedSet.has(normalizeCode(p.studentCode)))
      .sort((a, b) => a.studentCode.localeCompare(b.studentCode));
  }, [securityPayload]);

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return profilesList;
    const q = searchQuery.trim().toLowerCase();
    return profilesList.filter(
      (p) =>
        p.studentCode.toLowerCase().includes(q) ||
        p.fullNameKm.toLowerCase().includes(q) ||
        (p.phoneNumber || '').toLowerCase().includes(q)
    );
  }, [profilesList, searchQuery]);

  const showNotice = (msg: string) => {
    setToastText(msg);
    setTimeout(() => setToastText(''), 3000);
  };

  const handleUpdateProfileField = async (
    studentCode: string,
    patch: Partial<StudentSecurityProfile>
  ) => {
    const existing = securityPayload.profiles[studentCode];
    if (!existing) return;

    const updated = {
      ...existing,
      ...patch
    };
    if (patch.lastNameKm !== undefined || patch.firstNameKm !== undefined) {
      updated.fullNameKm = `${updated.lastNameKm || ''} ${updated.firstNameKm || ''}`.trim();
    }

    const nextPayload: StudentSecurityPayload = {
      ...securityPayload,
      profiles: {
        ...securityPayload.profiles,
        [studentCode]: updated
      }
    };
    setSecurityPayload(nextPayload);
    await saveSecurityPayloadToDb(nextPayload);
  };

  const handleRowAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingForCode) return;
    const targetCode = uploadingForCode;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const maxDim = 720;
        let w = img.width;
        let h = img.height;
        if (w > h && w > maxDim) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else if (h > maxDim) {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        localStorage.setItem(`bipa_avatar_${targetCode}`, dataUrl);
        await handleUpdateProfileField(targetCode, { avatarDataUrl: dataUrl });
        showNotice(`បានរក្សាទុករូបភាពសម្រាប់ ${targetCode}`);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAutoEncryptNewCode = async (studentCode: string) => {
    const existing = securityPayload.profiles[studentCode];
    if (!existing) return;
    const newSeed = Math.floor(1000 + Math.random() * 90000);
    const autoEncrypted = generateEncryptedCodeFromId(studentCode, newSeed);
    await handleUpdateProfileField(studentCode, {
      saltSeed: newSeed,
      secretCode: autoEncrypted
    });
    showNotice(`បានប្តូរកូដថ្មីសម្រាប់ ${studentCode}`);
  };

  const handleAddStudentAndSyncAll = async () => {
    const cleanCode = normalizeCode(newStCode);
    const fullName = `${newLastName.trim()} ${newFirstName.trim()}`.trim();
    if (!cleanCode || !fullName) {
      showNotice('សូមបញ្ចូលអត្តលេខ និងឈ្មោះសិស្ស!');
      return;
    }

    const updatedDeleted = [
      ...getLocalDeletedCodes(),
      ...(securityPayload.deletedCodes || [])
    ].filter((c) => normalizeCode(c) !== cleanCode);
    saveLocalDeletedCodes(updatedDeleted);

    const seed = Math.floor(1000 + Math.random() * 9000);
    const newProfile: StudentSecurityProfile = {
      studentCode: cleanCode,
      lastNameKm: newLastName.trim(),
      firstNameKm: newFirstName.trim(),
      fullNameKm: fullName,
      genderKm: 'ប្រុស',
      userTypeKm: newUserType,
      phoneNumber: newPhone.trim() || generateDefaultPhone(cleanCode),
      majorKm: 'ព័ត៌មានវិទ្យា',
      generationKm: 'សិស្សមណ្ឌល',
      saltSeed: seed,
      secretCode: generateEncryptedCodeFromId(cleanCode, seed),
      avatarDataUrl: ''
    };

    const nextSecPayload: StudentSecurityPayload = {
      profiles: {
        ...securityPayload.profiles,
        [cleanCode]: newProfile
      },
      deletedCodes: updatedDeleted
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
    setNewLastName('');
    setNewFirstName('');
    setNewPhone('');
    setShowAddBox(false);
    showNotice(`បានបន្ថែម "${newProfile.fullNameKm}" (${cleanCode})`);
  };

  const handleDeleteStudentProfile = async (studentCode: string, nameKm: string) => {
    const cleanCode = normalizeCode(studentCode);
    if (!window.confirm(`លុប "${nameKm} (${cleanCode})" ចេញពីតារាងមែនទេ?`)) {
      return;
    }

    const updatedDeleted = Array.from(
      new Set([
        ...getLocalDeletedCodes(),
        ...(securityPayload.deletedCodes || []),
        cleanCode
      ])
    );
    saveLocalDeletedCodes(updatedDeleted);

    const copy = { ...securityPayload.profiles };
    delete copy[cleanCode];

    const nextPayload: StudentSecurityPayload = {
      profiles: copy,
      deletedCodes: updatedDeleted
    };
    setSecurityPayload(nextPayload);
    await saveSecurityPayloadToDb(nextPayload);

    try {
      const payData = await fetchPaymentPayloadFromDb();
      if (
        (payData.residentStudents || []).some(
          (s) => normalizeCode(s.student_code) === cleanCode
        )
      ) {
        await savePaymentPayloadToDb({
          ...payData,
          residentStudents: (payData.residentStudents || []).filter(
            (s) => normalizeCode(s.student_code) !== cleanCode
          )
        });
      }
    } catch {}

    try {
      const riceData = await fetchRicePayloadFromDb();
      if (
        (riceData.residentStudents || []).some(
          (s) => normalizeCode(s.student_code) === cleanCode
        )
      ) {
        await saveRicePayloadToDb({
          ...riceData,
          residentStudents: (riceData.residentStudents || []).filter(
            (s) => normalizeCode(s.student_code) !== cleanCode
          )
        });
      }
    } catch {}

    showNotice(`បានលុប "${nameKm} (${cleanCode})"`);
  };

  return (
    <div className="bipa-admin-sec-page space-y-4 font-khmer pb-28">
      <style>{`
        .bipa-admin-sec-page input,
        .bipa-admin-sec-page select {
          font-size: 12px !important;
        }
      `}</style>

      <input
        ref={rowAvatarInputRef}
        type="file"
        accept="image/*"
        onChange={handleRowAvatarChange}
        className="hidden"
      />

      {toastText && (
        <div className="fixed top-20 right-4 z-[250] px-4 py-2.5 rounded-2xl bg-emerald-950/95 border border-emerald-500 text-emerald-300 shadow-2xl flex items-center gap-2 text-xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastText}</span>
        </div>
      )}

      <div className="bg-white dark:bg-[#162033] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-moul-kh text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-500 shrink-0" />
            <span>គ្រប់គ្រងប្រវត្តិរូប និងកាត QR និស្សិត</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            កំណត់រូបភាព ឈ្មោះ លេខទូរស័ព្ទ និងបោះពុម្ពកាត QR ខ្នាត A4
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => setShowA4PrintAllModal(true)}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs h-9 px-3.5 rounded-xl shadow-xs"
          >
            <Printer className="h-3.5 w-3.5 mr-1.5" />
            បោះពុម្ពកាត A4 ({filteredList.length})
          </Button>

          <Button
            type="button"
            onClick={() => setShowAddBox((p) => !p)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 px-3.5 rounded-xl shadow-xs"
          >
            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
            បន្ថែម User
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={syncFromPaymentAndRiceTables}
            className="rounded-xl border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs h-9 px-3"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
            Sync
          </Button>
        </div>
      </div>

      {showAddBox && (
        <div className="bg-white dark:bg-[#162033] border border-blue-500/40 rounded-2xl p-4 space-y-3 shadow-md animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h4 className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <UserPlus className="h-4 w-4" />
              បន្ថែមឈ្មោះ User ថ្មី
            </h4>
            <button
              type="button"
              onClick={() => setShowAddBox(false)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
            <Input
              value={newStCode}
              onChange={(e) => setNewStCode(e.target.value.toUpperCase())}
              placeholder="ឧ. BIPA-025"
              className="h-9 rounded-xl bg-slate-50 dark:bg-[#0f172a]"
            />
            <Input
              value={newLastName}
              onChange={(e) => setNewLastName(e.target.value)}
              placeholder="ឧ. នាមត្រកូល"
              className="h-9 rounded-xl bg-slate-50 dark:bg-[#0f172a]"
            />
            <Input
              value={newFirstName}
              onChange={(e) => setNewFirstName(e.target.value)}
              placeholder="ឧ. នាមខ្លួន"
              className="h-9 rounded-xl bg-slate-50 dark:bg-[#0f172a]"
            />
            <Input
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="ឧ. លេខទូរស័ព្ទ"
              className="h-9 rounded-xl bg-slate-50 dark:bg-[#0f172a]"
            />
            <div className="flex gap-2">
              <select
                value={newUserType}
                onChange={(e) => setNewUserType(e.target.value as StudentUserCategory)}
                className="h-9 rounded-xl px-2.5 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white flex-1"
              >
                <option value="សិស្ស">សិស្ស</option>
                <option value="និស្សិត">និស្សិត</option>
                <option value="ពិសេស">ពិសេស</option>
              </select>
              <Button
                type="button"
                onClick={handleAddStudentAndSyncAll}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-4 rounded-xl shrink-0"
              >
                បញ្ចូល
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-[#162033] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ស្វែងរកអត្តលេខ ឈ្មោះ ឬទូរស័ព្ទ..."
              className="pl-9 h-9 rounded-xl bg-slate-50 dark:bg-[#0f172a]"
            />
          </div>
          <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs w-fit">
            សរុប៖ {filteredList.length} នាក់
          </Badge>
        </div>

        <div className="w-full max-h-[540px] overflow-x-auto overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 scrollbar-thin">
          <table className="w-full text-xs text-left border-collapse min-w-[1040px]">
            <thead className="sticky top-0 z-20">
              <tr className="bg-amber-400 text-slate-950">
                <th className="py-3 px-2.5 border border-amber-500/40 text-center w-10">ល.រ</th>
                <th className="py-3 px-2.5 border border-amber-500/40 text-center">រូបភាព</th>
                <th className="py-3 px-3 border border-amber-500/40">អត្តលេខ</th>
                <th className="py-3 px-3 border border-amber-500/40">នាមត្រកូល</th>
                <th className="py-3 px-3 border border-amber-500/40">នាមខ្លួន</th>
                <th className="py-3 px-2.5 border border-amber-500/40 text-center">ប្រភេទ</th>
                <th className="py-3 px-3 border border-amber-500/40">លេខទូរស័ព្ទ</th>
                <th className="py-3 px-3 border border-amber-500/40 text-center">កូដសម្ងាត់</th>
                <th className="py-3 px-3 border border-amber-500/40 text-center">បាកូដ</th>
                <th className="py-3 px-3 border border-amber-500/40 text-center">សកម្មភាព</th>
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
                    <td className="py-2 px-2.5 border border-slate-200/70 dark:border-slate-800 text-center">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-2.5 border border-slate-200/70 dark:border-slate-800 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setUploadingForCode(st.studentCode);
                          rowAvatarInputRef.current?.click();
                        }}
                        className="relative w-9 h-9 rounded-full overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-[#0f172a] mx-auto flex items-center justify-center group"
                      >
                        {st.avatarDataUrl ? (
                          <img
                            src={st.avatarDataUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs text-amber-500">
                            {st.fullNameKm.charAt(0)}
                          </span>
                        )}
                        <span className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                          <Camera className="h-3.5 w-3.5" />
                        </span>
                      </button>
                    </td>
                    <td className="py-2 px-3 border border-slate-200/70 dark:border-slate-800 text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {st.studentCode}
                    </td>
                    <td className="py-2 px-2 border border-slate-200/70 dark:border-slate-800">
                      <input
                        type="text"
                        value={st.lastNameKm || ''}
                        onChange={(e) =>
                          handleUpdateProfileField(st.studentCode, {
                            lastNameKm: e.target.value
                          })
                        }
                        className="w-24 h-8 px-2 rounded-lg bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </td>
                    <td className="py-2 px-2 border border-slate-200/70 dark:border-slate-800">
                      <input
                        type="text"
                        value={st.firstNameKm || ''}
                        onChange={(e) =>
                          handleUpdateProfileField(st.studentCode, {
                            firstNameKm: e.target.value
                          })
                        }
                        className="w-28 h-8 px-2 rounded-lg bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </td>
                    <td className="py-2 px-2 border border-slate-200/70 dark:border-slate-800 text-center">
                      <select
                        value={st.userTypeKm || 'សិស្ស'}
                        onChange={(e) =>
                          handleUpdateProfileField(st.studentCode, {
                            userTypeKm: e.target.value as StudentUserCategory
                          })
                        }
                        className="h-8 rounded-lg px-2 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      >
                        <option value="សិស្ស">សិស្ស</option>
                        <option value="និស្សិត">និស្សិត</option>
                        <option value="ពិសេស">ពិសេស</option>
                      </select>
                    </td>
                    <td className="py-2 px-2 border border-slate-200/70 dark:border-slate-800">
                      <input
                        type="text"
                        value={st.phoneNumber || ''}
                        onChange={(e) =>
                          handleUpdateProfileField(st.studentCode, {
                            phoneNumber: e.target.value
                          })
                        }
                        className="w-28 h-8 px-2 rounded-lg bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </td>
                    <td className="py-2 px-2.5 border border-slate-200/70 dark:border-slate-800 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-[#0f172a] px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                        <span className="font-mono text-[11px] tracking-wider text-slate-700 dark:text-amber-400">
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
                        >
                          {isRevealed ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-1.5 px-2.5 border border-slate-200/70 dark:border-slate-800 text-center">
                      <div className="w-36 mx-auto">
                        <BarcodeSvg value={barcodeToken} hideText={!isRevealed} height={26} />
                      </div>
                    </td>
                    <td className="py-2 px-2.5 border border-slate-200/70 dark:border-slate-800 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAutoEncryptNewCode(st.studentCode)}
                          className="px-2 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] flex items-center gap-1"
                        >
                          <RefreshCw className="h-3 w-3" />
                          <span>ប្តូរកូដ</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedCardStudent(st)}
                          className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[10px] flex items-center gap-1 shadow-xs"
                        >
                          <QrCode className="h-3.5 w-3.5" />
                          <span>កាត QR</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteStudentProfile(st.studentCode, st.fullNameKm)
                          }
                          className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
        <AdminA4BarcodeSheetModal
          profiles={[selectedCardStudent]}
          logoUrl={logoUrl}
          onClose={() => setSelectedCardStudent(null)}
        />
      )}

      {showA4PrintAllModal && (
        <AdminA4BarcodeSheetModal
          profiles={filteredList}
          logoUrl={logoUrl}
          onClose={() => setShowA4PrintAllModal(false)}
        />
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
        className="w-full max-w-6xl max-h-[92dvh] bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="p-4 bg-[#0f172a] text-white flex items-center justify-between shrink-0">
          <span className="font-moul-kh text-xs flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-amber-400" />
            គ្រប់គ្រងលេខសម្ងាត់ User និងកាត QR
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
  const { lang, setLang } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const { hasRole } = useAuth();
  const isKh = lang === 'km';
  const isAdmin = hasRole('super_admin', 'residence_admin', 'finance_admin', 'duty_manager');

  const currentYearStr = String(new Date().getFullYear());

  const [paymentPayload, setPaymentPayload] = useState(() => loadCachedPaymentPayload());
  const [ricePayload, setRicePayload] = useState(() => loadCachedRicePayload());

  const [verifiedProfile, setVerifiedProfile] = useState<StudentSecurityProfile | null>(() =>
    isStudentSessionVerified(loadCachedSecurityPayload())
  );
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showProfileDetailModal, setShowProfileDetailModal] = useState(false);
  const [scrolledCompact, setScrolledCompact] = useState(false);

  const heroBannerRef = useRef<HTMLDivElement>(null);

  const loadAllDashboardData = async () => {
    const [secData, payData, rData] = await Promise.all([
      fetchSecurityPayloadFromDb(),
      fetchPaymentPayloadFromDb(),
      fetchRicePayloadFromDb()
    ]);
    setPaymentPayload(payData);
    setRicePayload(rData);
    setVerifiedProfile(isStudentSessionVerified(secData));
  };

  useEffect(() => {
    loadAllDashboardData();
    const openLoginHandler = () => setShowLoginModal(true);
    window.addEventListener('student-security-updated', loadAllDashboardData);
    window.addEventListener('payment-system-updated', loadAllDashboardData);
    window.addEventListener('rice-system-updated', loadAllDashboardData);
    window.addEventListener('open-bipa-student-login', openLoginHandler);
    return () => {
      window.removeEventListener('student-security-updated', loadAllDashboardData);
      window.removeEventListener('payment-system-updated', loadAllDashboardData);
      window.removeEventListener('rice-system-updated', loadAllDashboardData);
      window.removeEventListener('open-bipa-student-login', openLoginHandler);
    };
  }, []);

  useEffect(() => {
    const el = heroBannerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setScrolledCompact(!entry.isIntersecting);
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [verifiedProfile]);

  const myPaySummary = useMemo(() => {
    if (!verifiedProfile) return { paidCount: 0, owedCount: 0, paidRiel: 0, owedRiel: 0 };
    const code = normalizeCode(verifiedProfile.studentCode);
    const monthsMap = paymentPayload.recordsByYear?.[currentYearStr]?.[code]?.months || {};
    let paidCount = 0;
    let owedCount = 0;
    let paidRiel = 0;
    let owedRiel = 0;
    KHMER_MONTHS.forEach((m) => {
      const r = monthsMap[m.num];
      const fee = r?.amount || paymentPayload.monthlyFeeRiel || DEFAULT_MONTHLY_FEE;
      if (r?.status === 'paid') {
        paidCount += 1;
        paidRiel += fee;
      } else if (r?.status === 'owed') {
        owedCount += 1;
        owedRiel += fee;
      }
    });
    return { paidCount, owedCount, paidRiel, owedRiel };
  }, [verifiedProfile, paymentPayload, currentYearStr]);

  const myRiceSummary = useMemo(() => {
    if (!verifiedProfile) return { paidCount: 0, owedCount: 0, paidKg: 0, owedKg: 0 };
    const code = normalizeCode(verifiedProfile.studentCode);
    const monthsMap = ricePayload.recordsByYear?.[currentYearStr]?.[code]?.months || {};
    let paidCount = 0;
    let owedCount = 0;
    let paidKg = 0;
    let owedKg = 0;
    KHMER_RICE_MONTHS.forEach((m) => {
      const r = monthsMap[m.num];
      const quota = Number(r?.kgAmount || getQuotaKgForMonth(ricePayload, currentYearStr, m.num));
      if (r?.status === 'paid') {
        paidCount += 1;
        paidKg += quota;
      } else if (r?.status === 'owed') {
        owedCount += 1;
        owedKg += quota;
      }
    });
    return { paidCount, owedCount, paidKg, owedKg };
  }, [verifiedProfile, ricePayload, currentYearStr]);

  const renderTranslatedUserType = (typeKm?: StudentUserCategory) => {
    if (isKh) return typeKm || 'សិស្ស';
    if (typeKm === 'និស្សិត') return 'Student';
    if (typeKm === 'ពិសេស') return 'Special';
    return 'Student';
  };

  const currentAvatar =
    verifiedProfile?.avatarDataUrl ||
    (verifiedProfile
      ? localStorage.getItem(`bipa_avatar_${verifiedProfile.studentCode}`) || ''
      : '');

  return (
    <div className="w-full max-w-xl mx-auto min-h-full bg-[#f5f6f8] dark:bg-[#0b1120] text-slate-900 dark:text-white font-khmer pb-28 overflow-x-hidden">
      {showLoginModal && (
        <StudentVerificationGate
          onVerified={(prof) => {
            setVerifiedProfile(prof);
            setShowLoginModal(false);
          }}
          onClose={() => setShowLoginModal(false)}
        />
      )}

      {verifiedProfile && scrolledCompact && (
        <div
          onClick={() => setShowProfileDetailModal(true)}
          className="fixed top-16 sm:top-20 left-0 right-0 z-50 max-w-xl mx-auto bg-white/95 dark:bg-[#162033]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center justify-between shadow-sm cursor-pointer animate-in slide-in-from-top-2 duration-150"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/');
              }}
              className="p-1 text-slate-800 dark:text-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="w-9 h-9 rounded-full overflow-hidden border border-amber-400 bg-slate-200 shrink-0">
              {currentAvatar ? (
                <img src={currentAvatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-amber-500 text-white text-xs">
                  {verifiedProfile.fullNameKm.charAt(0)}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <span className="font-moul-kh text-xs text-slate-900 dark:text-white truncate block">
                {verifiedProfile.fullNameKm}
              </span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {renderTranslatedUserType(verifiedProfile.userTypeKm)} •{' '}
                {verifiedProfile.phoneNumber}
              </p>
            </div>
          </div>
          <Eye className="h-4 w-4 text-amber-500 shrink-0" />
        </div>
      )}

      {!verifiedProfile ? (
        <div
          ref={heroBannerRef}
          className="relative w-full h-60 sm:h-68 bg-[#c57c14] flex flex-col justify-between p-4 sm:p-5 text-white select-none"
        >
          <div className="flex items-center justify-between z-10">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="p-1.5 rounded-full text-slate-950 hover:bg-black/10 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => navigate('/admin?page=user-passwords')}
                className="px-3 py-1 rounded-full bg-black/25 text-white text-[11px]"
              >
                {isKh ? 'គ្រប់គ្រងកូដ (Admin)' : 'Admin Users'}
              </button>
            )}
          </div>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
            <User className="w-32 h-32 text-amber-200" />
          </div>

          <div className="relative z-10 flex items-center gap-3.5 pb-1">
            <div
              onClick={() => setShowLoginModal(true)}
              className="w-18 h-18 rounded-full bg-amber-200/30 border-2 border-amber-200/40 flex items-center justify-center cursor-pointer shrink-0"
              style={{ width: '70px', height: '70px' }}
            >
              <User className="h-8 w-8 text-[#935907]" />
            </div>
            <div className="space-y-0.5">
              <h1 className="font-moul-kh text-base sm:text-lg text-white leading-tight">
                {isKh ? 'ភ្ញៀវ' : 'Guest'}
              </h1>
              <p className="text-xs text-white/85">{isKh ? 'ភ្ញៀវ' : 'Guest'}</p>
              <p className="text-[11px] font-mono tracking-wider text-white/80">
                XXX-XXX-XXX
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div
          ref={heroBannerRef}
          onClick={() => setShowProfileDetailModal(true)}
          className="relative w-full h-72 sm:h-80 bg-[#0f172a] overflow-hidden flex flex-col justify-between p-4 sm:p-5 text-white cursor-pointer group"
        >
          {currentAvatar ? (
            <>
              <img
                src={currentAvatar}
                alt=""
                className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-55"
              />
              <img
                src={currentAvatar}
                alt={verifiedProfile.fullNameKm}
                style={{ objectPosition: 'center 15%' }}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#334155]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />

          <div className="relative z-10 flex items-center justify-between">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/');
              }}
              className="p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/admin?page=user-passwords');
                }}
                className="px-3 py-1 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-xs text-amber-300 text-[11px] border border-white/15"
              >
                {isKh ? 'កែរូបក្នុង Admin' : 'Edit in Admin'}
              </button>
            )}
          </div>

          <div className="relative z-10 flex items-center gap-3.5 pb-1">
            <div
              className="rounded-full overflow-hidden border-2 border-white shadow-xl bg-slate-900 shrink-0 group-hover:scale-105 transition-transform"
              style={{ width: '74px', height: '74px' }}
            >
              {currentAvatar ? (
                <img
                  src={currentAvatar}
                  alt={verifiedProfile.fullNameKm}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-amber-500 text-white text-xl">
                  {verifiedProfile.fullNameKm.charAt(0)}
                </div>
              )}
            </div>

            <div className="space-y-0.5 drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
              <h1 className="font-moul-kh text-base sm:text-lg text-white leading-tight">
                {verifiedProfile.fullNameKm}
              </h1>
              <p className="text-xs text-white/95">
                {renderTranslatedUserType(verifiedProfile.userTypeKm)}
              </p>
              <p className="text-xs text-white/95 tracking-wide">
                {verifiedProfile.phoneNumber}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 sm:px-5 pt-4 space-y-4">
        <div className="space-y-2">
          <h2 className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 px-1">
            {isKh ? 'ប្រវត្តិរូប' : 'Profile'}
          </h2>

          {!verifiedProfile ? (
            <div className="bg-white dark:bg-[#162033] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs text-center space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {isKh
                  ? 'អ្នកមិនទាន់បានចូលគណនី (login) នៅឡើយទេ'
                  : 'You are not logged in yet'}
              </p>
              <button
                type="button"
                onClick={() => setShowLoginModal(true)}
                className="px-5 py-1.5 rounded-full border border-[#d97706] text-[#d97706] dark:text-amber-400 hover:bg-amber-500/10 text-xs transition-all active:scale-95"
              >
                {isKh ? 'ទៅកាន់ផ្ទាំង ចូលគណនី' : 'Go to Login'}
              </button>
            </div>
          ) : (
            <>
              <div
                onClick={() => setShowProfileDetailModal(true)}
                className="bg-white dark:bg-[#162033] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden cursor-pointer hover:border-amber-500/50 transition-colors"
              >
                <div className="p-3 sm:p-3.5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Contact className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">
                      {isKh ? 'នាមត្រកូល' : 'Last Name'}
                    </p>
                    <p className="text-xs sm:text-sm text-slate-900 dark:text-white">
                      {verifiedProfile.lastNameKm ||
                        splitKhmerFullName(verifiedProfile.fullNameKm).lastName}
                    </p>
                  </div>
                </div>

                <div className="p-3 sm:p-3.5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Contact className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">
                      {isKh ? 'នាមខ្លួន' : 'First Name'}
                    </p>
                    <p className="text-xs sm:text-sm text-slate-900 dark:text-white">
                      {verifiedProfile.firstNameKm ||
                        splitKhmerFullName(verifiedProfile.fullNameKm).firstName}
                    </p>
                  </div>
                </div>

                <div className="p-3 sm:p-3.5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">
                      {isKh ? 'ប្រភេទ' : 'Category'}
                    </p>
                    <p className="text-xs sm:text-sm text-slate-900 dark:text-white">
                      {renderTranslatedUserType(verifiedProfile.userTypeKm)}
                    </p>
                  </div>
                </div>

                <div className="p-3 sm:p-3.5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">
                      {isKh ? 'លេខទូរស័ព្ទ' : 'Phone Number'}
                    </p>
                    <p className="text-xs sm:text-sm text-slate-900 dark:text-white">
                      {verifiedProfile.phoneNumber}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div
                  onClick={() => navigate('/dashboard/payments')}
                  className="bg-white dark:bg-[#162033] rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800 shadow-2xs cursor-pointer hover:border-blue-500 transition-all space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                      <DollarSign className="h-3.5 w-3.5" />
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-900 dark:text-white">
                    {isKh ? 'ការបង់ប្រាក់ប្រចាំខែ' : 'Monthly Payment'}
                  </p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                    {isKh
                      ? `បង់រួច ${myPaySummary.paidCount} ខែ (${formatRiel(myPaySummary.paidRiel)})`
                      : `Paid ${myPaySummary.paidCount} mo`}
                  </p>
                  {myPaySummary.owedCount > 0 && (
                    <p className="text-[10px] text-rose-500">
                      {isKh
                        ? `ជំពាក់ ${myPaySummary.owedCount} ខែ`
                        : `Owed ${myPaySummary.owedCount} mo`}
                    </p>
                  )}
                </div>

                <div
                  onClick={() => navigate('/?view=rice')}
                  className="bg-white dark:bg-[#162033] rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800 shadow-2xs cursor-pointer hover:border-orange-500 transition-all space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-7 h-7 rounded-full bg-orange-500/15 text-orange-500 flex items-center justify-center">
                      <Package className="h-3.5 w-3.5" />
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-900 dark:text-white">
                    {isKh ? 'ការរួមចំណែកអង្ករ' : 'Rice Contribution'}
                  </p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                    {isKh
                      ? `បង់រួច ${myRiceSummary.paidCount} ខែ (${formatKg(myRiceSummary.paidKg)})`
                      : `Paid ${myRiceSummary.paidCount} mo`}
                  </p>
                  {myRiceSummary.owedCount > 0 && (
                    <p className="text-[10px] text-rose-500">
                      {isKh
                        ? `ជំពាក់ ${myRiceSummary.owedCount} ខែ`
                        : `Owed ${myRiceSummary.owedCount} mo`}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 px-1">
            {isKh ? 'ការកំណត់កម្មវិធី' : 'App Settings'}
          </h2>

          <div className="bg-white dark:bg-[#162033] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
            <div className="p-3 sm:p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#f59e0b] text-white flex items-center justify-center shrink-0">
                  <Sun className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-slate-900 dark:text-white">
                    {isKh ? 'រូបរាង' : 'Appearance'}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {theme === 'light'
                      ? isKh
                        ? 'ភ្លឺ'
                        : 'Light'
                      : isKh
                      ? 'ងងឹត'
                      : 'Dark'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleTheme}
                className={cn(
                  'w-12 h-6 rounded-full p-0.5 transition-colors flex items-center',
                  theme === 'dark'
                    ? 'bg-amber-500 justify-end'
                    : 'bg-slate-200 dark:bg-slate-700 justify-start'
                )}
              >
                <span className="w-5 h-5 rounded-full bg-white shadow block" />
              </button>
            </div>

            <div className="p-3 sm:p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#2563eb] text-white flex items-center justify-center shrink-0">
                  <Globe className="h-4 w-4" />
                </div>
                <span className="text-xs text-slate-900 dark:text-white">
                  {isKh ? 'ភាសា' : 'Language'}
                </span>
              </div>

              <div className="flex items-center gap-3.5">
                <button
                  type="button"
                  onClick={() => setLang('km')}
                  className="flex items-center gap-1.5 text-xs text-slate-800 dark:text-slate-200"
                >
                  <span
                    className={cn(
                      'w-4 h-4 rounded-full flex items-center justify-center border',
                      lang === 'km'
                        ? 'border-[#f59e0b] bg-[#f59e0b] text-white'
                        : 'border-slate-300 dark:border-slate-600'
                    )}
                  >
                    {lang === 'km' && (
                      <CheckCircle2 className="h-3.5 w-3.5 fill-[#f59e0b] text-white" />
                    )}
                  </span>
                  <span>ខ្មែរ</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLang('en')}
                  className="flex items-center gap-1.5 text-xs text-slate-800 dark:text-slate-200"
                >
                  <span
                    className={cn(
                      'w-4 h-4 rounded-full flex items-center justify-center border',
                      lang === 'en'
                        ? 'border-[#f59e0b] bg-[#f59e0b] text-white'
                        : 'border-slate-300 dark:border-slate-600'
                    )}
                  >
                    {lang === 'en' && (
                      <CheckCircle2 className="h-3.5 w-3.5 fill-[#f59e0b] text-white" />
                    )}
                  </span>
                  <span>{isKh ? 'អង់គ្លេស' : 'English'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 px-1">
            {isKh ? 'ព័ត៌មាន' : 'Information'}
          </h2>

          <div className="bg-white dark:bg-[#162033] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
            <button
              type="button"
              onClick={() => navigate('/contact')}
              className="w-full p-3 sm:p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                  <Headphones className="h-4 w-4" />
                </div>
                <span className="text-xs text-slate-900 dark:text-white">
                  {isKh ? 'ទាក់ទងមកយើង' : 'Contact Us'}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/about')}
              className="w-full p-3 sm:p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <span className="text-xs text-slate-900 dark:text-white">
                  {isKh ? 'គោលការណ៍ឯកជនភាព' : 'Privacy Policy'}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/residence-info')}
              className="w-full p-3 sm:p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <FileText className="h-4 w-4" />
                </div>
                <span className="text-xs text-slate-900 dark:text-white">
                  {isKh ? 'លក្ខខណ្ឌប្រើប្រាស់' : 'Terms of Use'}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>

            <div className="p-3 sm:p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Info className="h-4 w-4" />
                </div>
                <span className="text-xs text-slate-900 dark:text-white">
                  {isKh ? 'កំណែ' : 'Version'}
                </span>
              </div>
              <span className="text-xs text-amber-600 dark:text-amber-400">2.0.6</span>
            </div>
          </div>
        </div>

        {verifiedProfile && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                clearVerifiedStudentSession();
                setVerifiedProfile(null);
              }}
              className="w-full bg-white dark:bg-[#162033] rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center">
                  <LogOut className="h-4 w-4" />
                </div>
                <span className="text-xs text-rose-600">
                  {isKh ? 'ចាកចេញ' : 'Sign Out'}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>
          </div>
        )}
      </div>

      {verifiedProfile && showProfileDetailModal && (
        <div
          onClick={() => setShowProfileDetailModal(false)}
          className="fixed inset-0 z-[240] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 font-khmer animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white dark:bg-[#162033] text-slate-900 dark:text-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200"
          >
            <div className="relative w-full h-72 bg-slate-950 flex items-center justify-center overflow-hidden">
              {currentAvatar ? (
                <img
                  src={currentAvatar}
                  alt={verifiedProfile.fullNameKm}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-amber-500 text-white text-3xl flex items-center justify-center">
                  {verifiedProfile.fullNameKm.charAt(0)}
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowProfileDetailModal(false)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div>
                  <h3 className="font-moul-kh text-sm text-slate-900 dark:text-white">
                    {verifiedProfile.fullNameKm}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {renderTranslatedUserType(verifiedProfile.userTypeKm)} •{' '}
                    {verifiedProfile.majorKm}
                  </p>
                </div>
                <Badge className="bg-amber-400 text-slate-950 text-[11px] px-2.5 py-0.5">
                  {verifiedProfile.studentCode}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200/70 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">
                    {isKh ? 'នាមត្រកូល' : 'Last Name'}
                  </span>
                  <span className="text-xs text-slate-900 dark:text-white">
                    {verifiedProfile.lastNameKm ||
                      splitKhmerFullName(verifiedProfile.fullNameKm).lastName}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200/70 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">
                    {isKh ? 'នាមខ្លួន' : 'First Name'}
                  </span>
                  <span className="text-xs text-slate-900 dark:text-white">
                    {verifiedProfile.firstNameKm ||
                      splitKhmerFullName(verifiedProfile.fullNameKm).firstName}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200/70 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">
                    {isKh ? 'ប្រភេទ' : 'Category'}
                  </span>
                  <span className="text-xs text-slate-900 dark:text-white">
                    {renderTranslatedUserType(verifiedProfile.userTypeKm)}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200/70 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">
                    {isKh ? 'លេខទូរស័ព្ទ' : 'Phone Number'}
                  </span>
                  <span className="text-xs text-blue-600 dark:text-amber-400">
                    {verifiedProfile.phoneNumber}
                  </span>
                </div>
              </div>

              <Button
                type="button"
                onClick={() => setShowProfileDetailModal(false)}
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs h-9 rounded-xl"
              >
                {isKh ? 'បិទផ្ទាំង' : 'Close'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}