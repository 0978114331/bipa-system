import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  Contact,
  Save
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
  updatedAt?: number;
}

export const SECURITY_STORAGE_KEY = 'bipa_student_security_system_v3';
export const DELETED_USERS_STORAGE_KEY = 'bipa_deleted_security_users_v1';
export const VERIFIED_TOKEN_KEY = 'bipa_verified_student_token_v2';

export function normalizeCode(raw: string): string {
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

export function generateObfuscatedCardCipher(studentCode: string, secretCode: string): string {
  const raw = `${normalizeCode(studentCode)}::${String(secretCode || '').trim()}::BIPA_CARD_CIPHER`;
  let h1 = 0x811c9dc5;
  let h2 = 0x1b873593;
  for (let i = 0; i < raw.length; i++) {
    const c = raw.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= c * 37;
    h2 = Math.imul(h2, 0xcc9e2d51);
  }
  const alphabet = '9X7FK2M8Q4Z1W5R3J6N0BVTYHPLGCDS';
  let out = '';
  let a = Math.abs(h1);
  let b = Math.abs(h2);
  for (let i = 0; i < 12; i++) {
    const idx = ((i % 2 === 0 ? a : b) + i * 13) % alphabet.length;
    out += alphabet[idx];
    a = Math.floor(a / 3) ^ (b & 0xff);
    b = Math.floor(b / 5) ^ (a & 0xff);
  }
  return `ENC#${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}`;
}

export function generateObfuscatedBarcodeSerial(studentCode: string, secretCode: string): string {
  const raw = `BAR::${normalizeCode(studentCode)}::${String(secretCode || '').trim()}`;
  let h = 5381;
  for (let i = 0; i < raw.length; i++) {
    h = (h * 33) ^ raw.charCodeAt(i);
  }
  const hex1 = (h >>> 0).toString(16).toUpperCase().padStart(8, '0');
  const hex2 = ((h ^ 0xa5a5a5a5) >>> 0).toString(16).toUpperCase().padStart(8, '0');
  return `0x${hex1}${hex2}`;
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
        userTypeKm: 'និស្សិត',
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
      const fallbackFull = item.fullNameKm || baseMap[code]?.fullNameKm || code;
      const split = splitKhmerFullName(fallbackFull);
      const lName = item.lastNameKm !== undefined ? String(item.lastNameKm) : split.lastName;
      const fName = item.firstNameKm !== undefined ? String(item.firstNameKm) : split.firstName;
      const fullName = `${lName} ${fName}`.trim() || fallbackFull;

      merged[code] = {
        ...(merged[code] || {}),
        ...item,
        studentCode: code,
        lastNameKm: lName,
        firstNameKm: fName,
        fullNameKm: fullName,
        userTypeKm: item.userTypeKm || 'និស្សិត',
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
      deletedCodes: combinedDeleted,
      updatedAt: Number(parsed?.updatedAt || 0)
    };
  } catch {
    return {
      profiles: getCombinedPaymentAndRiceStudentsMap(localDeleted),
      deletedCodes: localDeleted
    };
  }
}

let lastLocalSecuritySaveTime = 0;

export async function fetchSecurityPayloadFromDb(): Promise<StudentSecurityPayload> {
  let current = loadCachedSecurityPayload();
  if (Date.now() - lastLocalSecuritySaveTime < 1500) {
    return current;
  }

  try {
    const { data: setRow, error } = await supabase
      .from('bipa_settings')
      .select('name_en')
      .eq('id', 'student_security_v2')
      .maybeSingle();

    if (!error && setRow && setRow.name_en) {
      const parsed = JSON.parse(setRow.name_en);
      if (parsed && parsed.profiles) {
        const cloudDeleted = Array.isArray(parsed.deletedCodes)
          ? parsed.deletedCodes.map((c: string) => normalizeCode(c))
          : [];
        saveLocalDeletedCodes(cloudDeleted);
        const deletedSet = new Set(cloudDeleted);

        const baseMap = getCombinedPaymentAndRiceStudentsMap(cloudDeleted);
        const merged: Record<string, StudentSecurityProfile> = { ...baseMap };

        Object.keys(parsed.profiles).forEach((k) => {
          const code = normalizeCode(k);
          if (!code || deletedSet.has(code)) {
            delete merged[code];
            return;
          }
          const item = parsed.profiles[k];
          const seed = Number(item.saltSeed || 2026);
          const fallbackFull = item.fullNameKm || baseMap[code]?.fullNameKm || code;
          const split = splitKhmerFullName(fallbackFull);
          const lName = item.lastNameKm !== undefined ? String(item.lastNameKm) : split.lastName;
          const fName = item.firstNameKm !== undefined ? String(item.firstNameKm) : split.firstName;
          const fullName = `${lName} ${fName}`.trim() || fallbackFull;

          merged[code] = {
            ...(merged[code] || {}),
            ...item,
            studentCode: code,
            lastNameKm: lName,
            firstNameKm: fName,
            fullNameKm: fullName,
            userTypeKm: item.userTypeKm || 'និស្សិត',
            phoneNumber: item.phoneNumber || generateDefaultPhone(code),
            saltSeed: seed,
            secretCode: item.secretCode || generateEncryptedCodeFromId(code, seed),
            avatarDataUrl:
              item.avatarDataUrl ||
              localStorage.getItem(`bipa_avatar_${code}`) ||
              ''
          };
        });

        current = {
          profiles: merged,
          deletedCodes: cloudDeleted,
          updatedAt: Number(parsed.updatedAt || Date.now())
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
  const nowTs = Date.now();
  lastLocalSecuritySaveTime = nowTs;

  const deletedList = Array.from(
    new Set(
      [...getLocalDeletedCodes(), ...(payload.deletedCodes || [])].map((c) =>
        normalizeCode(c)
      )
    )
  );
  saveLocalDeletedCodes(deletedList);

  const cleanProfiles: Record<string, StudentSecurityProfile> = {};
  const delSet = new Set(deletedList);
  Object.keys(payload.profiles || {}).forEach((k) => {
    const code = normalizeCode(k);
    if (!delSet.has(code)) {
      const item = payload.profiles[k];
      const composedFull =
        `${item.lastNameKm || ''} ${item.firstNameKm || ''}`.trim() ||
        item.fullNameKm ||
        code;
      cleanProfiles[code] = {
        ...item,
        studentCode: code,
        fullNameKm: composedFull
      };
    }
  });

  const finalPayload = {
    profiles: cleanProfiles,
    deletedCodes: deletedList,
    updatedAt: nowTs
  };

  const jsonStr = JSON.stringify(finalPayload);
  localStorage.setItem(SECURITY_STORAGE_KEY, jsonStr);

  try {
    await supabase.from('bipa_settings').upsert(
      {
        id: 'student_security_v2',
        logo_url: 'STUDENT_SECURITY',
        name_km: 'ប្រព័ន្ធសុវត្ថិភាពកូដសម្ងាត់និស្សិត',
        name_en: jsonStr
      },
      { onConflict: 'id' }
    );
  } catch {}

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('bipa_security_sync_channel');
      bc.postMessage({ type: 'SECURITY_UPDATED', timestamp: nowTs });
      bc.close();
    }
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
  displayLabel,
  hideText = false,
  height = 38
}: {
  value: string;
  displayLabel?: string;
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
        <span className="text-[9.5px] font-mono tracking-[0.18em] text-slate-800 mt-1 truncate max-w-full">
          {displayLabel || value}
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
  const [selectedRole, setSelectedRole] = useState<StudentUserCategory>('និស្សិត');
  const [errorMsg, setErrorMsg] = useState('');
  const [scanningCamera, setScanningCamera] = useState(false);

  const [camStage, setCamStage] = useState<
    'scanning' | 'processing' | 'success' | 'unlinked' | 'error'
  >('scanning');
  const [camShortText, setCamShortText] = useState('');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanLockRef = useRef(false);
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

  const evaluateQrTokenQuick = (
    rawText: string,
    currentPayload: StudentSecurityPayload
  ): {
    status: 'success' | 'unlinked' | 'error';
    shortTitle: string;
    profile?: StudentSecurityProfile;
  } => {
    const cleaned = String(rawText || '').trim();
    if (!cleaned) {
      return {
        status: 'error',
        shortTitle: isKh ? 'មិនស្គាល់កូដ' : 'Invalid QR'
      };
    }

    const profilesList = Object.values(currentPayload.profiles || {});
    const parsedQr = parseStudentQrToken(cleaned);

    if (parsedQr) {
      const byCode = profilesList.find(
        (p) => normalizeCode(p.studentCode) === parsedQr.studentCode
      );
      if (!byCode) {
        return {
          status: 'unlinked',
          shortTitle: isKh ? 'មិនទាន់ភ្ជាប់ ID' : 'ID Not Linked'
        };
      }
      if (byCode.secretCode.trim().toUpperCase() === parsedQr.secretCode) {
        return {
          status: 'success',
          shortTitle: isKh ? 'ស្កេនជោគជ័យ' : 'Scan Success',
          profile: byCode
        };
      }
      return {
        status: 'error',
        shortTitle: isKh ? 'កាតមិនត្រឹមត្រូវ' : 'Invalid Card'
      };
    }

    const upper = cleaned.toUpperCase();
    const isStationQr =
      upper.startsWith('BIPA-STATION') ||
      upper === 'BIPA-QR' ||
      upper === 'BIPA-ATTENDANCE' ||
      cleaned.startsWith('http');

    if (isStationQr) {
      const linkedCode = normalizeCode(localStorage.getItem('bipa_linked_student_id') || '');
      if (!linkedCode) {
        return {
          status: 'unlinked',
          shortTitle: isKh ? 'មិនទាន់ភ្ជាប់ ID' : 'ID Not Linked'
        };
      }
      const linkedProf = profilesList.find((p) => normalizeCode(p.studentCode) === linkedCode);
      if (linkedProf) {
        return {
          status: 'success',
          shortTitle: isKh ? 'ស្កេនជោគជ័យ' : 'Scan Success',
          profile: linkedProf
        };
      }
      return {
        status: 'unlinked',
        shortTitle: isKh ? 'មិនទាន់ភ្ជាប់ ID' : 'ID Not Linked'
      };
    }

    const matchedBySecret = profilesList.find(
      (p) => p.secretCode.trim().toUpperCase() === upper
    );
    if (matchedBySecret) {
      return {
        status: 'success',
        shortTitle: isKh ? 'ស្កេនជោគជ័យ' : 'Scan Success',
        profile: matchedBySecret
      };
    }

    const matchedByCode = profilesList.find(
      (p) => normalizeCode(p.studentCode) === normalizeCode(cleaned)
    );
    if (matchedByCode) {
      return {
        status: 'success',
        shortTitle: isKh ? 'ស្កេនជោគជ័យ' : 'Scan Success',
        profile: matchedByCode
      };
    }

    if (/^(BIPA|PIBA|\d)/i.test(cleaned)) {
      return {
        status: 'unlinked',
        shortTitle: isKh ? 'មិនទាន់ភ្ជាប់ ID' : 'ID Not Linked'
      };
    }

    return {
      status: 'error',
      shortTitle: isKh ? 'កាតមិនត្រឹមត្រូវ' : 'Invalid Card'
    };
  };

  const verifyByQrOrCredentials = (rawScannedOrPass: string, rawPhoneOrId?: string): boolean => {
    const quickRes = evaluateQrTokenQuick(rawScannedOrPass, securityPayload);
    if (quickRes.status === 'success' && quickRes.profile) {
      setErrorMsg('');
      setVerifiedStudentSession(quickRes.profile);
      if (onVerified) onVerified(quickRes.profile);
      return true;
    }

    const passClean = rawScannedOrPass.trim().toUpperCase();
    const userIdentifier = String(rawPhoneOrId || '').trim();
    const digitsOnlyPhone = userIdentifier.replace(/\D/g, '');
    const profilesList = Object.values(securityPayload.profiles || {});

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
    let nativeDetectorTimer: ReturnType<typeof setInterval> | null = null;

    const handleDetectedCode = async (decodedText: string) => {
      if (scanLockRef.current || !mounted) return;
      scanLockRef.current = true;

      if (navigator.vibrate) {
        try {
          navigator.vibrate(35);
        } catch {}
      }

      setCamStage('processing');
      setCamShortText(isKh ? 'កំពុងពិនិត្យ...' : 'Checking...');

      let activePayload = securityPayload;
      let result = evaluateQrTokenQuick(decodedText, activePayload);

      if (result.status !== 'success') {
        try {
          activePayload = await fetchSecurityPayloadFromDb();
          if (mounted) setSecurityPayload(activePayload);
          result = evaluateQrTokenQuick(decodedText, activePayload);
        } catch {}
      }

      if (!mounted) return;

      if (result.status === 'success' && result.profile) {
        setCamStage('success');
        setCamShortText(result.shortTitle);
        setVerifiedStudentSession(result.profile);

        setTimeout(() => {
          if (scannerRef.current?.isScanning) {
            scannerRef.current
              .stop()
              .then(() => scannerRef.current?.clear())
              .catch(() => {});
          }
          if (mounted) {
            setScanningCamera(false);
            if (onVerified) onVerified(result.profile!);
          }
        }, 600);
      } else {
        setCamStage(result.status);
        setCamShortText(result.shortTitle);

        setTimeout(() => {
          if (!mounted) return;
          setCamStage('scanning');
          setCamShortText('');
          scanLockRef.current = false;
        }, 1400);
      }
    };

    const startQrCam = async () => {
      if (!scanningCamera) return;
      scanLockRef.current = false;
      setCamStage('scanning');
      setCamShortText('');

      await new Promise((r) => setTimeout(r, 120));
      if (!mounted || !document.getElementById('bipa-login-qr-reader')) return;

      try {
        const qr = new Html5Qrcode('bipa-login-qr-reader', {
          formatsToSupport: [0, 5, 3],
          useBarCodeDetectorIfSupported: true,
          verbose: false
        });
        scannerRef.current = qr;

        const fastConfig = {
          fps: 30,
          disableFlip: false
        };

        try {
          await qr.start(
            { facingMode: 'environment' },
            fastConfig,
            (decoded) => handleDetectedCode(decoded),
            () => {}
          );
        } catch {
          const cams = await Html5Qrcode.getCameras();
          if (!cams || cams.length === 0) {
            setCamStage('error');
            setCamShortText(isKh ? 'មិនឃើញកាមេរ៉ា' : 'No Camera');
            return;
          }
          const backCam =
            cams.find(
              (c) =>
                c.label.toLowerCase().includes('back') ||
                c.label.toLowerCase().includes('environment') ||
                c.label.toLowerCase().includes('rear')
            ) || cams[cams.length - 1];

          await qr.start(
            backCam.id,
            fastConfig,
            (decoded) => handleDetectedCode(decoded),
            () => {}
          );
        }

        const WinBarcodeDetector = (window as any).BarcodeDetector;
        if (WinBarcodeDetector) {
          try {
            const detector = new WinBarcodeDetector({
              formats: ['qr_code', 'code_128', 'code_39']
            });
            nativeDetectorTimer = setInterval(async () => {
              if (scanLockRef.current || !mounted) return;
              const videoEl = document.querySelector(
                '#bipa-login-qr-reader video'
              ) as HTMLVideoElement | null;
              if (videoEl && videoEl.readyState >= 2) {
                try {
                  const codes = await detector.detect(videoEl);
                  if (codes && codes.length > 0 && codes[0].rawValue) {
                    handleDetectedCode(codes[0].rawValue);
                  }
                } catch {}
              }
            }, 90);
          } catch {}
        }
      } catch {
        if (mounted) {
          setCamStage('error');
          setCamShortText(isKh ? 'សូមបើកសិទ្ធិកាមេរ៉ា' : 'Allow Camera');
        }
      }
    };

    if (scanningCamera) startQrCam();

    return () => {
      mounted = false;
      if (nativeDetectorTimer) clearInterval(nativeDetectorTimer);
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
  }, [scanningCamera]);

  const handleQrImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (scanningCamera) {
      setCamStage('processing');
      setCamShortText(isKh ? 'កំពុងអានរូប...' : 'Reading...');
    }

    try {
      const qr = new Html5Qrcode('bipa-login-qr-hidden');
      const decoded = await qr.scanFile(file, true);
      const activePayload = await fetchSecurityPayloadFromDb();
      setSecurityPayload(activePayload);
      const res = evaluateQrTokenQuick(decoded, activePayload);

      if (res.status === 'success' && res.profile) {
        if (scanningCamera) {
          setCamStage('success');
          setCamShortText(res.shortTitle);
        }
        setVerifiedStudentSession(res.profile);
        setTimeout(() => {
          setScanningCamera(false);
          if (onVerified) onVerified(res.profile!);
        }, 550);
      } else {
        if (scanningCamera) {
          setCamStage(res.status);
          setCamShortText(res.shortTitle);
          setTimeout(() => {
            setCamStage('scanning');
            setCamShortText('');
          }, 1500);
        } else {
          setErrorMsg(res.shortTitle);
        }
      }
    } catch {
      if (scanningCamera) {
        setCamStage('error');
        setCamShortText(isKh ? 'គ្មានកូដ QR ទេ' : 'No QR Found');
        setTimeout(() => {
          setCamStage('scanning');
          setCamShortText('');
        }, 1500);
      } else {
        setErrorMsg(isKh ? 'គ្មានកូដ QR ត្រឹមត្រូវទេ' : 'Invalid QR image');
      }
    }
    e.target.value = '';
  };

  const roleLabels: { key: StudentUserCategory; labelKm: string; labelEn: string }[] = [
    { key: 'សិស្ស', labelKm: 'សិស្ស', labelEn: 'Student' },
    { key: 'និស្សិត', labelKm: 'និស្សិត', labelEn: 'Student' },
    { key: 'ពិសេស', labelKm: 'ពិសេស', labelEn: 'Special' }
  ];

  return (
    <div className="fixed inset-0 z-[210] text-white flex flex-col justify-between p-4 sm:p-6 font-khmer overflow-y-auto animate-in fade-in duration-200 select-none">
      <style>{`
        @keyframes bipaLoginScanLaser {
          0% { top: 8%; }
          50% { top: 90%; }
          100% { top: 8%; }
        }
        .animate-bipa-login-laser {
          animation: bipaLoginScanLaser 1.9s ease-in-out infinite;
        }
        #bipa-login-qr-reader {
          border: none !important;
          width: 100% !important;
          height: 100% !important;
          position: relative !important;
          overflow: hidden !important;
        }
        #bipa-login-qr-reader video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 1.25rem !important;
        }
        #bipa-login-qr-reader canvas {
          opacity: 0 !important;
          position: absolute !important;
          pointer-events: none !important;
        }
        #bipa-login-qr-reader img,
        #bipa-login-qr-reader__dashboard,
        #bipa-login-qr-reader__header_message,
        #bipa-login-qr-reader__scan_region > div {
          display: none !important;
        }
      `}</style>

      <img
        src="https://i.ibb.co/KY0bJNW/b151bd61-2587-445b-b245-2ddaea928120.png"
        alt=""
        className="fixed inset-0 w-full h-full object-cover object-center -z-20 pointer-events-none"
      />
      <div className="fixed inset-0 bg-[#041028]/55 backdrop-blur-[3px] -z-10 pointer-events-none" />

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
          className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md flex items-center justify-center text-white border border-white/20 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="w-full max-w-md mx-auto my-auto py-4 space-y-5">
        <div className="flex flex-col items-center justify-center space-y-2 text-center">
          <div
            className="rounded-full bg-white shadow-[0_0_30px_rgba(59,130,246,0.5)] border-2 border-white p-1.5 flex items-center justify-center overflow-hidden"
            style={{ width: '88px', height: '88px' }}
          >
            <img
              src={logoUrl}
              alt="BIPA Logo"
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          <h2 className="font-moul-kh text-sm sm:text-base text-white drop-shadow">
            {isKh ? 'ផ្ទៀងផ្ទាត់អត្តសញ្ញាណនិស្សិត' : 'Student Verification'}
          </h2>
        </div>

        <div className="bg-[#091e42]/70 backdrop-blur-xl border border-white/20 rounded-3xl p-4 sm:p-5 shadow-[0_20px_50px_rgba(0,0,0,0.45)] space-y-3.5">
          {scanningCamera ? (
            <div className="space-y-3.5 text-center">
              <p className="text-xs text-sky-100">
                {isKh ? 'ដាក់កាតឱ្យចំកណ្តាល' : 'Center your QR card'}
              </p>

              <div className="relative w-64 h-64 mx-auto rounded-[22px] overflow-hidden bg-[#0a0f1d] border-2 border-amber-400/90 shadow-[0_0_35px_rgba(0,0,0,0.75)] flex items-center justify-center">
                <div id="bipa-login-qr-reader" className="w-full h-full" />

                <div className="absolute top-2.5 left-2.5 w-8 h-8 border-t-[3.5px] border-l-[3.5px] border-white/90 rounded-tl-xl z-10 pointer-events-none" />
                <div className="absolute top-2.5 right-2.5 w-8 h-8 border-t-[3.5px] border-r-[3.5px] border-white/90 rounded-tr-xl z-10 pointer-events-none" />
                <div className="absolute bottom-2.5 left-2.5 w-8 h-8 border-b-[3.5px] border-l-[3.5px] border-white/90 rounded-bl-xl z-10 pointer-events-none" />
                <div className="absolute bottom-2.5 right-2.5 w-8 h-8 border-b-[3.5px] border-r-[3.5px] border-white/90 rounded-br-xl z-10 pointer-events-none" />

                {camStage === 'scanning' && (
                  <div className="absolute left-4 right-4 h-0.5 bg-emerald-400 shadow-[0_0_12px_#34d399] animate-bipa-login-laser z-20 pointer-events-none" />
                )}

                {camStage !== 'scanning' && (
                  <div className="absolute inset-0 z-30 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center animate-in fade-in duration-150">
                    {camStage === 'processing' && (
                      <>
                        <div className="w-11 h-11 rounded-full border-4 border-white/20 border-t-white animate-spin mb-2.5" />
                        <span className="text-white text-xs tracking-wide">
                          {camShortText || 'កំពុងពិនិត្យ...'}
                        </span>
                      </>
                    )}

                    {camStage === 'success' && (
                      <>
                        <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg mb-2.5 animate-in zoom-in-75 duration-150">
                          <CheckCircle2 className="h-7 w-7 text-white" />
                        </div>
                        <span className="text-emerald-400 text-sm font-bold tracking-wide">
                          {camShortText || 'ស្កេនជោគជ័យ'}
                        </span>
                      </>
                    )}

                    {camStage === 'unlinked' && (
                      <>
                        <div className="w-14 h-14 rounded-full bg-amber-500 flex items-center justify-center shadow-lg mb-2.5 animate-in zoom-in-75 duration-150">
                          <AlertCircle className="h-7 w-7 text-slate-950" />
                        </div>
                        <span className="text-amber-300 text-sm font-bold tracking-wide">
                          {camShortText || 'មិនទាន់ភ្ជាប់ ID'}
                        </span>
                      </>
                    )}

                    {camStage === 'error' && (
                      <>
                        <div className="w-14 h-14 rounded-full bg-rose-600 flex items-center justify-center shadow-lg mb-2.5 animate-in zoom-in-75 duration-150">
                          <X className="h-7 w-7 text-white" />
                        </div>
                        <span className="text-rose-400 text-sm font-bold tracking-wide">
                          {camShortText || 'កាតមិនត្រឹមត្រូវ'}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-2.5 pt-1">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-xl h-9 px-3.5"
                >
                  <ImageUp className="h-3.5 w-3.5 mr-1.5" />
                  {isKh ? 'ជ្រើសរើសរូប QR' : 'Upload QR'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setScanningCamera(false)}
                  className="bg-white/10 border-white/25 text-white hover:bg-white/20 text-xs rounded-xl h-9 px-3.5"
                >
                  {isKh ? 'បិទកាមេរ៉ា' : 'Close'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              <div className="relative flex items-center h-12 pl-3 pr-11 rounded-xl bg-slate-950/60 border border-white/25 focus-within:border-amber-400 transition-colors">
                <div className="flex items-center gap-1.5 pr-2.5 border-r border-white/20 shrink-0 select-none">
                  <span className="text-xs">🇰🇭</span>
                  <span className="text-xs text-sky-100">+855 ▾</span>
                </div>

                <input
                  type="text"
                  value={phoneOrIdInput}
                  onChange={(e) => setPhoneOrIdInput(e.target.value)}
                  placeholder={isKh ? 'លេខទូរស័ព្ទ ឬ ID' : 'Phone or ID'}
                  style={{ fontSize: '13px' }}
                  className="min-w-0 w-full flex-1 h-10 pl-2.5 bg-transparent text-white placeholder:text-slate-300/75 outline-none"
                />

                <button
                  type="button"
                  onClick={() => setScanningCamera(true)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-sky-200 hover:text-white transition-colors"
                  title={isKh ? 'ស្កេនកាត QR' : 'Scan QR'}
                >
                  <QrCode className="h-5 w-5" />
                </button>
              </div>

              <div className="relative flex items-center h-12 pl-3.5 pr-11 rounded-xl bg-slate-950/60 border border-white/25 focus-within:border-amber-400 transition-colors">
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
                  style={{ fontSize: '13px' }}
                  className="min-w-0 w-full flex-1 h-10 bg-transparent text-white placeholder:text-slate-300/75 outline-none"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-sky-200 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between pt-0.5 px-1 flex-wrap gap-2">
                <div className="flex items-center gap-3.5">
                  {roleLabels.map((roleOption) => {
                    const active = selectedRole === roleOption.key;
                    return (
                      <button
                        key={roleOption.key}
                        type="button"
                        onClick={() => setSelectedRole(roleOption.key)}
                        className="flex items-center gap-1.5 text-xs text-white"
                      >
                        <span
                          className={cn(
                            'w-4 h-4 rounded-full flex items-center justify-center border transition-all',
                            active
                              ? 'border-amber-400 bg-amber-400 text-slate-950'
                              : 'border-white/50 bg-transparent'
                          )}
                        >
                          {active && (
                            <CheckCircle2 className="h-3.5 w-3.5 fill-amber-400 text-slate-950" />
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
                  className="text-[11px] text-amber-300 hover:underline flex items-center gap-1"
                >
                  <ImageUp className="h-3.5 w-3.5" />
                  <span>{isKh ? 'រូប QR' : 'QR Image'}</span>
                </button>
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-400/50 text-rose-200 text-[11px] flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => verifyByQrOrCredentials(passwordInput, phoneOrIdInput)}
                  className="w-full h-11 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 text-xs sm:text-sm font-bold shadow-lg flex items-center justify-center gap-1.5 active:scale-98 transition-all"
                >
                  <span>{isKh ? 'ចូលប្រព័ន្ធ' : 'Sign In'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="h-8" />
    </div>
  );
}

function StudentIdCardSingleItem({
  st,
  logoUrl
}: {
  st: StudentSecurityProfile;
  logoUrl: string;
}) {
  const token = buildStudentQrToken(st.studentCode, st.secretCode);
  const cipherCode = generateObfuscatedCardCipher(st.studentCode, st.secretCode);
  const barcodeSerial = generateObfuscatedBarcodeSerial(st.studentCode, st.secretCode);
  const fullName = `${st.lastNameKm || ''} ${st.firstNameKm || ''}`.trim() || st.fullNameKm;
  const avatarSrc = st.avatarDataUrl || localStorage.getItem(`bipa_avatar_${st.studentCode}`) || '';

  return (
    <div className="bipa-cut-card border-2 border-dashed border-slate-400 rounded-2xl p-3.5 bg-white text-slate-900 flex flex-col justify-between gap-2.5 break-inside-avoid">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <img
            src={logoUrl}
            alt="BIPA"
            className="w-8 h-8 rounded-full object-contain border border-slate-200 p-0.5 shrink-0 bg-white"
          />
          <div className="min-w-0">
            <div className="font-moul-kh text-[10px] text-slate-900 leading-tight truncate">
              សមាគមជនជាតិដើមភាគតិចព្នង (BIPA)
            </div>
            <div className="text-[9.5px] text-amber-600 font-bold">
              បណ្ណស្កេនព័ត៌មាននិស្សិត
            </div>
          </div>
        </div>
        <span className="px-2.5 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black text-[10px] shrink-0">
          {st.studentCode}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1 text-xs flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt=""
                className="w-11 h-11 rounded-full object-cover object-top border border-slate-300 shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-amber-500 text-white font-bold text-sm flex items-center justify-center shrink-0">
                {fullName.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <div className="font-moul-kh text-xs text-slate-900 truncate">
                {fullName}
              </div>
              <div className="text-[10px] text-slate-500">
                ប្រភេទ៖ {st.userTypeKm || 'និស្សិត'}
              </div>
            </div>
          </div>

          <div className="pt-1 space-y-0.5 text-[10.5px]">
            <div>
              <span className="text-slate-500">ទូរស័ព្ទ៖ </span>
              <span className="font-bold text-slate-900">{st.phoneNumber}</span>
            </div>
            <div className="truncate">
              <span className="text-slate-500">កូដ៖ </span>
              <span className="font-mono text-[10px] font-bold text-blue-700">
                {cipherCode}
              </span>
            </div>
          </div>
        </div>

        <div className="shrink-0 flex flex-col items-center">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=6&data=${encodeURIComponent(
              token
            )}`}
            alt="QR"
            crossOrigin="anonymous"
            style={{ width: '108px', height: '108px' }}
            className="rounded-xl border border-slate-200 p-1 bg-white"
          />
        </div>
      </div>

      <div className="pt-0.5">
        <BarcodeSvg
          value={`${st.studentCode}:${st.secretCode}`}
          displayLabel={barcodeSerial}
          hideText={false}
          height={25}
        />
      </div>
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
  const paginatedPages = useMemo(() => {
    const pages: StudentSecurityProfile[][] = [];
    for (let i = 0; i < profiles.length; i += 6) {
      pages.push(profiles.slice(i, i + 6));
    }
    return pages;
  }, [profiles]);

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-[250] bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 font-khmer animate-in fade-in duration-200"
      >
        <style>{`
          #bipa-a4-print-portal {
            display: none;
          }
          @media print {
            @page {
              size: A4 portrait;
              margin: 8mm;
            }
            html, body {
              background: #ffffff !important;
              background-color: #ffffff !important;
              height: auto !important;
              min-height: 0 !important;
              overflow: visible !important;
              position: static !important;
              margin: 0 !important;
              padding: 0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body > *:not(#bipa-a4-print-portal) {
              display: none !important;
            }
            #bipa-a4-print-portal {
              display: block !important;
              position: static !important;
              width: 100% !important;
              height: auto !important;
              overflow: visible !important;
              background: #ffffff !important;
            }
            .bipa-a4-print-page {
              width: 100% !important;
              display: grid !important;
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 6mm !important;
              padding: 1mm 0 !important;
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .bipa-a4-print-page:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
            }
            .bipa-cut-card {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `}</style>

        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-4xl h-[90dvh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-700"
        >
          <div className="p-4 bg-[#0f172a] border-b border-slate-800 text-white flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <Printer className="h-4 w-4 text-amber-400" />
              <div>
                <h3 className="font-moul-kh text-xs text-white">
                  បោះពុម្ពកាត QR & បាកូដនិស្សិត (A4)
                </h3>
                <p className="text-[11px] text-slate-400">
                  សរុប {profiles.length} កាត • {paginatedPages.length} ទំព័រ A4 (១ ទំព័រ ៦ កាត មិនដាច់កាត)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => window.print()}
                className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs h-8 px-3.5 rounded-xl shadow"
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

          <div
            style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-6 bg-slate-800/80 space-y-6 scrollbar-thin"
          >
            {paginatedPages.map((pageProfiles, pageIdx) => (
              <div
                key={pageIdx}
                className="w-full max-w-[210mm] mx-auto bg-white text-slate-900 p-4 sm:p-6 shadow-2xl rounded-2xl space-y-3"
              >
                {paginatedPages.length > 1 && (
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 text-xs text-slate-500 font-bold">
                    <span>ទំព័រ A4 ទី {pageIdx + 1} / {paginatedPages.length}</span>
                    <span>ចំនួន {pageProfiles.length} កាត</span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {pageProfiles.map((st) => (
                    <StudentIdCardSingleItem
                      key={st.studentCode}
                      st={st}
                      logoUrl={logoUrl}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {typeof document !== 'undefined' &&
        createPortal(
          <div id="bipa-a4-print-portal">
            {paginatedPages.map((pageProfiles, pageIdx) => (
              <div key={pageIdx} className="bipa-a4-print-page">
                {pageProfiles.map((st) => (
                  <StudentIdCardSingleItem
                    key={st.studentCode}
                    st={st}
                    logoUrl={logoUrl}
                  />
                ))}
              </div>
            ))}
          </div>,
          document.body
        )}
    </>
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
  const [dirtyRows, setDirtyRows] = useState<Record<string, boolean>>({});
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [toastText, setToastText] = useState('');

  const [showAddBox, setShowAddBox] = useState(false);
  const [newStCode, setNewStCode] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newUserType, setNewUserType] = useState<StudentUserCategory>('និស្សិត');

  const rowAvatarInputRef = useRef<HTMLInputElement>(null);
  const [uploadingForCode, setUploadingForCode] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setToastText(msg);
    setTimeout(() => {
      setToastText((prev) => (prev === msg ? '' : prev));
    }, 3200);
  };

  const syncFromPaymentAndRiceTables = async (notify = false) => {
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
      const existingFull = existing
        ? `${existing.lastNameKm || ''} ${existing.firstNameKm || ''}`.trim() ||
          existing.fullNameKm
        : '';
      const cleanFull = (existingFull || s.full_name_km || code)
        .replace(/\(ប្រធាន\)/g, '')
        .trim();
      const split = splitKhmerFullName(cleanFull);

      merged[code] = {
        studentCode: code,
        lastNameKm:
          existing?.lastNameKm !== undefined ? existing.lastNameKm : split.lastName,
        firstNameKm:
          existing?.firstNameKm !== undefined ? existing.firstNameKm : split.firstName,
        fullNameKm: cleanFull,
        genderKm: existing?.genderKm || s.gender_km || 'ប្រុស',
        userTypeKm: existing?.userTypeKm || 'និស្សិត',
        phoneNumber: existing?.phoneNumber || generateDefaultPhone(code),
        majorKm: existing?.majorKm || s.major_km || 'ព័ត៌មានវិទ្យា',
        generationKm: existing?.generationKm || s.generation_km || 'សិស្សមណ្ឌល',
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
      deletedCodes: combinedDeleted,
      updatedAt: Date.now()
    };
    setSecurityPayload(nextPayload);
    await saveSecurityPayloadToDb(nextPayload);
    if (notify) {
      showNotice('បានធ្វើបច្ចុប្បន្នភាពទិន្នន័យ (Sync) រួចរាល់!');
    }
  };

  useEffect(() => {
    syncFromPaymentAndRiceTables(false);
  }, []);

  const profilesList = useMemo(() => {
    const deletedSet = new Set(
      [...getLocalDeletedCodes(), ...(securityPayload.deletedCodes || [])].map((c) =>
        normalizeCode(c)
      )
    );
    return Object.values(securityPayload.profiles)
      .filter((p) => !deletedSet.has(normalizeCode(p.studentCode)))
      .sort((a, b) => a.studentCode.localeCompare(b.studentCode, undefined, { numeric: true }));
  }, [securityPayload]);

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return profilesList;
    const q = searchQuery.trim().toLowerCase();
    return profilesList.filter(
      (p) =>
        p.studentCode.toLowerCase().includes(q) ||
        p.fullNameKm.toLowerCase().includes(q) ||
        (p.lastNameKm || '').toLowerCase().includes(q) ||
        (p.firstNameKm || '').toLowerCase().includes(q) ||
        (p.phoneNumber || '').toLowerCase().includes(q)
    );
  }, [profilesList, searchQuery]);

  const handleLocalFieldEdit = (
    studentCode: string,
    patch: Partial<StudentSecurityProfile>
  ) => {
    const code = normalizeCode(studentCode);
    setSecurityPayload((prev) => {
      const existing = prev.profiles[code];
      if (!existing) return prev;
      const updated: StudentSecurityProfile = {
        ...existing,
        ...patch
      };
      if (patch.lastNameKm !== undefined || patch.firstNameKm !== undefined) {
        updated.fullNameKm = `${updated.lastNameKm || ''} ${updated.firstNameKm || ''}`.trim();
      }
      const next: StudentSecurityPayload = {
        ...prev,
        profiles: {
          ...prev.profiles,
          [code]: updated
        },
        updatedAt: Date.now()
      };
      localStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setDirtyRows((prev) => ({ ...prev, [code]: true }));
  };

  const persistAndPropagateNames = async (
    targetPayload: StudentSecurityPayload,
    successMessage: string
  ) => {
    setIsSavingAll(true);
    await saveSecurityPayloadToDb(targetPayload);

    try {
      const payData = await fetchPaymentPayloadFromDb();
      let payModified = false;
      const nextPayStudents = (payData.residentStudents || []).map((s) => {
        const c = normalizeCode(s.student_code);
        const prof = targetPayload.profiles[c];
        if (prof) {
          const full =
            `${prof.lastNameKm || ''} ${prof.firstNameKm || ''}`.trim() || prof.fullNameKm;
          if (full && s.full_name_km !== full) {
            payModified = true;
            return { ...s, full_name_km: full, full_name_en: full };
          }
        }
        return s;
      });
      if (payModified) {
        await savePaymentPayloadToDb({
          ...payData,
          residentStudents: nextPayStudents
        });
      }
    } catch {}

    try {
      const riceData = await fetchRicePayloadFromDb();
      let riceModified = false;
      const nextRiceStudents = (riceData.residentStudents || []).map((s) => {
        const c = normalizeCode(s.student_code);
        const prof = targetPayload.profiles[c];
        if (prof) {
          const full =
            `${prof.lastNameKm || ''} ${prof.firstNameKm || ''}`.trim() || prof.fullNameKm;
          if (full && s.full_name_km !== full) {
            riceModified = true;
            return { ...s, full_name_km: full, full_name_en: full };
          }
        }
        return s;
      });
      if (riceModified) {
        await saveRicePayloadToDb({
          ...riceData,
          residentStudents: nextRiceStudents
        });
      }
    } catch {}

    try {
      const linkedCode = normalizeCode(localStorage.getItem('bipa_linked_student_id') || '');
      if (linkedCode && targetPayload.profiles[linkedCode]) {
        setVerifiedStudentSession(targetPayload.profiles[linkedCode]);
      }
    } catch {}

    setIsSavingAll(false);
    setDirtyRows({});
    showNotice(successMessage);
  };

  const handleSaveSingleStudentRow = async (st: StudentSecurityProfile) => {
    const fullName = `${st.lastNameKm || ''} ${st.firstNameKm || ''}`.trim() || st.fullNameKm;
    await persistAndPropagateNames(
      securityPayload,
      `បានរក្សាទុក និងធ្វើបច្ចុប្បន្នភាពព័ត៌មានរបស់ «${fullName}» ដោយជោគជ័យ!`
    );
  };

  const handleSaveAllEditedRows = async () => {
    await persistAndPropagateNames(
      securityPayload,
      'បានរក្សាទុកការកែប្រែទាំងអស់ និងបញ្ជូនទៅកាន់អ្នកប្រើប្រាស់ភ្លាមៗ!'
    );
  };

  const handleRowAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingForCode) return;
    const targetCode = normalizeCode(uploadingForCode);

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const maxDim = 320;
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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.78);
        localStorage.setItem(`bipa_avatar_${targetCode}`, dataUrl);

        const existing = securityPayload.profiles[targetCode];
        if (existing) {
          const nextPayload: StudentSecurityPayload = {
            ...securityPayload,
            profiles: {
              ...securityPayload.profiles,
              [targetCode]: {
                ...existing,
                avatarDataUrl: dataUrl
              }
            },
            updatedAt: Date.now()
          };
          setSecurityPayload(nextPayload);
          await saveSecurityPayloadToDb(nextPayload);
          showNotice(`បានរក្សាទុករូបភាពថ្មីសម្រាប់ ${targetCode} ដោយជោគជ័យ!`);
        }
        setUploadingForCode(null);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAutoEncryptNewCode = async (studentCode: string) => {
    const code = normalizeCode(studentCode);
    const existing = securityPayload.profiles[code];
    if (!existing) return;
    const newSeed = Math.floor(1000 + Math.random() * 90000);
    const autoEncrypted = generateEncryptedCodeFromId(code, newSeed);
    const fullName =
      `${existing.lastNameKm || ''} ${existing.firstNameKm || ''}`.trim() || existing.fullNameKm;

    const nextPayload: StudentSecurityPayload = {
      ...securityPayload,
      profiles: {
        ...securityPayload.profiles,
        [code]: {
          ...existing,
          saltSeed: newSeed,
          secretCode: autoEncrypted
        }
      },
      updatedAt: Date.now()
    };
    setSecurityPayload(nextPayload);
    setRevealedCodes((prev) => ({ ...prev, [code]: true }));
    await saveSecurityPayloadToDb(nextPayload);
    showNotice(`បានប្តូរកូដសម្ងាត់ថ្មីសម្រាប់ «${fullName} (${code})» ដោយជោគជ័យ!`);
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
      deletedCodes: updatedDeleted,
      updatedAt: Date.now()
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
    showNotice(`បានបន្ថែមនិស្សិតថ្មី «${newProfile.fullNameKm} (${cleanCode})» ដោយជោគជ័យ!`);
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
      deletedCodes: updatedDeleted,
      updatedAt: Date.now()
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

    showNotice(`បានលុប «${nameKm} (${cleanCode})» ចេញពីប្រព័ន្ធរួចរាល់!`);
  };

  const hasDirtyChanges = Object.keys(dirtyRows).length > 0;

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
        <div className="fixed top-20 right-4 z-[260] px-4 py-3 rounded-2xl bg-emerald-950/95 border border-emerald-400 text-emerald-200 shadow-2xl flex items-center gap-2.5 text-xs sm:text-sm font-bold animate-in slide-in-from-top-3 duration-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
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
            onClick={handleSaveAllEditedRows}
            disabled={isSavingAll}
            className={cn(
              'text-xs h-9 px-4 rounded-xl shadow-xs font-bold transition-all',
              hasDirtyChanges
                ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            )}
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {isSavingAll ? 'កំពុងរក្សាទុក...' : 'រក្សាទុកការកែប្រែ'}
          </Button>

          <Button
            type="button"
            onClick={() => setShowA4PrintAllModal(true)}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs h-9 px-3.5 rounded-xl shadow-xs font-bold"
          >
            <Printer className="h-3.5 w-3.5 mr-1.5" />
            បោះពុម្ពកាត A4 ({filteredList.length})
          </Button>

          <Button
            type="button"
            onClick={() => setShowAddBox((p) => !p)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 px-3.5 rounded-xl shadow-xs font-bold"
          >
            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
            បន្ថែម User
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => syncFromPaymentAndRiceTables(true)}
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
          <table className="w-full text-xs text-left border-collapse min-w-[1060px]">
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
                const isRowDirty = Boolean(dirtyRows[st.studentCode]);
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
                            {(st.lastNameKm || st.fullNameKm || 'U').charAt(0)}
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
                          handleLocalFieldEdit(st.studentCode, {
                            lastNameKm: e.target.value
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveSingleStudentRow(st);
                        }}
                        className="w-24 h-8 px-2 rounded-lg bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 focus:border-amber-500 text-slate-900 dark:text-white outline-none"
                      />
                    </td>
                    <td className="py-2 px-2 border border-slate-200/70 dark:border-slate-800">
                      <input
                        type="text"
                        value={st.firstNameKm || ''}
                        onChange={(e) =>
                          handleLocalFieldEdit(st.studentCode, {
                            firstNameKm: e.target.value
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveSingleStudentRow(st);
                        }}
                        className="w-28 h-8 px-2 rounded-lg bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 focus:border-amber-500 text-slate-900 dark:text-white outline-none"
                      />
                    </td>
                    <td className="py-2 px-2 border border-slate-200/70 dark:border-slate-800 text-center">
                      <select
                        value={st.userTypeKm || 'និស្សិត'}
                        onChange={(e) =>
                          handleLocalFieldEdit(st.studentCode, {
                            userTypeKm: e.target.value as StudentUserCategory
                          })
                        }
                        className="h-8 rounded-lg px-2 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
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
                          handleLocalFieldEdit(st.studentCode, {
                            phoneNumber: e.target.value
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveSingleStudentRow(st);
                        }}
                        className="w-28 h-8 px-2 rounded-lg bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 focus:border-amber-500 text-slate-900 dark:text-white outline-none"
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
                        <BarcodeSvg value={barcodeToken} hideText={true} height={26} />
                      </div>
                    </td>
                    <td className="py-2 px-2.5 border border-slate-200/70 dark:border-slate-800 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSaveSingleStudentRow(st)}
                          className={cn(
                            'px-2.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all',
                            isRowDirty
                              ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-md scale-105'
                              : 'bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                          )}
                        >
                          <Save className="h-3 w-3" />
                          <span>Save</span>
                        </button>

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
  const { user, profile, signOut, hasRole } = useAuth();
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
  const [pullStretch, setPullStretch] = useState(0);
  const [customCoverUrl, setCustomCoverUrl] = useState<string>('');
  const [coverToast, setCoverToast] = useState('');

  const touchStartYRef = useRef<number | null>(null);
  const heroBannerRef = useRef<HTMLDivElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  const loadAllDashboardData = async () => {
    const [secData, payData, rData] = await Promise.all([
      fetchSecurityPayloadFromDb(),
      fetchPaymentPayloadFromDb(),
      fetchRicePayloadFromDb()
    ]);
    setPaymentPayload(payData);
    setRicePayload(rData);
    const activeProf = isStudentSessionVerified(secData);
    setVerifiedProfile(activeProf);

    if (activeProf) {
      const savedCover =
        (activeProf as any).coverDataUrl ||
        localStorage.getItem(`bipa_cover_${normalizeCode(activeProf.studentCode)}`) ||
        localStorage.getItem('bipa_default_cover_banner') ||
        '';
      setCustomCoverUrl(savedCover);
    } else {
      setCustomCoverUrl(localStorage.getItem('bipa_default_cover_banner') || '');
    }
  };

  useEffect(() => {
    loadAllDashboardData();
    const openLoginHandler = () => setShowLoginModal(true);
    const syncTimer = setInterval(loadAllDashboardData, 6000);

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('bipa_security_sync_channel');
        bc.onmessage = () => loadAllDashboardData();
      }
    } catch {}

    window.addEventListener('student-security-updated', loadAllDashboardData);
    window.addEventListener('payment-system-updated', loadAllDashboardData);
    window.addEventListener('rice-system-updated', loadAllDashboardData);
    window.addEventListener('open-bipa-student-login', openLoginHandler);
    return () => {
      clearInterval(syncTimer);
      if (bc) bc.close();
      window.removeEventListener('student-security-updated', loadAllDashboardData);
      window.removeEventListener('payment-system-updated', loadAllDashboardData);
      window.removeEventListener('rice-system-updated', loadAllDashboardData);
      window.removeEventListener('open-bipa-student-login', openLoginHandler);
    };
  }, []);

  useEffect(() => {
    const scrollEl = document.getElementById('bipa-dashboard-scroll-container');
    const checkCoverPosition = () => {
      if (scrollEl) {
        setScrolledCompact(scrollEl.scrollTop > 165);
        return;
      }
      const el = heroBannerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setScrolledCompact(rect.bottom < 85);
    };

    if (scrollEl) {
      scrollEl.addEventListener('scroll', checkCoverPosition, { passive: true });
    }
    window.addEventListener('scroll', checkCoverPosition, { capture: true, passive: true });
    window.addEventListener('touchmove', checkCoverPosition, { passive: true });

    return () => {
      if (scrollEl) {
        scrollEl.removeEventListener('scroll', checkCoverPosition);
      }
      window.removeEventListener('scroll', checkCoverPosition, true);
      window.removeEventListener('touchmove', checkCoverPosition);
    };
  }, [verifiedProfile]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const scrollEl = document.getElementById('bipa-dashboard-scroll-container');
    if (scrollEl && scrollEl.scrollTop <= 5) {
      touchStartYRef.current = e.touches[0].clientY;
    } else {
      touchStartYRef.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartYRef.current === null) return;
    const deltaY = e.touches[0].clientY - touchStartYRef.current;
    if (deltaY > 0) {
      setPullStretch(Math.min(90, deltaY * 0.45));
    } else {
      setPullStretch(0);
    }
  };

  const handleTouchEnd = () => {
    touchStartYRef.current = null;
    setPullStretch(0);
  };

  const handleCoverUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const maxW = 1100;
        let w = img.width;
        let h = img.height;
        if (w > maxW) {
          h = Math.round((h * maxW) / w);
          w = maxW;
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.84);

        setCustomCoverUrl(dataUrl);
        localStorage.setItem('bipa_default_cover_banner', dataUrl);

        if (verifiedProfile) {
          const code = normalizeCode(verifiedProfile.studentCode);
          localStorage.setItem(`bipa_cover_${code}`, dataUrl);
          try {
            const secData = await fetchSecurityPayloadFromDb();
            if (secData.profiles[code]) {
              const updatedProf = {
                ...secData.profiles[code],
                coverDataUrl: dataUrl
              } as StudentSecurityProfile;
              const nextPayload: StudentSecurityPayload = {
                ...secData,
                profiles: {
                  ...secData.profiles,
                  [code]: updatedProf
                },
                updatedAt: Date.now()
              };
              await saveSecurityPayloadToDb(nextPayload);
              setVerifiedProfile(updatedProf);
            }
          } catch {}
        }

        setCoverToast('បានផ្លាស់ប្តូររូបភាព Cover ដោយជោគជ័យ!');
        setTimeout(() => setCoverToast(''), 3000);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

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
    if (isKh) return typeKm || 'និស្សិត';
    if (typeKm === 'និស្សិត') return 'Student';
    if (typeKm === 'ពិសេស') return 'Special';
    return 'Student';
  };

  const currentAvatar =
    verifiedProfile?.avatarDataUrl ||
    (verifiedProfile
      ? localStorage.getItem(`bipa_avatar_${verifiedProfile.studentCode}`) || ''
      : '');

  const activeCoverBanner =
    customCoverUrl ||
    (verifiedProfile && (verifiedProfile as any).coverDataUrl) ||
    (verifiedProfile
      ? localStorage.getItem(`bipa_cover_${normalizeCode(verifiedProfile.studentCode)}`) || ''
      : '') ||
    currentAvatar;

  const coverBaseHeight = verifiedProfile ? 265 : 230;
  const dynamicCoverHeight = coverBaseHeight + pullStretch;
  const dynamicImageScale = 1 + pullStretch / 210;
  const displayFullName = verifiedProfile
    ? `${verifiedProfile.lastNameKm || ''} ${verifiedProfile.firstNameKm || ''}`.trim() ||
      verifiedProfile.fullNameKm
    : '';

  const dashboardMenuShortcuts = [
    {
      labelKm: 'បង់ប្រាក់',
      labelEn: 'Payment',
      path: '/?view=payments',
      color: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
      icon: DollarSign
    },
    {
      labelKm: 'បង់អង្ករ',
      labelEn: 'Rice',
      path: '/?view=rice',
      color: 'bg-orange-500/20 text-orange-300 border-orange-400/30',
      icon: Package
    },
    {
      labelKm: 'វេនប្រចាំថ្ងៃ',
      labelEn: 'Duty',
      path: '/?view=duties',
      color: 'bg-sky-500/20 text-sky-300 border-sky-400/30',
      icon: RefreshCw
    },
    {
      labelKm: 'មណ្ឌល',
      labelEn: 'Center',
      path: '/residence-info',
      color: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30',
      icon: Globe
    },
    {
      labelKm: 'ប្រកាស',
      labelEn: 'News',
      path: '/announcements',
      color: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
      icon: Info
    },
    {
      labelKm: 'ទំនាក់ទំនង',
      labelEn: 'Contact',
      path: '/contact',
      color: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30',
      icon: Phone
    }
  ];

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="w-full max-w-xl mx-auto min-h-full text-white font-khmer pb-16 overflow-x-hidden select-none"
    >
      <input
        ref={coverFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleCoverUploadChange}
        className="hidden"
      />

      {coverToast && (
        <div className="fixed top-5 right-4 z-[260] px-4 py-2.5 rounded-2xl bg-emerald-950/95 border border-emerald-400 text-emerald-200 shadow-2xl flex items-center gap-2 text-xs font-bold animate-in slide-in-from-top-2 duration-150">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{coverToast}</span>
        </div>
      )}

      {showLoginModal && (
        <StudentVerificationGate
          onVerified={(prof) => {
            setVerifiedProfile(prof);
            setShowLoginModal(false);
          }}
          onClose={() => setShowLoginModal(false)}
        />
      )}

      {scrolledCompact && (
        <div
          onClick={() => {
            if (verifiedProfile) setShowProfileDetailModal(true);
            else setShowLoginModal(true);
          }}
          style={{
            zIndex: 115,
            paddingTop: 'max(0.6rem, env(safe-area-inset-top, 0px))'
          }}
          className="fixed top-0 left-0 right-0 max-w-xl mx-auto bg-[#071329]/95 backdrop-blur-xl border-b border-white/15 px-3.5 pb-2.5 flex items-center justify-between shadow-2xl cursor-pointer animate-in slide-in-from-top-2 duration-150"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/');
              }}
              className="p-1 text-white hover:text-amber-300 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-amber-400 bg-slate-800 shrink-0">
              {verifiedProfile ? (
                currentAvatar ? (
                  <img src={currentAvatar} alt="" className="w-full h-full object-cover object-top" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-amber-500 text-white text-xs">
                    {displayFullName.charAt(0)}
                  </div>
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-white/15 text-amber-300">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <span className="font-moul-kh text-xs text-white truncate block">
                {verifiedProfile ? displayFullName : isKh ? 'ភ្ញៀវ' : 'Guest'}
              </span>
              <p className="text-[10.5px] text-sky-200 truncate">
                {verifiedProfile
                  ? `${renderTranslatedUserType(verifiedProfile.userTypeKm)} - ${verifiedProfile.phoneNumber}`
                  : 'XXX-XXX-XXX'}
              </p>
            </div>
          </div>
          <Eye className="h-4 w-4 text-amber-400 shrink-0" />
        </div>
      )}

      <div
        ref={heroBannerRef}
        onClick={() => {
          if (verifiedProfile) setShowProfileDetailModal(true);
        }}
        style={{
          height: `${dynamicCoverHeight}px`,
          transition: pullStretch > 0 ? 'none' : 'height 0.28s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        className={cn(
          'relative w-full overflow-hidden rounded-b-[32px] shadow-[0_16px_40px_rgba(0,0,0,0.5)] border-b border-white/15 flex flex-col justify-between p-4 sm:p-5 text-white',
          verifiedProfile
            ? 'bg-[#061229] cursor-pointer'
            : 'bg-gradient-to-br from-[#0a1e42] via-[#102d63] to-[#061229]'
        )}
      >
        {activeCoverBanner ? (
          <>
            <img
              src={activeCoverBanner}
              alt=""
              style={{
                transform: `scale(${dynamicImageScale + 0.08})`,
                transition: pullStretch > 0 ? 'none' : 'transform 0.3s ease-out'
              }}
              className="absolute inset-0 w-full h-full object-cover blur-xl opacity-55 pointer-events-none"
            />
            <img
              src={activeCoverBanner}
              alt={displayFullName || 'Cover'}
              style={{
                objectPosition: 'center center',
                transform: `scale(${dynamicImageScale})`,
                transition: pullStretch > 0 ? 'none' : 'transform 0.3s ease-out'
              }}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0b2149] via-[#133675] to-[#061024]" />
        )}

        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(4,12,28,0.45) 0%, rgba(4,12,28,0.08) 38%, rgba(4,12,28,0.68) 76%, rgba(4,12,28,0.94) 100%)'
          }}
        />

        <div
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
          className="relative z-10 flex items-center justify-between gap-2"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate('/');
            }}
            className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-md transition-all active:scale-95"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                coverFileInputRef.current?.click();
              }}
              className="px-3 py-1.5 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-md border border-white/20 text-[10.5px] text-amber-300 flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>{isKh ? 'ដាក់រូប Cover' : 'Set Cover'}</span>
            </button>

            {verifiedProfile && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowProfileDetailModal(true);
                }}
                className="px-3 py-1.5 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-md border border-white/20 text-[10.5px] text-white/95 flex items-center gap-1 shadow-md active:scale-95 transition-all"
              >
                <Eye className="h-3.5 w-3.5 text-amber-300" />
                <span>{isKh ? 'មើលរូបពេញ' : 'Full View'}</span>
              </button>
            )}
          </div>
        </div>

        {!verifiedProfile ? (
          <div className="relative z-10 flex items-center justify-between gap-3 pb-1">
            <div className="flex items-center gap-3.5">
              <div
                onClick={() => setShowLoginModal(true)}
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-white/15 border-2 border-amber-300/80 flex items-center justify-center cursor-pointer shrink-0 shadow-xl"
              >
                <User className="h-8 w-8 text-amber-300" />
              </div>
              <div className="space-y-0.5">
                <h1 className="font-moul-kh text-base sm:text-lg text-white leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                  {isKh ? 'ភ្ញៀវ' : 'Guest'}
                </h1>
                <p className="text-xs text-sky-200">{isKh ? 'មិនទាន់ភ្ជាប់កាតសិស្ស' : 'Guest'}</p>
                <p className="text-[11px] font-mono tracking-wider text-amber-300">
                  XXX-XXX-XXX
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowLoginModal(true);
              }}
              className="px-4 py-2 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-lg flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <QrCode className="h-4 w-4" />
              <span>{isKh ? 'ស្កេនកាត' : 'Scan QR'}</span>
            </button>
          </div>
        ) : (
          <div className="relative z-10 flex items-center gap-3.5 pb-1">
            <div
              className="rounded-full overflow-hidden border-[2.5px] border-white shadow-[0_6px_20px_rgba(0,0,0,0.85)] bg-slate-900 shrink-0"
              style={{ width: '74px', height: '74px' }}
            >
              {currentAvatar ? (
                <img
                  src={currentAvatar}
                  alt={displayFullName}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-amber-500 text-white text-xl">
                  {displayFullName.charAt(0)}
                </div>
              )}
            </div>

            <div className="space-y-0.5 drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] min-w-0">
              <h1 className="font-moul-kh text-base sm:text-lg text-white leading-tight truncate">
                {displayFullName}
              </h1>
              <p className="text-xs text-sky-100">
                {renderTranslatedUserType(verifiedProfile.userTypeKm)} •{' '}
                {verifiedProfile.majorKm || 'ព័ត៌មានវិទ្យា'}
              </p>
              <p className="text-xs text-amber-300 font-bold tracking-wide">
                {verifiedProfile.phoneNumber}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="px-3.5 sm:px-5 pt-4 space-y-4">
        <div className="space-y-2">
          <h2 className="text-xs text-sky-100/95 px-1 drop-shadow-2xs">
            {isKh ? 'ម៉ឺនុយគ្រប់គ្រងរហ័ស' : 'Quick Menu'}
          </h2>

          <div className="bg-[#091e42]/60 backdrop-blur-xl rounded-3xl p-3.5 border border-white/20 shadow-[0_8px_30px_rgba(0,0,0,0.25)] space-y-3">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
              {dashboardMenuShortcuts.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className="flex flex-col items-center justify-center gap-1.5 py-2.5 px-1.5 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 transition-all active:scale-95"
                >
                  <div
                    className={cn(
                      'w-9 h-9 rounded-xl border flex items-center justify-center shrink-0',
                      item.color
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                  </div>
                  <span className="text-[11px] text-white truncate max-w-full">
                    {isKh ? item.labelKm : item.labelEn}
                  </span>
                </button>
              ))}
            </div>

            {isAdmin && (
              <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => navigate('/admin')}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 text-amber-300 text-xs font-bold transition-all active:scale-95"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>{isKh ? 'ផ្ទាំងគ្រប់គ្រង Admin' : 'Admin Panel'}</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(new Event('open-bipa-admin-security-modal'))
                  }
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/40 text-sky-200 text-xs font-bold transition-all active:scale-95"
                >
                  <QrCode className="h-4 w-4" />
                  <span>{isKh ? 'កូដសិស្ស & កាត QR' : 'Student QR'}</span>
                </button>
              </div>
            )}

            {user ? (
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10 px-1">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold shrink-0">
                    {profile?.display_name?.charAt(0).toUpperCase() || 'A'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-white truncate">
                      {profile?.display_name || user.email}
                    </p>
                    <p className="text-[9.5px] text-amber-300 uppercase">
                      {profile?.role?.replace(/_/g, ' ') || 'USER'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    clearVerifiedStudentSession();
                    await signOut();
                    navigate('/');
                  }}
                  className="px-3 py-1 rounded-full bg-rose-500/25 hover:bg-rose-500/35 border border-rose-400/40 text-rose-200 text-[10.5px] flex items-center gap-1 shrink-0"
                >
                  <LogOut className="h-3 w-3" />
                  <span>{isKh ? 'ចាកចេញគណនី' : 'Logout'}</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => navigate('/signin')}
                  className="py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs transition-all active:scale-95"
                >
                  {isKh ? 'ចូលគណនី App' : 'Sign In'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/signup')}
                  className="py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs transition-all active:scale-95"
                >
                  {isKh ? 'បង្កើតគណនី' : 'Create Account'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xs text-sky-100/95 px-1 drop-shadow-2xs">
            {isKh ? 'ប្រវត្តិរូប' : 'Profile'}
          </h2>

          {!verifiedProfile ? (
            <div className="bg-[#091e42]/55 backdrop-blur-xl rounded-3xl p-5 border border-white/25 shadow-lg text-center space-y-3">
              <p className="text-xs text-white/95">
                {isKh
                  ? 'អ្នកមិនទាន់បានចូលគណនីសិស្ស (ស្កេនកាត QR) នៅឡើយទេ'
                  : 'You have not linked your student QR card yet'}
              </p>
              <button
                type="button"
                onClick={() => setShowLoginModal(true)}
                className="px-5 py-2 rounded-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow transition-all active:scale-95"
              >
                {isKh ? 'ទៅកាន់ផ្ទាំង ស្កេនកាត / ចូលគណនី' : 'Go to Student Login'}
              </button>
            </div>
          ) : (
            <>
              <div
                onClick={() => setShowProfileDetailModal(true)}
                className="bg-[#091e42]/55 backdrop-blur-xl rounded-3xl border border-white/25 shadow-[0_8px_30px_rgba(0,0,0,0.22)] divide-y divide-white/15 overflow-hidden cursor-pointer hover:border-amber-300/60 transition-colors"
              >
                <div className="p-3.5 flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-300 flex items-center justify-center shrink-0">
                    <Contact className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10.5px] text-sky-200/90">
                      {isKh ? 'នាមត្រកូល' : 'Last Name'}
                    </p>
                    <p className="text-xs sm:text-sm text-white drop-shadow-2xs">
                      {verifiedProfile.lastNameKm ||
                        splitKhmerFullName(verifiedProfile.fullNameKm).lastName}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-300 flex items-center justify-center shrink-0">
                    <Contact className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10.5px] text-sky-200/90">
                      {isKh ? 'នាមខ្លួន' : 'First Name'}
                    </p>
                    <p className="text-xs sm:text-sm text-white drop-shadow-2xs">
                      {verifiedProfile.firstNameKm ||
                        splitKhmerFullName(verifiedProfile.fullNameKm).firstName}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-300 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10.5px] text-sky-200/90">
                      {isKh ? 'ប្រភេទ' : 'Category'}
                    </p>
                    <p className="text-xs sm:text-sm text-white drop-shadow-2xs">
                      {renderTranslatedUserType(verifiedProfile.userTypeKm)}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-300 flex items-center justify-center shrink-0">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10.5px] text-sky-200/90">
                      {isKh ? 'លេខទូរស័ព្ទ' : 'Phone Number'}
                    </p>
                    <p className="text-xs sm:text-sm text-amber-300 tracking-wide drop-shadow-2xs">
                      {verifiedProfile.phoneNumber}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div
                  onClick={() => navigate('/?view=payments')}
                  className="bg-[#091e42]/55 backdrop-blur-xl rounded-3xl p-3.5 border border-white/25 shadow-[0_8px_30px_rgba(0,0,0,0.22)] cursor-pointer hover:border-sky-300/60 transition-all space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-full bg-emerald-400/20 border border-emerald-300/30 text-emerald-300 flex items-center justify-center">
                      <DollarSign className="h-4 w-4" />
                    </div>
                    <ChevronRight className="h-4 w-4 text-sky-200/80" />
                  </div>
                  <p className="text-xs text-white pt-0.5 drop-shadow-2xs">
                    {isKh ? 'ការបង់ប្រាក់ប្រចាំខែ' : 'Monthly Payment'}
                  </p>
                  <p className="text-[11px] text-emerald-300 drop-shadow-2xs">
                    {isKh
                      ? `បង់រួច ${myPaySummary.paidCount} ខែ (${formatRiel(myPaySummary.paidRiel)})`
                      : `Paid ${myPaySummary.paidCount} mo`}
                  </p>
                  {myPaySummary.owedCount > 0 && (
                    <p className="text-[10.5px] text-rose-300 drop-shadow-2xs">
                      {isKh
                        ? `ជំពាក់ ${myPaySummary.owedCount} ខែ`
                        : `Owed ${myPaySummary.owedCount} mo`}
                    </p>
                  )}
                </div>

                <div
                  onClick={() => navigate('/?view=rice')}
                  className="bg-[#091e42]/55 backdrop-blur-xl rounded-3xl p-3.5 border border-white/25 shadow-[0_8px_30px_rgba(0,0,0,0.22)] cursor-pointer hover:border-amber-300/60 transition-all space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-300 flex items-center justify-center">
                      <Package className="h-4 w-4" />
                    </div>
                    <ChevronRight className="h-4 w-4 text-sky-200/80" />
                  </div>
                  <p className="text-xs text-white pt-0.5 drop-shadow-2xs">
                    {isKh ? 'ការរួមចំណែកអង្ករ' : 'Rice Contribution'}
                  </p>
                  <p className="text-[11px] text-emerald-300 drop-shadow-2xs">
                    {isKh
                      ? `បង់រួច ${myRiceSummary.paidCount} ខែ (${formatKg(myRiceSummary.paidKg)})`
                      : `Paid ${myRiceSummary.paidCount} mo`}
                  </p>
                  {myRiceSummary.owedCount > 0 && (
                    <p className="text-[10.5px] text-rose-300 drop-shadow-2xs">
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
          <h2 className="text-xs text-sky-100/95 px-1 drop-shadow-2xs">
            {isKh ? 'ការកំណត់កម្មវិធី' : 'App Settings'}
          </h2>

          <div className="bg-[#091e42]/55 backdrop-blur-xl rounded-3xl border border-white/25 shadow-[0_8px_30px_rgba(0,0,0,0.22)] divide-y divide-white/15 overflow-hidden">
            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow">
                  <Sun className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-white drop-shadow-2xs">
                    {isKh ? 'រូបរាង' : 'Appearance'}
                  </p>
                  <p className="text-[10.5px] text-sky-200">
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
                  'w-12 h-6 rounded-full p-0.5 transition-colors flex items-center border border-white/20',
                  theme === 'dark'
                    ? 'bg-amber-500 justify-end'
                    : 'bg-white/25 justify-start'
                )}
              >
                <span className="w-5 h-5 rounded-full bg-white shadow block" />
              </button>
            </div>

            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0 shadow">
                  <Globe className="h-4 w-4" />
                </div>
                <span className="text-xs text-white drop-shadow-2xs">
                  {isKh ? 'ភាសា' : 'Language'}
                </span>
              </div>

              <div className="flex items-center gap-3.5">
                <button
                  type="button"
                  onClick={() => setLang('km')}
                  className="flex items-center gap-1.5 text-xs text-white"
                >
                  <span
                    className={cn(
                      'w-4 h-4 rounded-full flex items-center justify-center border',
                      lang === 'km'
                        ? 'border-amber-400 bg-amber-400 text-slate-950'
                        : 'border-white/50'
                    )}
                  >
                    {lang === 'km' && (
                      <CheckCircle2 className="h-3.5 w-3.5 fill-amber-400 text-slate-950" />
                    )}
                  </span>
                  <span>ខ្មែរ</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLang('en')}
                  className="flex items-center gap-1.5 text-xs text-white"
                >
                  <span
                    className={cn(
                      'w-4 h-4 rounded-full flex items-center justify-center border',
                      lang === 'en'
                        ? 'border-amber-400 bg-amber-400 text-slate-950'
                        : 'border-white/50'
                    )}
                  >
                    {lang === 'en' && (
                      <CheckCircle2 className="h-3.5 w-3.5 fill-amber-400 text-slate-950" />
                    )}
                  </span>
                  <span>{isKh ? 'អង់គ្លេស' : 'English'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xs text-sky-100/95 px-1 drop-shadow-2xs">
            {isKh ? 'ព័ត៌មាន' : 'Information'}
          </h2>

          <div className="bg-[#091e42]/55 backdrop-blur-xl rounded-3xl border border-white/25 shadow-[0_8px_30px_rgba(0,0,0,0.22)] divide-y divide-white/15 overflow-hidden">
            <button
              type="button"
              onClick={() => navigate('/contact')}
              className="w-full p-3.5 flex items-center justify-between hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-cyan-400/20 border border-cyan-300/30 text-cyan-300 flex items-center justify-center">
                  <Headphones className="h-4 w-4" />
                </div>
                <span className="text-xs text-white drop-shadow-2xs">
                  {isKh ? 'ទាក់ទងមកយើង' : 'Contact Us'}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-sky-200/80" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/about')}
              className="w-full p-3.5 flex items-center justify-between hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-purple-400/20 border border-purple-300/30 text-purple-300 flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <span className="text-xs text-white drop-shadow-2xs">
                  {isKh ? 'គោលការណ៍ឯកជនភាព' : 'Privacy Policy'}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-sky-200/80" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/residence-info')}
              className="w-full p-3.5 flex items-center justify-between hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-400/20 border border-emerald-300/30 text-emerald-300 flex items-center justify-center">
                  <FileText className="h-4 w-4" />
                </div>
                <span className="text-xs text-white drop-shadow-2xs">
                  {isKh ? 'លក្ខខណ្ឌប្រើប្រាស់' : 'Terms of Use'}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-sky-200/80" />
            </button>

            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-300 flex items-center justify-center">
                  <Info className="h-4 w-4" />
                </div>
                <span className="text-xs text-white drop-shadow-2xs">
                  {isKh ? 'កំណែ' : 'Version'}
                </span>
              </div>
              <span className="text-xs text-amber-300">2.0.6</span>
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
              className="w-full bg-rose-500/25 hover:bg-rose-500/35 backdrop-blur-xl rounded-3xl p-3.5 border border-rose-300/35 shadow-lg flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-rose-500/30 text-rose-200 flex items-center justify-center">
                  <LogOut className="h-4 w-4" />
                </div>
                <span className="text-xs text-rose-100">
                  {isKh ? 'ចាកចេញ' : 'Sign Out'}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-rose-200" />
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
            className="w-full max-w-sm bg-[#0b1830] text-white rounded-3xl overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-200"
          >
            <div className="relative w-full h-64 bg-slate-950 flex items-center justify-center overflow-hidden">
              {activeCoverBanner ? (
                <img
                  src={activeCoverBanner}
                  alt={displayFullName}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-amber-500 text-white text-3xl flex items-center justify-center">
                  {displayFullName.charAt(0)}
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
              <div className="flex items-center justify-between border-b border-white/15 pb-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-11 h-11 rounded-full overflow-hidden border border-amber-400 shrink-0 bg-slate-800">
                    {currentAvatar ? (
                      <img src={currentAvatar} alt="" className="w-full h-full object-cover object-top" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-amber-500 text-white text-sm">
                        {displayFullName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-moul-kh text-sm text-white truncate">
                      {displayFullName}
                    </h3>
                    <p className="text-[11px] text-sky-200 mt-0.5 truncate">
                      {renderTranslatedUserType(verifiedProfile.userTypeKm)} •{' '}
                      {verifiedProfile.majorKm}
                    </p>
                  </div>
                </div>
                <Badge className="bg-amber-400 text-slate-950 text-[11px] px-2.5 py-0.5 shrink-0">
                  {verifiedProfile.studentCode}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-white/10 border border-white/15">
                  <span className="text-[10px] text-sky-200 block">
                    {isKh ? 'នាមត្រកូល' : 'Last Name'}
                  </span>
                  <span className="text-xs text-white">
                    {verifiedProfile.lastNameKm ||
                      splitKhmerFullName(verifiedProfile.fullNameKm).lastName}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white/10 border border-white/15">
                  <span className="text-[10px] text-sky-200 block">
                    {isKh ? 'នាមខ្លួន' : 'First Name'}
                  </span>
                  <span className="text-xs text-white">
                    {verifiedProfile.firstNameKm ||
                      splitKhmerFullName(verifiedProfile.fullNameKm).firstName}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white/10 border border-white/15">
                  <span className="text-[10px] text-sky-200 block">
                    {isKh ? 'ប្រភេទ' : 'Category'}
                  </span>
                  <span className="text-xs text-white">
                    {renderTranslatedUserType(verifiedProfile.userTypeKm)}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white/10 border border-white/15">
                  <span className="text-[10px] text-sky-200 block">
                    {isKh ? 'លេខទូរស័ព្ទ' : 'Phone Number'}
                  </span>
                  <span className="text-xs text-amber-300">
                    {verifiedProfile.phoneNumber}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    setShowProfileDetailModal(false);
                    coverFileInputRef.current?.click();
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 rounded-xl"
                >
                  <Camera className="h-3.5 w-3.5 mr-1.5" />
                  {isKh ? 'ប្តូររូប Cover' : 'Change Cover'}
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowProfileDetailModal(false)}
                  className="flex-1 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs h-9 rounded-xl"
                >
                  {isKh ? 'បិទផ្ទាំង' : 'Close'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}