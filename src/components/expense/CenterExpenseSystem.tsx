import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Wallet,
  Plus,
  Trash2,
  Printer,
  Search,
  Calendar,
  FileText,
  CheckCircle2,
  RefreshCw,
  Edit3,
  X,
  ArrowLeft,
  Filter,
  PieChart,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CenterExpenseItem {
  id: string;
  expense_date: string;
  category: string;
  title: string;
  quantity: string;
  amount_riel: number;
  payer_name: string;
  note: string;
  created_at?: string;
}

const EXPENSE_CACHE_KEY = 'bipa_center_expenses_cache_v1';
const CUSTOM_CATEGORIES_KEY = 'bipa_custom_expense_categories_v1';

const DEFAULT_CATEGORIES = [
  'ទិញម្ហូបប្រចាំថ្ងៃ',
  'គ្រឿងទេស',
  'បង់ភ្លើង',
  'បង់ទឹក',
  'ថ្លៃ Wi-Fi / អ៊ីនធឺណិត',
  'សម្ភារៈមណ្ឌល',
  'ជួសជុល និងថែទាំ',
  'ចំណាយផ្សេងៗ'
];

const CATEGORY_EN_MAP: Record<string, string> = {
  'ទិញម្ហូបប្រចាំថ្ងៃ': 'Daily Food',
  'គ្រឿងទេស': 'Groceries & Spices',
  'បង់ភ្លើង': 'Electricity Bill',
  'បង់ទឹក': 'Water Bill',
  'ថ្លៃ Wi-Fi / អ៊ីនធឺណិត': 'Wi-Fi / Internet',
  'សម្ភារៈមណ្ឌល': 'Center Supplies',
  'ជួសជុល និងថែទាំ': 'Maintenance & Repair',
  'ចំណាយផ្សេងៗ': 'Other Expenses'
};

const CHART_COLORS = [
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#ec4899',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#f43f5e'
];

const MONTHS_DATA = [
  { num: '01', km: 'មករា', en: 'Jan' },
  { num: '02', km: 'កុម្ភៈ', en: 'Feb' },
  { num: '03', km: 'មីនា', en: 'Mar' },
  { num: '04', km: 'មេសា', en: 'Apr' },
  { num: '05', km: 'ឧសភា', en: 'May' },
  { num: '06', km: 'មិថុនា', en: 'Jun' },
  { num: '07', km: 'កក្កដា', en: 'Jul' },
  { num: '08', km: 'សីហា', en: 'Aug' },
  { num: '09', km: 'កញ្ញា', en: 'Sep' },
  { num: '10', km: 'តុលា', en: 'Oct' },
  { num: '11', km: 'វិច្ឆិកា', en: 'Nov' },
  { num: '12', km: 'ធ្នូ', en: 'Dec' }
];

export function formatRielCurrency(amount: number): string {
  const num = Number(amount || 0);
  return `${num.toLocaleString('en-US')} ៛`;
}

function formatCompactRiel(amount: number): string {
  const num = Number(amount || 0);
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M ៛`;
  if (num >= 1000) return `${Math.round(num / 1000)}k ៛`;
  return `${num} ៛`;
}

function getTodayIsoString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function loadCachedExpenses(): CenterExpenseItem[] {
  try {
    const raw = localStorage.getItem(EXPENSE_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCachedExpenses(list: CenterExpenseItem[]) {
  try {
    localStorage.setItem(EXPENSE_CACHE_KEY, JSON.stringify(list));
  } catch {}
}

function loadCustomCategories(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOM_CATEGORIES_KEY);
    if (!raw) return DEFAULT_CATEGORIES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return Array.from(new Set([...DEFAULT_CATEGORIES, ...parsed]));
    }
  } catch {}
  return DEFAULT_CATEGORIES;
}

export function CenterExpenseAdminDashboard() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { lang } = useI18n();
  const isKh = lang === 'km';
  const isAdmin = hasRole('super_admin', 'residence_admin', 'finance_admin', 'duty_manager');

  const todayStr = getTodayIsoString();
  const currentYear = todayStr.slice(0, 4);
  const currentMonth = todayStr.slice(5, 7);

  const [expenses, setExpenses] = useState<CenterExpenseItem[]>(() => loadCachedExpenses());
  const [categories, setCategories] = useState<string[]>(() => loadCustomCategories());
  const logoUrl = 'https://i.ibb.co/KpKL2rSC/864a542d-a47f-48b2-8481-68f39c87138b.png';
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formDate, setFormDate] = useState(todayStr);
  const [formCategory, setFormCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [showNewCategoryBox, setShowNewCategoryBox] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formQuantity, setFormQuantity] = useState('1');
  const [formAmount, setFormAmount] = useState('');
  const [formPayer, setFormPayer] = useState('រដ្ឋបាលមណ្ឌល');
  const [formNote, setFormNote] = useState('');

  const [filterYear, setFilterYear] = useState<string>(currentYear);
  const [filterMonth, setFilterMonth] = useState<string>(currentMonth);
  const [filterDay, setFilterDay] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [singleInvoiceItem, setSingleInvoiceItem] = useState<CenterExpenseItem | null>(null);

  const translateCategory = (catKm: string) => {
    if (isKh) return catKm;
    return CATEGORY_EN_MAP[catKm] || catKm;
  };

  const notify = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? '' : prev));
    }, 3000);
  };

  let lastExpenseCloudFetchTime = 0;

  const syncBackupToSettings = async (_list: CenterExpenseItem[], cats: string[]) => {
    try {
      await supabase.from('bipa_settings').upsert(
        {
          id: 'center_expenses_v1',
          logo_url: 'CENTER_EXPENSES',
          name_km: 'ប្រភេទការចំណាយមណ្ឌល',
          name_en: JSON.stringify({
            categories: cats,
            updatedAt: Date.now()
          })
        },
        { onConflict: 'id' }
      );
    } catch {}
  };

  const fetchExpensesFromCloud = async (forceRefresh = false) => {
    const now = Date.now();
    const cachedList = loadCachedExpenses();
    if (!forceRefresh && cachedList.length > 0 && now - lastExpenseCloudFetchTime < 60000) {
      setExpenses(cachedList);
      return;
    }

    setLoading(true);
    lastExpenseCloudFetchTime = now;

    try {
      const { data, error } = await supabase
        .from('bipa_expenses')
        .select('id, expense_date, category, title, quantity, amount_riel, payer_name, note, created_at')
        .order('expense_date', { ascending: false })
        .limit(500);

      if (!error && Array.isArray(data)) {
        const formatted: CenterExpenseItem[] = data.map((r: any) => ({
          id: String(r.id),
          expense_date: String(r.expense_date || todayStr).slice(0, 10),
          category: String(r.category || 'ចំណាយផ្សេងៗ'),
          title: String(r.title || ''),
          quantity: String(r.quantity || '1'),
          amount_riel: Number(r.amount_riel || 0),
          payer_name: String(r.payer_name || 'រដ្ឋបាលមណ្ឌល'),
          note: String(r.note || ''),
          created_at: r.created_at
        }));
        setExpenses(formatted);
        saveCachedExpenses(formatted);
      }
    } catch {}

    try {
      const { data: settingRow } = await supabase
        .from('bipa_settings')
        .select('name_en')
        .eq('id', 'center_expenses_v1')
        .maybeSingle();

      if (settingRow?.name_en) {
        const parsed = JSON.parse(settingRow.name_en);
        if (Array.isArray(parsed?.categories)) {
          const mergedCats = Array.from(
            new Set([...DEFAULT_CATEGORIES, ...parsed.categories])
          );
          setCategories(mergedCats);
          localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(mergedCats));
        }
      }
    } catch {}

    setLoading(false);
    if (forceRefresh) {
      notify(isKh ? 'បានធ្វើបច្ចុប្បន្នភាពទិន្នន័យរួចរាល់!' : 'Expenses synced successfully!');
    }
  };

  useEffect(() => {
    fetchExpensesFromCloud(false);
  }, []);

  const handleAddCustomCategory = () => {
    const clean = customCategoryInput.trim();
    if (!clean) return;
    const nextCats = Array.from(new Set([...categories, clean]));
    setCategories(nextCats);
    setFormCategory(clean);
    setCustomCategoryInput('');
    setShowNewCategoryBox(false);
    localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(nextCats));
    syncBackupToSettings(expenses, nextCats);
    notify(isKh ? `បានបន្ថែមប្រភេទ «${clean}»!` : `Added category "${clean}"!`);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormDate(todayStr);
    setFormTitle('');
    setFormQuantity('1');
    setFormAmount('');
    setFormPayer('រដ្ឋបាលមណ្ឌល');
    setFormNote('');
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = formTitle.trim();
    const numericAmount = Number(String(formAmount).replace(/,/g, '').trim());

    if (!cleanTitle || !numericAmount || numericAmount <= 0) {
      notify(
        isKh
          ? 'សូមបញ្ចូលឈ្មោះមុខទំនិញ និងទឹកប្រាក់ឱ្យបានត្រឹមត្រូវ!'
          : 'Please enter item description and valid amount!'
      );
      return;
    }

    const activeCategory =
      showNewCategoryBox && customCategoryInput.trim()
        ? customCategoryInput.trim()
        : formCategory;

    let updatedCategories = categories;
    if (!categories.includes(activeCategory)) {
      updatedCategories = [...categories, activeCategory];
      setCategories(updatedCategories);
      localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(updatedCategories));
    }

    if (editingId) {
      const updatedItem: CenterExpenseItem = {
        id: editingId,
        expense_date: formDate,
        category: activeCategory,
        title: cleanTitle,
        quantity: formQuantity.trim() || '1',
        amount_riel: numericAmount,
        payer_name: formPayer.trim() || 'រដ្ឋបាលមណ្ឌល',
        note: formNote.trim()
      };

      const nextList = expenses.map((item) =>
        item.id === editingId ? updatedItem : item
      );
      setExpenses(nextList);
      saveCachedExpenses(nextList);

      try {
        await supabase
          .from('bipa_expenses')
          .update({
            expense_date: updatedItem.expense_date,
            category: updatedItem.category,
            title: updatedItem.title,
            quantity: updatedItem.quantity,
            amount_riel: updatedItem.amount_riel,
            payer_name: updatedItem.payer_name,
            note: updatedItem.note
          })
          .eq('id', editingId);
      } catch {}

      await syncBackupToSettings(nextList, updatedCategories);
      resetForm();
      notify(isKh ? 'បានកែប្រែការចំណាយដោយជោគជ័យ!' : 'Expense updated successfully!');
      return;
    }

    const newId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `exp-${Date.now()}`;

    const newItem: CenterExpenseItem = {
      id: newId,
      expense_date: formDate,
      category: activeCategory,
      title: cleanTitle,
      quantity: formQuantity.trim() || '1',
      amount_riel: numericAmount,
      payer_name: formPayer.trim() || 'រដ្ឋបាលមណ្ឌល',
      note: formNote.trim(),
      created_at: new Date().toISOString()
    };

    const nextList = [newItem, ...expenses].sort((a, b) =>
      b.expense_date.localeCompare(a.expense_date)
    );
    setExpenses(nextList);
    saveCachedExpenses(nextList);

    try {
      await supabase.from('bipa_expenses').insert([
        {
          id: newItem.id,
          expense_date: newItem.expense_date,
          category: newItem.category,
          title: newItem.title,
          quantity: newItem.quantity,
          amount_riel: newItem.amount_riel,
          payer_name: newItem.payer_name,
          note: newItem.note
        }
      ]);
    } catch {}

    await syncBackupToSettings(nextList, updatedCategories);
    resetForm();
    notify(
      isKh
        ? `បានបន្ថែម «${cleanTitle}» (${formatRielCurrency(numericAmount)})!`
        : `Added "${cleanTitle}" (${formatRielCurrency(numericAmount)})!`
    );
  };

  const handleStartEdit = (item: CenterExpenseItem) => {
    setEditingId(item.id);
    setFormDate(item.expense_date);
    setFormCategory(item.category);
    setFormTitle(item.title);
    setFormQuantity(item.quantity);
    setFormAmount(String(item.amount_riel));
    setFormPayer(item.payer_name);
    setFormNote(item.note);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteExpense = async (item: CenterExpenseItem) => {
    const confirmMsg = isKh
      ? `លុបការចំណាយ «${item.title} (${formatRielCurrency(item.amount_riel)})» មែនទេ?`
      : `Delete expense "${item.title} (${formatRielCurrency(item.amount_riel)})"?`;
    if (!window.confirm(confirmMsg)) return;

    const nextList = expenses.filter((r) => r.id !== item.id);
    setExpenses(nextList);
    saveCachedExpenses(nextList);

    try {
      await supabase.from('bipa_expenses').delete().eq('id', item.id);
    } catch {}

    await syncBackupToSettings(nextList, categories);
    notify(isKh ? `បានលុប «${item.title}» រួចរាល់!` : `Deleted "${item.title}"!`);
  };

  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>([currentYear, '2025', '2026', '2027']);
    expenses.forEach((e) => {
      const y = e.expense_date.slice(0, 4);
      if (y) yearsSet.add(y);
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [expenses, currentYear]);

  const summaryMetrics = useMemo(() => {
    const targetDayDate =
      filterDay !== 'ALL' && filterYear !== 'ALL' && filterMonth !== 'ALL'
        ? `${filterYear}-${filterMonth}-${filterDay}`
        : todayStr;

    const targetMonthPrefix =
      filterYear !== 'ALL' && filterMonth !== 'ALL'
        ? `${filterYear}-${filterMonth}`
        : todayStr.slice(0, 7);

    const targetYearPrefix = filterYear !== 'ALL' ? filterYear : currentYear;

    let dailyTotal = 0;
    let monthlyTotal = 0;
    let yearlyTotal = 0;

    expenses.forEach((e) => {
      const amt = Number(e.amount_riel || 0);
      if (e.expense_date === targetDayDate) dailyTotal += amt;
      if (e.expense_date.startsWith(targetMonthPrefix)) monthlyTotal += amt;
      if (e.expense_date.startsWith(targetYearPrefix)) yearlyTotal += amt;
    });

    return {
      dailyTotal,
      monthlyTotal,
      yearlyTotal,
      targetDayDate,
      targetMonthPrefix,
      targetYearPrefix
    };
  }, [expenses, filterYear, filterMonth, filterDay, todayStr, currentYear]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((item) => {
      const [y, m, d] = item.expense_date.split('-');
      if (filterYear !== 'ALL' && y !== filterYear) return false;
      if (filterMonth !== 'ALL' && m !== filterMonth) return false;
      if (filterDay !== 'ALL' && d !== filterDay) return false;
      if (filterCategory !== 'ALL' && item.category !== filterCategory) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchCat = item.category.toLowerCase().includes(q);
        const matchPayer = item.payer_name.toLowerCase().includes(q);
        const matchNote = (item.note || '').toLowerCase().includes(q);
        if (!matchTitle && !matchCat && !matchPayer && !matchNote) return false;
      }
      return true;
    });
  }, [expenses, filterYear, filterMonth, filterDay, filterCategory, searchQuery]);

  const filteredTotalRiel = useMemo(() => {
    return filteredExpenses.reduce((sum, item) => sum + Number(item.amount_riel || 0), 0);
  }, [filteredExpenses]);

  const categoryChartData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach((item) => {
      map[item.category] = (map[item.category] || 0) + Number(item.amount_riel || 0);
    });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((acc, [, v]) => acc + v, 0) || 1;

    let cumulativePercent = 0;
    return sorted.map(([cat, amount], index) => {
      const percent = (amount / total) * 100;
      const startOffset = cumulativePercent;
      cumulativePercent += percent;
      return {
        category: cat,
        amount,
        percent,
        startOffset,
        color: CHART_COLORS[index % CHART_COLORS.length]
      };
    });
  }, [filteredExpenses]);

  const monthlyTrendData = useMemo(() => {
    const activeYear = filterYear === 'ALL' ? currentYear : filterYear;
    const totalsByMonth: Record<string, number> = {};
    MONTHS_DATA.forEach((m) => {
      totalsByMonth[m.num] = 0;
    });

    expenses.forEach((item) => {
      if (item.expense_date.startsWith(activeYear)) {
        if (filterCategory === 'ALL' || item.category === filterCategory) {
          const m = item.expense_date.slice(5, 7);
          if (totalsByMonth[m] !== undefined) {
            totalsByMonth[m] += Number(item.amount_riel || 0);
          }
        }
      }
    });

    const values = MONTHS_DATA.map((m) => totalsByMonth[m.num]);
    const maxVal = Math.max(...values, 1);

    return {
      activeYear,
      maxVal,
      months: MONTHS_DATA.map((m) => ({
        ...m,
        amount: totalsByMonth[m.num],
        heightPercent: Math.round((totalsByMonth[m.num] / maxVal) * 100)
      }))
    };
  }, [expenses, filterYear, filterCategory, currentYear]);

  const getFilterPeriodLabel = () => {
    const yLabel =
      filterYear === 'ALL'
        ? isKh
          ? 'គ្រប់ឆ្នាំ'
          : 'All Years'
        : isKh
        ? `ឆ្នាំ ${filterYear}`
        : `Year ${filterYear}`;
    const mObj = MONTHS_DATA.find((m) => m.num === filterMonth);
    const mLabel =
      filterMonth === 'ALL'
        ? isKh
          ? 'គ្រប់ខែ'
          : 'All Months'
        : isKh
        ? `ខែ${mObj?.km || filterMonth}`
        : mObj?.en || filterMonth;
    const dLabel =
      filterDay === 'ALL'
        ? ''
        : isKh
        ? `ថ្ងៃទី ${filterDay}`
        : `Day ${filterDay}`;
    const cLabel =
      filterCategory === 'ALL'
        ? ''
        : ` • ${translateCategory(filterCategory)}`;
    return `${dLabel} ${mLabel} ${yLabel}${cLabel}`.trim();
  };

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto mt-10 bg-white dark:bg-[#162033] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-center space-y-3 font-khmer">
        <p className="text-sm text-rose-500 font-bold">
          {isKh
            ? 'មុខងារនេះសម្រាប់តែអ្នកគ្រប់គ្រង (Admin Dashboard) ប៉ុណ្ណោះ!'
            : 'This feature is restricted to Administrators only!'}
        </p>
        <Button onClick={() => navigate('/')} className="bg-blue-600 text-white text-xs rounded-xl">
          {isKh ? 'ត្រឡប់ទៅទំព័រដើម' : 'Back to Home'}
        </Button>
      </div>
    );
  }

  const invoiceItemsToPrint = singleInvoiceItem ? [singleInvoiceItem] : filteredExpenses;
  const invoiceTotalRiel = singleInvoiceItem
    ? Number(singleInvoiceItem.amount_riel || 0)
    : filteredTotalRiel;

  const svgPoints = monthlyTrendData.months
    .map((m, idx) => {
      const x = Math.round((idx / 11) * 560 + 20);
      const y = Math.round(135 - (m.amount / monthlyTrendData.maxVal) * 105);
      return { x, y, ...m };
    });

  const polylineStr = svgPoints.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPathStr = `M ${svgPoints[0].x},140 L ${svgPoints
    .map((p) => `${p.x},${p.y}`)
    .join(' L ')} L ${svgPoints[svgPoints.length - 1].x},140 Z`;

  return (
    <div className="max-w-7xl mx-auto space-y-4 font-khmer pb-24 text-slate-900 dark:text-white">
      <style>{`
        #bipa-expense-print-portal {
          display: none;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          html, body {
            background: #ffffff !important;
            background-color: #ffffff !important;
            color: #0f172a !important;
            height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body > *:not(#bipa-expense-print-portal) {
            display: none !important;
          }
          #bipa-expense-print-portal {
            display: block !important;
            width: 100% !important;
            background: #ffffff !important;
            font-family: 'Siemreap', sans-serif !important;
          }
        }
      `}</style>

      {toastMsg && (
        <div className="fixed top-20 right-4 z-[260] px-4 py-3 rounded-2xl bg-emerald-950/95 border border-emerald-400 text-emerald-200 shadow-2xl flex items-center gap-2 text-xs font-bold animate-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="bg-white dark:bg-[#162033] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#0f172a] hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700 shrink-0 transition-all active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="font-moul-kh text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Wallet className="h-5 w-5 text-amber-500 shrink-0" />
              <span>
                {isKh
                  ? 'ការចំណាយមណ្ឌល (ប្រចាំថ្ងៃ ខែ ឆ្នាំ)'
                  : 'Center Expenses (Daily, Monthly, Yearly)'}
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {isKh
                ? 'គ្រប់គ្រងថ្លៃទឹក ភ្លើង ម្ហូបអាហារ សម្ភារៈ វិភាគក្រាប និងបោះពុម្ពវិក្កយបត្រ'
                : 'Manage utilities, daily food, supplies, chart analytics & print invoices'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => {
              setSingleInvoiceItem(null);
              setShowInvoiceModal(true);
            }}
            className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs h-9 px-3.5 rounded-xl shadow-xs"
          >
            <Printer className="h-3.5 w-3.5 mr-1.5" />
            {isKh
              ? `វិក្កយបត្រ (${filteredExpenses.length})`
              : `Invoice (${filteredExpenses.length})`}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => fetchExpensesFromCloud(true)}
            disabled={loading}
            className="rounded-xl border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs h-9 px-3"
          >
            <RefreshCw
              className={cn('h-3.5 w-3.5 mr-1.5 text-amber-500', loading && 'animate-spin')}
            />
            Sync
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#162033] border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {isKh
                ? `ចំណាយថ្ងៃ (${summaryMetrics.targetDayDate})`
                : `Daily (${summaryMetrics.targetDayDate})`}
            </span>
            <Calendar className="h-4 w-4 text-sky-400" />
          </div>
          <p className="text-sm sm:text-base font-black text-sky-500">
            {formatRielCurrency(summaryMetrics.dailyTotal)}
          </p>
        </div>

        <div className="bg-white dark:bg-[#162033] border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {isKh
                ? `ចំណាយខែ (${summaryMetrics.targetMonthPrefix})`
                : `Monthly (${summaryMetrics.targetMonthPrefix})`}
            </span>
            <Wallet className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-sm sm:text-base font-black text-emerald-500">
            {formatRielCurrency(summaryMetrics.monthlyTotal)}
          </p>
        </div>

        <div className="bg-white dark:bg-[#162033] border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {isKh
                ? `ចំណាយឆ្នាំ (${summaryMetrics.targetYearPrefix})`
                : `Yearly (${summaryMetrics.targetYearPrefix})`}
            </span>
            <FileText className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-sm sm:text-base font-black text-amber-500">
            {formatRielCurrency(summaryMetrics.yearlyTotal)}
          </p>
        </div>

        <div className="bg-white dark:bg-[#162033] border border-amber-500/40 rounded-2xl p-3.5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-amber-600 dark:text-amber-300 font-bold">
              {isKh
                ? `សរុបតាមតម្រង (${filteredExpenses.length})`
                : `Filtered Total (${filteredExpenses.length})`}
            </span>
            <Printer className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-sm sm:text-base font-black text-rose-500 dark:text-rose-400">
            {formatRielCurrency(filteredTotalRiel)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#162033] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="h-4 w-4 text-sky-400" />
              <h3 className="font-moul-kh text-xs sm:text-sm text-slate-900 dark:text-white">
                {isKh ? 'ស្ថិតិចំណាយតាមប្រភេទ' : 'Expenses by Category'}
              </h3>
            </div>
            <Badge className="bg-sky-500/15 text-sky-600 dark:text-sky-300 border border-sky-500/30 text-[10.5px]">
              {getFilterPeriodLabel()}
            </Badge>
          </div>

          {categoryChartData.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-xs text-slate-400">
              {isKh ? 'មិនទាន់មានទិន្នន័យសម្រាប់បង្ហាញក្រាប' : 'No expense data to display'}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 42 42" className="w-full h-full -rotate-90">
                  <circle
                    cx="21"
                    cy="21"
                    r="15.91549430918954"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="5.5"
                    className="text-slate-100 dark:text-slate-800"
                  />
                  {categoryChartData.map((seg) => (
                    <circle
                      key={seg.category}
                      cx="21"
                      cy="21"
                      r="15.91549430918954"
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth="5.5"
                      strokeDasharray={`${Math.max(seg.percent - 0.8, 0.5)} ${
                        100 - Math.max(seg.percent - 0.8, 0.5)
                      }`}
                      strokeDashoffset={-seg.startOffset}
                      strokeLinecap="round"
                      className="transition-all duration-500 cursor-pointer hover:opacity-80"
                      onClick={() =>
                        setFilterCategory((prev) =>
                          prev === seg.category ? 'ALL' : seg.category
                        )
                      }
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2 pointer-events-none">
                  <span className="text-[10px] text-slate-400">
                    {isKh ? 'សរុប' : 'Total'}
                  </span>
                  <span className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                    {formatCompactRiel(filteredTotalRiel)}
                  </span>
                  <span className="text-[10px] text-amber-500 font-bold">
                    {filteredExpenses.length} {isKh ? 'ខ្ទង់' : 'items'}
                  </span>
                </div>
              </div>

              <div className="flex-1 w-full max-h-44 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {categoryChartData.map((seg) => {
                  const isSelected = filterCategory === seg.category;
                  return (
                    <button
                      key={seg.category}
                      type="button"
                      onClick={() =>
                        setFilterCategory((prev) =>
                          prev === seg.category ? 'ALL' : seg.category
                        )
                      }
                      className={cn(
                        'w-full flex items-center justify-between p-2 rounded-xl border text-xs transition-all',
                        isSelected
                          ? 'bg-amber-400/15 border-amber-400 text-slate-900 dark:text-white'
                          : 'bg-slate-50 dark:bg-[#0f172a]/80 border-slate-200/70 dark:border-slate-800/80 hover:border-slate-400'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: seg.color }}
                        />
                        <span className="truncate font-bold text-slate-700 dark:text-slate-200">
                          {translateCategory(seg.category)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10.5px] text-slate-400">
                          {seg.percent.toFixed(1)}%
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-slate-200/70 dark:bg-slate-800 text-slate-800 dark:text-amber-300 font-bold text-[11px]">
                          {formatRielCurrency(seg.amount)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-[#162033] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <h3 className="font-moul-kh text-xs sm:text-sm text-slate-900 dark:text-white">
                {isKh
                  ? `ក្រាបការចំណាយប្រចាំខែ (${monthlyTrendData.activeYear})`
                  : `Monthly Expense Trend (${monthlyTrendData.activeYear})`}
              </h3>
            </div>
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 text-[10.5px]">
              {isKh ? '១២ ខែ' : '12 Months'}
            </Badge>
          </div>

          <div className="relative w-full pt-2">
            <svg viewBox="0 0 600 165" className="w-full h-40 overflow-visible">
              <defs>
                <linearGradient id="bipaExpenseAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {[30, 65, 100, 135].map((yLine) => (
                <line
                  key={yLine}
                  x1="15"
                  y1={yLine}
                  x2="585"
                  y2={yLine}
                  stroke="currentColor"
                  strokeDasharray="3 3"
                  className="text-slate-200 dark:text-slate-800"
                  strokeWidth="1"
                />
              ))}

              <path d={areaPathStr} fill="url(#bipaExpenseAreaGrad)" />

              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={polylineStr}
              />

              {svgPoints.map((pt) => {
                const isSelectedMonth = filterMonth === pt.num;
                return (
                  <g
                    key={pt.num}
                    className="cursor-pointer group"
                    onClick={() =>
                      setFilterMonth((prev) => (prev === pt.num ? 'ALL' : pt.num))
                    }
                  >
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelectedMonth ? 6 : 4.5}
                      fill={isSelectedMonth ? '#f59e0b' : '#10b981'}
                      stroke="#0f172a"
                      strokeWidth="2"
                    />
                    {pt.amount > 0 && (
                      <text
                        x={pt.x}
                        y={Math.max(14, pt.y - 9)}
                        textAnchor="middle"
                        className="text-[9.5px] fill-slate-600 dark:fill-emerald-300 font-bold"
                      >
                        {formatCompactRiel(pt.amount)}
                      </text>
                    )}
                    <text
                      x={pt.x}
                      y="156"
                      textAnchor="middle"
                      className={cn(
                        'text-[10px] font-bold',
                        isSelectedMonth
                          ? 'fill-amber-500'
                          : 'fill-slate-500 dark:fill-slate-400'
                      )}
                    >
                      {isKh ? pt.km : pt.en}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSaveExpense}
        className="bg-white dark:bg-[#162033] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3.5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {editingId ? (
              <>
                <Edit3 className="h-4 w-4 text-amber-400" />
                <span>{isKh ? 'កែប្រែទិន្នន័យចំណាយ' : 'Edit Expense Record'}</span>
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 text-emerald-400" />
                <span>{isKh ? 'កត់ត្រាការចំណាយថ្មី' : 'Add New Expense'}</span>
              </>
            )}
          </h2>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-rose-400 hover:underline flex items-center gap-1"
            >
              <X className="h-3.5 w-3.5" />
              <span>{isKh ? 'បោះបង់ការកែ' : 'Cancel Edit'}</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          <div className="space-y-1">
            <label className="text-[11px] text-slate-500 dark:text-slate-400 block">
              {isKh ? 'កាលបរិច្ឆេទ' : 'Date'}
            </label>
            <Input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="h-9 rounded-xl bg-slate-50 dark:bg-[#0f172a] text-xs"
              required
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] text-slate-500 dark:text-slate-400">
                {isKh ? 'ប្រភេទចំណាយ' : 'Category'}
              </label>
              <button
                type="button"
                onClick={() => setShowNewCategoryBox((p) => !p)}
                className="text-[10px] text-amber-500 hover:underline font-bold"
              >
                {showNewCategoryBox
                  ? isKh
                    ? 'ជ្រើសរើសមានស្រាប់'
                    : 'Select Existing'
                  : isKh
                  ? '+ បន្ថែមប្រភេទថ្មី'
                  : '+ New Category'}
              </button>
            </div>

            {showNewCategoryBox ? (
              <div className="flex gap-1.5">
                <Input
                  value={customCategoryInput}
                  onChange={(e) => setCustomCategoryInput(e.target.value)}
                  placeholder={isKh ? 'វាយប្រភេទថ្មី...' : 'New category...'}
                  className="h-9 rounded-xl bg-slate-50 dark:bg-[#0f172a] text-xs"
                />
                <Button
                  type="button"
                  onClick={handleAddCustomCategory}
                  className="h-9 px-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shrink-0"
                >
                  {isKh ? 'ដាក់' : 'Add'}
                </Button>
              </div>
            ) : (
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full h-9 rounded-xl px-2.5 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {translateCategory(cat)}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-1 lg:col-span-2">
            <label className="text-[11px] text-slate-500 dark:text-slate-400 block">
              {isKh ? 'បរិយាយមុខទំនិញ / សេវាកម្ម' : 'Item / Service Description'}
            </label>
            <Input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder={
                isKh
                  ? 'ឧ. ទិញត្រី សាច់ បន្លែ / បង់ភ្លើងខែ១១...'
                  : 'e.g. Daily vegetables & meat / Electricity...'
              }
              className="h-9 rounded-xl bg-slate-50 dark:bg-[#0f172a] text-xs"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-slate-500 dark:text-slate-400 block">
              {isKh ? 'បរិមាណ / ចំនួន' : 'Quantity'}
            </label>
            <Input
              value={formQuantity}
              onChange={(e) => setFormQuantity(e.target.value)}
              placeholder={isKh ? 'ឧ. 1 ខែ / 5 គីឡូ' : 'e.g. 1 mo / 5 kg'}
              className="h-9 rounded-xl bg-slate-50 dark:bg-[#0f172a] text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-slate-500 dark:text-slate-400 block">
              {isKh ? 'ទឹកប្រាក់សរុប (រៀល ៛)' : 'Amount (KHR ៛)'}
            </label>
            <Input
              type="number"
              min="0"
              step="100"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              placeholder="50000"
              className="h-9 rounded-xl bg-slate-50 dark:bg-[#0f172a] text-xs font-bold text-amber-500"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          <Input
            value={formPayer}
            onChange={(e) => setFormPayer(e.target.value)}
            placeholder={isKh ? 'អ្នកទូទាត់ (ឧ. រដ្ឋបាលមណ្ឌល)' : 'Paid by (e.g. Center Admin)'}
            className="h-9 rounded-xl bg-slate-50 dark:bg-[#0f172a] text-xs"
          />
          <Input
            value={formNote}
            onChange={(e) => setFormNote(e.target.value)}
            placeholder={isKh ? 'កំណត់សម្គាល់បន្ថែម (បើមាន)...' : 'Additional notes (optional)...'}
            className="h-9 rounded-xl bg-slate-50 dark:bg-[#0f172a] text-xs"
          />
          <Button
            type="submit"
            className={cn(
              'h-9 rounded-xl text-xs font-bold shadow-md',
              editingId
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            )}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            {editingId
              ? isKh
                ? 'រក្សាទុកការកែប្រែ'
                : 'Save Changes'
              : isKh
              ? 'បញ្ចូលក្នុងបញ្ជីចំណាយ'
              : 'Add Expense'}
          </Button>
        </div>
      </form>

      <div className="bg-white dark:bg-[#162033] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 mr-1">
              <Filter className="h-3.5 w-3.5 text-amber-400" />
              <span>{isKh ? 'តម្រង៖' : 'Filter:'}</span>
            </div>

            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="h-8 rounded-xl px-2.5 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 text-xs outline-none"
            >
              <option value="ALL">{isKh ? 'គ្រប់ឆ្នាំ' : 'All Years'}</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {isKh ? `ឆ្នាំ ${y}` : `Year ${y}`}
                </option>
              ))}
            </select>

            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="h-8 rounded-xl px-2.5 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 text-xs outline-none"
            >
              <option value="ALL">{isKh ? 'គ្រប់ខែ' : 'All Months'}</option>
              {MONTHS_DATA.map((m) => (
                <option key={m.num} value={m.num}>
                  {isKh ? `ខែ${m.km} (${m.num})` : `${m.en} (${m.num})`}
                </option>
              ))}
            </select>

            <select
              value={filterDay}
              onChange={(e) => setFilterDay(e.target.value)}
              className="h-8 rounded-xl px-2.5 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 text-xs outline-none"
            >
              <option value="ALL">{isKh ? 'គ្រប់ថ្ងៃ' : 'All Days'}</option>
              {Array.from({ length: 31 }, (_, i) =>
                String(i + 1).padStart(2, '0')
              ).map((d) => (
                <option key={d} value={d}>
                  {isKh ? `ថ្ងៃទី ${d}` : `Day ${d}`}
                </option>
              ))}
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="h-8 rounded-xl px-2.5 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 text-xs outline-none"
            >
              <option value="ALL">{isKh ? 'គ្រប់ប្រភេទចំណាយ' : 'All Categories'}</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {translateCategory(cat)}
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full lg:w-64">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isKh ? 'ស្វែងរកមុខទំនិញ ឬប្រភេទ...' : 'Search expenses...'}
              className="pl-8 h-8 rounded-xl bg-slate-50 dark:bg-[#0f172a] text-xs"
            />
          </div>
        </div>

        <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-xs text-left border-collapse min-w-[860px]">
            <thead>
              <tr className="bg-amber-400 text-slate-950 font-bold">
                <th className="py-2.5 px-3 border border-amber-500/40 text-center w-12">
                  {isKh ? 'ល.រ' : 'No.'}
                </th>
                <th className="py-2.5 px-3 border border-amber-500/40">
                  {isKh ? 'កាលបរិច្ឆេទ' : 'Date'}
                </th>
                <th className="py-2.5 px-3 border border-amber-500/40">
                  {isKh ? 'ប្រភេទចំណាយ' : 'Category'}
                </th>
                <th className="py-2.5 px-3 border border-amber-500/40">
                  {isKh ? 'បរិយាយមុខទំនិញ' : 'Description'}
                </th>
                <th className="py-2.5 px-3 border border-amber-500/40 text-center">
                  {isKh ? 'បរិមាណ' : 'Qty'}
                </th>
                <th className="py-2.5 px-3 border border-amber-500/40 text-right">
                  {isKh ? 'ទឹកប្រាក់ (៛)' : 'Amount (៛)'}
                </th>
                <th className="py-2.5 px-3 border border-amber-500/40">
                  {isKh ? 'អ្នកទូទាត់' : 'Paid By'}
                </th>
                <th className="py-2.5 px-3 border border-amber-500/40 text-center">
                  {isKh ? 'សកម្មភាព' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    {isKh
                      ? 'មិនទាន់មានទិន្នន័យចំណាយក្នុងកាលបរិច្ឆេទនេះនៅឡើយទេ'
                      : 'No expense records found for this period'}
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="bg-white dark:bg-[#162033] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-2.5 px-3 border border-slate-200/70 dark:border-slate-800 text-center">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 border border-slate-200/70 dark:border-slate-800 whitespace-nowrap font-mono text-[11px] text-sky-600 dark:text-sky-300">
                      {item.expense_date}
                    </td>
                    <td className="py-2.5 px-3 border border-slate-200/70 dark:border-slate-800">
                      <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-500/30 text-[10.5px]">
                        {translateCategory(item.category)}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 border border-slate-200/70 dark:border-slate-800">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {item.title}
                      </div>
                      {item.note && (
                        <div className="text-[10.5px] text-slate-400">{item.note}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 border border-slate-200/70 dark:border-slate-800 text-center">
                      {item.quantity}
                    </td>
                    <td className="py-2.5 px-3 border border-slate-200/70 dark:border-slate-800 text-right font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                      {formatRielCurrency(item.amount_riel)}
                    </td>
                    <td className="py-2.5 px-3 border border-slate-200/70 dark:border-slate-800">
                      {item.payer_name}
                    </td>
                    <td className="py-2.5 px-3 border border-slate-200/70 dark:border-slate-800 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSingleInvoiceItem(item);
                            setShowInvoiceModal(true);
                          }}
                          className="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-[10px] flex items-center gap-1"
                        >
                          <Printer className="h-3 w-3" />
                          <span>{isKh ? 'វិក្កយបត្រ' : 'Receipt'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          className="p-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-500"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(item)}
                          className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredExpenses.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 dark:bg-[#0f172a] font-bold">
                  <td colSpan={5} className="py-3 px-4 text-right text-slate-700 dark:text-slate-200">
                    {isKh
                      ? `សរុបទឹកប្រាក់ចំណាយទាំងអស់ (${getFilterPeriodLabel()})៖`
                      : `Total Expenses (${getFilterPeriodLabel()}):`}
                  </td>
                  <td className="py-3 px-3 text-right text-sm font-black text-rose-600 dark:text-amber-400 whitespace-nowrap">
                    {formatRielCurrency(filteredTotalRiel)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {showInvoiceModal && (
        <div
          onClick={() => setShowInvoiceModal(false)}
          className="fixed inset-0 z-[250] bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 font-khmer animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl max-h-[92dvh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-700"
          >
            <div className="p-4 bg-[#0f172a] border-b border-slate-800 text-white flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <Printer className="h-4 w-4 text-amber-400" />
                <span className="font-moul-kh text-xs">
                  {isKh
                    ? 'វិក្កយបត្រចំណាយមណ្ឌលនិស្សិត BIPA'
                    : 'BIPA Center Expense Invoice'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs h-8 px-4 rounded-xl"
                >
                  <Printer className="h-3.5 w-3.5 mr-1.5" />
                  {isKh ? 'បោះពុម្ពវិក្កយបត្រ (Print)' : 'Print Invoice'}
                </Button>
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto bg-slate-800/70 flex-1">
              <div className="bg-white text-slate-900 rounded-2xl p-6 shadow-xl max-w-[210mm] mx-auto space-y-5">
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={logoUrl}
                      alt="BIPA"
                      className="w-14 h-14 rounded-full object-contain border border-slate-300 p-0.5"
                    />
                    <div>
                      <h2 className="font-moul-kh text-sm sm:text-base text-slate-900">
                        សមាគមជនជាតិដើមភាគតិចព្នង (BIPA)
                      </h2>
                      <p className="text-xs text-slate-600 font-bold mt-0.5">
                        វិក្កយបត្ររបាយការណ៍ចំណាយមណ្ឌលនិស្សិត
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-xs space-y-0.5">
                    <div className="font-bold text-slate-900">
                      កាលបរិច្ឆេទបោះពុម្ព៖ {todayStr}
                    </div>
                    <div className="text-slate-600">
                      {singleInvoiceItem
                        ? `កាលបរិច្ឆេទចំណាយ៖ ${singleInvoiceItem.expense_date}`
                        : getFilterPeriodLabel()}
                    </div>
                  </div>
                </div>

                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 font-bold">
                      <th className="py-2 px-2.5 border border-slate-300 text-center w-10">ល.រ</th>
                      <th className="py-2 px-2.5 border border-slate-300">កាលបរិច្ឆេទ</th>
                      <th className="py-2 px-2.5 border border-slate-300">ប្រភេទ</th>
                      <th className="py-2 px-2.5 border border-slate-300">បរិយាយមុខទំនិញ</th>
                      <th className="py-2 px-2.5 border border-slate-300 text-center">បរិមាណ</th>
                      <th className="py-2 px-2.5 border border-slate-300 text-right">ទឹកប្រាក់ (៛)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceItemsToPrint.map((item, i) => (
                      <tr key={item.id}>
                        <td className="py-2 px-2.5 border border-slate-300 text-center">
                          {i + 1}
                        </td>
                        <td className="py-2 px-2.5 border border-slate-300 whitespace-nowrap">
                          {item.expense_date}
                        </td>
                        <td className="py-2 px-2.5 border border-slate-300">
                          {item.category}
                        </td>
                        <td className="py-2 px-2.5 border border-slate-300">
                          <span className="font-bold">{item.title}</span>
                          {item.note ? ` (${item.note})` : ''}
                        </td>
                        <td className="py-2 px-2.5 border border-slate-300 text-center">
                          {item.quantity}
                        </td>
                        <td className="py-2 px-2.5 border border-slate-300 text-right font-bold">
                          {formatRielCurrency(item.amount_riel)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-amber-100/70 font-bold text-slate-950">
                      <td colSpan={5} className="py-2.5 px-3 border border-slate-300 text-right">
                        សរុបទឹកប្រាក់ចំណាយរួម៖
                      </td>
                      <td className="py-2.5 px-2.5 border border-slate-300 text-right text-sm font-black">
                        {formatRielCurrency(invoiceTotalRiel)}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                <div className="grid grid-cols-2 gap-6 pt-8 text-center text-xs text-slate-700">
                  <div>
                    <p className="font-bold">ហត្ថលេខាអ្នកកត់ត្រា / រដ្ឋបាល</p>
                    <div className="h-14" />
                    <p>...........................................</p>
                  </div>
                  <div>
                    <p className="font-bold">ហត្ថលេខាអ្នកត្រួតពិនិត្យ / ប្រធានមណ្ឌល</p>
                    <div className="h-14" />
                    <p>...........................................</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {typeof document !== 'undefined' &&
        createPortal(
          <div id="bipa-expense-print-portal">
            <div className="p-4 space-y-5 text-slate-900">
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                <div className="flex items-center gap-3">
                  <img
                    src={logoUrl}
                    alt="BIPA"
                    className="w-14 h-14 rounded-full object-contain border border-slate-300 p-0.5"
                  />
                  <div>
                    <h2 className="font-moul-kh text-base text-slate-900">
                      សមាគមជនជាតិដើមភាគតិចព្នង (BIPA)
                    </h2>
                    <p className="text-xs text-slate-700 font-bold mt-0.5">
                      វិក្កយបត្ររបាយការណ៍ចំណាយមណ្ឌលនិស្សិត
                    </p>
                  </div>
                </div>
                <div className="text-right text-xs space-y-0.5">
                  <div className="font-bold">កាលបរិច្ឆេទបោះពុម្ព៖ {todayStr}</div>
                  <div>
                    {singleInvoiceItem
                      ? `កាលបរិច្ឆេទចំណាយ៖ ${singleInvoiceItem.expense_date}`
                      : getFilterPeriodLabel()}
                  </div>
                </div>
              </div>

              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 font-bold">
                    <th className="py-2 px-2.5 border border-slate-400 text-center w-10">ល.រ</th>
                    <th className="py-2 px-2.5 border border-slate-400">កាលបរិច្ឆេទ</th>
                    <th className="py-2 px-2.5 border border-slate-400">ប្រភេទ</th>
                    <th className="py-2 px-2.5 border border-slate-400">បរិយាយមុខទំនិញ</th>
                    <th className="py-2 px-2.5 border border-slate-400 text-center">បរិមាណ</th>
                    <th className="py-2 px-2.5 border border-slate-400 text-right">ទឹកប្រាក់ (៛)</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceItemsToPrint.map((item, i) => (
                    <tr key={item.id}>
                      <td className="py-2 px-2.5 border border-slate-400 text-center">
                        {i + 1}
                      </td>
                      <td className="py-2 px-2.5 border border-slate-400 whitespace-nowrap">
                        {item.expense_date}
                      </td>
                      <td className="py-2 px-2.5 border border-slate-400">
                        {item.category}
                      </td>
                      <td className="py-2 px-2.5 border border-slate-400">
                        <span className="font-bold">{item.title}</span>
                        {item.note ? ` (${item.note})` : ''}
                      </td>
                      <td className="py-2 px-2.5 border border-slate-400 text-center">
                        {item.quantity}
                      </td>
                      <td className="py-2 px-2.5 border border-slate-400 text-right font-bold">
                        {formatRielCurrency(item.amount_riel)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold">
                    <td colSpan={5} className="py-2.5 px-3 border border-slate-400 text-right">
                      សរុបទឹកប្រាក់ចំណាយរួម៖
                    </td>
                    <td className="py-2.5 px-2.5 border border-slate-400 text-right text-sm font-black">
                      {formatRielCurrency(invoiceTotalRiel)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              <div className="grid grid-cols-2 gap-6 pt-10 text-center text-xs text-slate-800">
                <div>
                  <p className="font-bold">ហត្ថលេខាអ្នកកត់ត្រា / រដ្ឋបាល</p>
                  <div className="h-16" />
                  <p>...........................................</p>
                </div>
                <div>
                  <p className="font-bold">ហត្ថលេខាអ្នកត្រួតពិនិត្យ / ប្រធានមណ្ឌល</p>
                  <div className="h-16" />
                  <p>...........................................</p>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}