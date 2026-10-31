import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Plus,
  Trash2,
  Save,
  X,
  Bell,
  BellRing,
  Send,
  Calendar,
  TrendingUp,
  PieChart,
  Columns,
  CheckCheck,
  Wallet,
  Receipt,
  Printer,
  UserPlus,
  RefreshCw,
  Eye
} from 'lucide-react';
import { initialStudents, BipaStudent } from '@/pages/admin/StudentListPage';
import { normalizeStudentCodeInput } from '@/components/layout/Header';
import { cn } from '@/lib/utils';

export type MonthPaymentStatus = 'paid' | 'owed' | 'unpaid';

export interface StudentMonthRecord {
  month: number;
  status: MonthPaymentStatus;
  amount: number;
  paidDate: string;
  note: string;
  updatedAt: string;
}

export interface PaymentResidentStudent {
  id: string;
  student_code: string;
  full_name_km: string;
  full_name_en: string;
  gender_km: string;
  major_km: string;
  generation_km: string;
}

export interface PaymentNotificationItem {
  id: string;
  studentCode: string;
  studentNameKm: string;
  year: number;
  month: number;
  status: MonthPaymentStatus;
  amount: number;
  titleKm: string;
  messageKm: string;
  createdAt: string;
  readBy: string[];
}

export interface PaymentSystemPayload {
  monthlyFeeRiel: number;
  customColumns: string[];
  residentStudents: PaymentResidentStudent[];
  recordsByYear: Record<
    string,
    Record<
      string,
      {
        months: Record<number, StudentMonthRecord>;
        customValues: Record<string, string>;
      }
    >
  >;
  notifications: PaymentNotificationItem[];
}

export const PAYMENT_STORAGE_KEY = 'bipa_payments_system_v2';
export const DEFAULT_MONTHLY_FEE = 50000;

export const KHMER_MONTHS = [
  { num: 1, nameKm: 'មករា', nameEn: 'Jan', color: '#3b82f6' },
  { num: 2, nameKm: 'កុម្ភៈ', nameEn: 'Feb', color: '#10b981' },
  { num: 3, nameKm: 'មីនា', nameEn: 'Mar', color: '#f59e0b' },
  { num: 4, nameKm: 'មេសា', nameEn: 'Apr', color: '#ec4899' },
  { num: 5, nameKm: 'ឧសភា', nameEn: 'May', color: '#8b5cf6' },
  { num: 6, nameKm: 'មិថុនា', nameEn: 'Jun', color: '#06b6d4' },
  { num: 7, nameKm: 'កក្កដា', nameEn: 'Jul', color: '#f97316' },
  { num: 8, nameKm: 'សីហា', nameEn: 'Aug', color: '#14b8a6' },
  { num: 9, nameKm: 'កញ្ញា', nameEn: 'Sep', color: '#eab308' },
  { num: 10, nameKm: 'តុលា', nameEn: 'Oct', color: '#6366f1' },
  { num: 11, nameKm: 'វិច្ឆិកា', nameEn: 'Nov', color: '#f43f5e' },
  { num: 12, nameKm: 'ធ្នូ', nameEn: 'Dec', color: '#84cc16' }
];

function mapInitialResidentStudents(): PaymentResidentStudent[] {
  let baseList: BipaStudent[] = initialStudents;
  const cached =
    localStorage.getItem('bipa_students_directory_v2') ||
    localStorage.getItem('bipa_students_directory');
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) baseList = parsed;
    } catch {}
  }
  return baseList.map((s) => ({
    id: String(s.id || s.student_code),
    student_code: String(s.student_code || '').trim().toUpperCase(),
    full_name_km: s.full_name_km || s.full_name_en || '',
    full_name_en: s.full_name_en || s.full_name_km || '',
    gender_km: s.gender_km || 'ប្រុស',
    major_km: s.major_km || 'ព័ត៌មានវិទ្យា',
    generation_km: s.generation_km || 'ជំនាន់ទី ១'
  }));
}

export const defaultPaymentPayload: PaymentSystemPayload = {
  monthlyFeeRiel: DEFAULT_MONTHLY_FEE,
  customColumns: ['កំណត់សម្គាល់'],
  residentStudents: [],
  recordsByYear: {},
  notifications: []
};

export function formatRiel(amount: number): string {
  return Number(amount || 0).toLocaleString('en-US') + ' ៛';
}

export function loadCachedPaymentPayload(): PaymentSystemPayload {
  try {
    const raw =
      localStorage.getItem(PAYMENT_STORAGE_KEY) ||
      localStorage.getItem('bipa_payments_system_v1');
    const fallbackResidents = mapInitialResidentStudents();
    if (!raw) {
      return {
        ...defaultPaymentPayload,
        residentStudents: fallbackResidents
      };
    }
    const parsed = JSON.parse(raw);
    return {
      monthlyFeeRiel: Number(parsed.monthlyFeeRiel || DEFAULT_MONTHLY_FEE),
      customColumns: Array.isArray(parsed.customColumns)
        ? parsed.customColumns
        : defaultPaymentPayload.customColumns,
      residentStudents:
        Array.isArray(parsed.residentStudents) && parsed.residentStudents.length > 0
          ? parsed.residentStudents
          : fallbackResidents,
      recordsByYear: parsed.recordsByYear || {},
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : []
    };
  } catch {
    return {
      ...defaultPaymentPayload,
      residentStudents: mapInitialResidentStudents()
    };
  }
}

export async function fetchPaymentPayloadFromDb(): Promise<PaymentSystemPayload> {
  let current = loadCachedPaymentPayload();

  try {
    const { data, error } = await supabase
      .from('bipa_payments_data')
      .select('payload')
      .eq('id', '1')
      .maybeSingle();

    if (!error && data && data.payload) {
      const p = data.payload;
      current = {
        monthlyFeeRiel: Number(p.monthlyFeeRiel || DEFAULT_MONTHLY_FEE),
        customColumns: Array.isArray(p.customColumns)
          ? p.customColumns
          : defaultPaymentPayload.customColumns,
        residentStudents:
          Array.isArray(p.residentStudents) && p.residentStudents.length > 0
            ? p.residentStudents
            : current.residentStudents,
        recordsByYear: p.recordsByYear || {},
        notifications: Array.isArray(p.notifications) ? p.notifications : []
      };
      localStorage.setItem(PAYMENT_STORAGE_KEY, JSON.stringify(current));
      return current;
    }
  } catch {}

  try {
    const { data: setRow } = await supabase
      .from('bipa_settings')
      .select('name_en')
      .eq('id', 'payment_payload_v2')
      .maybeSingle();

    if (setRow && setRow.name_en) {
      const p = JSON.parse(setRow.name_en);
      current = {
        monthlyFeeRiel: Number(p.monthlyFeeRiel || DEFAULT_MONTHLY_FEE),
        customColumns: Array.isArray(p.customColumns)
          ? p.customColumns
          : defaultPaymentPayload.customColumns,
        residentStudents:
          Array.isArray(p.residentStudents) && p.residentStudents.length > 0
            ? p.residentStudents
            : current.residentStudents,
        recordsByYear: p.recordsByYear || {},
        notifications: Array.isArray(p.notifications) ? p.notifications : []
      };
      localStorage.setItem(PAYMENT_STORAGE_KEY, JSON.stringify(current));
    }
  } catch {}

  return current;
}

export async function savePaymentPayloadToDb(
  payload: PaymentSystemPayload
): Promise<{ ok: boolean; syncedCloud: boolean }> {
  const jsonStr = JSON.stringify(payload);
  localStorage.setItem(PAYMENT_STORAGE_KEY, jsonStr);

  let syncedCloud = false;

  try {
    const { error } = await supabase.from('bipa_payments_data').upsert({
      id: '1',
      payload,
      updated_at: new Date().toISOString()
    });
    if (!error) syncedCloud = true;
  } catch {}

  try {
    const { error: fallbackErr } = await supabase.from('bipa_settings').upsert({
      id: 'payment_payload_v2',
      logo_url: 'PAYMENT_SYSTEM',
      name_km: 'ប្រព័ន្ធបង់ប្រាក់ប្រចាំខែ',
      name_en: jsonStr
    });
    if (!fallbackErr) syncedCloud = true;
  } catch {}

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('bipa_payment_sync_channel');
      bc.postMessage({ type: 'PAYMENT_UPDATED', timestamp: Date.now() });
      bc.close();
    }
  } catch {}

  window.dispatchEvent(new Event('payment-system-updated'));
  return { ok: true, syncedCloud };
}

export function getUnreadPaymentBadgeCountForStudent(
  payload: PaymentSystemPayload,
  rawStudentId: string
): number {
  const code = normalizeStudentCodeInput(rawStudentId);
  if (!code) return 0;

  const unreadNotifs = payload.notifications.filter(
    (n) =>
      (normalizeStudentCodeInput(n.studentCode) === code || n.studentCode === 'ALL') &&
      !(n.readBy || []).includes(code)
  ).length;

  const currentYear = String(new Date().getFullYear());
  const stYearData = payload.recordsByYear?.[currentYear]?.[code]?.months || {};
  const owedCount = Object.values(stYearData).filter((m) => m.status === 'owed').length;

  return unreadNotifs + (unreadNotifs === 0 ? owedCount : 0);
}

export function GlobalPaymentBadgeEnhancer() {
  const [badgeCount, setBadgeCount] = useState(0);

  const refreshCount = async () => {
    const linked = localStorage.getItem('bipa_linked_student_id') || '';
    if (!linked.trim()) {
      setBadgeCount(0);
      return;
    }
    const payload = await fetchPaymentPayloadFromDb();
    const count = getUnreadPaymentBadgeCountForStudent(payload, linked);
    setBadgeCount(count);
  };

  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, 4000);
    window.addEventListener('payment-system-updated', refreshCount);
    window.addEventListener('storage', refreshCount);

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('bipa_payment_sync_channel');
        bc.onmessage = () => refreshCount();
      }
    } catch {}

    return () => {
      clearInterval(interval);
      window.removeEventListener('payment-system-updated', refreshCount);
      window.removeEventListener('storage', refreshCount);
      if (bc) bc.close();
    };
  }, []);

  useEffect(() => {
    const applyBadgesToDom = () => {
      const allNodes = Array.from(document.querySelectorAll('main *, #root *')) as HTMLElement[];
      let payCard: HTMLElement | null = null;

      for (const el of allNodes) {
        if (el.closest('aside, nav, header')) continue;
        if (el.classList.contains('bipa-tg-payment-badge')) continue;

        let directText = '';
        el.childNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            directText += node.textContent || '';
          }
        });
        const clean = directText.replace(/\s+/g, ' ').trim();
        if (clean !== 'ការបង់ប្រាក់ប្រចាំខែ' && clean !== 'ការបង់ប្រាក់') continue;

        let curr: HTMLElement | null = el.parentElement;
        while (curr && curr !== document.body) {
          const hasSvg = curr.querySelector('svg') !== null;
          const rect = curr.getBoundingClientRect();
          if (
            hasSvg &&
            rect.width >= 75 &&
            rect.width <= 460 &&
            rect.height >= 65 &&
            rect.height <= 260
          ) {
            payCard = curr;
            break;
          }
          curr = curr.parentElement;
        }
        if (payCard) break;
      }

      const oldBadges = Array.from(document.querySelectorAll('.bipa-tg-payment-badge'));

      if (payCard && badgeCount > 0) {
        const style = window.getComputedStyle(payCard);
        if (style.position === 'static') {
          payCard.style.position = 'relative';
        }
        const existing = payCard.querySelector('.bipa-tg-payment-badge') as HTMLElement | null;
        if (existing) {
          existing.textContent = String(badgeCount);
          oldBadges.forEach((b) => {
            if (b !== existing) b.remove();
          });
        } else {
          oldBadges.forEach((b) => b.remove());
          const span = document.createElement('span');
          span.className =
            'bipa-tg-payment-badge absolute top-2.5 right-2.5 z-20 min-w-[22px] h-[22px] px-1.5 rounded-full bg-rose-600 text-white text-[11px] font-black flex items-center justify-center shadow-[0_0_12px_rgba(225,29,72,0.85)] border-2 border-white dark:border-[#0f172a] pointer-events-none animate-bounce';
          span.textContent = String(badgeCount);
          payCard.appendChild(span);
        }
      } else {
        oldBadges.forEach((b) => b.remove());
      }
    };

    applyBadgesToDom();
    const timer = setInterval(applyBadgesToDom, 900);
    return () => clearInterval(timer);
  }, [badgeCount]);

  return null;
}

export function PaymentReceiptModal({
  student,
  year,
  monthsData,
  onClose
}: {
  student: PaymentResidentStudent;
  year: string;
  monthsData: {
    num: number;
    nameKm: string;
    status: MonthPaymentStatus;
    amount: number;
    paidDate: string;
  }[];
  onClose: () => void;
}) {
  const paidMonths = monthsData.filter((m) => m.status === 'paid');
  const owedMonths = monthsData.filter((m) => m.status === 'owed');
  const totalPaid = paidMonths.reduce((acc, m) => acc + m.amount, 0);
  const totalOwed = owedMonths.reduce((acc, m) => acc + m.amount, 0);
  const receiptNo = `BIPA-${year}-${student.student_code.replace(/\D/g, '') || '01'}`;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[220] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 font-khmer animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90dvh] bg-white text-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-200"
      >
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#0f172a] to-[#1e293b] text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2.5">
            <Receipt className="h-5 w-5 text-amber-400" />
            <span className="text-sm sm:text-base font-black">
              វិក្កយបត្របង់ប្រាក់មណ្ឌល (Official Receipt)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => window.print()}
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs h-8 px-3 rounded-xl"
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              បោះពុម្ព
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

        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-white">
          <div className="text-center border-b border-dashed border-slate-300 pb-4 space-y-1">
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              សមាគមជនជាតិដើមភាគតិចព្នង (BIPA)
            </h2>
            <p className="text-xs font-bold text-slate-500">
              បង្កាន់ដៃទទួលប្រាក់ប្រចាំខែមណ្ឌលសិស្សនិស្សិត • ឆ្នាំ {year}
            </p>
            <div className="inline-block mt-1 px-3 py-0.5 rounded-full bg-slate-100 text-[11px] font-black text-slate-700">
              លេខវិក្កយបត្រ៖ {receiptNo}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block">គោត្តនាម និងនាម៖</span>
              <span className="font-black text-slate-900 text-sm">{student.full_name_km}</span>
            </div>
            <div>
              <span className="text-slate-500 block">អត្តលេខសិស្ស (ID)៖</span>
              <span className="font-black text-blue-600 text-sm">{student.student_code}</span>
            </div>
            <div>
              <span className="text-slate-500 block">ភេទ / ជំនាញ៖</span>
              <span className="font-bold text-slate-800">
                {student.gender_km} • {student.major_km || 'មិនបញ្ជាក់'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">កាលបរិច្ឆេទចេញវិក្កយបត្រ៖</span>
              <span className="font-bold text-slate-800">
                {new Date().toLocaleDateString('en-GB')}
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-black text-slate-700 mb-2">
              បញ្ជីខែដែលបានបង់ប្រាក់រួច ({paidMonths.length} ខែ)៖
            </h4>
            {paidMonths.length > 0 ? (
              <table className="w-full text-xs border-collapse border border-slate-200 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-black">
                    <th className="py-2 px-3 border border-slate-200 text-left">ល.រ</th>
                    <th className="py-2 px-3 border border-slate-200 text-left">ខែបង់ប្រាក់</th>
                    <th className="py-2 px-3 border border-slate-200 text-center">ថ្ងៃខែបង់</th>
                    <th className="py-2 px-3 border border-slate-200 text-right">ចំនួនទឹកប្រាក់</th>
                  </tr>
                </thead>
                <tbody>
                  {paidMonths.map((pm, idx) => (
                    <tr key={pm.num} className="border-b border-slate-200">
                      <td className="py-2 px-3 font-bold">{idx + 1}</td>
                      <td className="py-2 px-3 font-black text-slate-900">
                        ខែ{pm.nameKm} ({year})
                      </td>
                      <td className="py-2 px-3 text-center text-slate-600 font-semibold">
                        {pm.paidDate || '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-black text-emerald-600">
                        {formatRiel(pm.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500 font-bold">
                មិនទាន់មានខែដែលបានបង់ប្រាក់ក្នុងឆ្នាំ {year} នៅឡើយទេ
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1.5">
            <div className="flex items-center justify-between text-sm font-black text-emerald-900">
              <span>ទឹកប្រាក់បានបង់សរុប ({paidMonths.length} ខែ)៖</span>
              <span className="text-base text-emerald-700">{formatRiel(totalPaid)}</span>
            </div>
            {owedMonths.length > 0 && (
              <div className="flex items-center justify-between text-xs font-bold text-rose-600 pt-1 border-t border-emerald-200/70">
                <span>
                  ខែជំពាក់មណ្ឌល ({owedMonths.map((m) => `ខែ${m.nameKm}`).join(', ')})៖
                </span>
                <span>{formatRiel(totalOwed)}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 text-center text-xs font-bold text-slate-600">
            <div className="space-y-8">
              <p>ហត្ថលេខាអ្នកបង់ប្រាក់</p>
              <p className="text-slate-900 font-black">{student.full_name_km}</p>
            </div>
            <div className="space-y-8">
              <p>ហត្ថលេខាគណៈគ្រប់គ្រងមណ្ឌល</p>
              <p className="text-slate-900 font-black">មណ្ឌលនិស្សិត BIPA</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PaymentAdminDashboard() {
  const currentYearNum = new Date().getFullYear();
  const currentMonthNum = new Date().getMonth() + 1;

  const [payload, setPayload] = useState<PaymentSystemPayload>(() => loadCachedPaymentPayload());
  const [selectedYear, setSelectedYear] = useState<string>(String(currentYearNum));
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthNum);
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'owed' | 'unpaid'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const [saveFeedback, setSaveFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [hoveredStockMonth, setHoveredStockMonth] = useState<number | null>(null);
  const [activeDonutMonth, setActiveDonutMonth] = useState<number>(currentMonthNum);

  const [newColName, setNewColName] = useState('');
  const [showAddColBox, setShowAddColBox] = useState(false);

  const [showAddStudentBox, setShowAddStudentBox] = useState(false);
  const [newStCode, setNewStCode] = useState('');
  const [newStNameKm, setNewStNameKm] = useState('');
  const [newStGender, setNewStGender] = useState('ប្រុស');
  const [newStMajor, setNewStMajor] = useState('ព័ត៌មានវិទ្យា');

  const [activeStudentModal, setActiveStudentModal] = useState<PaymentResidentStudent | null>(
    null
  );
  const [receiptStudentModal, setReceiptStudentModal] = useState<PaymentResidentStudent | null>(
    null
  );
  const [customNoticeText, setCustomNoticeText] = useState('');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setSaveFeedback({ type, text });
    setTimeout(() => {
      setSaveFeedback(null);
    }, 3200);
  };

  const initLoad = async () => {
    const dbPayload = await fetchPaymentPayloadFromDb();
    setPayload(dbPayload);
  };

  useEffect(() => {
    initLoad();
    window.addEventListener('payment-system-updated', initLoad);
    return () => {
      window.removeEventListener('payment-system-updated', initLoad);
    };
  }, []);

  const students = payload.residentStudents || [];

  const getStudentYearEntry = (studentCode: string, yearStr = selectedYear) => {
    const code = normalizeStudentCodeInput(studentCode);
    return (
      payload.recordsByYear?.[yearStr]?.[code] || {
        months: {},
        customValues: {}
      }
    );
  };

  const getStudentMonthRecord = (
    studentCode: string,
    monthNum: number,
    yearStr = selectedYear
  ): StudentMonthRecord => {
    const entry = getStudentYearEntry(studentCode, yearStr);
    const existing = entry.months?.[monthNum];
    if (existing) return existing;
    return {
      month: monthNum,
      status: 'unpaid',
      amount: payload.monthlyFeeRiel || DEFAULT_MONTHLY_FEE,
      paidDate: '',
      note: '',
      updatedAt: ''
    };
  };

  const handleSetStudentMonthStatus = async (
    student: PaymentResidentStudent,
    monthNum: number,
    newStatus: MonthPaymentStatus,
    customDate?: string,
    customNote?: string
  ) => {
    const code = normalizeStudentCodeInput(student.student_code);
    const prevRec = getStudentMonthRecord(code, monthNum, selectedYear);
    const todayIso = new Date().toISOString().split('T')[0];

    const updatedRec: StudentMonthRecord = {
      month: monthNum,
      status: newStatus,
      amount: prevRec.amount || payload.monthlyFeeRiel || DEFAULT_MONTHLY_FEE,
      paidDate:
        newStatus === 'paid'
          ? customDate !== undefined
            ? customDate
            : prevRec.paidDate || todayIso
          : customDate || '',
      note: customNote !== undefined ? customNote : prevRec.note || '',
      updatedAt: new Date().toISOString()
    };

    const yearMap = { ...(payload.recordsByYear[selectedYear] || {}) };
    const stEntry = yearMap[code] || { months: {}, customValues: {} };

    yearMap[code] = {
      ...stEntry,
      months: {
        ...stEntry.months,
        [monthNum]: updatedRec
      }
    };

    const monthObj = KHMER_MONTHS.find((m) => m.num === monthNum);
    const monthNameKm = monthObj?.nameKm || String(monthNum);

    let newNotifications = [...payload.notifications];
    if (newStatus === 'paid' || newStatus === 'owed') {
      const notifTitle =
        newStatus === 'paid'
          ? `បញ្ជាក់ការបង់ប្រាក់ខែ${monthNameKm} ជោគជ័យ`
          : `កត់ត្រាការជំពាក់ប្រាក់ខែ${monthNameKm}`;
      const notifMsg =
        newStatus === 'paid'
          ? `គណៈគ្រប់គ្រងបានបញ្ជាក់ថា អ្នកបានបង់ប្រាក់ប្រចាំខែ${monthNameKm} ឆ្នាំ${selectedYear} ចំនួន ${formatRiel(updatedRec.amount)} រួចរាល់នៅថ្ងៃទី ${updatedRec.paidDate}។`
          : `ប្រាក់មណ្ឌលប្រចាំខែ${monthNameKm} ឆ្នាំ${selectedYear} ចំនួន ${formatRiel(updatedRec.amount)} ត្រូវបានកត់ត្រាក្នុងបញ្ជីជំពាក់។`;

      const notifItem: PaymentNotificationItem = {
        id: `pay-notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        studentCode: code,
        studentNameKm: student.full_name_km,
        year: Number(selectedYear),
        month: monthNum,
        status: newStatus,
        amount: updatedRec.amount,
        titleKm: notifTitle,
        messageKm: notifMsg,
        createdAt: new Date().toISOString(),
        readBy: []
      };
      newNotifications = [notifItem, ...newNotifications.slice(0, 250)];
    }

    const nextPayload: PaymentSystemPayload = {
      ...payload,
      recordsByYear: {
        ...payload.recordsByYear,
        [selectedYear]: yearMap
      },
      notifications: newNotifications
    };

    setPayload(nextPayload);
    const res = await savePaymentPayloadToDb(nextPayload);
    const statusText =
      newStatus === 'paid' ? 'បានបង់រួច' : newStatus === 'owed' ? 'ជំពាក់' : 'មិនទាន់បង់';
    showToast(
      `រក្សាទុកជោគជ័យ៖ ${student.full_name_km} (ខែ${monthNameKm} = ${statusText})${res.syncedCloud ? ' [Synced]' : ''}`
    );
  };

  const handleAddResidentStudent = async () => {
    const cleanCode = normalizeStudentCodeInput(newStCode);
    if (!cleanCode || !newStNameKm.trim()) {
      showToast('សូមបញ្ចូលអត្តលេខ (ID) និងឈ្មោះសិស្សជាមុនសិន!', 'error');
      return;
    }
    if (
      students.some(
        (s) => normalizeStudentCodeInput(s.student_code).toLowerCase() === cleanCode.toLowerCase()
      )
    ) {
      showToast(`អត្តលេខ "${cleanCode}" មានក្នុងតារាងរួចហើយ!`, 'error');
      return;
    }

    const newSt: PaymentResidentStudent = {
      id: `res-st-${Date.now()}`,
      student_code: cleanCode,
      full_name_km: newStNameKm.trim(),
      full_name_en: newStNameKm.trim(),
      gender_km: newStGender,
      major_km: newStMajor.trim() || 'ព័ត៌មានវិទ្យា',
      generation_km: 'សិស្សមណ្ឌល'
    };

    const nextPayload: PaymentSystemPayload = {
      ...payload,
      residentStudents: [...students, newSt]
    };
    setPayload(nextPayload);
    setNewStCode('');
    setNewStNameKm('');
    setShowAddStudentBox(false);
    await savePaymentPayloadToDb(nextPayload);
    showToast(`បានបន្ថែមសិស្ស "${newSt.full_name_km}" (${cleanCode}) ចូលតារាងបង់ប្រាក់!`);
  };

  const handleRemoveResidentStudent = async (st: PaymentResidentStudent) => {
    if (
      !window.confirm(
        `តើអ្នកពិតជាចង់ដកឈ្មោះ "${st.full_name_km} (${st.student_code})" ចេញពីតារាងបង់ប្រាក់មណ្ឌលមែនទេ?`
      )
    ) {
      return;
    }
    const nextPayload: PaymentSystemPayload = {
      ...payload,
      residentStudents: students.filter((s) => s.student_code !== st.student_code)
    };
    setPayload(nextPayload);
    await savePaymentPayloadToDb(nextPayload);
    showToast(`បានដកឈ្មោះ "${st.full_name_km}" ចេញពីតារាងបង់ប្រាក់រួចរាល់!`);
  };

  const handleUpdateCustomCell = (studentCode: string, colName: string, val: string) => {
    const code = normalizeStudentCodeInput(studentCode);
    const yearMap = { ...(payload.recordsByYear[selectedYear] || {}) };
    const stEntry = yearMap[code] || { months: {}, customValues: {} };

    yearMap[code] = {
      ...stEntry,
      customValues: {
        ...stEntry.customValues,
        [colName]: val
      }
    };

    setPayload({
      ...payload,
      recordsByYear: {
        ...payload.recordsByYear,
        [selectedYear]: yearMap
      }
    });
  };

  const handleAddCustomColumn = async () => {
    const trimmed = newColName.trim();
    if (!trimmed || payload.customColumns.includes(trimmed)) return;
    const nextPayload = {
      ...payload,
      customColumns: [...payload.customColumns, trimmed]
    };
    setPayload(nextPayload);
    setNewColName('');
    setShowAddColBox(false);
    await savePaymentPayloadToDb(nextPayload);
    showToast(`បានបន្ថែមជួរឈរ "${trimmed}" ចូលក្នុងតារាង!`);
  };

  const handleDeleteCustomColumn = async (colName: string) => {
    if (!window.confirm(`តើអ្នកពិតជាចង់លុបជួរឈរ "${colName}" មែនទេ?`)) return;
    const nextPayload = {
      ...payload,
      customColumns: payload.customColumns.filter((c) => c !== colName)
    };
    setPayload(nextPayload);
    await savePaymentPayloadToDb(nextPayload);
    showToast(`បានលុបជួរឈរ "${colName}" រួចរាល់!`);
  };

  const handleSendCustomNoticeToStudent = async (student: PaymentResidentStudent) => {
    if (!customNoticeText.trim()) return;
    const code = normalizeStudentCodeInput(student.student_code);
    const monthObj = KHMER_MONTHS.find((m) => m.num === selectedMonth);

    const notifItem: PaymentNotificationItem = {
      id: `pay-msg-${Date.now()}`,
      studentCode: code,
      studentNameKm: student.full_name_km,
      year: Number(selectedYear),
      month: selectedMonth,
      status: 'owed',
      amount: payload.monthlyFeeRiel || DEFAULT_MONTHLY_FEE,
      titleKm: `សារជូនដំណឹងពីគណៈគ្រប់គ្រងមណ្ឌល (ខែ${monthObj?.nameKm || selectedMonth})`,
      messageKm: customNoticeText.trim(),
      createdAt: new Date().toISOString(),
      readBy: []
    };

    const nextPayload: PaymentSystemPayload = {
      ...payload,
      notifications: [notifItem, ...payload.notifications]
    };
    setPayload(nextPayload);
    setCustomNoticeText('');
    await savePaymentPayloadToDb(nextPayload);
    showToast(`បានផ្ញើសារជូនដំណឹងទៅកាន់ ${student.full_name_km} (${code}) ជោគជ័យ!`);
  };

  const handleBroadcastDueMonthReminder = async () => {
    const monthObj = KHMER_MONTHS.find((m) => m.num === selectedMonth);
    const monthNameKm = monthObj?.nameKm || String(selectedMonth);

    const unpaidStudents = students.filter((s) => {
      const rec = getStudentMonthRecord(s.student_code, selectedMonth, selectedYear);
      return rec.status !== 'paid';
    });

    if (unpaidStudents.length === 0) {
      showToast(`សិស្សទាំងអស់បានបង់ប្រាក់ខែ${monthNameKm} រួចរាល់អស់ហើយ!`);
      return;
    }

    const nowIso = new Date().toISOString();
    const batchNotifs: PaymentNotificationItem[] = unpaidStudents.map((s, idx) => ({
      id: `due-${Date.now()}-${idx}`,
      studentCode: normalizeStudentCodeInput(s.student_code),
      studentNameKm: s.full_name_km,
      year: Number(selectedYear),
      month: selectedMonth,
      status: 'owed',
      amount: payload.monthlyFeeRiel || DEFAULT_MONTHLY_FEE,
      titleKm: `ដល់ខែត្រូវបង់ប្រាក់មណ្ឌល (ខែ${monthNameKm} ${selectedYear})`,
      messageKm: `សូមជម្រាបជូន ${s.full_name_km} (${s.student_code})៖ ដល់ពេលត្រូវបង់ប្រាក់មណ្ឌលប្រចាំខែ${monthNameKm} ឆ្នាំ${selectedYear} ចំនួន ${formatRiel(payload.monthlyFeeRiel || DEFAULT_MONTHLY_FEE)} ហើយ។`,
      createdAt: nowIso,
      readBy: []
    }));

    const nextPayload: PaymentSystemPayload = {
      ...payload,
      notifications: [...batchNotifs, ...payload.notifications.slice(0, 200)]
    };

    setPayload(nextPayload);
    await savePaymentPayloadToDb(nextPayload);
    showToast(
      `បានផ្ញើសារជូនដំណឹងខែ${monthNameKm} ទៅកាន់សិស្សមិនទាន់បង់ចំនួន ${unpaidStudents.length} នាក់!`
    );
  };

  const handleSaveAllChanges = async () => {
    setSaving(true);
    const res = await savePaymentPayloadToDb(payload);
    setSaving(false);
    showToast(
      res.syncedCloud
        ? 'បានរក្សាទុក និង Sync ទិន្នន័យទៅគ្រប់ទូរស័ព្ទដោយជោគជ័យ!'
        : 'បានរក្សាទុកទិន្នន័យការបង់ប្រាក់ជោគជ័យ!'
    );
  };

  const studentRows = useMemo(() => {
    return students.map((st, index) => {
      const code = normalizeStudentCodeInput(st.student_code);
      const currentMonthRec = getStudentMonthRecord(code, selectedMonth, selectedYear);

      const paidMonths: { num: number; nameKm: string; amount: number; date: string }[] = [];
      const owedMonths: { num: number; nameKm: string; status: MonthPaymentStatus; amount: number }[] =
        [];

      const allTwelveMonths = KHMER_MONTHS.map((m) => {
        const r = getStudentMonthRecord(code, m.num, selectedYear);
        if (r.status === 'paid') {
          paidMonths.push({
            num: m.num,
            nameKm: m.nameKm,
            amount: r.amount || DEFAULT_MONTHLY_FEE,
            date: r.paidDate
          });
        } else if (r.status === 'owed') {
          owedMonths.push({
            num: m.num,
            nameKm: m.nameKm,
            status: r.status,
            amount: r.amount || DEFAULT_MONTHLY_FEE
          });
        }
        return {
          num: m.num,
          nameKm: m.nameKm,
          status: r.status,
          amount: r.amount || DEFAULT_MONTHLY_FEE,
          paidDate: r.paidDate
        };
      });

      const totalPaidRiel = paidMonths.reduce((sum, item) => sum + item.amount, 0);
      const totalOwedRiel = owedMonths.reduce((sum, item) => sum + item.amount, 0);
      const customValues = getStudentYearEntry(code, selectedYear).customValues || {};

      return {
        index: index + 1,
        student: st,
        currentMonthRec,
        paidMonths,
        owedMonths,
        allTwelveMonths,
        totalPaidRiel,
        totalOwedRiel,
        customValues
      };
    });
  }, [students, payload, selectedYear, selectedMonth]);

  const filteredRows = useMemo(() => {
    return studentRows.filter((row) => {
      if (statusFilter === 'paid' && row.currentMonthRec.status !== 'paid') return false;
      if (statusFilter === 'owed' && row.currentMonthRec.status === 'paid') return false;
      if (statusFilter === 'unpaid' && row.currentMonthRec.status !== 'unpaid') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchCode = row.student.student_code.toLowerCase().includes(q);
        const matchKm = (row.student.full_name_km || '').toLowerCase().includes(q);
        if (!matchCode && !matchKm) return false;
      }
      return true;
    });
  }, [studentRows, statusFilter, searchQuery]);

  const monthlyChartStats = useMemo(() => {
    return KHMER_MONTHS.map((m) => {
      let paidCount = 0;
      let owedCount = 0;
      let unpaidCount = 0;
      let revenueRiel = 0;
      let owedRiel = 0;

      students.forEach((s) => {
        const r = getStudentMonthRecord(s.student_code, m.num, selectedYear);
        const fee = r.amount || DEFAULT_MONTHLY_FEE;
        if (r.status === 'paid') {
          paidCount += 1;
          revenueRiel += fee;
        } else if (r.status === 'owed') {
          owedCount += 1;
          owedRiel += fee;
        } else {
          unpaidCount += 1;
        }
      });

      return {
        ...m,
        paidCount,
        owedCount,
        unpaidCount,
        revenueRiel,
        owedRiel
      };
    });
  }, [students, payload, selectedYear]);

  const totalYearlyRevenue = monthlyChartStats.reduce((sum, m) => sum + m.revenueRiel, 0);
  const selectedMonthStat =
    monthlyChartStats.find((m) => m.num === selectedMonth) || monthlyChartStats[0];
  const totalYearlyOwed = studentRows.reduce((sum, r) => sum + r.totalOwedRiel, 0);
  const selectedMonthObj = KHMER_MONTHS.find((m) => m.num === selectedMonth);

  const maxStockValue = Math.max(
    ...monthlyChartStats.map((m) => Math.max(m.revenueRiel, m.owedRiel)),
    students.length * DEFAULT_MONTHLY_FEE || 200000
  );

  const svgW = 660;
  const svgH = 210;
  const padX = 42;
  const padY = 24;
  const plotW = svgW - padX * 2;
  const plotH = svgH - padY * 2;

  const getStockPt = (idx: number, val: number) => {
    const x = padX + (idx / 11) * plotW;
    const y = padY + plotH - (Math.min(val, maxStockValue) / maxStockValue) * plotH;
    return { x, y };
  };

  const paidPts = monthlyChartStats.map((m, i) => getStockPt(i, m.revenueRiel));
  const owedPts = monthlyChartStats.map((m, i) => getStockPt(i, m.owedRiel));

  const buildSmoothCurve = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const cX = (pts[i].x + pts[i + 1].x) / 2;
      d += ` C ${cX} ${pts[i].y}, ${cX} ${pts[i + 1].y}, ${pts[i + 1].x} ${pts[i + 1].y}`;
    }
    return d;
  };

  const buildAreaCurve = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    return `${buildSmoothCurve(pts)} L ${pts[pts.length - 1].x} ${padY + plotH} L ${pts[0].x} ${padY + plotH} Z`;
  };

  const donutRadius = 62;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let donutAccum = 0;
  const donutTotalBase = totalYearlyRevenue > 0 ? totalYearlyRevenue : 12;

  const donutSlices = monthlyChartStats.map((m) => {
    const val = totalYearlyRevenue > 0 ? m.revenueRiel : 1;
    const pct = val / donutTotalBase;
    const dashArray = `${pct * donutCircumference} ${donutCircumference}`;
    const dashOffset = -donutAccum * donutCircumference;
    donutAccum += pct;
    return {
      ...m,
      pct: totalYearlyRevenue > 0 ? Math.round((m.revenueRiel / totalYearlyRevenue) * 100) : 0,
      dashArray,
      dashOffset
    };
  });

  const activeDonutStat =
    monthlyChartStats.find((m) => m.num === activeDonutMonth) || monthlyChartStats[0];

  return (
    <div className="space-y-5 font-khmer pb-28">
      {saveFeedback && (
        <div
          className={cn(
            'fixed top-20 right-4 z-[250] px-4 py-3 rounded-2xl border shadow-2xl flex items-center gap-2.5 text-xs sm:text-sm font-black animate-in slide-in-from-top-3 duration-200',
            saveFeedback.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-500 text-emerald-300'
              : 'bg-rose-950/95 border-rose-500 text-rose-300'
          )}
        >
          {saveFeedback.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
          )}
          <span>{saveFeedback.text}</span>
        </div>
      )}

      <div className="bg-white dark:bg-[#162033] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-[#eab308] text-slate-950 font-extrabold px-2.5 py-0.5 text-[10px] sm:text-xs">
              MONTHLY PAYMENT & REVENUE CMS
            </Badge>
            <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-extrabold text-[10px] sm:text-xs">
              តម្លៃមណ្ឌល៖ ៥០,០០០ ៛ / ខែ
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2 pt-1">
            <DollarSign className="h-6 w-6 text-emerald-500 shrink-0" />
            <span>គ្រប់គ្រងការបង់ប្រាក់ប្រចាំខែ និងចំណូលមណ្ឌល</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            តាមដានសិស្សបង់ប្រាក់ ចេញវិក្កយបត្រ បញ្ជូនសារជូនដំណឹងតាម ID និងមើលក្រាបផ្សារភាគហ៊ុនចំណូលប្រចាំខែ/ឆ្នាំ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => setShowAddStudentBox((prev) => !prev)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs h-10 px-3.5 rounded-xl shadow-sm"
          >
            <UserPlus className="h-4 w-4 mr-1.5" />
            បន្ថែមសិស្សថ្មី
          </Button>

          <Button
            type="button"
            onClick={handleBroadcastDueMonthReminder}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs h-10 px-3.5 rounded-xl shadow-sm"
          >
            <BellRing className="h-4 w-4 mr-1.5" />
            ជូនដំណឹងខែ{selectedMonthObj?.nameKm}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => setShowAddColBox((prev) => !prev)}
            className="rounded-xl border-slate-300 dark:border-slate-700 text-xs font-bold h-10 px-3"
          >
            <Columns className="h-4 w-4 mr-1.5 text-blue-500" />
            បន្ថែមជួរឈរ
          </Button>

          <Button
            type="button"
            disabled={saving}
            onClick={handleSaveAllChanges}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs h-10 px-4 rounded-xl shadow-md"
          >
            <Save className="h-4 w-4 mr-1.5" />
            {saving ? 'កំពុងរក្សាទុក...' : 'រក្សាទុកទិន្នន័យ'}
          </Button>
        </div>
      </div>

      {showAddStudentBox && (
        <div className="bg-white dark:bg-[#162033] border border-blue-500/40 rounded-2xl p-4 space-y-3 shadow-md animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h4 className="text-xs sm:text-sm font-black text-blue-500 flex items-center gap-1.5">
              <UserPlus className="h-4 w-4" />
              បន្ថែមឈ្មោះសិស្សថ្មីដែលកំពុងស្នាក់នៅមណ្ឌលចូលក្នុងតារាងបង់ប្រាក់
            </h4>
            <button
              type="button"
              onClick={() => setShowAddStudentBox(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <Input
              value={newStCode}
              onChange={(e) => setNewStCode(e.target.value.toUpperCase())}
              placeholder="អត្តលេខ (ឧ. BIPA-022)..."
              className="text-xs h-10 font-bold"
            />
            <Input
              value={newStNameKm}
              onChange={(e) => setNewStNameKm(e.target.value)}
              placeholder="គោត្តនាម និងនាម (ខ្មែរ)..."
              className="text-xs h-10 font-bold"
            />
            <select
              value={newStGender}
              onChange={(e) => setNewStGender(e.target.value)}
              className="h-10 rounded-xl px-3 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 text-xs font-bold"
            >
              <option value="ប្រុស">ភេទ៖ ប្រុស</option>
              <option value="ស្រី">ភេទ៖ ស្រី</option>
            </select>
            <div className="flex gap-2">
              <Input
                value={newStMajor}
                onChange={(e) => setNewStMajor(e.target.value)}
                placeholder="ជំនាញ..."
                className="text-xs h-10 flex-1"
              />
              <Button
                type="button"
                onClick={handleAddResidentStudent}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black h-10 px-4 rounded-xl shrink-0"
              >
                បញ្ចូល
              </Button>
            </div>
          </div>
        </div>
      )}

      {showAddColBox && (
        <div className="bg-white dark:bg-[#162033] border border-blue-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3 shadow-md animate-in fade-in duration-200">
          <Input
            value={newColName}
            onChange={(e) => setNewColName(e.target.value)}
            placeholder="វាយឈ្មោះជួរឈរថ្មី (ឧ. លេខបង្កាន់ដៃ, អ្នកទទួលប្រាក់)..."
            className="text-xs h-10 flex-1"
          />
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              onClick={handleAddCustomColumn}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-10 px-4 rounded-xl"
            >
              <Plus className="h-4 w-4 mr-1" />
              បន្ថែមចូលតារាង
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddColBox(false)}
              className="text-xs h-10 rounded-xl"
            >
              បិទ
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-white dark:bg-[#162033] border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
          <CardContent className="p-4 flex items-center justify-between gap-2">
            <div className="space-y-1 min-w-0">
              <p className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">
                ចំណូលខែ{selectedMonthObj?.nameKm} ({selectedYear})
              </p>
              <p className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 truncate">
                {formatRiel(selectedMonthStat?.revenueRiel || 0)}
              </p>
              <p className="text-[10px] sm:text-xs font-bold text-slate-500">
                បានបង់ {selectedMonthStat?.paidCount || 0} / {students.length} នាក់
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#162033] border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
          <CardContent className="p-4 flex items-center justify-between gap-2">
            <div className="space-y-1 min-w-0">
              <p className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">
                ចំណូលសរុបឆ្នាំ {selectedYear}
              </p>
              <p className="text-lg sm:text-2xl font-black text-blue-600 dark:text-blue-400 truncate">
                {formatRiel(totalYearlyRevenue)}
              </p>
              <p className="text-[10px] sm:text-xs font-bold text-blue-500">
                សរុបគ្រប់ខែដែលបានបង់
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-500 shrink-0">
              <Wallet className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#162033] border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
          <CardContent className="p-4 flex items-center justify-between gap-2">
            <div className="space-y-1 min-w-0">
              <p className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">
                សិស្សមិនទាន់បង់ (ខែ{selectedMonthObj?.nameKm})
              </p>
              <p className="text-lg sm:text-2xl font-black text-rose-600 dark:text-rose-400">
                {students.length - (selectedMonthStat?.paidCount || 0)} នាក់
              </p>
              <p className="text-[10px] sm:text-xs font-bold text-rose-500 truncate">
                ជំពាក់ខែនេះ៖ {formatRiel(selectedMonthStat?.owedRiel || 0)}
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 shrink-0">
              <AlertCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#162033] border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
          <CardContent className="p-4 flex items-center justify-between gap-2">
            <div className="space-y-1 min-w-0">
              <p className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">
                ទឹកប្រាក់ជំពាក់សរុប ({selectedYear})
              </p>
              <p className="text-lg sm:text-2xl font-black text-amber-600 dark:text-amber-400 truncate">
                {formatRiel(totalYearlyOwed)}
              </p>
              <p className="text-[10px] sm:text-xs font-bold text-amber-500">
                គិតតាមខែដែលកត់ត្រាជំពាក់
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <Card className="bg-white dark:bg-[#162033] border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm xl:col-span-7 overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-cyan-500" />
                <span>ក្រាបសន្ទុះចំណូលបង់ប្រាក់ និងការជំពាក់ប្រចាំខែ (ឆ្នាំ {selectedYear})</span>
              </CardTitle>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                បង្ហាញការឡើងចុះនៃទឹកប្រាក់បង់រួច និងទឹកប្រាក់ជំពាក់/បង់យឺតតាមខែទាំង ១២ (ចុចលើចំណុចខែដើម្បីមើលតម្លៃលេខ)
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-extrabold bg-slate-100 dark:bg-[#0f172a] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 w-fit">
              <span className="flex items-center gap-1.5 text-emerald-500">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                បានបង់រួច
              </span>
              <span className="w-px h-3.5 bg-slate-300 dark:bg-slate-700" />
              <span className="flex items-center gap-1.5 text-rose-500">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                ជំពាក់ / បង់យឺត
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="relative bg-[#0b1325] rounded-2xl border border-slate-800 p-3">
              <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-48 sm:h-52 overflow-visible">
                <defs>
                  <linearGradient id="paidStockGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="owedStockGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.38" />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {[0, 0.25, 0.5, 0.75, 1].map((step, idx) => {
                  const yPos = padY + step * plotH;
                  const valLabel = Math.round((maxStockValue * (1 - step)) / 1000) + 'k';
                  return (
                    <g key={idx}>
                      <line
                        x1={padX}
                        y1={yPos}
                        x2={svgW - padX}
                        y2={yPos}
                        stroke="#1e293b"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                      <text x={4} y={yPos + 3} fill="#64748b" fontSize="9.5" fontWeight="bold">
                        {valLabel}
                      </text>
                    </g>
                  );
                })}

                <path d={buildAreaCurve(paidPts)} fill="url(#paidStockGrad)" />
                <path
                  d={buildSmoothCurve(paidPts)}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                <path d={buildAreaCurve(owedPts)} fill="url(#owedStockGrad)" />
                <path
                  d={buildSmoothCurve(owedPts)}
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {monthlyChartStats.map((m, i) => {
                  const pPt = paidPts[i];
                  const oPt = owedPts[i];
                  const isActive =
                    hoveredStockMonth === m.num ||
                    (hoveredStockMonth === null && selectedMonth === m.num);

                  return (
                    <g
                      key={m.num}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredStockMonth(m.num)}
                      onMouseLeave={() => setHoveredStockMonth(null)}
                      onClick={() => {
                        setSelectedMonth(m.num);
                        setActiveDonutMonth(m.num);
                      }}
                    >
                      {isActive && (
                        <line
                          x1={pPt.x}
                          y1={padY}
                          x2={pPt.x}
                          y2={padY + plotH}
                          stroke="#94a3b8"
                          strokeDasharray="3 3"
                          strokeWidth="1"
                        />
                      )}
                      <circle
                        cx={pPt.x}
                        cy={pPt.y}
                        r={isActive ? 6 : 4}
                        fill="#0b1325"
                        stroke="#10b981"
                        strokeWidth="2.5"
                      />
                      <circle
                        cx={oPt.x}
                        cy={oPt.y}
                        r={isActive ? 5.5 : 3.5}
                        fill="#0b1325"
                        stroke="#f43f5e"
                        strokeWidth="2.5"
                      />
                      <text
                        x={pPt.x}
                        y={svgH - 4}
                        textAnchor="middle"
                        fill={isActive ? '#38bdf8' : '#94a3b8'}
                        fontSize="9.5"
                        fontWeight="bold"
                      >
                        {m.nameKm}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {(() => {
                const targetM =
                  monthlyChartStats.find(
                    (m) => m.num === (hoveredStockMonth || selectedMonth)
                  ) || monthlyChartStats[0];
                return (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 bg-[#162033] border border-slate-700/80 px-3.5 py-2 rounded-xl text-xs">
                    <span className="font-black text-white">
                      ខែ{targetM.nameKm} ({selectedYear})៖
                    </span>
                    <div className="flex flex-wrap items-center gap-3 font-extrabold">
                      <span className="text-emerald-400">
                        បង់រួច៖ {formatRiel(targetM.revenueRiel)} ({targetM.paidCount} នាក់)
                      </span>
                      <span className="text-rose-400">
                        ជំពាក់៖ {formatRiel(targetM.owedRiel)} ({targetM.owedCount} នាក់)
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#162033] border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm xl:col-span-5">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <PieChart className="h-5 w-5 text-amber-500" />
              <span>ក្រាបមូលតាមពណ៌នៃខែទាំង ១២ (ចុចមើលទឹកប្រាក់តាមខែ)</span>
            </CardTitle>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              ចុចលើពណ៌ខែណាមួយ ដើម្បីមើលចំនួនទឹកប្រាក់បង់រួចជាលេខ
            </p>
          </CardHeader>
          <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r={donutRadius}
                  fill="transparent"
                  stroke="#0f172a"
                  strokeWidth="18"
                />
                {donutSlices.map((slice) => {
                  const isSel = slice.num === activeDonutMonth;
                  return (
                    <circle
                      key={slice.num}
                      cx="80"
                      cy="80"
                      r={donutRadius}
                      fill="transparent"
                      stroke={slice.color}
                      strokeWidth={isSel ? '22' : '17'}
                      strokeDasharray={slice.dashArray}
                      strokeDashoffset={slice.dashOffset}
                      onClick={() => {
                        setActiveDonutMonth(slice.num);
                        setSelectedMonth(slice.num);
                      }}
                      className="cursor-pointer transition-all duration-300 hover:opacity-90"
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3 pointer-events-none">
                <span
                  className="text-[11px] font-black px-2 py-0.5 rounded-full text-white mb-0.5"
                  style={{ backgroundColor: activeDonutStat?.color || '#3b82f6' }}
                >
                  ខែ{activeDonutStat?.nameKm}
                </span>
                <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight">
                  {formatRiel(activeDonutStat?.revenueRiel || 0)}
                </span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  បង់ {activeDonutStat?.paidCount || 0} នាក់ • ជំពាក់ {activeDonutStat?.owedCount || 0}
                </span>
              </div>
            </div>

            <div className="flex-1 w-full grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
              {donutSlices.map((slice) => {
                const isSel = slice.num === activeDonutMonth;
                return (
                  <button
                    key={slice.num}
                    type="button"
                    onClick={() => {
                      setActiveDonutMonth(slice.num);
                      setSelectedMonth(slice.num);
                    }}
                    className={cn(
                      'flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl border text-left transition-all text-[11px]',
                      isSel
                        ? 'bg-blue-600/15 border-blue-500 font-black text-slate-900 dark:text-white shadow-xs'
                        : 'bg-slate-50 dark:bg-[#0f172a] border-slate-200/70 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:border-slate-500'
                    )}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: slice.color }}
                      />
                      <span className="truncate">{slice.nameKm}</span>
                    </div>
                    <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0">
                      {slice.revenueRiel > 0
                        ? Math.round(slice.revenueRiel / 1000) + 'k'
                        : '0៛'}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white dark:bg-[#162033] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="h-10 rounded-xl px-3 bg-slate-100 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white"
            >
              {['2025', '2026', '2027', '2028'].map((yr) => (
                <option key={yr} value={yr}>
                  ឆ្នាំ {yr}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0f172a] p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all',
                  statusFilter === 'all'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-600 dark:text-slate-300'
                )}
              >
                សិស្សក្នុងមណ្ឌល ({studentRows.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('paid')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all',
                  statusFilter === 'paid'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-600 dark:text-slate-300'
                )}
              >
                បានបង់ ({studentRows.filter((r) => r.currentMonthRec.status === 'paid').length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('owed')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all',
                  statusFilter === 'owed'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-slate-600 dark:text-slate-300'
                )}
              >
                មិនទាន់បង់/ជំពាក់ (
                {studentRows.filter((r) => r.currentMonthRec.status !== 'paid').length})
              </button>
            </div>
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ស្វែងរកអត្តលេខ (BIPA-015) ឬឈ្មោះ..."
              className="pl-9 text-xs h-10 rounded-xl bg-slate-50 dark:bg-[#0f172a]"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {KHMER_MONTHS.map((m) => {
            const isSel = m.num === selectedMonth;
            return (
              <button
                key={m.num}
                type="button"
                onClick={() => {
                  setSelectedMonth(m.num);
                  setActiveDonutMonth(m.num);
                }}
                className={cn(
                  'px-3.5 py-2 rounded-xl text-xs font-extrabold shrink-0 border transition-all active:scale-95',
                  isSel
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                    : 'bg-slate-50 dark:bg-[#0f172a] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-blue-400'
                )}
              >
                ខែ{m.nameKm}
              </button>
            );
          })}
        </div>

        <div className="w-full max-h-[480px] overflow-x-auto overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 scrollbar-thin">
          <table className="w-full text-xs text-left border-collapse min-w-[1000px]">
            <thead className="sticky top-0 z-20">
              <tr className="bg-amber-400 text-slate-950 font-black shadow-xs">
                <th className="py-3.5 px-3 border border-amber-500/40 text-center w-12">ល.រ</th>
                <th className="py-3.5 px-3 border border-amber-500/40">អត្តលេខ (ID)</th>
                <th className="py-3.5 px-3 border border-amber-500/40">
                  គោត្តនាម និងនាម (ចុចមើលខែ)
                </th>
                <th className="py-3.5 px-2.5 border border-amber-500/40 text-center">ភេទ</th>
                <th className="py-3.5 px-3 border border-amber-500/40 text-center">
                  ស្ថានភាព ខែ{selectedMonthObj?.nameKm}
                </th>
                <th className="py-3.5 px-3 border border-amber-500/40 text-center">
                  ថ្ងៃខែបង់ប្រាក់
                </th>
                <th className="py-3.5 px-3 border border-amber-500/40 text-center">
                  សង្ខេបខែបង់រួច & ជំពាក់
                </th>
                <th className="py-3.5 px-3 border border-amber-500/40 text-right">
                  បានបង់សរុប
                </th>
                <th className="py-3.5 px-3 border border-amber-500/40 text-right">
                  ជំពាក់សរុប
                </th>
                {payload.customColumns.map((col) => (
                  <th key={col} className="py-3.5 px-3 border border-amber-500/40">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate">{col}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomColumn(col)}
                        className="text-red-700 hover:text-red-900 p-0.5"
                        title="លុបជួរឈរ"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </th>
                ))}
                <th className="py-3.5 px-3 border border-amber-500/40 text-center">
                  សកម្មភាព & វិក្កយបត្រ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredRows.map((row) => {
                const isPaid = row.currentMonthRec.status === 'paid';
                const isOwed = row.currentMonthRec.status === 'owed';

                return (
                  <tr
                    key={row.student.student_code}
                    className="bg-white dark:bg-[#162033] hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <td className="py-2.5 px-3 border border-slate-200/70 dark:border-slate-800 text-center font-black">
                      {row.index}
                    </td>
                    <td className="py-2.5 px-3 border border-slate-200/70 dark:border-slate-800 font-black text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {row.student.student_code}
                    </td>
                    <td className="py-2.5 px-3 border border-slate-200/70 dark:border-slate-800 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setActiveStudentModal(row.student)}
                        className="font-black text-slate-900 dark:text-white hover:text-blue-500 flex items-center gap-1.5 text-left"
                      >
                        <span>{row.student.full_name_km}</span>
                        <Eye className="h-3.5 w-3.5 text-blue-500 opacity-75" />
                      </button>
                    </td>
                    <td className="py-2.5 px-2.5 border border-slate-200/70 dark:border-slate-800 text-center font-bold whitespace-nowrap">
                      {row.student.gender_km}
                    </td>
                    <td className="py-2.5 px-3 border border-slate-200/70 dark:border-slate-800 text-center whitespace-nowrap">
                      {isPaid ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-extrabold text-[11px]">
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          បានបង់ ៥ម៉ឺន
                        </Badge>
                      ) : isOwed ? (
                        <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-extrabold text-[11px]">
                          <AlertCircle className="h-3.5 w-3.5 mr-1" />
                          ជំពាក់ ៥ម៉ឺន
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-[11px]">
                          មិនទាន់បង់
                        </Badge>
                      )}
                    </td>
                    <td className="py-2.5 px-3 border border-slate-200/70 dark:border-slate-800 text-center whitespace-nowrap">
                      <input
                        type="date"
                        value={row.currentMonthRec.paidDate || ''}
                        onChange={(e) =>
                          handleSetStudentMonthStatus(
                            row.student,
                            selectedMonth,
                            row.currentMonthRec.status,
                            e.target.value
                          )
                        }
                        className="h-8 px-2 rounded-lg bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 text-[11px] font-bold"
                      />
                    </td>
                    <td className="py-2.5 px-3 border border-slate-200/70 dark:border-slate-800 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setActiveStudentModal(row.student)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-blue-500/15 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 text-[11px] font-extrabold transition-colors"
                      >
                        <span className="text-emerald-600 dark:text-emerald-400">
                          បង់ {row.paidMonths.length} ខែ
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-rose-500">
                          ជំពាក់ {row.owedMonths.length} ខែ
                        </span>
                        <span className="text-blue-500 underline ml-1">មើលខែ</span>
                      </button>
                    </td>
                    <td className="py-2.5 px-3 border border-slate-200/70 dark:border-slate-800 text-right font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {formatRiel(row.totalPaidRiel)}
                    </td>
                    <td className="py-2.5 px-3 border border-slate-200/70 dark:border-slate-800 text-right font-black text-rose-600 dark:text-rose-400 whitespace-nowrap">
                      {formatRiel(row.totalOwedRiel)}
                    </td>
                    {payload.customColumns.map((col) => (
                      <td
                        key={col}
                        className="py-2 px-2 border border-slate-200/70 dark:border-slate-800 whitespace-nowrap"
                      >
                        <input
                          type="text"
                          value={row.customValues[col] || ''}
                          onChange={(e) =>
                            handleUpdateCustomCell(
                              row.student.student_code,
                              col,
                              e.target.value
                            )
                          }
                          placeholder="..."
                          className="w-28 h-8 px-2 rounded-lg bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 text-xs"
                        />
                      </td>
                    ))}
                    <td className="py-2 px-3 border border-slate-200/70 dark:border-slate-800 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            handleSetStudentMonthStatus(
                              row.student,
                              selectedMonth,
                              isPaid ? 'unpaid' : 'paid'
                            )
                          }
                          className={cn(
                            'px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold transition-all',
                            isPaid
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          )}
                        >
                          {isPaid ? '✓ បានបង់' : 'ដាក់ថាបង់'}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleSetStudentMonthStatus(
                              row.student,
                              selectedMonth,
                              isOwed ? 'unpaid' : 'owed'
                            )
                          }
                          className={cn(
                            'px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold transition-all',
                            isOwed
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                          )}
                        >
                          ជំពាក់
                        </button>

                        <button
                          type="button"
                          onClick={() => setReceiptStudentModal(row.student)}
                          className="p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                          title="មើលវិក្កយបត្រ"
                        >
                          <Receipt className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveResidentStudent(row.student)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500"
                          title="ដកឈ្មោះសិស្សចេញពីតារាងបង់ប្រាក់"
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

      {activeStudentModal && (
        <div
          onClick={() => setActiveStudentModal(null)}
          className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 font-khmer animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[90dvh] bg-white dark:bg-[#162033] border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between gap-3 shrink-0">
              <div>
                <Badge className="bg-black/30 text-white border-0 text-[10px] font-extrabold mb-1">
                  អត្តលេខ៖ {activeStudentModal.student_code} • ឆ្នាំ {selectedYear}
                </Badge>
                <h3 className="text-base sm:text-lg font-black">
                  ខែដែលបានបង់ និងមិនទាន់បង់ របស់៖ {activeStudentModal.full_name_km}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    const st = activeStudentModal;
                    setActiveStudentModal(null);
                    setReceiptStudentModal(st);
                  }}
                  className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs h-8 px-3 rounded-xl"
                >
                  <Receipt className="h-3.5 w-3.5 mr-1" />
                  វិក្កយបត្រ
                </Button>
                <button
                  type="button"
                  onClick={() => setActiveStudentModal(null)}
                  className="w-8 h-8 rounded-full bg-black/25 hover:bg-black/40 flex items-center justify-center text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 scrollbar-thin">
              {(() => {
                const stRow = studentRows.find(
                  (r) => r.student.student_code === activeStudentModal.student_code
                );
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1.5">
                      <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                        ✓ ខែដែលបានបង់រួច ({stRow?.paidMonths.length || 0} ខែ ={' '}
                        {formatRiel(stRow?.totalPaidRiel || 0)})៖
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {stRow && stRow.paidMonths.length > 0 ? (
                          stRow.paidMonths.map((pm) => (
                            <span
                              key={pm.num}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-extrabold"
                            >
                              ខែ{pm.nameKm}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">មិនទាន់មានខែបានបង់ទេ</span>
                        )}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-1.5">
                      <div className="text-xs font-black text-rose-600 dark:text-rose-400">
                        ! ខែដែលជំពាក់មណ្ឌល ({stRow?.owedMonths.length || 0} ខែ ={' '}
                        {formatRiel(stRow?.totalOwedRiel || 0)})៖
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {stRow && stRow.owedMonths.length > 0 ? (
                          stRow.owedMonths.map((om) => (
                            <span
                              key={om.num}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-extrabold"
                            >
                              ខែ{om.nameKm}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-emerald-500 font-bold">
                            គ្មានខែជំពាក់ទេ
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="bg-slate-50 dark:bg-[#0f172a] p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="text-xs font-extrabold text-blue-500 flex items-center gap-1.5">
                  <Send className="h-3.5 w-3.5" />
                  ផ្ញើសារជូនដំណឹងផ្ទាល់ទៅកាន់ទូរស័ព្ទរបស់ {activeStudentModal.full_name_km}៖
                </label>
                <div className="flex gap-2">
                  <Input
                    value={customNoticeText}
                    onChange={(e) => setCustomNoticeText(e.target.value)}
                    placeholder={`សរសេរសារជូនដំណឹងទៅកាន់ ${activeStudentModal.student_code}...`}
                    className="text-xs h-9 flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleSendCustomNoticeToStudent(activeStudentModal)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-9 px-4 shrink-0"
                  >
                    <Send className="h-3.5 w-3.5 mr-1" />
                    ផ្ញើសារ
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {KHMER_MONTHS.map((m) => {
                  const rec = getStudentMonthRecord(
                    activeStudentModal.student_code,
                    m.num,
                    selectedYear
                  );
                  const isPaid = rec.status === 'paid';
                  const isOwed = rec.status === 'owed';

                  return (
                    <div
                      key={m.num}
                      className={cn(
                        'p-3 rounded-2xl border flex flex-col justify-between gap-2 transition-all',
                        isPaid
                          ? 'bg-emerald-500/10 border-emerald-500/40'
                          : isOwed
                          ? 'bg-rose-500/10 border-rose-500/40'
                          : 'bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          ខែ{m.nameKm}
                        </span>
                        <span className="text-[11px] font-bold text-slate-500">
                          {formatRiel(rec.amount || DEFAULT_MONTHLY_FEE)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            handleSetStudentMonthStatus(
                              activeStudentModal,
                              m.num,
                              isPaid ? 'unpaid' : 'paid'
                            )
                          }
                          className={cn(
                            'py-1.5 rounded-lg text-[10px] font-extrabold transition-all',
                            isPaid
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          )}
                        >
                          {isPaid ? '✓ បានបង់' : 'ដាក់ថាបង់'}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleSetStudentMonthStatus(
                              activeStudentModal,
                              m.num,
                              isOwed ? 'unpaid' : 'owed'
                            )
                          }
                          className={cn(
                            'py-1.5 rounded-lg text-[10px] font-extrabold transition-all',
                            isOwed
                              ? 'bg-rose-600 text-white'
                              : 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                          )}
                        >
                          {isOwed ? '! ជំពាក់' : 'ដាក់ជំពាក់'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0f172a] flex justify-end">
              <Button
                onClick={() => setActiveStudentModal(null)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl px-6"
              >
                បិទផ្ទាំង
              </Button>
            </div>
          </div>
        </div>
      )}

      {receiptStudentModal && (
        <PaymentReceiptModal
          student={receiptStudentModal}
          year={selectedYear}
          monthsData={
            studentRows.find(
              (r) => r.student.student_code === receiptStudentModal.student_code
            )?.allTwelveMonths || []
          }
          onClose={() => setReceiptStudentModal(null)}
        />
      )}
    </div>
  );
}

export function PaymentStudentView({
  onSwitchToAdmin
}: {
  onSwitchToAdmin?: () => void;
}) {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('super_admin', 'residence_admin', 'finance_admin', 'duty_manager');

  const currentYearStr = String(new Date().getFullYear());
  const currentMonthNum = new Date().getMonth() + 1;

  const [payload, setPayload] = useState<PaymentSystemPayload>(() => loadCachedPaymentPayload());
  const [selectedYear, setSelectedYear] = useState<string>(currentYearStr);

  const [linkedId, setLinkedId] = useState<string>(() =>
    normalizeStudentCodeInput(localStorage.getItem('bipa_linked_student_id') || '')
  );
  const [inputId, setInputId] = useState<string>(() =>
    normalizeStudentCodeInput(localStorage.getItem('bipa_linked_student_id') || '')
  );
  const [isEditingId, setIsEditingId] = useState<boolean>(
    () => !localStorage.getItem('bipa_linked_student_id')
  );
  const [idError, setIdError] = useState('');
  const [showMyReceipt, setShowMyReceipt] = useState(false);

  const loadData = async () => {
    const dbPayload = await fetchPaymentPayloadFromDb();
    setPayload(dbPayload);
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 3500);
    window.addEventListener('payment-system-updated', loadData);
    window.addEventListener('storage', loadData);

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('bipa_payment_sync_channel');
        bc.onmessage = () => loadData();
      }
    } catch {}

    return () => {
      clearInterval(timer);
      window.removeEventListener('payment-system-updated', loadData);
      window.removeEventListener('storage', loadData);
      if (bc) bc.close();
    };
  }, []);

  const allStudentsPool = useMemo(() => {
    const map = new Map<string, PaymentResidentStudent>();
    initialStudents.forEach((s) => {
      const c = normalizeStudentCodeInput(s.student_code);
      map.set(c, {
        id: s.id,
        student_code: c,
        full_name_km: s.full_name_km,
        full_name_en: s.full_name_en,
        gender_km: s.gender_km,
        major_km: s.major_km,
        generation_km: s.generation_km
      });
    });
    (payload.residentStudents || []).forEach((s) => {
      const c = normalizeStudentCodeInput(s.student_code);
      map.set(c, s);
    });
    return Array.from(map.values());
  }, [payload.residentStudents]);

  const matchedStudent = useMemo(() => {
    if (!linkedId) return null;
    const clean = normalizeStudentCodeInput(linkedId);
    return (
      allStudentsPool.find(
        (s) => normalizeStudentCodeInput(s.student_code).toLowerCase() === clean.toLowerCase()
      ) || null
    );
  }, [allStudentsPool, linkedId]);

  const handleSaveStudentId = () => {
    const clean = normalizeStudentCodeInput(inputId);
    if (!clean) {
      setIdError('សូមបញ្ចូលអត្តលេខសិស្សរបស់អ្នក (ឧ. BIPA-015)');
      return;
    }
    const found = allStudentsPool.find(
      (s) => normalizeStudentCodeInput(s.student_code).toLowerCase() === clean.toLowerCase()
    );
    if (!found) {
      setIdError(`រកមិនឃើញអត្តលេខ "${clean}" ក្នុងបញ្ជីមណ្ឌលទេ!`);
      return;
    }
    setIdError('');
    localStorage.setItem('bipa_linked_student_id', found.student_code);
    setLinkedId(found.student_code);
    setInputId(found.student_code);
    setIsEditingId(false);
    window.dispatchEvent(new Event('payment-system-updated'));
  };

  const myYearMonths = useMemo(() => {
    if (!matchedStudent) return [];
    const code = normalizeStudentCodeInput(matchedStudent.student_code);
    const yearEntry = payload.recordsByYear?.[selectedYear]?.[code]?.months || {};

    return KHMER_MONTHS.map((m) => {
      const rec = yearEntry[m.num];
      const status: MonthPaymentStatus = rec?.status || 'unpaid';
      return {
        ...m,
        status,
        amount: rec?.amount || payload.monthlyFeeRiel || DEFAULT_MONTHLY_FEE,
        paidDate: rec?.paidDate || '',
        note: rec?.note || ''
      };
    });
  }, [matchedStudent, payload, selectedYear]);

  const paidMonthsList = myYearMonths.filter((m) => m.status === 'paid');
  const owedMonthsList = myYearMonths.filter((m) => m.status === 'owed');
  const totalPaidAmount = paidMonthsList.reduce((s, m) => s + m.amount, 0);
  const totalOwedAmount = owedMonthsList.reduce((s, m) => s + m.amount, 0);

  const nextDueMonthObj = useMemo(() => {
    const firstUnpaid = myYearMonths.find(
      (m) => m.status !== 'paid' && m.num >= currentMonthNum
    );
    return firstUnpaid || myYearMonths.find((m) => m.status !== 'paid') || null;
  }, [myYearMonths, currentMonthNum]);

  const myUnreadNotifications = useMemo(() => {
    if (!matchedStudent) return [];
    const code = normalizeStudentCodeInput(matchedStudent.student_code);
    return payload.notifications.filter(
      (n) =>
        (normalizeStudentCodeInput(n.studentCode) === code || n.studentCode === 'ALL') &&
        !(n.readBy || []).includes(code)
    );
  }, [payload.notifications, matchedStudent]);

  const handleDismissNotifications = async () => {
    if (!matchedStudent || myUnreadNotifications.length === 0) return;
    const code = normalizeStudentCodeInput(matchedStudent.student_code);
    const updatedNotifs = payload.notifications.map((n) => {
      if (normalizeStudentCodeInput(n.studentCode) === code || n.studentCode === 'ALL') {
        const setArr = Array.from(new Set([...(n.readBy || []), code]));
        return { ...n, readBy: setArr };
      }
      return n;
    });
    const nextPayload = { ...payload, notifications: updatedNotifs };
    setPayload(nextPayload);
    await savePaymentPayloadToDb(nextPayload);
  };

  return (
    <div className="max-w-xl mx-auto space-y-4 font-khmer pb-24 pt-12 sm:pt-4">
      {(isEditingId || !matchedStudent) && (
        <div className="bg-[#162033] text-white border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-black flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-400" />
              <span>ភ្ជាប់អត្តលេខសិស្ស (Student ID)</span>
            </h2>
            {matchedStudent && (
              <button
                type="button"
                onClick={() => setIsEditingId(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                បិទ
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            បញ្ចូលអត្តលេខ (ID) របស់អ្នក ហើយចុច Save នោះប្រអប់នេះនឹងបាត់ ហើយបង្ហាញតែទិន្នន័យបង់ប្រាក់របស់អ្នកប៉ុណ្ណោះ។
          </p>
          <div className="flex gap-2">
            <Input
              value={inputId}
              onChange={(e) => setInputId(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveStudentId();
              }}
              placeholder="ឧ. BIPA-015"
              className="text-xs font-black h-11 flex-1 bg-[#0f172a] border-slate-700 text-white rounded-xl"
            />
            <Button
              type="button"
              onClick={handleSaveStudentId}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black h-11 px-5 rounded-xl shrink-0"
            >
              Save ID
            </Button>
          </div>
          {idError && <p className="text-xs font-bold text-rose-400">{idError}</p>}
        </div>
      )}

      {matchedStudent && (
        <>
          <div className="bg-gradient-to-b from-[#162033] to-[#11192a] text-white rounded-3xl p-4 sm:p-5 border border-slate-800/90 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <Badge className="bg-[#eab308] hover:bg-[#eab308] text-slate-950 font-black text-xs px-3 py-0.5 rounded-lg">
                    {matchedStudent.student_code}
                  </Badge>
                  <h2 className="text-lg sm:text-xl font-black text-white">
                    {matchedStudent.full_name_km}
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  ជំនាញ៖ {matchedStudent.major_km || 'ព័ត៌មានវិទ្យា'} •{' '}
                  {matchedStudent.generation_km || 'សិស្សមណ្ឌល'}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowMyReceipt(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 text-[11px] font-extrabold flex items-center gap-1"
                >
                  <Receipt className="h-3.5 w-3.5" />
                  <span>វិក្កយបត្រ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingId(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold"
                >
                  ប្តូរ ID
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-b border-slate-800/90 pb-3">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="h-9 rounded-xl px-3 bg-[#0f172a] border border-slate-700 text-xs font-extrabold text-white"
              >
                {['2025', '2026', '2027', '2028'].map((yr) => (
                  <option key={yr} value={yr}>
                    ឆ្នាំ {yr}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadData}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300"
                  title="Refresh"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
                {isAdmin && onSwitchToAdmin && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={onSwitchToAdmin}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-8 px-3 rounded-xl"
                  >
                    Admin
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-[#0d332a]/85 border border-emerald-500/30">
                <p className="text-[11px] font-bold text-emerald-300">
                  ខែបានបង់រួច ({selectedYear})
                </p>
                <p className="text-xl sm:text-2xl font-black text-white mt-0.5">
                  {paidMonthsList.length} ខែ
                </p>
                <p className="text-xs font-extrabold text-emerald-400 mt-0.5">
                  សរុប៖ {formatRiel(totalPaidAmount)}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#381624]/85 border border-rose-500/30">
                <p className="text-[11px] font-bold text-rose-300">ខែមិនទាន់បង់ / ជំពាក់</p>
                <p className="text-xl sm:text-2xl font-black text-white mt-0.5">
                  {owedMonthsList.length} ខែ
                </p>
                <p className="text-xs font-extrabold text-rose-400 mt-0.5">
                  ជំពាក់៖ {formatRiel(totalOwedAmount)}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#152847] border border-blue-500/35 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold text-blue-300">
                  ខែបច្ចុប្បន្ន (ខែ{KHMER_MONTHS[currentMonthNum - 1]?.nameKm}) និងខែបន្ទាប់
                </p>
                <p className="text-sm sm:text-base font-black text-white mt-0.5">
                  {myYearMonths[currentMonthNum - 1]?.status === 'paid'
                    ? `✓ ខែ${KHMER_MONTHS[currentMonthNum - 1]?.nameKm} បានបង់រួចរាល់`
                    : `! ដល់ខែត្រូវបង់ ៥ម៉ឺន (ខែ${nextDueMonthObj?.nameKm || KHMER_MONTHS[currentMonthNum - 1]?.nameKm})`}
                </p>
                <p className="text-[11px] font-bold text-blue-300 mt-0.5">
                  {nextDueMonthObj
                    ? `ខែត្រូវបង់បន្ទាប់៖ ខែ${nextDueMonthObj.nameKm} (50,000 ៛)`
                    : 'បានបង់គ្រប់ខែទាំងអស់ក្នុងឆ្នាំនេះ'}
                </p>
              </div>
            </div>
          </div>

          {myUnreadNotifications.length > 0 && (
            <div className="bg-blue-950/90 border border-blue-500/50 rounded-3xl p-4 text-white space-y-2.5 shadow-lg animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-amber-400 animate-bounce" />
                  <span className="text-xs font-black text-amber-300">
                    សារជូនដំណឹងថ្មីពីគណៈគ្រប់គ្រង ({myUnreadNotifications.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDismissNotifications}
                  className="px-2.5 py-1 rounded-full bg-blue-600 text-white text-[10px] font-extrabold flex items-center gap-1"
                >
                  <CheckCheck className="h-3 w-3" />
                  <span>យល់ព្រម</span>
                </button>
              </div>
              {myUnreadNotifications.slice(0, 2).map((n) => (
                <div
                  key={n.id}
                  className="p-3 rounded-2xl bg-[#0f172a]/90 border border-slate-800 text-xs space-y-1"
                >
                  <p className="font-black text-white">{n.titleKm}</p>
                  <p className="text-slate-300 leading-relaxed">{n.messageKm}</p>
                </div>
              ))}
            </div>
          )}

          <div className="bg-[#162033] text-white border border-slate-800/90 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3.5">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Calendar className="h-5 w-5 text-amber-400" />
              <h3 className="text-sm sm:text-base font-black">
                តារាងតាមដានការបង់ប្រាក់ទាំង ១២ ខែ របស់អ្នក (ឆ្នាំ {selectedYear})
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {myYearMonths.map((m) => {
                const isPaid = m.status === 'paid';
                const isOwed = m.status === 'owed';
                const isCurrentMonth = m.num === currentMonthNum;

                return (
                  <div
                    key={m.num}
                    className={cn(
                      'p-3.5 rounded-2xl border flex flex-col justify-between gap-2 transition-all',
                      isPaid
                        ? 'bg-[#0d332a]/90 border-emerald-500/45'
                        : isOwed
                        ? 'bg-[#381624]/90 border-rose-500/45'
                        : isCurrentMonth
                        ? 'bg-[#2b2618] border-amber-500/50'
                        : 'bg-[#0f172a] border-slate-800'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-black text-white">
                        ខែ{m.nameKm}
                      </span>
                      {isCurrentMonth && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[9px] font-black">
                          ខែនេះ
                        </span>
                      )}
                    </div>

                    <div className="text-xs font-extrabold text-slate-300">
                      {formatRiel(m.amount)}
                    </div>

                    {isPaid ? (
                      <div className="space-y-1">
                        <div className="w-full py-1.5 rounded-xl bg-emerald-600 text-white text-[11px] font-black text-center">
                          ✓ បានបង់រួច
                        </div>
                        {m.paidDate && (
                          <div className="text-[10px] font-bold text-emerald-300 text-center">
                            {m.paidDate}
                          </div>
                        )}
                      </div>
                    ) : isOwed ? (
                      <div className="w-full py-1.5 rounded-xl bg-rose-600 text-white text-[11px] font-black text-center">
                        ! ជំពាក់មណ្ឌល
                      </div>
                    ) : (
                      <div className="w-full py-1.5 rounded-xl bg-slate-800 text-slate-400 text-[11px] font-bold text-center">
                        មិនទាន់បង់
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {showMyReceipt && (
            <PaymentReceiptModal
              student={matchedStudent}
              year={selectedYear}
              monthsData={myYearMonths}
              onClose={() => setShowMyReceipt(false)}
            />
          )}
        </>
      )}
    </div>
  );
}