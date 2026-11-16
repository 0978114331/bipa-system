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
  Zap,
  Droplets,
  Utensils,
  ShoppingCart,
  Flame,
  MoreHorizontal,
  TrendingUp,
  BarChart3,
  PieChart,
  Eye,
  FileSpreadsheet,
  ClipboardList,
  Layers,
  Save,
  Award
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

interface BulkEntryRow {
  amount: string;
  quantity: string;
  note: string;
}

const EXPENSE_CACHE_KEY = 'bipa_center_expenses_cache_v1';
const CUSTOM_CATEGORIES_KEY = 'bipa_custom_expense_categories_v1';
const CUSTOM_YEARS_KEY = 'bipa_custom_expense_years_v1';
const CURRENCY_MODE_KEY = 'bipa_expense_currency_mode_v1';

const DEFAULT_CATEGORIES = [
  'ភ្លើងអគ្គិសនី',
  'ទឹក',
  'ទិញម្ហូបប្រចាំថ្ងៃ',
  'គ្រឿងទេស',
  'ហ្គាស / ឥន្ធនៈ',
  'ថ្លៃ Wi-Fi / អ៊ីនធឺណិត',
  'សម្ភារៈមណ្ឌល',
  'ជួសជុល និងថែទាំ',
  'ចំណាយផ្សេងៗ'
];

const CATEGORY_EN_MAP: Record<string, string> = {
  'ភ្លើងអគ្គិសនី': 'Electricity',
  'បង់ភ្លើង': 'Electricity',
  'ទឹក': 'Water Supply',
  'បង់ទឹក': 'Water Supply',
  'ទិញម្ហូបប្រចាំថ្ងៃ': 'Daily Food',
  'គ្រឿងទេស': 'Groceries',
  'ហ្គាស / ឥន្ធនៈ': 'Gas / Fuel',
  'ថ្លៃ Wi-Fi / អ៊ីនធឺណិត': 'Wi-Fi / Internet',
  'សម្ភារៈមណ្ឌល': 'Center Supplies',
  'ជួសជុល និងថែទាំ': 'Maintenance',
  'ចំណាយផ្សេងៗ': 'Other Expenses'
};

const CHART_PALETTE = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ec4899',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#eab308',
  '#6366f1',
  '#14b8a6',
  '#f43f5e',
  '#84cc16'
];

const MONTHS_DATA = [
  { num: '01', km: 'មករា', fullKm: 'ខែមករា', en: 'Jan', fullEn: 'January' },
  { num: '02', km: 'កុម្ភៈ', fullKm: 'ខែកុម្ភៈ', en: 'Feb', fullEn: 'February' },
  { num: '03', km: 'មីនា', fullKm: 'ខែមីនា', en: 'Mar', fullEn: 'March' },
  { num: '04', km: 'មេសា', fullKm: 'ខែមេសា', en: 'Apr', fullEn: 'April' },
  { num: '05', km: 'ឧសភា', fullKm: 'ខែឧសភា', en: 'May', fullEn: 'May' },
  { num: '06', km: 'មិថុនា', fullKm: 'ខែមិថុនា', en: 'Jun', fullEn: 'June' },
  { num: '07', km: 'កក្កដា', fullKm: 'ខែកក្កដា', en: 'Jul', fullEn: 'July' },
  { num: '08', km: 'សីហា', fullKm: 'ខែសីហា', en: 'Aug', fullEn: 'August' },
  { num: '09', km: 'កញ្ញា', fullKm: 'ខែកញ្ញា', en: 'Sep', fullEn: 'September' },
  { num: '10', km: 'តុលា', fullKm: 'ខែតុលា', en: 'Oct', fullEn: 'October' },
  { num: '11', km: 'វិច្ឆិកា', fullKm: 'ខែវិច្ឆិកា', en: 'Nov', fullEn: 'November' },
  { num: '12', km: 'ធ្នូ', fullKm: 'ខែធ្នូ', en: 'Dec', fullEn: 'December' }
];

const EXCHANGE_RATE_RIEL = 4000;

export function formatRielCurrency(amount: number): string {
  const num = Number(amount || 0);
  return `${num.toLocaleString('en-US')} ៛`;
}

function formatDisplayMoney(amountRiel: number, mode: 'KHR' | 'USD'): string {
  const num = Number(amountRiel || 0);
  if (mode === 'USD') {
    const usd = num / EXCHANGE_RATE_RIEL;
    return `$${usd.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }
  return `${num.toLocaleString('en-US')} ៛`;
}

function formatCompactMoney(amountRiel: number, mode: 'KHR' | 'USD'): string {
  const num = Number(amountRiel || 0);
  if (mode === 'USD') {
    const usd = num / EXCHANGE_RATE_RIEL;
    if (usd >= 1000) return `$${(usd / 1000).toFixed(1)}k`;
    return `$${usd.toFixed(0)}`;
  }
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${Math.round(num / 1000)}k`;
  return `${num}`;
}

function formatDateDdMmYyyy(isoDate: string): string {
  if (!isoDate || isoDate.length < 10) return isoDate;
  const [y, m, d] = isoDate.slice(0, 10).split('-');
  return `${d}-${m}-${y}`;
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

function loadCustomYears(currentYear: string): string[] {
  const base = ['2024', '2025', '2026', '2027', '2028', currentYear];
  try {
    const raw = localStorage.getItem(CUSTOM_YEARS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return Array.from(new Set([...base, ...parsed])).sort((a, b) => b.localeCompare(a));
      }
    }
  } catch {}
  return Array.from(new Set(base)).sort((a, b) => b.localeCompare(a));
}

function buildSmoothSvgPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const cX = (pts[i].x + pts[i + 1].x) / 2;
    d += ` C ${cX} ${pts[i].y}, ${cX} ${pts[i + 1].y}, ${pts[i + 1].x} ${pts[i + 1].y}`;
  }
  return d;
}

function buildSmoothAreaSvgPath(pts: { x: number; y: number }[], baselineY: number): string {
  if (pts.length === 0) return '';
  const lineD = buildSmoothSvgPath(pts);
  return `${lineD} L ${pts[pts.length - 1].x} ${baselineY} L ${pts[0].x} ${baselineY} Z`;
}

const glassCardClass =
  'bg-white/80 dark:bg-[#0a1628]/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.18)]';

const glassInnerClass =
  'bg-slate-100/75 dark:bg-[#060f1d]/55 border border-slate-200/70 dark:border-white/10';

let lastExpenseCloudFetchTime = 0;

export function CenterExpenseAdminDashboard() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { lang } = useI18n();
  const isKh = lang === 'km';
  const isAdmin = hasRole('super_admin', 'residence_admin', 'finance_admin', 'duty_manager');

  const todayStr = getTodayIsoString();
  const currentYear = todayStr.slice(0, 4);
  const currentMonth = todayStr.slice(5, 7);
  const currentDay = todayStr.slice(8, 10);

  const [expenses, setExpenses] = useState<CenterExpenseItem[]>(() => loadCachedExpenses());
  const [categories, setCategories] = useState<string[]>(() => loadCustomCategories());
  const [customYears, setCustomYears] = useState<string[]>(() => loadCustomYears(currentYear));
  const logoUrl = 'https://i.ibb.co/KpKL2rSC/864a542d-a47f-48b2-8481-68f39c87138b.png';
  const [loading, setLoading] = useState(false);
  const [isSavingBulk, setIsSavingBulk] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const [currencyMode, setCurrencyMode] = useState<'KHR' | 'USD'>(() => {
    try {
      return localStorage.getItem(CURRENCY_MODE_KEY) === 'USD' ? 'USD' : 'KHR';
    } catch {
      return 'KHR';
    }
  });

  const [filterYear, setFilterYear] = useState<string>(currentYear);
  const [filterMonth, setFilterMonth] = useState<string>('ALL');
  const [filterDay, setFilterDay] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [donutMode, setDonutMode] = useState<'months' | 'categories'>('months');
  const [activeChartMonth, setActiveChartMonth] = useState<string>(currentMonth);
  const [tableViewTab, setTableViewTab] = useState<'transactions' | 'categorySummary'>(
    'transactions'
  );

  const [showBulkEntrySheet, setShowBulkEntrySheet] = useState(false);
  const [bulkYear, setBulkYear] = useState<string>(currentYear);
  const [bulkMonth, setBulkMonth] = useState<string>(currentMonth);
  const [bulkDay, setBulkDay] = useState<string>(currentDay);
  const [bulkPayer, setBulkPayer] = useState<string>('រដ្ឋបាលមណ្ឌល');
  const [bulkRows, setBulkRows] = useState<Record<string, BulkEntryRow>>({});
  const [newCategoryInput, setNewCategoryInput] = useState('');

  const [showAddYearInput, setShowAddYearInput] = useState(false);
  const [newYearInput, setNewYearInput] = useState('');

  const [editingItem, setEditingItem] = useState<CenterExpenseItem | null>(null);
  const [editDate, setEditDate] = useState(todayStr);
  const [editCategory, setEditCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [editTitle, setEditTitle] = useState('');
  const [editQuantity, setEditQuantity] = useState('1');
  const [editAmount, setEditAmount] = useState('');
  const [editPayer, setEditPayer] = useState('រដ្ឋបាលមណ្ឌល');
  const [editNote, setEditNote] = useState('');

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [reportPrintMode, setReportPrintMode] = useState<'invoice' | 'monthly' | 'summary'>(
    'invoice'
  );
  const [singleInvoiceItem, setSingleInvoiceItem] = useState<CenterExpenseItem | null>(null);

  const translateCategory = (catKm: string) => {
    if (isKh) return catKm;
    return CATEGORY_EN_MAP[catKm] || catKm;
  };

  const toggleCurrencyMode = (mode: 'KHR' | 'USD') => {
    setCurrencyMode(mode);
    try {
      localStorage.setItem(CURRENCY_MODE_KEY, mode);
    } catch {}
  };

  const notify = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? '' : prev));
    }, 3200);
  };

  const syncMetadataToSettings = async (cats: string[], years: string[]) => {
    try {
      await supabase.from('bipa_settings').upsert(
        {
          id: 'center_expenses_v1',
          logo_url: 'CENTER_EXPENSES',
          name_km: 'ប្រភេទការចំណាយមណ្ឌល',
          name_en: JSON.stringify({
            categories: cats,
            years,
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
        .select(
          'id, expense_date, category, title, quantity, amount_riel, payer_name, note, created_at'
        )
        .order('expense_date', { ascending: false })
        .limit(800);

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
        if (Array.isArray(parsed?.years)) {
          const mergedYears = Array.from(
            new Set([...loadCustomYears(currentYear), ...parsed.years])
          ).sort((a, b) => b.localeCompare(a));
          setCustomYears(mergedYears);
          localStorage.setItem(CUSTOM_YEARS_KEY, JSON.stringify(mergedYears));
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

  useEffect(() => {
    if (filterYear !== 'ALL') setBulkYear(filterYear);
    if (filterMonth !== 'ALL') {
      setBulkMonth(filterMonth);
      setActiveChartMonth(filterMonth);
    }
    if (filterDay !== 'ALL') setBulkDay(filterDay);
  }, [filterYear, filterMonth, filterDay]);

  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>(customYears);
    expenses.forEach((e) => {
      const y = e.expense_date.slice(0, 4);
      if (y && /^\d{4}$/.test(y)) yearsSet.add(y);
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [expenses, customYears]);

  const handleAddYear = () => {
    const cleanY = newYearInput.trim();
    if (!/^\d{4}$/.test(cleanY)) {
      notify(isKh ? 'សូមវាយឆ្នាំជាលេខ ៤ ខ្ទង់ (ឧ. 2028)!' : 'Please enter a 4-digit year!');
      return;
    }
    const nextYears = Array.from(new Set([...customYears, cleanY])).sort((a, b) =>
      b.localeCompare(a)
    );
    setCustomYears(nextYears);
    setFilterYear(cleanY);
    setBulkYear(cleanY);
    setNewYearInput('');
    setShowAddYearInput(false);
    localStorage.setItem(CUSTOM_YEARS_KEY, JSON.stringify(nextYears));
    syncMetadataToSettings(categories, nextYears);
    notify(isKh ? `បានបន្ថែមឆ្នាំ ${cleanY} ដោយជោគជ័យ!` : `Added year ${cleanY}!`);
  };

  const handleAddCategoryToSheet = () => {
    const clean = newCategoryInput.trim();
    if (!clean) return;
    if (categories.includes(clean)) {
      setNewCategoryInput('');
      return;
    }
    const nextCats = [...categories, clean];
    setCategories(nextCats);
    setNewCategoryInput('');
    localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(nextCats));
    syncMetadataToSettings(nextCats, customYears);
    notify(
      isKh
        ? `បានបន្ថែមមុខទំនិញចំណាយថ្មី «${clean}» ចូលក្នុងតារាងរួម!`
        : `Added category "${clean}"!`
    );
  };

  const handleRemoveCustomCategory = (catToRemove: string) => {
    if (DEFAULT_CATEGORIES.includes(catToRemove)) return;
    if (
      !window.confirm(
        isKh ? `លុបមុខទំនិញ «${catToRemove}» ចេញពីតារាងមែនទេ?` : `Remove "${catToRemove}"?`
      )
    ) {
      return;
    }
    const nextCats = categories.filter((c) => c !== catToRemove);
    setCategories(nextCats);
    if (filterCategory === catToRemove) setFilterCategory('ALL');
    localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(nextCats));
    syncMetadataToSettings(nextCats, customYears);
  };

  const handleBulkRowChange = (cat: string, field: keyof BulkEntryRow, val: string) => {
    setBulkRows((prev) => ({
      ...prev,
      [cat]: {
        amount: prev[cat]?.amount || '',
        quantity: prev[cat]?.quantity || '1',
        note: prev[cat]?.note || '',
        [field]: val
      }
    }));
  };

  const bulkPreviewTotalRiel = useMemo(() => {
    let sum = 0;
    categories.forEach((cat) => {
      const rawAmt = Number(String(bulkRows[cat]?.amount || '').replace(/,/g, '').trim());
      if (rawAmt > 0) {
        sum +=
          currencyMode === 'USD' ? Math.round(rawAmt * EXCHANGE_RATE_RIEL) : Math.round(rawAmt);
      }
    });
    return sum;
  }, [categories, bulkRows, currencyMode]);

  const handleSaveBulkExpenses = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetIsoDate = `${bulkYear}-${bulkMonth}-${bulkDay.padStart(2, '0')}`;
    const newItems: CenterExpenseItem[] = [];

    categories.forEach((cat) => {
      const row = bulkRows[cat];
      if (!row) return;
      const rawAmt = Number(String(row.amount || '').replace(/,/g, '').trim());
      if (!rawAmt || rawAmt <= 0) return;

      const amountRiel =
        currencyMode === 'USD' ? Math.round(rawAmt * EXCHANGE_RATE_RIEL) : Math.round(rawAmt);

      const newId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `exp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      const cleanNote = (row.note || '').trim();
      newItems.push({
        id: newId,
        expense_date: targetIsoDate,
        category: cat,
        title: cleanNote || cat,
        quantity: (row.quantity || '1').trim() || '1',
        amount_riel: amountRiel,
        payer_name: bulkPayer.trim() || 'រដ្ឋបាលមណ្ឌល',
        note: cleanNote,
        created_at: new Date().toISOString()
      });
    });

    if (newItems.length === 0) {
      notify(
        isKh
          ? 'សូមវាយបញ្ចូលទឹកប្រាក់យ៉ាងហោចណាស់ ១ មុខទំនិញក្នុងតារាង!'
          : 'Please enter an amount for at least 1 category!'
      );
      return;
    }

    setIsSavingBulk(true);
    const nextList = [...newItems, ...expenses].sort((a, b) =>
      b.expense_date.localeCompare(a.expense_date)
    );
    setExpenses(nextList);
    saveCachedExpenses(nextList);
    setFilterYear(bulkYear);
    setFilterMonth(bulkMonth);
    setActiveChartMonth(bulkMonth);

    try {
      await supabase.from('bipa_expenses').insert(
        newItems.map((item) => ({
          id: item.id,
          expense_date: item.expense_date,
          category: item.category,
          title: item.title,
          quantity: item.quantity,
          amount_riel: item.amount_riel,
          payer_name: item.payer_name,
          note: item.note
        }))
      );
    } catch {}

    setIsSavingBulk(false);
    setBulkRows({});
    setShowBulkEntrySheet(false);
    notify(
      isKh
        ? `បានរក្សាទុកការចំណាយចំនួន ${newItems.length} មុខទំនិញ សម្រាប់ថ្ងៃ ${formatDateDdMmYyyy(targetIsoDate)}!`
        : `Saved ${newItems.length} expense items successfully!`
    );
  };

  const handleStartEditSingle = (item: CenterExpenseItem) => {
    setEditingItem(item);
    setEditDate(item.expense_date);
    setEditCategory(item.category);
    setEditTitle(item.title);
    setEditQuantity(item.quantity);
    setEditAmount(
      currencyMode === 'USD'
        ? String(Number((item.amount_riel / EXCHANGE_RATE_RIEL).toFixed(2)))
        : String(item.amount_riel)
    );
    setEditPayer(item.payer_name);
    setEditNote(item.note || '');
  };

  const handleSaveSingleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const rawNum = Number(String(editAmount).replace(/,/g, '').trim());
    const numericAmountRiel =
      currencyMode === 'USD' ? Math.round(rawNum * EXCHANGE_RATE_RIEL) : Math.round(rawNum);

    if (!numericAmountRiel || numericAmountRiel <= 0) {
      notify(isKh ? 'សូមបញ្ចូលទឹកប្រាក់ឱ្យបានត្រឹមត្រូវ!' : 'Invalid amount!');
      return;
    }

    const updatedItem: CenterExpenseItem = {
      ...editingItem,
      expense_date: editDate,
      category: editCategory,
      title: editTitle.trim() || editCategory,
      quantity: editQuantity.trim() || '1',
      amount_riel: numericAmountRiel,
      payer_name: editPayer.trim() || 'រដ្ឋបាលមណ្ឌល',
      note: editNote.trim()
    };

    const nextList = expenses
      .map((item) => (item.id === editingItem.id ? updatedItem : item))
      .sort((a, b) => b.expense_date.localeCompare(a.expense_date));

    setExpenses(nextList);
    saveCachedExpenses(nextList);
    setEditingItem(null);

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
        .eq('id', updatedItem.id);
    } catch {}

    notify(isKh ? 'បានកែប្រែទិន្នន័យចំណាយដោយជោគជ័យ!' : 'Expense updated successfully!');
  };

  const handleDeleteExpense = async (item: CenterExpenseItem) => {
    const confirmMsg = isKh
      ? `លុបការចំណាយ «${item.title} (${formatDisplayMoney(item.amount_riel, currencyMode)})» មែនទេ?`
      : `Delete expense "${item.title}"?`;
    if (!window.confirm(confirmMsg)) return;

    const nextList = expenses.filter((r) => r.id !== item.id);
    setExpenses(nextList);
    saveCachedExpenses(nextList);

    try {
      await supabase.from('bipa_expenses').delete().eq('id', item.id);
    } catch {}

    notify(isKh ? `បានលុប «${item.title}» រួចរាល់!` : `Deleted "${item.title}"!`);
  };

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

  const analyticsByYearAndCategory = useMemo(() => {
    const activeYear = filterYear === 'ALL' ? currentYear : filterYear;
    const focusMonth = filterMonth === 'ALL' ? activeChartMonth : filterMonth;

    const monthlyAllTotals: Record<string, number> = {};
    const monthlySelectedCatTotals: Record<string, number> = {};
    const monthlySelectedCatCounts: Record<string, number> = {};
    const monthlyAllCounts: Record<string, number> = {};

    MONTHS_DATA.forEach((m) => {
      monthlyAllTotals[m.num] = 0;
      monthlySelectedCatTotals[m.num] = 0;
      monthlySelectedCatCounts[m.num] = 0;
      monthlyAllCounts[m.num] = 0;
    });

    const categoryTotalsInPeriod: Record<
      string,
      { amount: number; count: number; peakMonth: string; peakAmt: number }
    > = {};
    const perCategoryMonthMap: Record<string, Record<string, number>> = {};

    categories.forEach((c) => {
      categoryTotalsInPeriod[c] = { amount: 0, count: 0, peakMonth: '01', peakAmt: 0 };
      perCategoryMonthMap[c] = {};
      MONTHS_DATA.forEach((m) => {
        perCategoryMonthMap[c][m.num] = 0;
      });
    });

    const isUtilityOrFood = (cat: string) =>
      cat.includes('ភ្លើង') || cat.includes('ទឹក') || cat.includes('Wi-Fi') || cat.includes('ហ្គាស');

    expenses.forEach((item) => {
      const [y, m] = item.expense_date.split('-');
      const amt = Number(item.amount_riel || 0);

      if (y === activeYear && monthlyAllTotals[m] !== undefined) {
        monthlyAllTotals[m] += amt;
        monthlyAllCounts[m] += 1;

        if (!perCategoryMonthMap[item.category]) {
          perCategoryMonthMap[item.category] = {};
          MONTHS_DATA.forEach((mo) => {
            perCategoryMonthMap[item.category][mo.num] = 0;
          });
        }
        perCategoryMonthMap[item.category][m] =
          (perCategoryMonthMap[item.category][m] || 0) + amt;

        if (filterCategory === 'ALL') {
          if (isUtilityOrFood(item.category)) {
            monthlySelectedCatTotals[m] += amt;
            monthlySelectedCatCounts[m] += 1;
          }
        } else if (item.category === filterCategory) {
          monthlySelectedCatTotals[m] += amt;
          monthlySelectedCatCounts[m] += 1;
        }
      }

      const matchYear = filterYear === 'ALL' || y === filterYear;
      const matchMonth = filterMonth === 'ALL' || m === filterMonth;
      if (matchYear && matchMonth) {
        if (!categoryTotalsInPeriod[item.category]) {
          categoryTotalsInPeriod[item.category] = {
            amount: 0,
            count: 0,
            peakMonth: m,
            peakAmt: 0
          };
        }
        categoryTotalsInPeriod[item.category].amount += amt;
        categoryTotalsInPeriod[item.category].count += 1;
      }
    });

    Object.keys(perCategoryMonthMap).forEach((cat) => {
      let bestM = '01';
      let bestVal = 0;
      MONTHS_DATA.forEach((m) => {
        const val = perCategoryMonthMap[cat][m.num] || 0;
        if (val > bestVal) {
          bestVal = val;
          bestM = m.num;
        }
      });
      if (categoryTotalsInPeriod[cat]) {
        categoryTotalsInPeriod[cat].peakMonth = bestM;
        categoryTotalsInPeriod[cat].peakAmt = bestVal;
      }
    });

    let peakMonthObj = MONTHS_DATA[0];
    let peakMonthAmount = 0;
    let yearlyTotalForSelected = 0;
    let activeMonthsWithSpend = 0;

    MONTHS_DATA.forEach((m) => {
      const val =
        filterCategory === 'ALL' ? monthlyAllTotals[m.num] : monthlySelectedCatTotals[m.num];
      yearlyTotalForSelected += val;
      if (val > 0) activeMonthsWithSpend += 1;
      if (val > peakMonthAmount) {
        peakMonthAmount = val;
        peakMonthObj = m;
      }
    });

    const monthlyAvgForSelected =
      activeMonthsWithSpend > 0
        ? Math.round(yearlyTotalForSelected / activeMonthsWithSpend)
        : 0;

    return {
      activeYear,
      focusMonth,
      monthlyAllTotals,
      monthlySelectedCatTotals,
      monthlySelectedCatCounts,
      monthlyAllCounts,
      categoryTotalsInPeriod,
      perCategoryMonthMap,
      peakMonthObj,
      peakMonthAmount,
      yearlyTotalForSelected,
      monthlyAvgForSelected,
      activeMonthsWithSpend
    };
  }, [expenses, categories, filterYear, filterMonth, filterCategory, activeChartMonth, currentYear]);

  const dashboardMetrics = useMemo(() => {
    const activeYear = filterYear === 'ALL' ? currentYear : filterYear;
    const activeMonth = filterMonth === 'ALL' ? currentMonth : filterMonth;
    const targetDayDate =
      filterDay !== 'ALL' ? `${activeYear}-${activeMonth}-${filterDay}` : todayStr;

    let dailyTotal = 0;
    filteredExpenses.forEach((e) => {
      if (e.expense_date === targetDayDate) {
        dailyTotal += Number(e.amount_riel || 0);
      }
    });

    if (filterDay === 'ALL' && dailyTotal === 0 && filteredExpenses.length > 0) {
      const latestDate = filteredExpenses[0].expense_date;
      filteredExpenses.forEach((e) => {
        if (e.expense_date === latestDate) {
          dailyTotal += Number(e.amount_riel || 0);
        }
      });
    }

    return {
      dailyTotal,
      filteredTotalRiel,
      yearlyTotalForSelected: analyticsByYearAndCategory.yearlyTotalForSelected,
      peakMonthObj: analyticsByYearAndCategory.peakMonthObj,
      peakMonthAmount: analyticsByYearAndCategory.peakMonthAmount,
      monthlyAvgForSelected: analyticsByYearAndCategory.monthlyAvgForSelected
    };
  }, [
    filteredExpenses,
    filteredTotalRiel,
    analyticsByYearAndCategory,
    filterYear,
    filterMonth,
    filterDay,
    todayStr,
    currentYear,
    currentMonth
  ]);

  const donutChartConfig = useMemo(() => {
    const radius = 58;
    const circumference = 2 * Math.PI * radius;

    if (donutMode === 'months') {
      const items = MONTHS_DATA.map((m, idx) => {
        const val =
          filterCategory === 'ALL'
            ? analyticsByYearAndCategory.monthlyAllTotals[m.num]
            : analyticsByYearAndCategory.monthlySelectedCatTotals[m.num];
        const count =
          filterCategory === 'ALL'
            ? analyticsByYearAndCategory.monthlyAllCounts[m.num]
            : analyticsByYearAndCategory.monthlySelectedCatCounts[m.num];
        return {
          key: m.num,
          labelKm: m.km,
          fullLabelKm: m.fullKm,
          labelEn: m.en,
          amount: val,
          count,
          color: CHART_PALETTE[idx % CHART_PALETTE.length]
        };
      });

      const total = items.reduce((s, i) => s + i.amount, 0) || 1;
      let accPct = 0;
      const segments = items.map((item) => {
        const pct = item.amount / total;
        const dashArray = `${Math.max(pct * circumference, 0)} ${circumference}`;
        const dashOffset = -accPct * circumference;
        accPct += pct;
        return {
          ...item,
          pct: Math.round(pct * 100),
          dashArray,
          dashOffset
        };
      });

      const activeSeg =
        segments.find((s) => s.key === analyticsByYearAndCategory.focusMonth) || segments[0];

      return {
        radius,
        segments,
        activeCenterTitle: isKh ? activeSeg.fullLabelKm : activeSeg.labelEn,
        activeCenterAmount: activeSeg.amount,
        activeCenterSub: isKh
          ? `ចំនួន ${activeSeg.count} ខ្ទង់ • ${activeSeg.pct}%`
          : `${activeSeg.count} items • ${activeSeg.pct}%`
      };
    } else {
      const catEntries = Object.entries(analyticsByYearAndCategory.categoryTotalsInPeriod)
        .map(([cat, info], idx) => ({
          key: cat,
          labelKm: cat,
          fullLabelKm: cat,
          labelEn: translateCategory(cat),
          amount: info.amount,
          count: info.count,
          color: CHART_PALETTE[idx % CHART_PALETTE.length]
        }))
        .sort((a, b) => b.amount - a.amount);

      const total = catEntries.reduce((s, i) => s + i.amount, 0) || 1;
      let accPct = 0;
      const segments = catEntries.map((item) => {
        const pct = item.amount / total;
        const dashArray = `${Math.max(pct * circumference, 0)} ${circumference}`;
        const dashOffset = -accPct * circumference;
        accPct += pct;
        return {
          ...item,
          pct: Math.round(pct * 100),
          dashArray,
          dashOffset
        };
      });

      const activeSeg =
        (filterCategory !== 'ALL' && segments.find((s) => s.key === filterCategory)) ||
        segments[0];

      return {
        radius,
        segments,
        activeCenterTitle: activeSeg
          ? isKh
            ? activeSeg.labelKm
            : activeSeg.labelEn
          : isKh
          ? 'សរុប'
          : 'Total',
        activeCenterAmount: activeSeg ? activeSeg.amount : 0,
        activeCenterSub: activeSeg
          ? isKh
            ? `ចំនួន ${activeSeg.count} ខ្ទង់ • ${activeSeg.pct}%`
            : `${activeSeg.count} items • ${activeSeg.pct}%`
          : ''
      };
    }
  }, [donutMode, analyticsByYearAndCategory, filterCategory, isKh]);

  const renderCategoryIcon = (catName: string, colorHex: string) => {
    const lower = catName.toLowerCase();
    if (catName.includes('ភ្លើង') || lower.includes('electric')) {
      return <Zap className="h-4 w-4 shrink-0" style={{ color: colorHex }} />;
    }
    if (catName.includes('ទឹក') || lower.includes('water')) {
      return <Droplets className="h-4 w-4 shrink-0" style={{ color: colorHex }} />;
    }
    if (catName.includes('ម្ហូប') || lower.includes('food')) {
      return <Utensils className="h-4 w-4 shrink-0" style={{ color: colorHex }} />;
    }
    if (catName.includes('គ្រឿងទេស') || lower.includes('grocer')) {
      return <ShoppingCart className="h-4 w-4 shrink-0" style={{ color: colorHex }} />;
    }
    if (catName.includes('ហ្គាស') || catName.includes('ឥន្ធនៈ') || lower.includes('gas')) {
      return <Flame className="h-4 w-4 shrink-0" style={{ color: colorHex }} />;
    }
    return <MoreHorizontal className="h-4 w-4 shrink-0" style={{ color: colorHex }} />;
  };

  const getFilterPeriodLabel = () => {
    const yLabel =
      filterYear === 'ALL'
        ? isKh
          ? 'គ្រប់ឆ្នាំ'
          : 'All Years'
        : isKh
        ? `ឆ្នាំ ${filterYear}`
        : `${filterYear}`;
    const mObj = MONTHS_DATA.find((m) => m.num === filterMonth);
    const mLabel =
      filterMonth === 'ALL'
        ? isKh
          ? 'គ្រប់ខែទាំង ១២'
          : 'All 12 Months'
        : isKh
        ? mObj?.fullKm || filterMonth
        : mObj?.fullEn || filterMonth;
    const dLabel =
      filterDay === 'ALL'
        ? ''
        : isKh
        ? `ថ្ងៃទី ${filterDay}`
        : `Day ${filterDay}`;
    const cLabel =
      filterCategory === 'ALL'
        ? isKh
          ? 'ការចំណាយរួមទាំងអស់'
          : 'All Expenses'
        : translateCategory(filterCategory);
    return `${cLabel} • ${dLabel} ${mLabel} (${yLabel})`.replace(/\s+/g, ' ').trim();
  };

  const handleExportExcelCsv = () => {
    if (filteredExpenses.length === 0) {
      notify(isKh ? 'មិនមានទិន្នន័យសម្រាប់ទាញយកទេ!' : 'No data to export!');
      return;
    }

    const headers = [
      'ល.រ',
      'កាលបរិច្ឆេទ',
      'ប្រភេទចំណាយ',
      'បរិយាយមុខទំនិញ',
      'បរិមាណ',
      'ទឹកប្រាក់ (រៀល)',
      'ទឹកប្រាក់ (USD)',
      'អ្នកទូទាត់',
      'ចំណាំ'
    ];

    const rows = filteredExpenses.map((item, idx) => [
      idx + 1,
      formatDateDdMmYyyy(item.expense_date),
      `"${item.category.replace(/"/g, '""')}"`,
      `"${item.title.replace(/"/g, '""')}"`,
      `"${item.quantity.replace(/"/g, '""')}"`,
      item.amount_riel,
      (item.amount_riel / EXCHANGE_RATE_RIEL).toFixed(2),
      `"${item.payer_name.replace(/"/g, '""')}"`,
      `"${(item.note || '').replace(/"/g, '""')}"`
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BIPA_Expenses_${filterYear}_${filterMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    notify(isKh ? 'បានទាញយកឯកសារ Excel (CSV) រួចរាល់!' : 'Excel (CSV) exported!');
  };

  if (!isAdmin) {
    return (
      <div className={cn('max-w-md mx-auto mt-10 rounded-3xl p-6 text-center space-y-3 font-khmer', glassCardClass)}>
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

  const svgW = 620;
  const svgH = 195;
  const padLeft = 46;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 28;
  const plotW = svgW - padLeft - padRight;
  const plotH = svgH - padTop - padBottom;

  const maxLineValue = Math.max(
    ...MONTHS_DATA.map((m) =>
      Math.max(
        analyticsByYearAndCategory.monthlyAllTotals[m.num] || 0,
        analyticsByYearAndCategory.monthlySelectedCatTotals[m.num] || 0
      )
    ),
    100000
  );

  const greenLinePoints = MONTHS_DATA.map((m, idx) => {
    const val = analyticsByYearAndCategory.monthlyAllTotals[m.num] || 0;
    const x = padLeft + (idx / 11) * plotW;
    const y = padTop + plotH - (val / maxLineValue) * plotH;
    return { x, y, num: m.num, km: m.km, fullKm: m.fullKm, en: m.en, val };
  });

  const pinkLinePoints = MONTHS_DATA.map((m, idx) => {
    const val = analyticsByYearAndCategory.monthlySelectedCatTotals[m.num] || 0;
    const x = padLeft + (idx / 11) * plotW;
    const y = padTop + plotH - (val / maxLineValue) * plotH;
    return { x, y, num: m.num, km: m.km, fullKm: m.fullKm, en: m.en, val };
  });

  const selectedMonthPointIdx = Math.max(
    0,
    MONTHS_DATA.findIndex((m) => m.num === analyticsByYearAndCategory.focusMonth)
  );
  const activeGreenPt = greenLinePoints[selectedMonthPointIdx] || greenLinePoints[0];
  const activePinkPt = pinkLinePoints[selectedMonthPointIdx] || pinkLinePoints[0];

  const invoiceItemsToPrint = singleInvoiceItem ? [singleInvoiceItem] : filteredExpenses;
  const invoiceTotalRiel = singleInvoiceItem
    ? Number(singleInvoiceItem.amount_riel || 0)
    : filteredTotalRiel;

  return (
    <div className="max-w-7xl mx-auto space-y-4 font-khmer pb-24 text-slate-900 dark:text-white overflow-x-hidden">
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

      {/* Top Header Banner with Translucent Glassmorphism */}
      <div className={cn('relative overflow-hidden rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4', glassCardClass)}>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 min-w-0">
          <div className="pr-3 sm:pr-4 border-r-2 border-slate-300/80 dark:border-white/15 shrink-0">
            <h2 className="font-moul-kh text-sm sm:text-base text-blue-700 dark:text-amber-400 leading-tight">
              មណ្ឌលនិស្សិត BIPA
            </h2>
            <p className="text-[11px] font-extrabold text-slate-500 dark:text-slate-300">
              Student Center
            </p>
          </div>

          <div className="min-w-0">
            <h1 className="font-moul-kh text-sm sm:text-lg text-slate-900 dark:text-white leading-tight truncate">
              {isKh ? 'ប្រព័ន្ធគ្រប់គ្រង និងវិភាគការចំណាយរបស់មណ្ឌល' : 'Expense Management & Analytics'}
            </h1>
            <p className="text-xs font-bold text-blue-600 dark:text-sky-300 mt-0.5 truncate">
              {getFilterPeriodLabel()}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className={cn('flex items-center rounded-xl p-1', glassInnerClass)}>
            <button
              type="button"
              onClick={() => toggleCurrencyMode('KHR')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all',
                currencyMode === 'KHR'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              )}
            >
              ៛ រៀល
            </button>
            <button
              type="button"
              onClick={() => toggleCurrencyMode('USD')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all',
                currencyMode === 'USD'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              )}
            >
              $ USD
            </button>
          </div>

          <Button
            type="button"
            onClick={() => setShowBulkEntrySheet((p) => !p)}
            className={cn(
              'font-bold text-xs h-9 px-3.5 rounded-xl shadow-md transition-all',
              showBulkEntrySheet
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            )}
          >
            <Layers className="h-4 w-4 mr-1.5" />
            {isKh ? '+ បញ្ចូលចំណាយរួម' : '+ Bulk Entry'}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => fetchExpensesFromCloud(true)}
            disabled={loading}
            className={cn('rounded-xl text-slate-700 dark:text-slate-200 text-xs h-9 px-2.5', glassInnerClass)}
          >
            <RefreshCw className={cn('h-3.5 w-3.5 text-amber-500', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Bulk Entry Sheet when clicked */}
      {showBulkEntrySheet && (
        <form
          onSubmit={handleSaveBulkExpenses}
          className={cn('border-2 border-emerald-500/70 rounded-3xl p-4 sm:p-5 space-y-4 animate-in fade-in duration-200', glassCardClass)}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200/70 dark:border-white/10 pb-3.5">
            <div className="space-y-0.5">
              <h2 className="font-moul-kh text-xs sm:text-base text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <Layers className="h-5 w-5 shrink-0" />
                <span>
                  {isKh
                    ? 'តារាងបំពេញការចំណាយរួមតាមមុខទំនិញ (រើសថ្ងៃ ខែ ឆ្នាំ រួចវាយទឹកប្រាក់តាមមុខទំនិញ)'
                    : 'All-in-One Bulk Expense Entry Sheet'}
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-300">
                {isKh
                  ? 'បំពេញតែមុខទំនិញណាដែលបានចំណាយ រួចចុច «រក្សាទុកទាំងអស់» នោះវានឹងរត់ចូលក្រាប និងតារាងស្វ័យប្រវត្តិ'
                  : 'Enter amounts for any items below and click Save All'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className={cn('flex flex-wrap items-center gap-1.5 rounded-xl px-3 py-1.5', glassInnerClass)}>
                <Calendar className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {isKh ? 'កាលបរិច្ឆេទ៖' : 'Date:'}
                </span>
                <select
                  value={bulkDay}
                  onChange={(e) => setBulkDay(e.target.value)}
                  className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 dark:text-white outline-none"
                >
                  {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map(
                    (d) => (
                      <option key={d} value={d}>
                        {isKh ? `ថ្ងៃទី ${d}` : `Day ${d}`}
                      </option>
                    )
                  )}
                </select>

                <select
                  value={bulkMonth}
                  onChange={(e) => setBulkMonth(e.target.value)}
                  className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 dark:text-white outline-none"
                >
                  {MONTHS_DATA.map((m) => (
                    <option key={m.num} value={m.num}>
                      {isKh ? `${m.fullKm} (${m.num})` : `${m.en} (${m.num})`}
                    </option>
                  ))}
                </select>

                <select
                  value={bulkYear}
                  onChange={(e) => setBulkYear(e.target.value)}
                  className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 dark:text-white outline-none"
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {isKh ? `ឆ្នាំ ${y}` : y}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setShowBulkEntrySheet(false)}
                className="w-8 h-8 rounded-full bg-slate-200/70 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-rose-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className={cn('flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3 rounded-2xl', glassInnerClass)}>
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCategoryToSheet();
                  }
                }}
                placeholder={
                  isKh
                    ? '+ វាយបន្ថែមមុខទំនិញចំណាយថ្មី (ឧ. ថ្លៃសំរាម, ទិញទឹកសុទ្ធ...)'
                    : '+ Add new expense category...'
                }
                className="h-9 rounded-xl bg-white/90 dark:bg-[#0b1526]/80 text-xs"
              />
              <Button
                type="button"
                onClick={handleAddCategoryToSheet}
                className="h-9 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shrink-0"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                {isKh ? 'បន្ថែមមុខទំនិញ' : 'Add'}
              </Button>
            </div>

            <div className="flex items-center gap-2 sm:w-64">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
                {isKh ? 'អ្នកទូទាត់៖' : 'Paid by:'}
              </span>
              <Input
                value={bulkPayer}
                onChange={(e) => setBulkPayer(e.target.value)}
                className="h-9 rounded-xl bg-white/90 dark:bg-[#0b1526]/80 text-xs"
              />
            </div>
          </div>

          <div className="w-full max-h-[340px] overflow-y-auto overflow-x-auto rounded-2xl border border-slate-200/70 dark:border-white/10 scrollbar-thin">
            <table className="w-full text-xs text-left border-collapse min-w-[600px]">
              <thead className="sticky top-0 z-10 bg-slate-100/95 dark:bg-[#091426]/95 text-slate-800 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">{isKh ? 'ល.រ' : '#'}</th>
                  <th className="py-2.5 px-3">
                    {isKh ? 'មុខទំនិញ / ប្រភេទចំណាយ' : 'Expense Category'}
                  </th>
                  <th className="py-2.5 px-3 w-44">
                    {currencyMode === 'USD'
                      ? isKh
                        ? 'ទឹកប្រាក់ ($ USD)'
                        : 'Amount ($ USD)'
                      : isKh
                      ? 'ទឹកប្រាក់ (រៀល ៛)'
                      : 'Amount (KHR ៛)'}
                  </th>
                  <th className="py-2.5 px-3 w-28 text-center">
                    {isKh ? 'បរិមាណ' : 'Quantity'}
                  </th>
                  <th className="py-2.5 px-3">
                    {isKh ? 'ចំណាំបន្ថែម (មិនបំពេញក៏បាន)' : 'Note (Optional)'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-white/10">
                {categories.map((cat, idx) => {
                  const row = bulkRows[cat] || { amount: '', quantity: '1', note: '' };
                  const hasVal = Number(row.amount) > 0;
                  const colorHex = CHART_PALETTE[idx % CHART_PALETTE.length];
                  const isCustom = !DEFAULT_CATEGORIES.includes(cat);

                  return (
                    <tr
                      key={cat}
                      className={cn(
                        'transition-colors',
                        hasVal
                          ? 'bg-emerald-500/10'
                          : 'hover:bg-slate-100/50 dark:hover:bg-white/5'
                      )}
                    >
                      <td className="py-2 px-3 text-center font-bold text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {renderCategoryIcon(cat, colorHex)}
                            <span className="font-bold text-slate-900 dark:text-white">
                              {translateCategory(cat)}
                            </span>
                          </div>
                          {isCustom && (
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomCategory(cat)}
                              className="text-slate-400 hover:text-rose-500 p-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={row.amount}
                          onChange={(e) => handleBulkRowChange(cat, 'amount', e.target.value)}
                          placeholder={currencyMode === 'USD' ? '0.00' : '0'}
                          className={cn(
                            'h-8 rounded-xl text-xs font-extrabold',
                            hasVal
                              ? 'border-emerald-500 bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400'
                              : 'bg-white/70 dark:bg-[#071120]/70'
                          )}
                        />
                      </td>
                      <td className="py-2 px-3">
                        <Input
                          type="text"
                          value={row.quantity}
                          onChange={(e) => handleBulkRowChange(cat, 'quantity', e.target.value)}
                          placeholder="1"
                          className="h-8 rounded-xl bg-white/70 dark:bg-[#071120]/70 text-xs text-center"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <Input
                          type="text"
                          value={row.note}
                          onChange={(e) => handleBulkRowChange(cat, 'note', e.target.value)}
                          placeholder={isKh ? `ចំណាំសម្រាប់ ${cat}...` : 'Note...'}
                          className="h-8 rounded-xl bg-white/70 dark:bg-[#071120]/70 text-xs"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200/70 dark:border-white/10">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {isKh ? 'សរុបទឹកប្រាក់កំពុងបំពេញ៖' : 'Total being entered:'}
              </span>
              <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                {formatDisplayMoney(bulkPreviewTotalRiel, currencyMode)}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBulkRows({})}
                className="h-9 px-4 rounded-xl text-xs"
              >
                {isKh ? 'សម្អាត' : 'Clear'}
              </Button>
              <Button
                type="submit"
                disabled={isSavingBulk}
                className="h-9 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg"
              >
                <Save className="h-4 w-4 mr-1.5" />
                {isSavingBulk
                  ? isKh
                    ? 'កំពុងរក្សាទុក...'
                    : 'Saving...'
                  : isKh
                  ? 'រក្សាទុកទាំងអស់'
                  : 'Save All'}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* 4 Translucent Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={cn('rounded-3xl p-3.5 sm:p-4 flex items-center gap-3', glassCardClass)}>
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-blue-500/15 border border-blue-400/30 text-blue-500 dark:text-sky-400 flex items-center justify-center shrink-0">
            <Wallet className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-300 truncate">
              {filterCategory === 'ALL'
                ? isKh
                  ? 'ចំណាយសរុបតាមការជ្រើសរើស'
                  : 'Filtered Total'
                : `${translateCategory(filterCategory)} (${isKh ? 'សរុប' : 'Total'})`}
            </p>
            <p className="text-sm sm:text-lg font-black text-blue-600 dark:text-sky-400 truncate">
              {formatDisplayMoney(dashboardMetrics.filteredTotalRiel, currencyMode)}
            </p>
            <p className="text-[10px] font-bold text-slate-400">
              {filteredExpenses.length} {isKh ? 'ខ្ទង់ចំណាយ' : 'records'}
            </p>
          </div>
        </div>

        <div className={cn('rounded-3xl p-3.5 sm:p-4 flex items-center gap-3', glassCardClass)}>
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-500 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Calendar className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-300 truncate">
              {isKh
                ? `សរុបប្រចាំឆ្នាំ (${analyticsByYearAndCategory.activeYear})`
                : `Yearly Total (${analyticsByYearAndCategory.activeYear})`}
            </p>
            <p className="text-sm sm:text-lg font-black text-emerald-600 dark:text-emerald-400 truncate">
              {formatDisplayMoney(dashboardMetrics.yearlyTotalForSelected, currencyMode)}
            </p>
            <p className="text-[10px] font-bold text-slate-400 truncate">
              {filterCategory === 'ALL'
                ? isKh
                  ? 'គ្រប់មុខទំនិញទាំងអស់'
                  : 'All categories'
                : translateCategory(filterCategory)}
            </p>
          </div>
        </div>

        <div className={cn('rounded-3xl p-3.5 sm:p-4 flex items-center gap-3', glassCardClass)}>
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-rose-500/15 border border-rose-400/30 text-rose-500 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Award className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-300 truncate">
              {isKh ? 'ខែចំណាយច្រើនបំផុត' : 'Highest Spending Month'}
            </p>
            <p className="text-sm sm:text-lg font-black text-rose-500 dark:text-rose-400 truncate">
              {formatDisplayMoney(dashboardMetrics.peakMonthAmount, currencyMode)}
            </p>
            <p className="text-[10px] font-bold text-amber-500 truncate">
              {isKh
                ? `${dashboardMetrics.peakMonthObj.fullKm} (${analyticsByYearAndCategory.activeYear})`
                : `${dashboardMetrics.peakMonthObj.fullEn} (${analyticsByYearAndCategory.activeYear})`}
            </p>
          </div>
        </div>

        <div className={cn('rounded-3xl p-3.5 sm:p-4 flex items-center gap-3', glassCardClass)}>
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-300 truncate">
              {isKh ? 'មធ្យមភាគក្នុង ១ ខែ' : 'Monthly Average'}
            </p>
            <p className="text-sm sm:text-lg font-black text-amber-500 dark:text-amber-400 truncate">
              {formatDisplayMoney(dashboardMetrics.monthlyAvgForSelected, currencyMode)}
            </p>
            <p className="text-[10px] font-bold text-slate-400 truncate">
              {isKh
                ? `ចំណាយថ្ងៃ៖ ${formatDisplayMoney(dashboardMetrics.dailyTotal, currencyMode)}`
                : `Daily: ${formatDisplayMoney(dashboardMetrics.dailyTotal, currencyMode)}`}
            </p>
          </div>
        </div>
      </div>

      {/* Contained Filter Bar (Fixes Search Overflow completely) */}
      <div className={cn('rounded-3xl p-3.5 sm:p-4 space-y-2.5 overflow-hidden', glassCardClass)}>
        {/* Row 1: Year + Day on Left, Search neatly contained on Right */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className={cn('flex items-center gap-1 rounded-xl px-2.5 py-1.5', glassInnerClass)}>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="bg-transparent text-xs font-extrabold text-slate-900 dark:text-white outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-white dark:bg-slate-900">
                  {isKh ? 'គ្រប់ឆ្នាំ' : 'All Years'}
                </option>
                {availableYears.map((y) => (
                  <option key={y} value={y} className="bg-white dark:bg-slate-900">
                    {isKh ? `ឆ្នាំ ${y}` : `Year ${y}`}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowAddYearInput((p) => !p)}
                title={isKh ? 'បន្ថែមឆ្នាំថ្មី' : 'Add Year'}
                className="ml-1 px-1.5 py-0.2 rounded bg-amber-500/20 hover:bg-amber-500/35 text-amber-600 dark:text-amber-300 text-[10px] font-bold"
              >
                +
              </button>
            </div>

            {showAddYearInput && (
              <div className={cn('flex items-center gap-1 border border-amber-400 rounded-xl px-2 py-1', glassInnerClass)}>
                <input
                  type="text"
                  maxLength={4}
                  value={newYearInput}
                  onChange={(e) => setNewYearInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="2028"
                  className="w-12 text-xs font-bold bg-transparent text-slate-900 dark:text-white outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddYear}
                  className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] font-bold"
                >
                  {isKh ? 'ដាក់' : 'Add'}
                </button>
              </div>
            )}

            <select
              value={filterDay}
              onChange={(e) => setFilterDay(e.target.value)}
              className={cn(
                'h-8 rounded-xl px-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer',
                glassInnerClass
              )}
            >
              <option value="ALL" className="bg-white dark:bg-slate-900">
                {isKh ? 'គ្រប់ថ្ងៃក្នុងខែ' : 'All Days'}
              </option>
              {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map((d) => (
                <option key={d} value={d} className="bg-white dark:bg-slate-900">
                  {isKh ? `ថ្ងៃទី ${d}` : `Day ${d}`}
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full sm:w-64 md:w-72 min-w-0">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isKh ? 'ស្វែងរកមុខទំនិញ ឬចំណាំ...' : 'Search expenses...'}
              className={cn('w-full pl-8 pr-7 h-8 rounded-xl text-xs', glassInnerClass)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Scrollable Category Pills */}
        <div className={cn('flex items-center gap-1.5 p-1.5 rounded-2xl overflow-x-auto scrollbar-thin', glassInnerClass)}>
          <button
            type="button"
            onClick={() => setFilterCategory('ALL')}
            className={cn(
              'px-3 py-1 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all shrink-0',
              filterCategory === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            {isKh ? `ការចំណាយរួមទាំងអស់ (${expenses.length})` : `All Expenses (${expenses.length})`}
          </button>
          {categories.map((cat) => {
            const active = filterCategory === cat;
            const catInfo = analyticsByYearAndCategory.categoryTotalsInPeriod[cat];
            return (
              <button
                key={cat}
                type="button"
                onClick={() =>
                  setFilterCategory((prev) => (prev === cat ? 'ALL' : cat))
                }
                className={cn(
                  'px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0',
                  active
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <span>{translateCategory(cat)}</span>
                {catInfo && catInfo.count > 0 && (
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.2 rounded-full font-extrabold',
                      active
                        ? 'bg-white/25 text-white'
                        : 'bg-amber-500/20 text-amber-600 dark:text-amber-300'
                    )}
                  >
                    {catInfo.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Row 3: Scrollable 12-Month Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
          <button
            type="button"
            onClick={() => setFilterMonth('ALL')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap border transition-all shrink-0',
              filterMonth === 'ALL'
                ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                : cn(glassInnerClass, 'text-slate-600 dark:text-slate-300 hover:border-slate-400')
            )}
          >
            {isKh ? 'គ្រប់ខែទាំង ១២' : 'All 12 Months'}
          </button>
          {MONTHS_DATA.map((m) => {
            const isSelected = filterMonth === m.num;
            return (
              <button
                key={m.num}
                type="button"
                onClick={() => {
                  setFilterMonth((prev) => (prev === m.num ? 'ALL' : m.num));
                  setActiveChartMonth(m.num);
                }}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap border transition-all shrink-0',
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                    : cn(glassInnerClass, 'text-slate-600 dark:text-slate-300 hover:border-slate-400')
                )}
              >
                {isKh ? m.fullKm : m.en}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart Analysis Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Card: 12-Month Smooth Area & Line Chart */}
        <div className={cn('lg:col-span-7 rounded-3xl p-4 sm:p-5 flex flex-col justify-between space-y-3', glassCardClass)}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-moul-kh text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-cyan-400 shrink-0" />
                <span>
                  {isKh
                    ? `ក្រាបសន្ទុះការចំណាយប្រចាំខែ (ឆ្នាំ ${analyticsByYearAndCategory.activeYear})`
                    : `Monthly Expense Trend (${analyticsByYearAndCategory.activeYear})`}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-300 mt-0.5">
                {isKh
                  ? 'បង្ហាញការឡើងចុះនៃការចំណាយសរុប និងមុខចំណាយតាមខែទាំង ១២'
                  : '12-month comparison of total expenses vs selected category'}
              </p>
            </div>

            <div className={cn('flex items-center gap-3 text-[11px] font-bold px-3 py-1.5 rounded-full w-fit', glassInnerClass)}>
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                {isKh ? 'ចំណាយសរុបរួម' : 'Total Expense'}
              </span>
              <span className="text-slate-400">|</span>
              <span className="flex items-center gap-1.5 text-rose-500 dark:text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                {filterCategory === 'ALL'
                  ? isKh
                    ? 'ទឹក/ភ្លើង/ហ្គាស'
                    : 'Utilities'
                  : translateCategory(filterCategory)}
              </span>
            </div>
          </div>

          <div className={cn('rounded-2xl p-3 space-y-3', glassInnerClass)}>
            <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-44 sm:h-48 overflow-visible">
              <defs>
                <linearGradient id="expGreenAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="expPinkAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.38" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {[0, 0.25, 0.5, 0.75, 1].map((step, idx) => {
                const yPos = padTop + step * plotH;
                const valLabel = Math.round(maxLineValue * (1 - step));
                return (
                  <g key={idx}>
                    <line
                      x1={padLeft}
                      y1={yPos}
                      x2={svgW - padRight}
                      y2={yPos}
                      stroke="currentColor"
                      strokeDasharray="4 4"
                      className="text-slate-300/70 dark:text-white/10"
                      strokeWidth="1"
                    />
                    <text
                      x={padLeft - 6}
                      y={yPos + 3}
                      textAnchor="end"
                      className="text-[9.5px] fill-slate-500 dark:fill-slate-400 font-bold"
                    >
                      {formatCompactMoney(valLabel, currencyMode)}
                    </text>
                  </g>
                );
              })}

              {activeGreenPt && (
                <line
                  x1={activeGreenPt.x}
                  y1={padTop}
                  x2={activeGreenPt.x}
                  y2={padTop + plotH}
                  stroke="#94a3b8"
                  strokeDasharray="3 3"
                  strokeWidth="1.2"
                />
              )}

              <path
                d={buildSmoothAreaSvgPath(greenLinePoints, padTop + plotH)}
                fill="url(#expGreenAreaGrad)"
              />
              <path
                d={buildSmoothSvgPath(greenLinePoints)}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.8"
                strokeLinecap="round"
              />

              <path
                d={buildSmoothAreaSvgPath(pinkLinePoints, padTop + plotH)}
                fill="url(#expPinkAreaGrad)"
              />
              <path
                d={buildSmoothSvgPath(pinkLinePoints)}
                fill="none"
                stroke="#f43f5e"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {greenLinePoints.map((pt, idx) => {
                const pkPt = pinkLinePoints[idx];
                const isSelected = pt.num === analyticsByYearAndCategory.focusMonth;
                return (
                  <g
                    key={pt.num}
                    className="cursor-pointer"
                    onClick={() => {
                      setActiveChartMonth(pt.num);
                      setFilterMonth((prev) => (prev === pt.num ? 'ALL' : pt.num));
                    }}
                  >
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? 5.5 : 4}
                      fill="#0b1322"
                      stroke="#10b981"
                      strokeWidth="2.5"
                    />
                    {pkPt && (
                      <circle
                        cx={pkPt.x}
                        cy={pkPt.y}
                        r={isSelected ? 5.5 : 3.8}
                        fill="#0b1322"
                        stroke="#f43f5e"
                        strokeWidth="2.5"
                      />
                    )}
                    <text
                      x={pt.x}
                      y={svgH - 6}
                      textAnchor="middle"
                      className={cn(
                        'text-[10px] font-bold',
                        isSelected
                          ? 'fill-amber-500 dark:fill-amber-400'
                          : 'fill-slate-500 dark:fill-slate-400'
                      )}
                    >
                      {isKh ? pt.km : pt.en}
                    </text>
                  </g>
                );
              })}
            </svg>

            <div className="flex flex-wrap items-center justify-between gap-2 bg-white/75 dark:bg-[#0b1629]/75 border border-slate-200/70 dark:border-white/10 px-3.5 py-2 rounded-xl text-xs">
              <span className="font-extrabold text-slate-900 dark:text-white">
                {isKh ? activeGreenPt?.fullKm : activeGreenPt?.en} ({analyticsByYearAndCategory.activeYear})៖
              </span>
              <div className="flex flex-wrap items-center gap-4 font-bold">
                <span className="text-emerald-600 dark:text-emerald-400">
                  {isKh ? 'ចំណាយសរុប៖ ' : 'Total: '}
                  {formatDisplayMoney(activeGreenPt?.val || 0, currencyMode)}
                </span>
                <span className="text-rose-500 dark:text-rose-400">
                  {filterCategory === 'ALL'
                    ? isKh
                      ? 'ទឹក/ភ្លើង/ហ្គាស៖ '
                      : 'Utilities: '
                    : `${translateCategory(filterCategory)}៖ `}
                  {formatDisplayMoney(activePinkPt?.val || 0, currencyMode)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Interactive Donut Chart & 2-Column Scrollable Pill Grid */}
        <div className={cn('lg:col-span-5 rounded-3xl p-4 sm:p-5 flex flex-col justify-between space-y-3', glassCardClass)}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-moul-kh text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <PieChart className="h-4 w-4 text-amber-400 shrink-0" />
                <span>
                  {donutMode === 'months'
                    ? isKh
                      ? 'ក្រាបមូលតាមពណ៌នៃខែទាំង ១២'
                      : '12-Month Expense Share'
                    : isKh
                    ? 'ក្រាបមូលតាមមុខទំនិញចំណាយ'
                    : 'Share by Expense Category'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-300 mt-0.5">
                {isKh
                  ? 'ចុចលើពណ៌ខែ ឬមុខទំនិញណាមួយ ដើម្បីមើលចំនួនទឹកប្រាក់លម្អិត'
                  : 'Click any item to inspect exact spending'}
              </p>
            </div>

            <div className={cn('flex items-center p-1 rounded-xl shrink-0', glassInnerClass)}>
              <button
                type="button"
                onClick={() => setDonutMode('months')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all',
                  donutMode === 'months'
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-500 dark:text-slate-300'
                )}
              >
                {isKh ? 'តាមខែ (១២)' : 'By Month'}
              </button>
              <button
                type="button"
                onClick={() => setDonutMode('categories')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all',
                  donutMode === 'categories'
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-500 dark:text-slate-300'
                )}
              >
                {isKh ? 'តាមមុខទំនិញ' : 'By Item'}
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
            <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 150 150" className="w-full h-full -rotate-90">
                <circle
                  cx="75"
                  cy="75"
                  r={donutChartConfig.radius}
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="18"
                  className="text-slate-200/70 dark:text-white/10"
                />
                {donutChartConfig.segments.map((seg) => (
                  <circle
                    key={seg.key}
                    cx="75"
                    cy="75"
                    r={donutChartConfig.radius}
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth="18"
                    strokeDasharray={seg.dashArray}
                    strokeDashoffset={seg.dashOffset}
                    className="transition-all duration-500 cursor-pointer hover:opacity-85"
                    onClick={() => {
                      if (donutMode === 'months') {
                        setActiveChartMonth(seg.key);
                        setFilterMonth((prev) => (prev === seg.key ? 'ALL' : seg.key));
                      } else {
                        setFilterCategory((prev) => (prev === seg.key ? 'ALL' : seg.key));
                      }
                    }}
                  />
                ))}
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3 pointer-events-none">
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold shadow-xs max-w-[110px] truncate">
                  {donutChartConfig.activeCenterTitle}
                </span>
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white mt-1 leading-tight">
                  {formatDisplayMoney(donutChartConfig.activeCenterAmount, currencyMode)}
                </span>
                <span className="text-[9.5px] font-bold text-slate-400 mt-0.5">
                  {donutChartConfig.activeCenterSub}
                </span>
              </div>
            </div>

            <div className="flex-1 w-full max-h-48 overflow-y-auto pr-1 scrollbar-thin">
              <div className="grid grid-cols-2 gap-2">
                {donutChartConfig.segments.map((seg) => {
                  const isActive =
                    donutMode === 'months'
                      ? analyticsByYearAndCategory.focusMonth === seg.key
                      : filterCategory === seg.key;

                  return (
                    <button
                      key={seg.key}
                      type="button"
                      onClick={() => {
                        if (donutMode === 'months') {
                          setActiveChartMonth(seg.key);
                          setFilterMonth((prev) => (prev === seg.key ? 'ALL' : seg.key));
                        } else {
                          setFilterCategory((prev) => (prev === seg.key ? 'ALL' : seg.key));
                        }
                      }}
                      className={cn(
                        'flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-xl border text-[11px] font-bold transition-all',
                        isActive
                          ? 'bg-blue-600/20 border-blue-500 text-slate-900 dark:text-white shadow-xs'
                          : cn(glassInnerClass, 'text-slate-700 dark:text-slate-200 hover:border-slate-400')
                      )}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: seg.color }}
                        />
                        <span className="truncate">
                          {isKh ? seg.labelKm : seg.labelEn}
                        </span>
                      </div>
                      <span className="text-emerald-600 dark:text-emerald-400 font-extrabold shrink-0">
                        {formatCompactMoney(seg.amount, currencyMode)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {editingItem && (
        <form
          onSubmit={handleSaveSingleEdit}
          className={cn('border-2 border-amber-500 rounded-3xl p-4 sm:p-5 space-y-3 animate-in fade-in duration-150', glassCardClass)}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <Edit3 className="h-4 w-4" />
              <span>
                {isKh ? 'កែប្រែទិន្នន័យចំណាយ' : 'Edit Expense Item'} ({editingItem.title})
              </span>
            </h3>
            <button
              type="button"
              onClick={() => setEditingItem(null)}
              className="text-xs text-rose-500 hover:underline flex items-center gap-1"
            >
              <X className="h-3.5 w-3.5" />
              <span>{isKh ? 'បិទ' : 'Cancel'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
            <Input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className={cn('h-9 rounded-xl text-xs', glassInnerClass)}
              required
            />
            <select
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
              className={cn('h-9 rounded-xl px-2.5 text-xs outline-none', glassInnerClass)}
            >
              {categories.map((c) => (
                <option key={c} value={c} className="bg-white dark:bg-slate-900">
                  {translateCategory(c)}
                </option>
              ))}
            </select>
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder={isKh ? 'បរិយាយមុខទំនិញ' : 'Description'}
              className={cn('h-9 rounded-xl text-xs lg:col-span-2', glassInnerClass)}
              required
            />
            <Input
              type="number"
              min="0"
              step="any"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              className={cn('h-9 rounded-xl text-xs font-bold text-amber-500', glassInnerClass)}
              required
            />
            <Button
              type="submit"
              className="h-9 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {isKh ? 'រក្សាទុកការកែ' : 'Update'}
            </Button>
          </div>
        </form>
      )}

      {/* Bottom Row: Scrollable Data Table + Compact Sleek Print / Report Buttons */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className={cn('lg:col-span-7 rounded-3xl p-4 sm:p-5 space-y-3.5', glassCardClass)}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <ClipboardList className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-moul-kh text-xs sm:text-sm text-slate-900 dark:text-white">
                  {tableViewTab === 'transactions'
                    ? isKh
                      ? `បញ្ជីប្រវត្តិចំណាយ (${filteredExpenses.length})`
                      : `Expense Transactions (${filteredExpenses.length})`
                    : isKh
                    ? 'តារាងសរុបតាមមុខចំណាយនីមួយៗ'
                    : 'Summary by Expense Category'}
                </h3>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-300">
                  {getFilterPeriodLabel()}
                </p>
              </div>
            </div>

            <div className={cn('flex items-center p-1 rounded-xl', glassInnerClass)}>
              <button
                type="button"
                onClick={() => setTableViewTab('transactions')}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-bold transition-all',
                  tableViewTab === 'transactions'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                )}
              >
                {isKh ? 'ប្រវត្តិចំណាយ' : 'Transactions'}
              </button>
              <button
                type="button"
                onClick={() => setTableViewTab('categorySummary')}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-bold transition-all',
                  tableViewTab === 'categorySummary'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                )}
              >
                {isKh ? 'សរុបតាមមុខទំនិញ' : 'By Category'}
              </button>
            </div>
          </div>

          {tableViewTab === 'transactions' ? (
            <div className="w-full max-h-[340px] overflow-y-auto overflow-x-auto rounded-2xl border border-slate-200/70 dark:border-white/10 scrollbar-thin">
              <table className="w-full text-xs text-left border-collapse min-w-[560px]">
                <thead className="sticky top-0 z-10 bg-slate-100/95 dark:bg-[#091426]/95 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-white/10">
                  <tr>
                    <th className="py-2.5 px-3 w-10">{isKh ? 'ល.រ' : 'No.'}</th>
                    <th className="py-2.5 px-3">{isKh ? 'កាលបរិច្ឆេទ' : 'Date'}</th>
                    <th className="py-2.5 px-3">{isKh ? 'មុខចំណាយ' : 'Category'}</th>
                    <th className="py-2.5 px-3 text-right">
                      {isKh ? 'ទឹកប្រាក់' : 'Amount'}
                    </th>
                    <th className="py-2.5 px-3">{isKh ? 'ចំណាំ' : 'Note'}</th>
                    <th className="py-2.5 px-3 text-center">
                      {isKh ? 'សកម្មភាព' : 'Action'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-white/10">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        {isKh
                          ? 'មិនទាន់មានទិន្នន័យចំណាយក្នុងកាលបរិច្ឆេទនេះនៅឡើយទេ'
                          : 'No expense records found'}
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((item, idx) => (
                      <tr
                        key={item.id}
                        className="hover:bg-sky-50/40 dark:hover:bg-white/5 transition-colors"
                      >
                        <td className="py-2.5 px-3 font-semibold text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap font-semibold text-slate-800 dark:text-slate-200">
                          {formatDateDdMmYyyy(item.expense_date)}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge className="bg-blue-500/15 text-blue-600 dark:text-sky-300 border border-blue-500/30 text-[10.5px]">
                            {translateCategory(item.category)}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-slate-900 dark:text-amber-400 whitespace-nowrap">
                          {formatDisplayMoney(item.amount_riel, currencyMode)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 max-w-[180px] truncate">
                          {item.title}
                          {item.note && item.note !== item.title ? ` (${item.note})` : ''}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSingleInvoiceItem(item);
                                setReportPrintMode('invoice');
                                setShowInvoiceModal(true);
                              }}
                              className="p-1.5 rounded-full bg-blue-600/15 hover:bg-blue-600/25 text-blue-600 dark:text-sky-400"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStartEditSingle(item)}
                              className="p-1.5 rounded-full bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteExpense(item)}
                              className="p-1.5 rounded-full bg-rose-500/15 hover:bg-rose-500/25 text-rose-500"
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
                  <tfoot className="sticky bottom-0 bg-slate-100/95 dark:bg-[#091426]/95 font-bold border-t border-slate-200 dark:border-white/10">
                    <tr>
                      <td colSpan={3} className="py-2.5 px-3 text-right">
                        {isKh ? 'សរុបរួម៖' : 'Total:'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-blue-600 dark:text-amber-400 whitespace-nowrap">
                        {formatDisplayMoney(filteredTotalRiel, currencyMode)}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          ) : (
            <div className="w-full max-h-[340px] overflow-y-auto overflow-x-auto rounded-2xl border border-slate-200/70 dark:border-white/10 scrollbar-thin">
              <table className="w-full text-xs text-left border-collapse min-w-[520px]">
                <thead className="sticky top-0 z-10 bg-slate-100/95 dark:bg-[#091426]/95 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-white/10">
                  <tr>
                    <th className="py-2.5 px-3 w-10">{isKh ? 'ល.រ' : '#'}</th>
                    <th className="py-2.5 px-3">{isKh ? 'មុខទំនិញចំណាយ' : 'Category'}</th>
                    <th className="py-2.5 px-3 text-center">
                      {isKh ? 'ចំនួនដង' : 'Count'}
                    </th>
                    <th className="py-2.5 px-3 text-center">
                      {isKh ? 'ខែចំណាយខ្ពស់បំផុត' : 'Peak Month'}
                    </th>
                    <th className="py-2.5 px-3 text-right">
                      {isKh ? 'ទឹកប្រាក់សរុប' : 'Total Spent'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-white/10">
                  {categories.map((cat, idx) => {
                    const info = analyticsByYearAndCategory.categoryTotalsInPeriod[cat] || {
                      amount: 0,
                      count: 0,
                      peakMonth: '01',
                      peakAmt: 0
                    };
                    const peakMObj = MONTHS_DATA.find((m) => m.num === info.peakMonth);
                    const colorHex = CHART_PALETTE[idx % CHART_PALETTE.length];

                    return (
                      <tr
                        key={cat}
                        onClick={() => {
                          setFilterCategory((prev) => (prev === cat ? 'ALL' : cat));
                          setTableViewTab('transactions');
                        }}
                        className="hover:bg-sky-50/40 dark:hover:bg-white/5 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-3 font-bold text-slate-500">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                            {renderCategoryIcon(cat, colorHex)}
                            <span>{translateCategory(cat)}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-600 dark:text-slate-300">
                          {info.count} {isKh ? 'ដង' : ''}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {info.peakAmt > 0 ? (
                            <span className="text-[11px] font-bold text-rose-500 dark:text-rose-400">
                              {isKh ? peakMObj?.fullKm : peakMObj?.en} (
                              {formatCompactMoney(info.peakAmt, currencyMode)})
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-blue-600 dark:text-amber-400">
                          {formatDisplayMoney(info.amount, currencyMode)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Card: Compact, Sleek 4 Action Buttons + Slogan */}
        <div className="lg:col-span-5 flex flex-col gap-3.5">
          <div className={cn('rounded-3xl p-4 space-y-3', glassCardClass)}>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-500 dark:text-sky-400 flex items-center justify-center shrink-0">
                <Printer className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="font-moul-kh text-xs text-slate-900 dark:text-white truncate">
                  {isKh ? 'ព្រីនវិក្កយបត្រ & របាយការណ៍' : 'Print Invoice & Report'}
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-300 truncate">
                  {getFilterPeriodLabel()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSingleInvoiceItem(null);
                  setReportPrintMode('invoice');
                  setShowInvoiceModal(true);
                }}
                className="flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white shadow-sm transition-all active:scale-95 text-center"
              >
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                  <Printer className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="text-[10px] font-extrabold leading-tight">
                  <div>Print</div>
                  <div>Invoice</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSingleInvoiceItem(null);
                  setReportPrintMode('monthly');
                  setShowInvoiceModal(true);
                }}
                className="flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-gradient-to-b from-emerald-500 to-green-700 hover:from-emerald-600 hover:to-green-800 text-white shadow-sm transition-all active:scale-95 text-center"
              >
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                  <FileText className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="text-[10px] font-extrabold leading-tight">
                  <div>Monthly</div>
                  <div>Report (PDF)</div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleExportExcelCsv}
                className="flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-gradient-to-b from-purple-500 to-indigo-700 hover:from-purple-600 hover:to-indigo-800 text-white shadow-sm transition-all active:scale-95 text-center"
              >
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                  <FileSpreadsheet className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="text-[10px] font-extrabold leading-tight">
                  <div>Export</div>
                  <div>Excel</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSingleInvoiceItem(null);
                  setReportPrintMode('summary');
                  setShowInvoiceModal(true);
                }}
                className="flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-gradient-to-b from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-sm transition-all active:scale-95 text-center"
              >
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                  <BarChart3 className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="text-[10px] font-extrabold leading-tight">
                  <div>Print</div>
                  <div>Summary</div>
                </div>
              </button>
            </div>
          </div>

          <div className={cn('rounded-3xl p-3.5 flex items-center justify-center gap-2.5 text-center', glassCardClass)}>
            <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="text-[11px] font-extrabold text-slate-800 dark:text-emerald-300">
                ការគ្រប់គ្រងចំណាយមានប្រសិទ្ធភាព ដើម្បីអនាគតរបស់មណ្ឌលយើង!
              </p>
              <p className="text-[10px] font-semibold italic text-slate-500 dark:text-slate-300">
                Manage Expenses Wisely for a Better Community!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Print Modal & A4 Portal */}
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
                  {reportPrintMode === 'summary'
                    ? 'របាយការណ៍សង្ខេបការចំណាយមណ្ឌលនិស្សិត BIPA'
                    : 'វិក្កយបត្ររបាយការណ៍ចំណាយមណ្ឌលនិស្សិត BIPA'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs h-8 px-4 rounded-xl"
                >
                  <Printer className="h-3.5 w-3.5 mr-1.5" />
                  {isKh ? 'បោះពុម្ព (Print A4)' : 'Print A4'}
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
                        {reportPrintMode === 'summary'
                          ? 'របាយការណ៍សង្ខេបចំណាយតាមប្រភេទមណ្ឌលនិស្សិត'
                          : 'វិក្កយបត្ររបាយការណ៍ចំណាយមណ្ឌលនិស្សិត'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-xs space-y-0.5">
                    <div className="font-bold text-slate-900">
                      កាលបរិច្ឆេទបោះពុម្ព៖ {formatDateDdMmYyyy(todayStr)}
                    </div>
                    <div className="text-slate-600">
                      {singleInvoiceItem
                        ? `កាលបរិច្ឆេទចំណាយ៖ ${formatDateDdMmYyyy(singleInvoiceItem.expense_date)}`
                        : getFilterPeriodLabel()}
                    </div>
                  </div>
                </div>

                {reportPrintMode === 'summary' ? (
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-900 font-bold">
                        <th className="py-2 px-3 border border-slate-300 text-center w-12">ល.រ</th>
                        <th className="py-2 px-3 border border-slate-300">ប្រភេទចំណាយ</th>
                        <th className="py-2 px-3 border border-slate-300 text-center">ចំនួនដង</th>
                        <th className="py-2 px-3 border border-slate-300 text-right">ទឹកប្រាក់សរុប</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((cat, i) => {
                        const info = analyticsByYearAndCategory.categoryTotalsInPeriod[cat] || {
                          amount: 0,
                          count: 0
                        };
                        return (
                          <tr key={cat}>
                            <td className="py-2 px-3 border border-slate-300 text-center">
                              {i + 1}
                            </td>
                            <td className="py-2 px-3 border border-slate-300 font-bold">
                              {cat}
                            </td>
                            <td className="py-2 px-3 border border-slate-300 text-center">
                              {info.count}
                            </td>
                            <td className="py-2 px-3 border border-slate-300 text-right font-bold">
                              {formatDisplayMoney(info.amount, currencyMode)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-amber-100/70 font-bold text-slate-950">
                        <td colSpan={3} className="py-2.5 px-3 border border-slate-300 text-right">
                          សរុបទឹកប្រាក់ចំណាយរួម៖
                        </td>
                        <td className="py-2.5 px-3 border border-slate-300 text-right text-sm font-black">
                          {formatDisplayMoney(filteredTotalRiel, currencyMode)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                ) : (
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-900 font-bold">
                        <th className="py-2 px-2.5 border border-slate-300 text-center w-10">ល.រ</th>
                        <th className="py-2 px-2.5 border border-slate-300">កាលបរិច្ឆេទ</th>
                        <th className="py-2 px-2.5 border border-slate-300">ប្រភេទ</th>
                        <th className="py-2 px-2.5 border border-slate-300">បរិយាយមុខទំនិញ</th>
                        <th className="py-2 px-2.5 border border-slate-300 text-center">បរិមាណ</th>
                        <th className="py-2 px-2.5 border border-slate-300 text-right">ទឹកប្រាក់</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceItemsToPrint.map((item, i) => (
                        <tr key={item.id}>
                          <td className="py-2 px-2.5 border border-slate-300 text-center">
                            {i + 1}
                          </td>
                          <td className="py-2 px-2.5 border border-slate-300 whitespace-nowrap">
                            {formatDateDdMmYyyy(item.expense_date)}
                          </td>
                          <td className="py-2 px-2.5 border border-slate-300">
                            {item.category}
                          </td>
                          <td className="py-2 px-2.5 border border-slate-300">
                            <span className="font-bold">{item.title}</span>
                            {item.note && item.note !== item.title ? ` (${item.note})` : ''}
                          </td>
                          <td className="py-2 px-2.5 border border-slate-300 text-center">
                            {item.quantity}
                          </td>
                          <td className="py-2 px-2.5 border border-slate-300 text-right font-bold">
                            {formatDisplayMoney(item.amount_riel, currencyMode)}
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
                          {formatDisplayMoney(invoiceTotalRiel, currencyMode)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}

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
                      {reportPrintMode === 'summary'
                        ? 'របាយការណ៍សង្ខេបចំណាយតាមប្រភេទមណ្ឌលនិស្សិត'
                        : 'វិក្កយបត្ររបាយការណ៍ចំណាយមណ្ឌលនិស្សិត'}
                    </p>
                  </div>
                </div>
                <div className="text-right text-xs space-y-0.5">
                  <div className="font-bold">
                    កាលបរិច្ឆេទបោះពុម្ព៖ {formatDateDdMmYyyy(todayStr)}
                  </div>
                  <div>
                    {singleInvoiceItem
                      ? `កាលបរិច្ឆេទចំណាយ៖ ${formatDateDdMmYyyy(singleInvoiceItem.expense_date)}`
                      : getFilterPeriodLabel()}
                  </div>
                </div>
              </div>

              {reportPrintMode === 'summary' ? (
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 font-bold">
                      <th className="py-2 px-3 border border-slate-400 text-center w-12">ល.រ</th>
                      <th className="py-2 px-3 border border-slate-400">ប្រភេទចំណាយ</th>
                      <th className="py-2 px-3 border border-slate-400 text-center">ចំនួនដង</th>
                      <th className="py-2 px-3 border border-slate-400 text-right">ទឹកប្រាក់សរុប</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat, i) => {
                      const info = analyticsByYearAndCategory.categoryTotalsInPeriod[cat] || {
                        amount: 0,
                        count: 0
                      };
                      return (
                        <tr key={cat}>
                          <td className="py-2 px-3 border border-slate-400 text-center">
                            {i + 1}
                          </td>
                          <td className="py-2 px-3 border border-slate-400 font-bold">
                            {cat}
                          </td>
                          <td className="py-2 px-3 border border-slate-400 text-center">
                            {info.count}
                          </td>
                          <td className="py-2 px-3 border border-slate-400 text-right font-bold">
                            {formatDisplayMoney(info.amount, currencyMode)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold">
                      <td colSpan={3} className="py-2.5 px-3 border border-slate-400 text-right">
                        សរុបទឹកប្រាក់ចំណាយរួម៖
                      </td>
                      <td className="py-2.5 px-3 border border-slate-400 text-right text-sm font-black">
                        {formatDisplayMoney(filteredTotalRiel, currencyMode)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 font-bold">
                      <th className="py-2 px-2.5 border border-slate-400 text-center w-10">ល.រ</th>
                      <th className="py-2 px-2.5 border border-slate-400">កាលបរិច្ឆេទ</th>
                      <th className="py-2 px-2.5 border border-slate-400">ប្រភេទ</th>
                      <th className="py-2 px-2.5 border border-slate-400">បរិយាយមុខទំនិញ</th>
                      <th className="py-2 px-2.5 border border-slate-400 text-center">បរិមាណ</th>
                      <th className="py-2 px-2.5 border border-slate-400 text-right">ទឹកប្រាក់</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceItemsToPrint.map((item, i) => (
                      <tr key={item.id}>
                        <td className="py-2 px-2.5 border border-slate-400 text-center">
                          {i + 1}
                        </td>
                        <td className="py-2 px-2.5 border border-slate-400 whitespace-nowrap">
                          {formatDateDdMmYyyy(item.expense_date)}
                        </td>
                        <td className="py-2 px-2.5 border border-slate-400">
                          {item.category}
                        </td>
                        <td className="py-2 px-2.5 border border-slate-400">
                          <span className="font-bold">{item.title}</span>
                          {item.note && item.note !== item.title ? ` (${item.note})` : ''}
                        </td>
                        <td className="py-2 px-2.5 border border-slate-400 text-center">
                          {item.quantity}
                        </td>
                        <td className="py-2 px-2.5 border border-slate-400 text-right font-bold">
                          {formatDisplayMoney(item.amount_riel, currencyMode)}
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
                        {formatDisplayMoney(invoiceTotalRiel, currencyMode)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}

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