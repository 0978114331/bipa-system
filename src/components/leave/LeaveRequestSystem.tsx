import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Printer,
  Trash2,
  Search,
  UserCheck,
  Calendar,
  ArrowLeft,
  X,
  RefreshCw
} from 'lucide-react';
import { initialStudents } from '@/pages/admin/StudentListPage';
import { normalizeStudentCodeInput, resolveStudentByIdOrName } from '@/components/layout/Header';
import { cn } from '@/lib/utils';

export type LeaveApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface BipaLeaveRequestItem {
  id: string;
  studentCode: string;
  studentNameKm: string;
  genderKm: string;
  studyYearKm: string;
  academicYearKm: string;
  roleInGroupKm: string;
  groupNumberKm: string;
  durationDays: string;
  startDate: string;
  endDate: string;
  reasonKm: string;
  transferredDutyToKm: string;
  groupLeaderNameKm: string;
  approvedByNameKm: string;
  status: LeaveApprovalStatus;
  adminCommentKm: string;
  createdAt: string;
  updatedAt: string;
  studentRead: boolean;
}

export interface LeaveSystemPayload {
  requests: BipaLeaveRequestItem[];
}

export const LEAVE_STORAGE_KEY = 'bipa_leave_requests_system_v1';

const KHMER_DIGITS = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];

export function toKhmerNum(val: string | number): string {
  return String(val ?? '').replace(/\d/g, (d) => KHMER_DIGITS[Number(d)] || d);
}

const KHMER_MONTH_NAMES = [
  'មករា',
  'កុម្ភៈ',
  'មីនា',
  'មេសា',
  'ឧសភា',
  'មិថុនា',
  'កក្កដា',
  'សីហា',
  'កញ្ញា',
  'តុលា',
  'វិច្ឆិកា',
  'ធ្នូ'
];

export function parseIsoDateToKhmerParts(isoDate: string): {
  dayKm: string;
  monthKm: string;
  yearKm: string;
} {
  if (!isoDate) {
    const now = new Date();
    return {
      dayKm: toKhmerNum(String(now.getDate()).padStart(2, '0')),
      monthKm: KHMER_MONTH_NAMES[now.getMonth()] || 'មករា',
      yearKm: toKhmerNum(now.getFullYear())
    };
  }
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const d = Number(parts[2]);
    return {
      dayKm: toKhmerNum(String(d).padStart(2, '0')),
      monthKm: KHMER_MONTH_NAMES[(m - 1 + 12) % 12] || 'មករា',
      yearKm: toKhmerNum(y)
    };
  }
  return {
    dayKm: '......',
    monthKm: '............',
    yearKm: '២០២៦'
  };
}

export function loadCachedLeavePayload(): LeaveSystemPayload {
  try {
    const raw = localStorage.getItem(LEAVE_STORAGE_KEY);
    if (!raw) return { requests: [] };
    const parsed = JSON.parse(raw);
    return {
      requests: Array.isArray(parsed.requests) ? parsed.requests : []
    };
  } catch {
    return { requests: [] };
  }
}

export async function fetchLeavePayloadFromDb(): Promise<LeaveSystemPayload> {
  let current = loadCachedLeavePayload();
  try {
    const { data: setRow } = await supabase
      .from('bipa_settings')
      .select('name_en')
      .eq('id', 'leave_requests_v1')
      .maybeSingle();

    if (setRow && setRow.name_en) {
      const parsed = JSON.parse(setRow.name_en);
      if (parsed && Array.isArray(parsed.requests)) {
        current = { requests: parsed.requests };
        localStorage.setItem(LEAVE_STORAGE_KEY, JSON.stringify(current));
      }
    }
  } catch {}
  return current;
}

export async function saveLeavePayloadToDb(
  payload: LeaveSystemPayload
): Promise<{ ok: boolean; syncedCloud: boolean }> {
  const jsonStr = JSON.stringify(payload);
  localStorage.setItem(LEAVE_STORAGE_KEY, jsonStr);
  let syncedCloud = false;

  try {
    const { error } = await supabase.from('bipa_settings').upsert({
      id: 'leave_requests_v1',
      logo_url: 'LEAVE_SYSTEM',
      name_km: 'ប្រព័ន្ធសំណើច្បាប់និស្សិត',
      name_en: jsonStr
    });
    if (!error) syncedCloud = true;
  } catch {}

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('bipa_leave_sync_channel');
      bc.postMessage({ type: 'LEAVE_UPDATED', timestamp: Date.now() });
      bc.close();
    }
  } catch {}

  window.dispatchEvent(new Event('leave-system-updated'));
  return { ok: true, syncedCloud };
}

export function GlobalLeaveBadgeEnhancer() {
  const [badgeCount, setBadgeCount] = useState(0);
  const { hasRole } = useAuth();
  const isAdmin = hasRole('super_admin', 'residence_admin', 'finance_admin', 'duty_manager');

  const refreshBadge = async () => {
    const payload = await fetchLeavePayloadFromDb();
    if (isAdmin) {
      const pendingCount = payload.requests.filter((r) => r.status === 'pending').length;
      setBadgeCount(pendingCount);
      return;
    }
    const linked = normalizeStudentCodeInput(
      localStorage.getItem('bipa_linked_student_id') || ''
    );
    if (!linked) {
      setBadgeCount(0);
      return;
    }
    const unreadUpdates = payload.requests.filter(
      (r) =>
        normalizeStudentCodeInput(r.studentCode) === linked &&
        r.status !== 'pending' &&
        !r.studentRead
    ).length;
    setBadgeCount(unreadUpdates);
  };

  useEffect(() => {
    refreshBadge();
    const interval = setInterval(refreshBadge, 3500);
    window.addEventListener('leave-system-updated', refreshBadge);
    window.addEventListener('student-id-linked', refreshBadge);
    window.addEventListener('storage', refreshBadge);

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('bipa_leave_sync_channel');
        bc.onmessage = () => refreshBadge();
      }
    } catch {}

    return () => {
      clearInterval(interval);
      window.removeEventListener('leave-system-updated', refreshBadge);
      window.removeEventListener('student-id-linked', refreshBadge);
      window.removeEventListener('storage', refreshBadge);
      if (bc) bc.close();
    };
  }, [isAdmin]);

  useEffect(() => {
    const applyLeaveBadge = () => {
      const allNodes = Array.from(document.querySelectorAll('main *, #root *')) as HTMLElement[];
      let leaveCard: HTMLElement | null = null;

      for (const el of allNodes) {
        if (el.closest('aside, nav, header, .fixed')) continue;
        if (el.classList.contains('bipa-tg-leave-badge')) continue;

        let directText = '';
        el.childNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            directText += node.textContent || '';
          }
        });
        const clean = directText.replace(/\s+/g, ' ').trim();
        if (clean !== 'សំណើច្បាប់' && clean !== 'សុំច្បាប់') continue;

        let curr: HTMLElement | null = el.parentElement;
        while (curr && curr !== document.body) {
          if (curr.classList.contains('grid')) break;
          const hasSvg = curr.querySelector('svg') !== null;
          const rect = curr.getBoundingClientRect();
          if (
            hasSvg &&
            rect.width >= 75 &&
            rect.width <= 320 &&
            rect.height >= 65 &&
            rect.height <= 220
          ) {
            leaveCard = curr;
            break;
          }
          curr = curr.parentElement;
        }
        if (leaveCard) break;
      }

      const oldBadges = Array.from(document.querySelectorAll('.bipa-tg-leave-badge'));

      if (leaveCard && badgeCount > 0) {
        const style = window.getComputedStyle(leaveCard);
        if (style.position === 'static') {
          leaveCard.style.position = 'relative';
        }
        const existing = leaveCard.querySelector('.bipa-tg-leave-badge') as HTMLElement | null;
        if (existing) {
          existing.textContent = String(badgeCount);
          oldBadges.forEach((b) => {
            if (b !== existing) b.remove();
          });
        } else {
          oldBadges.forEach((b) => b.remove());
          const span = document.createElement('span');
          span.className =
            'bipa-tg-leave-badge absolute top-2.5 right-2.5 z-20 min-w-[22px] h-[22px] px-1.5 rounded-full bg-rose-600 text-white text-[11px] font-black flex items-center justify-center shadow-[0_0_12px_rgba(225,29,72,0.85)] border-2 border-white dark:border-[#0f172a] pointer-events-none animate-bounce';
          span.textContent = String(badgeCount);
          leaveCard.appendChild(span);
        }
      } else {
        oldBadges.forEach((b) => b.remove());
      }
    };

    applyLeaveBadge();
    const timer = setInterval(applyLeaveBadge, 900);
    return () => clearInterval(timer);
  }, [badgeCount]);

  return null;
}

export function LeaveA4DocumentModal({
  item,
  logoUrl,
  onClose
}: {
  item: BipaLeaveRequestItem;
  logoUrl: string;
  onClose: () => void;
}) {
  const startParts = parseIsoDateToKhmerParts(item.startDate);
  const endParts = parseIsoDateToKhmerParts(item.endDate);
  const createdParts = parseIsoDateToKhmerParts(item.createdAt.split('T')[0]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[240] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 font-khmer overflow-y-auto animate-in fade-in duration-200"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Battambang:wght@400;700&family=Moul&display=swap');

        .bipa-khmer-moul {
          font-family: 'Moul', 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important;
          font-weight: 400 !important;
        }
        .bipa-khmer-body {
          font-family: 'Battambang', 'Khmer OS Battambang', 'Noto Sans Khmer', serif !important;
        }
        .bipa-filled-blue {
          color: #1d4ed8 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
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
          #bipa-a4-leave-print-sheet,
          #bipa-a4-leave-print-sheet * {
            visibility: visible !important;
          }
          #bipa-a4-leave-print-sheet {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            padding: 16mm 20mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print-bar {
            display: none !important;
          }
        }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[840px] max-h-[94dvh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-700"
      >
        <div className="no-print-bar p-3.5 sm:p-4 bg-[#0f172a] border-b border-slate-800 text-white flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-400" />
            <span className="text-xs sm:text-sm font-black">
              លិខិតសុំអនុញ្ញាតច្បាប់ផ្លូវការ (អក្សរឆ្លាក់ & ខ្នាតក្រដាស A4)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => window.print()}
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs h-9 px-4 rounded-xl shadow"
            >
              <Printer className="h-4 w-4 mr-1.5" />
              បោះពុម្ពក្រដាស A4 (Print)
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

        <div className="overflow-y-auto p-3 sm:p-6 bg-slate-800/70 flex justify-center flex-1 scrollbar-thin">
          <div
            id="bipa-a4-leave-print-sheet"
            className="bipa-khmer-body w-full max-w-[210mm] min-h-[297mm] bg-white text-black p-6 sm:p-[16mm_20mm] shadow-2xl rounded-sm leading-[2.15] text-[13.5px] sm:text-[15px] flex flex-col justify-between select-text"
          >
            <div className="space-y-3">
              <div className="relative flex items-start justify-between">
                <div className="flex flex-col items-center text-center w-44 shrink-0 pt-2">
                  <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center border border-slate-300 bg-white p-0.5">
                    <img
                      src={logoUrl}
                      alt="BIPA Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <p className="bipa-khmer-moul text-[10px] sm:text-[11px] text-black mt-2 leading-relaxed">
                    សមាគមជនជាតិដើមភាគតិចព្នង
                  </p>
                </div>

                <div className="flex-1 text-center pt-1 pr-4 sm:pr-24 space-y-1">
                  <h2 className="bipa-khmer-moul text-[15px] sm:text-[17px] tracking-wide text-black">
                    ព្រះរាជាណាចក្រកម្ពុជា
                  </h2>
                  <h3 className="bipa-khmer-moul text-[14px] sm:text-[16px] tracking-wide text-black">
                    ជាតិ សាសនា ព្រះមហាក្សត្រ
                  </h3>
                  <div className="text-xs font-bold tracking-[0.2em] text-black pt-0.5">
                    ~ ~ ~ ❖ ~ ~ ~
                  </div>
                </div>
              </div>

              <div className="text-center pt-2 pb-1">
                <h1 className="bipa-khmer-moul text-[16px] sm:text-[18px] text-black">
                  លិខិតសុំអនុញ្ញាតច្បាប់
                </h1>
              </div>

              <div className="space-y-3 text-justify pt-1">
                <p className="indent-8 leading-[2.3]">
                  ខ្ញុំបាទ/នាងខ្ញុំឈ្មោះ៖{' '}
                  <span className="bipa-khmer-moul bipa-filled-blue inline-block border-b border-dotted border-black px-3 min-w-[165px] text-center text-[14px] sm:text-[15.5px]">
                    {item.studentNameKm}
                  </span>{' '}
                  ឆ្នាំទី{' '}
                  <span className="bipa-filled-blue inline-block border-b border-dotted border-black px-2.5 font-bold min-w-[40px] text-center">
                    {toKhmerNum(item.studyYearKm)}
                  </span>{' '}
                  ក្នុងឆ្នាំសិក្សា{' '}
                  <span className="bipa-filled-blue font-bold">
                    {toKhmerNum(item.academicYearKm || '២០២៥-២០២៦')}
                  </span>{' '}
                  នៃ សមាគមជនជាតិដើមភាគតិចព្នង(BIPA) តួនាទីជា{' '}
                  <span className="bipa-filled-blue inline-block border-b border-dotted border-black px-3 font-bold min-w-[110px] text-center">
                    {item.roleInGroupKm || 'សមាជិក'}
                  </span>{' '}
                  ក្នុងក្រុមទី{' '}
                  <span className="bipa-filled-blue inline-block border-b border-dotted border-black px-2.5 font-bold min-w-[40px] text-center">
                    {toKhmerNum(item.groupNumberKm)}
                  </span>{' '}
                  ។
                </p>

                <div className="text-center py-1">
                  <p className="bipa-khmer-moul text-black text-[13.5px] sm:text-[15px]">
                    សូមគោរពជូនប្រធានសមាគមជនជាតិដើមភាគតិចព្នង(BIPA)
                  </p>
                </div>

                <div className="leading-[2.3]">
                  <p>
                    <span className="bipa-khmer-moul underline underline-offset-4 mr-2 text-[13.5px] sm:text-[14.5px]">
                      កម្មវត្ថុ៖
                    </span>
                    ស្នើសុំស្នាក់នៅក្រៅមណ្ឌល រយៈពេល{' '}
                    <span className="bipa-filled-blue inline-block border-b border-dotted border-black px-3 font-bold min-w-[45px] text-center">
                      {toKhmerNum(item.durationDays)}
                    </span>{' '}
                    ថ្ងៃ ចាប់ពីថ្ងៃទី{' '}
                    <span className="bipa-filled-blue inline-block border-b border-dotted border-black px-2.5 font-bold min-w-[42px] text-center">
                      {startParts.dayKm}
                    </span>{' '}
                    ខែ{' '}
                    <span className="bipa-filled-blue inline-block border-b border-dotted border-black px-3 font-bold min-w-[75px] text-center">
                      {startParts.monthKm}
                    </span>{' '}
                    ឆ្នាំ{' '}
                    <span className="bipa-filled-blue inline-block border-b border-dotted border-black px-2 font-bold min-w-[60px] text-center">
                      {startParts.yearKm}
                    </span>
                  </p>
                  <p className="pl-16 sm:pl-20">
                    ដល់ថ្ងៃទី{' '}
                    <span className="bipa-filled-blue inline-block border-b border-dotted border-black px-2.5 font-bold min-w-[42px] text-center">
                      {endParts.dayKm}
                    </span>{' '}
                    ខែ{' '}
                    <span className="bipa-filled-blue inline-block border-b border-dotted border-black px-3 font-bold min-w-[75px] text-center">
                      {endParts.monthKm}
                    </span>{' '}
                    ឆ្នាំ{' '}
                    <span className="bipa-filled-blue inline-block border-b border-dotted border-black px-2 font-bold min-w-[60px] text-center">
                      {endParts.yearKm}
                    </span>{' '}
                    ។
                  </p>
                </div>

                <div className="leading-[2.3]">
                  <p>
                    <span className="bipa-khmer-moul underline underline-offset-4 mr-2 text-[13.5px] sm:text-[14.5px]">
                      មូលហេតុ៖
                    </span>
                    <span className="bipa-filled-blue border-b border-dotted border-black px-2 font-bold">
                      {item.reasonKm}
                    </span>{' '}
                    ។
                  </p>
                </div>

                <div className="leading-[2.3]">
                  <p>
                    <span className="bipa-khmer-moul underline underline-offset-4 mr-2 text-[13.5px] sm:text-[14.5px]">
                      បញ្ជាក់៖
                    </span>
                    កិច្ចការប្រចាំថ្ងៃផ្ទេរជូន{' '}
                    <span className="bipa-khmer-moul bipa-filled-blue inline-block border-b border-dotted border-black px-4 min-w-[200px] text-center text-[13.5px] sm:text-[14.5px]">
                      {item.transferredDutyToKm || 'សមាជិកក្នុងក្រុម'}
                    </span>
                  </p>
                </div>

                <p className="indent-8 leading-[2.15] pt-1">
                  អាស្រ័យដូចបានជម្រាបជូនខាងលើ សូមប្រធាននៃសមាគមជនជាតិដើមភាគតិចព្នង (BIPA)
                  មេត្តាអនុញ្ញាតដោយក្ដីអនុគ្រោះផង។
                </p>

                <p className="indent-12 leading-[2.15] font-bold">
                  *សូមទទួលនូវការគោរពដ៏ខ្ពង់ខ្ពស់អំពីខ្ញុំបាទ/នាងខ្ញុំ។
                </p>
              </div>
            </div>

            <div className="pt-5 pb-3 space-y-4">
              <div className="text-right pr-2">
                <p>
                  ភ្នំពេញ, ថ្ងៃទី{' '}
                  <span className="bipa-filled-blue inline-block border-b border-dotted border-black px-2.5 font-bold">
                    {createdParts.dayKm}
                  </span>{' '}
                  ខែ{' '}
                  <span className="bipa-filled-blue inline-block border-b border-dotted border-black px-3 font-bold">
                    {createdParts.monthKm}
                  </span>{' '}
                  ឆ្នាំ{' '}
                  <span className="bipa-filled-blue inline-block border-b border-dotted border-black px-2 font-bold">
                    {createdParts.yearKm}
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center pt-2">
                <div className="flex flex-col justify-between min-h-[120px]">
                  <p className="bipa-khmer-moul text-xs sm:text-[13px]">
                    បានឃើញ និងអនុញ្ញាតដោយ
                  </p>
                  <div className="my-1.5">
                    {item.status === 'approved' && (
                      <span className="bipa-filled-blue inline-block px-2.5 py-0.5 rounded border border-blue-700 text-xs font-bold">
                        ✓ បានអនុញ្ញាតច្បាប់
                      </span>
                    )}
                    {item.status === 'rejected' && (
                      <span className="inline-block px-2.5 py-0.5 rounded border border-rose-700 text-rose-700 text-xs font-bold">
                        ✕ មិនអនុញ្ញាត
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="bipa-khmer-moul bipa-filled-blue text-xs sm:text-[13px] mb-1">
                      {item.approvedByNameKm || ''}
                    </p>
                    <p className="text-xs tracking-widest">............................</p>
                  </div>
                </div>

                <div className="flex flex-col justify-between min-h-[120px]">
                  <div>
                    <p className="bipa-khmer-moul text-xs sm:text-[13px]">
                      យល់ព្រមនិងបញ្ជូនមក
                    </p>
                    <p className="bipa-khmer-moul text-xs sm:text-[13px] mt-1">ប្រធានក្រុម</p>
                  </div>
                  <div>
                    <p className="bipa-khmer-moul bipa-filled-blue text-xs sm:text-[13px] mb-1">
                      {item.groupLeaderNameKm || ''}
                    </p>
                    <p className="text-xs tracking-widest">............................</p>
                  </div>
                </div>

                <div className="flex flex-col justify-between min-h-[120px]">
                  <p className="bipa-khmer-moul text-xs sm:text-[13px]">
                    ហត្ថលេខានិងឈ្មោះអ្នកសុំ
                  </p>
                  <div>
                    <p className="bipa-khmer-moul bipa-filled-blue text-xs sm:text-[13px] mb-1">
                      {item.studentNameKm}
                    </p>
                    <p className="text-xs tracking-widest">............................</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LeaveStudentView({
  onSwitchToAdmin
}: {
  onSwitchToAdmin?: () => void;
}) {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const isAdmin = hasRole('super_admin', 'residence_admin', 'finance_admin', 'duty_manager');

  const todayIso = new Date().toISOString().split('T')[0];

  const [payload, setPayload] = useState<LeaveSystemPayload>(() => loadCachedLeavePayload());
  const [linkedId, setLinkedId] = useState<string>(() =>
    normalizeStudentCodeInput(localStorage.getItem('bipa_linked_student_id') || '')
  );
  const [inputId, setInputId] = useState<string>(() =>
    normalizeStudentCodeInput(localStorage.getItem('bipa_linked_student_id') || '')
  );
  const [studentNameKm, setStudentNameKm] = useState<string>('');
  const [genderKm, setGenderKm] = useState<string>('ប្រុស');
  const [isEditingId, setIsEditingId] = useState<boolean>(
    () => !localStorage.getItem('bipa_linked_student_id')
  );
  const [idError, setIdError] = useState('');

  const [studyYearKm, setStudyYearKm] = useState('២');
  const [academicYearKm, setAcademicYearKm] = useState('២០២៥-២០២៦');
  const [roleInGroupKm, setRoleInGroupKm] = useState('សមាជិក');
  const [groupNumberKm, setGroupNumberKm] = useState('១');
  const [groupLeaderNameKm, setGroupLeaderNameKm] = useState('');
  const [startDate, setStartDate] = useState(todayIso);
  const [endDate, setEndDate] = useState(todayIso);
  const [durationDays, setDurationDays] = useState('១');
  const [reasonKm, setReasonKm] = useState('');
  const [transferredDutyToKm, setTransferredDutyToKm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState('');

  const loadLeaveData = async () => {
    const dbData = await fetchLeavePayloadFromDb();
    setPayload(dbData);
  };

  const syncLinkedStudentProfile = async (codeToLookup: string) => {
    const clean = normalizeStudentCodeInput(codeToLookup);
    if (!clean) {
      setStudentNameKm('');
      return;
    }
    const resolved = await resolveStudentByIdOrName(clean);
    if (resolved) {
      setLinkedId(resolved.code);
      setInputId(resolved.code);
      setStudentNameKm(resolved.nameKm);
      setGenderKm(resolved.genderKm);
      return;
    }
    const fallback = initialStudents.find(
      (s) => normalizeStudentCodeInput(s.student_code) === clean
    );
    if (fallback) {
      setLinkedId(fallback.student_code);
      setInputId(fallback.student_code);
      setStudentNameKm(fallback.full_name_km);
      setGenderKm(fallback.gender_km);
    }
  };

  useEffect(() => {
    loadLeaveData();
    syncLinkedStudentProfile(localStorage.getItem('bipa_linked_student_id') || '');

    const handleIdSync = () => {
      const latest = localStorage.getItem('bipa_linked_student_id') || '';
      syncLinkedStudentProfile(latest);
      setIsEditingId(!latest);
    };

    const timer = setInterval(loadLeaveData, 3500);
    window.addEventListener('leave-system-updated', loadLeaveData);
    window.addEventListener('student-id-linked', handleIdSync);
    window.addEventListener('storage', handleIdSync);

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('bipa_leave_sync_channel');
        bc.onmessage = () => loadLeaveData();
      }
    } catch {}

    return () => {
      clearInterval(timer);
      window.removeEventListener('leave-system-updated', loadLeaveData);
      window.removeEventListener('student-id-linked', handleIdSync);
      window.removeEventListener('storage', handleIdSync);
      if (bc) bc.close();
    };
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (diff > 0) {
        setDurationDays(String(diff));
      }
    }
  }, [startDate, endDate]);

  const handleSaveStudentId = async () => {
    const clean = normalizeStudentCodeInput(inputId);
    if (!clean) {
      setIdError('សូមបញ្ចូលអត្តលេខសិស្សរបស់អ្នក (ឧ. BIPA-015)');
      return;
    }
    const resolved = await resolveStudentByIdOrName(clean);
    if (!resolved) {
      setIdError(`រកមិនឃើញអត្តលេខ "${clean}" ក្នុងបញ្ជីឈ្មោះនិស្សិតទេ!`);
      return;
    }
    setIdError('');
    localStorage.setItem('bipa_linked_student_id', resolved.code);
    setLinkedId(resolved.code);
    setInputId(resolved.code);
    setStudentNameKm(resolved.nameKm);
    setGenderKm(resolved.genderKm);
    setIsEditingId(false);
    window.dispatchEvent(new Event('student-id-linked'));
    window.dispatchEvent(new Event('payment-system-updated'));
    window.dispatchEvent(new Event('rice-system-updated'));
  };

  const handleSubmitLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkedId || !studentNameKm) {
      setIsEditingId(true);
      return;
    }
    if (!reasonKm.trim()) {
      alert('សូមបំពេញមូលហេតុនៃការសុំច្បាប់!');
      return;
    }

    setSubmitting(true);
    const newReq: BipaLeaveRequestItem = {
      id: `leave-${Date.now()}`,
      studentCode: linkedId,
      studentNameKm,
      genderKm,
      studyYearKm: studyYearKm.trim() || '១',
      academicYearKm: academicYearKm.trim() || '២០២៥-២០២៦',
      roleInGroupKm: roleInGroupKm.trim() || 'សមាជិក',
      groupNumberKm: groupNumberKm.trim() || '១',
      durationDays: durationDays.trim() || '១',
      startDate,
      endDate,
      reasonKm: reasonKm.trim(),
      transferredDutyToKm: transferredDutyToKm.trim() || 'សមាជិកក្នុងក្រុម',
      groupLeaderNameKm: groupLeaderNameKm.trim(),
      approvedByNameKm: '',
      status: 'pending',
      adminCommentKm: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      studentRead: true
    };

    const nextPayload: LeaveSystemPayload = {
      requests: [newReq, ...payload.requests]
    };

    setPayload(nextPayload);
    await saveLeavePayloadToDb(nextPayload);
    setSubmitting(false);
    setReasonKm('');
    setTransferredDutyToKm('');
    setSubmitSuccess('បានបញ្ជូនពាក្យសុំច្បាប់ជោគជ័យ! សូមរង់ចាំការអនុញ្ញាត។');
    setTimeout(() => setSubmitSuccess(''), 4000);
  };

  const myRequests = useMemo(() => {
    if (!linkedId) return [];
    const clean = normalizeStudentCodeInput(linkedId);
    return payload.requests.filter(
      (r) => normalizeStudentCodeInput(r.studentCode) === clean
    );
  }, [payload.requests, linkedId]);

  const handleMarkMyUpdatesRead = async () => {
    if (!linkedId) return;
    const clean = normalizeStudentCodeInput(linkedId);
    const hasUnread = myRequests.some((r) => !r.studentRead);
    if (!hasUnread) return;

    const nextReqs = payload.requests.map((r) =>
      normalizeStudentCodeInput(r.studentCode) === clean ? { ...r, studentRead: true } : r
    );
    const nextPayload = { requests: nextReqs };
    setPayload(nextPayload);
    await saveLeavePayloadToDb(nextPayload);
  };

  return (
    <div className="bipa-compact-leave-form max-w-md mx-auto space-y-3 font-khmer pb-24 pt-1">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Moul&display=swap');
        .bipa-khmer-moul-ui {
          font-family: 'Moul', 'Khmer OS Muol Light', serif !important;
          font-weight: 400 !important;
        }
        .bipa-compact-leave-form input,
        .bipa-compact-leave-form select,
        .bipa-compact-leave-form textarea {
          font-size: 12px !important;
        }
      `}</style>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-white dark:bg-[#162033] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white text-[11px] font-extrabold shadow-xs active:scale-95"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-purple-500" />
          <span>ត្រឡប់ទៅវិញ</span>
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() =>
              onSwitchToAdmin ? onSwitchToAdmin() : navigate('/admin/leave-requests')
            }
            className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-extrabold shadow-xs"
          >
            ផ្ទាំង Admin & Print A4 →
          </button>
        )}
      </div>

      {(isEditingId || !linkedId || !studentNameKm) && (
        <div className="bg-[#162033] text-white border border-slate-800 rounded-2xl p-4 shadow-lg space-y-2.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-black flex items-center gap-1.5">
              <UserCheck className="h-4 w-4 text-purple-400" />
              <span>ភ្ជាប់អត្តលេខសិស្ស (Student ID)</span>
            </h2>
            {linkedId && studentNameKm && (
              <button
                type="button"
                onClick={() => setIsEditingId(false)}
                className="text-[11px] text-slate-400 hover:text-white"
              >
                បិទ
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            បញ្ចូលអត្តលេខតែម្តង ប្រើបានគ្រប់កាតទាំងអស់ក្នុងប្រព័ន្ធ។
          </p>
          <div className="flex gap-2">
            <Input
              value={inputId}
              onChange={(e) => setInputId(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveStudentId();
              }}
              placeholder="ឧ. BIPA-015"
              className="h-9 flex-1 bg-[#0f172a] border-slate-700 text-white font-black rounded-xl"
            />
            <Button
              type="button"
              onClick={handleSaveStudentId}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-black h-9 px-4 rounded-xl shrink-0"
            >
              Save ID
            </Button>
          </div>
          {idError && <p className="text-[11px] font-bold text-rose-400">{idError}</p>}
        </div>
      )}

      {linkedId && studentNameKm && (
        <>
          <div className="bg-gradient-to-b from-[#162033] to-[#11192a] text-white rounded-2xl p-3.5 sm:p-4 border border-slate-800/90 shadow-lg space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800/90 pb-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#eab308] text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-md">
                    {linkedId}
                  </Badge>
                  <h2 className="bipa-khmer-moul-ui text-xs sm:text-sm text-sky-400 truncate">
                    {studentNameKm}
                  </h2>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  ពាក្យស្នើសុំអនុញ្ញាតច្បាប់ស្នាក់នៅក្រៅមណ្ឌល
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsEditingId(true)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold shrink-0"
              >
                ប្តូរ ID
              </button>
            </div>

            {submitSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 text-[11px] font-bold flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>{submitSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubmitLeaveRequest} className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5">
                    និស្សិតឆ្នាំទី
                  </label>
                  <select
                    value={studyYearKm}
                    onChange={(e) => setStudyYearKm(e.target.value)}
                    className="w-full h-8 rounded-lg px-2.5 bg-[#0f172a] border border-slate-700 font-bold text-sky-400"
                  >
                    <option value="១">ឆ្នាំទី ១</option>
                    <option value="២">ឆ្នាំទី ២</option>
                    <option value="៣">ឆ្នាំទី ៣</option>
                    <option value="៤">ឆ្នាំទី ៤</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5">
                    ឆ្នាំសិក្សា
                  </label>
                  <input
                    type="text"
                    value={academicYearKm}
                    onChange={(e) => setAcademicYearKm(e.target.value)}
                    placeholder="២០២៥-២០២៦"
                    className="w-full h-8 rounded-lg px-2.5 bg-[#0f172a] border border-slate-700 font-bold text-sky-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5">
                    តួនាទីក្នុងក្រុម
                  </label>
                  <select
                    value={roleInGroupKm}
                    onChange={(e) => setRoleInGroupKm(e.target.value)}
                    className="w-full h-8 rounded-lg px-2.5 bg-[#0f172a] border border-slate-700 font-bold text-sky-400"
                  >
                    <option value="សមាជិក">សមាជិក</option>
                    <option value="ប្រធានក្រុម">ប្រធានក្រុម</option>
                    <option value="អនុប្រធានក្រុម">អនុប្រធានក្រុម</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5">
                    ក្នុងក្រុមទី
                  </label>
                  <select
                    value={groupNumberKm}
                    onChange={(e) => setGroupNumberKm(e.target.value)}
                    className="w-full h-8 rounded-lg px-2.5 bg-[#0f172a] border border-slate-700 font-bold text-sky-400"
                  >
                    <option value="១">ក្រុមទី ១</option>
                    <option value="២">ក្រុមទី ២</option>
                    <option value="៣">ក្រុមទី ៣</option>
                    <option value="៤">ក្រុមទី ៤</option>
                    <option value="៥">ក្រុមទី ៥</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-5">
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5">
                    ចាប់ពីថ្ងៃទី
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full h-8 rounded-lg px-2 bg-[#0f172a] border border-slate-700 font-bold text-sky-400"
                  />
                </div>

                <div className="col-span-5">
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5">
                    ដល់ថ្ងៃទី
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full h-8 rounded-lg px-2 bg-[#0f172a] border border-slate-700 font-bold text-sky-400"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-amber-400 block mb-0.5 text-center">
                    ថ្ងៃ
                  </label>
                  <input
                    type="text"
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                    className="w-full h-8 rounded-lg bg-[#0f172a] border border-slate-700 font-black text-center text-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-0.5">
                  មូលហេតុនៃការសុំច្បាប់ *
                </label>
                <textarea
                  value={reasonKm}
                  onChange={(e) => setReasonKm(e.target.value)}
                  placeholder="បញ្ជាក់មូលហេតុសង្ខេប..."
                  className="w-full h-14 rounded-xl bg-[#0f172a] border border-slate-700 p-2 font-bold text-sky-400 outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5">
                    កិច្ចការប្រចាំថ្ងៃផ្ទេរជូន
                  </label>
                  <input
                    type="text"
                    value={transferredDutyToKm}
                    onChange={(e) => setTransferredDutyToKm(e.target.value)}
                    placeholder="ឈ្មោះអ្នកទទួលជំនួស..."
                    className="w-full h-8 rounded-lg px-2.5 bg-[#0f172a] border border-slate-700 font-bold text-sky-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5">
                    ឈ្មោះប្រធានក្រុម
                  </label>
                  <input
                    type="text"
                    value={groupLeaderNameKm}
                    onChange={(e) => setGroupLeaderNameKm(e.target.value)}
                    placeholder="ឧ. ផន ចាន់តារា..."
                    className="w-full h-8 rounded-lg px-2.5 bg-[#0f172a] border border-slate-700 font-bold text-sky-400"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs h-9 rounded-xl shadow-md mt-1"
              >
                <Send className="h-3.5 w-3.5 mr-1.5" />
                {submitting ? 'កំពុងបញ្ជូន...' : 'ដាក់ពាក្យស្នើសុំច្បាប់'}
              </Button>
            </form>
          </div>

          <div
            onClick={handleMarkMyUpdatesRead}
            className="bg-[#162033] text-white border border-slate-800/90 rounded-2xl p-3.5 shadow-lg space-y-2.5"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-purple-400" />
                <h3 className="text-xs font-black">
                  ប្រវត្តិសំណើច្បាប់របស់អ្នក ({myRequests.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={loadLeaveData}
                className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>

            {myRequests.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-0.5 scrollbar-thin">
                {myRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-2.5 rounded-xl bg-[#0f172a] border border-slate-800 flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-black text-white">
                        សុំច្បាប់ {toKhmerNum(req.durationDays)} ថ្ងៃ ({req.startDate} ដល់{' '}
                        {req.endDate})
                      </span>
                      {req.status === 'approved' ? (
                        <Badge className="bg-emerald-600 text-white text-[9px] font-black px-2 py-0">
                          ✓ បានអនុញ្ញាតច្បាប់
                        </Badge>
                      ) : req.status === 'rejected' ? (
                        <Badge className="bg-rose-600 text-white text-[9px] font-black px-2 py-0">
                          ✕ មិនអនុញ្ញាត
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-black px-2 py-0">
                          ⏳ រង់ចាំអនុម័ត
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-sky-400 font-bold">
                      មូលហេតុ៖ {req.reasonKm}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>ផ្ទេរកិច្ចការជូន៖ {req.transferredDutyToKm}</span>
                      <span>ក្រុមទី {toKhmerNum(req.groupNumberKm)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-[11px] text-slate-400">
                មិនទាន់មានប្រវត្តិស្នើសុំច្បាប់នៅឡើយទេ
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function LeaveAdminDashboard() {
  const [payload, setPayload] = useState<LeaveSystemPayload>(() => loadCachedLeavePayload());
  const [statusFilter, setStatusFilter] = useState<'all' | LeaveApprovalStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedA4Request, setSelectedA4Request] = useState<BipaLeaveRequestItem | null>(
    null
  );
  const [directorNameKm, setDirectorNameKm] = useState('ណន ស្រីនាង');
  const [logoUrl, setLogoUrl] = useState(
    'https://i.ibb.co/tphX7kd4/ce2e43f3-9d48-4d71-86a6-dd1ac3d77c49.png'
  );
  const [toastMsg, setToastMsg] = useState('');

  const loadData = async () => {
    const dbData = await fetchLeavePayloadFromDb();
    setPayload(dbData);

    try {
      const { data: setRow } = await supabase
        .from('bipa_settings')
        .select('logo_url')
        .eq('id', '1')
        .maybeSingle();
      if (setRow && setRow.logo_url) {
        setLogoUrl(setRow.logo_url);
      }
    } catch {}
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 4000);
    window.addEventListener('leave-system-updated', loadData);
    return () => {
      clearInterval(timer);
      window.removeEventListener('leave-system-updated', loadData);
    };
  }, []);

  const showNotice = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleUpdateStatus = async (
    reqId: string,
    newStatus: LeaveApprovalStatus
  ) => {
    const updatedList = payload.requests.map((r) =>
      r.id === reqId
        ? {
            ...r,
            status: newStatus,
            approvedByNameKm: directorNameKm.trim() || 'ប្រធានមណ្ឌល',
            updatedAt: new Date().toISOString(),
            studentRead: false
          }
        : r
    );

    const nextPayload = { requests: updatedList };
    setPayload(nextPayload);
    await saveLeavePayloadToDb(nextPayload);
    showNotice(
      newStatus === 'approved'
        ? 'បានអនុញ្ញាតច្បាប់ជូននិស្សិតរួចរាល់!'
        : 'បានបដិសេធសំណើច្បាប់រួចរាល់!'
    );
  };

  const handleDeleteRequest = async (reqId: string) => {
    if (!window.confirm('តើអ្នកពិតជាចង់លុបសំណើច្បាប់នេះមែនទេ?')) return;
    const nextPayload = {
      requests: payload.requests.filter((r) => r.id !== reqId)
    };
    setPayload(nextPayload);
    await saveLeavePayloadToDb(nextPayload);
    showNotice('បានលុបសំណើច្បាប់រួចរាល់!');
  };

  const filteredRequests = useMemo(() => {
    return payload.requests.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchCode = r.studentCode.toLowerCase().includes(q);
        const matchName = r.studentNameKm.toLowerCase().includes(q);
        if (!matchCode && !matchName) return false;
      }
      return true;
    });
  }, [payload.requests, statusFilter, searchQuery]);

  const totalCount = payload.requests.length;
  const pendingCount = payload.requests.filter((r) => r.status === 'pending').length;
  const approvedCount = payload.requests.filter((r) => r.status === 'approved').length;
  const rejectedCount = payload.requests.filter((r) => r.status === 'rejected').length;

  return (
    <div className="space-y-5 font-khmer pb-28">
      {toastMsg && (
        <div className="fixed top-20 right-4 z-[250] px-4 py-3 rounded-2xl bg-emerald-950/95 border border-emerald-500 text-emerald-300 shadow-2xl flex items-center gap-2 text-xs sm:text-sm font-black">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="bg-white dark:bg-[#162033] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <Badge className="bg-purple-600 text-white font-extrabold px-2.5 py-0.5 text-[10px] sm:text-xs">
            OFFICIAL LEAVE REQUEST & A4 PRINT CMS
          </Badge>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2 pt-1">
            <FileText className="h-6 w-6 text-purple-500 shrink-0" />
            <span>គ្រប់គ្រងសំណើច្បាប់ និងបោះពុម្ពលិខិតច្បាប់ (A4)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            ពិនិត្យសំណើសុំច្បាប់របស់និស្សិត អនុញ្ញាតច្បាប់ និងបោះពុម្ពជាទម្រង់លិខិតផ្លូវការខ្នាតក្រដាស A4
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#0f172a] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
              ឈ្មោះអ្នកអនុញ្ញាត៖
            </span>
            <Input
              value={directorNameKm}
              onChange={(e) => setDirectorNameKm(e.target.value)}
              className="h-8 w-36 text-xs font-black bg-white dark:bg-[#162033]"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-white dark:bg-[#162033] border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500">សំណើច្បាប់សរុប</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                {totalCount}
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-purple-500/15 text-purple-500 flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#162033] border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-amber-500">រង់ចាំការអនុញ្ញាត</p>
              <p className="text-2xl font-black text-amber-500 mt-0.5">{pendingCount}</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#162033] border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-500">បានអនុញ្ញាតច្បាប់</p>
              <p className="text-2xl font-black text-emerald-500 mt-0.5">{approvedCount}</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#162033] border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-rose-500">មិនអនុញ្ញាត / បដិសេធ</p>
              <p className="text-2xl font-black text-rose-500 mt-0.5">{rejectedCount}</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center">
              <XCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white dark:bg-[#162033] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-[#0f172a] p-1 rounded-xl border border-slate-200 dark:border-slate-800 w-fit">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all',
                statusFilter === 'all'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-600 dark:text-slate-300'
              )}
            >
              ទាំងអស់ ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all',
                statusFilter === 'pending'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-600 dark:text-slate-300'
              )}
            >
              រង់ចាំអនុម័ត ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('approved')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all',
                statusFilter === 'approved'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-600 dark:text-slate-300'
              )}
            >
              បានអនុញ្ញាត ({approvedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('rejected')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all',
                statusFilter === 'rejected'
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-slate-600 dark:text-slate-300'
              )}
            >
              បដិសេធ ({rejectedCount})
            </button>
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

        <div className="w-full max-h-[500px] overflow-x-auto overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 scrollbar-thin">
          <table className="w-full text-xs text-left border-collapse min-w-[1000px]">
            <thead className="sticky top-0 z-20">
              <tr className="bg-amber-400 text-slate-950 font-black">
                <th className="py-3.5 px-3 border border-amber-500/40 text-center w-12">ល.រ</th>
                <th className="py-3.5 px-3 border border-amber-500/40">អត្តលេខ (ID)</th>
                <th className="py-3.5 px-3 border border-amber-500/40">ឈ្មោះអ្នកសុំច្បាប់</th>
                <th className="py-3.5 px-3 border border-amber-500/40 text-center">
                  ឆ្នាំទី / ក្រុម
                </th>
                <th className="py-3.5 px-3 border border-amber-500/40 text-center">
                  រយៈពេលសុំ
                </th>
                <th className="py-3.5 px-3 border border-amber-500/40">មូលហេតុ</th>
                <th className="py-3.5 px-3 border border-amber-500/40">កិច្ចការផ្ទេរជូន</th>
                <th className="py-3.5 px-3 border border-amber-500/40 text-center">ស្ថានភាព</th>
                <th className="py-3.5 px-3 border border-amber-500/40 text-center">
                  ការអនុញ្ញាត & លិខិត A4
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredRequests.length > 0 ? (
                filteredRequests.map((req, idx) => (
                  <tr
                    key={req.id}
                    className="bg-white dark:bg-[#162033] hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <td className="py-3 px-3 border border-slate-200/70 dark:border-slate-800 text-center font-black">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-3 border border-slate-200/70 dark:border-slate-800 font-black text-purple-600 dark:text-purple-400 whitespace-nowrap">
                      {req.studentCode}
                    </td>
                    <td className="py-3 px-3 border border-slate-200/70 dark:border-slate-800 font-black text-blue-600 dark:text-sky-400 whitespace-nowrap">
                      {req.studentNameKm}
                    </td>
                    <td className="py-3 px-3 border border-slate-200/70 dark:border-slate-800 text-center font-bold whitespace-nowrap">
                      ឆ្នាំទី{toKhmerNum(req.studyYearKm)} • ក្រុមទី{toKhmerNum(req.groupNumberKm)}
                    </td>
                    <td className="py-3 px-3 border border-slate-200/70 dark:border-slate-800 text-center whitespace-nowrap">
                      <div className="font-black text-amber-600 dark:text-amber-400">
                        {toKhmerNum(req.durationDays)} ថ្ងៃ
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {req.startDate} ដល់ {req.endDate}
                      </div>
                    </td>
                    <td className="py-3 px-3 border border-slate-200/70 dark:border-slate-800 max-w-[220px]">
                      <p className="line-clamp-2 font-semibold text-blue-600 dark:text-sky-400">
                        {req.reasonKm}
                      </p>
                    </td>
                    <td className="py-3 px-3 border border-slate-200/70 dark:border-slate-800 font-bold text-blue-600 dark:text-sky-400 whitespace-nowrap">
                      {req.transferredDutyToKm}
                    </td>
                    <td className="py-3 px-3 border border-slate-200/70 dark:border-slate-800 text-center whitespace-nowrap">
                      {req.status === 'approved' ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-black">
                          ✓ បានអនុញ្ញាត
                        </Badge>
                      ) : req.status === 'rejected' ? (
                        <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-black">
                          ✕ បដិសេធ
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-black">
                          ⏳ រង់ចាំអនុម័ត
                        </Badge>
                      )}
                    </td>
                    <td className="py-2.5 px-3 border border-slate-200/70 dark:border-slate-800 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(req.id, 'approved')}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold shadow-xs"
                        >
                          ✓ អនុញ្ញាត
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(req.id, 'rejected')}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[11px] font-extrabold"
                        >
                          បដិសេធ
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedA4Request(req)}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-extrabold flex items-center gap-1 shadow-xs"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span>លិខិត A4</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRequest(req.id)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-bold">
                    មិនទាន់មានសំណើសុំច្បាប់នៅឡើយទេ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedA4Request && (
        <LeaveA4DocumentModal
          item={selectedA4Request}
          logoUrl={logoUrl}
          onClose={() => setSelectedA4Request(null)}
        />
      )}
    </div>
  );
}