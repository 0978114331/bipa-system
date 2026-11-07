import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Building2,
  QrCode,
  DollarSign,
  CalendarClock,
  FileText,
  Package,
  Megaphone,
  Settings,
  GraduationCap,
  ClipboardList,
  LayoutTemplate,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Heart,
  Save,
  TrendingUp,
  PieChart,
  ArrowLeft,
  ArrowRight,
  Copy,
  Check,
  X,
  KeyRound,
  Mail,
  CheckCircle2,
  Link2
} from 'lucide-react';
import { UserRole } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  HomeBannerItem,
  HomeNewsItem,
  fetchHomeContentFromDb,
  HOME_BANNERS_STORAGE_KEY,
  HOME_NEWS_STORAGE_KEY
} from '@/pages/public/HomePage';
import { ResidenceManagerPanel } from '@/pages/public/ResidenceInfoPage';
import { DutyRosterAdminPanel, DutyScheduleUserView } from '@/components/duty/DutyScheduleSystem';
import {
  PaymentAdminDashboard,
  PaymentStudentView
} from '@/components/payment/PaymentManagementSystem';
import { RiceAdminDashboard, RiceStudentView } from '@/components/rice/RiceContributionSystem';
import { LeaveAdminDashboard } from '@/components/leave/LeaveRequestSystem';
import { AdminUserPasswordDashboard } from '@/components/security/StudentSecuritySystem';

interface NavItem {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
  roles: UserRole[];
}

export interface ContactMessageItem {
  id: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

export interface BipaContactConfig {
  email: string;
  phoneDisplayKm: string;
  phoneDial: string;
  addressKm: string;
  addressEn: string;
  websiteDisplay: string;
  websiteUrl: string;
  facebookPageName: string;
  facebookUrl: string;
  youtubeName: string;
  youtubeUrl: string;
  telegramName: string;
  telegramUrl: string;
  mapUrl: string;
}

export const CONTACT_MESSAGES_STORAGE_KEY = 'bipa_contact_messages_v1';
export const CONTACT_CONFIG_STORAGE_KEY = 'bipa_contact_config_v1';

export const defaultBipaContactConfig: BipaContactConfig = {
  email: 'info@bunong.org',
  phoneDisplayKm: '(៨៥៥) ៩៩ ៩៨៧ ៤៥១',
  phoneDial: '+85599987451',
  addressKm:
    'ផ្ទះលេខBE0E1E2 ភូមិត្នោតជ្រុំ សង្កាត់បឹងទំពុនទី២, ខណ្ឌមានជ័យ, រាជធានីភ្នំពេញ',
  addressEn:
    'House #BE0E1E2, Tnaot Chrum Village, Sangkat Boeng Tumpun 2, Khan Meanchey, Phnom Penh',
  websiteDisplay: 'www.bunong.org',
  websiteUrl: 'https://www.bunong.org',
  facebookPageName: 'The Bunong Indigenous People Association',
  facebookUrl: 'https://www.facebook.com/search/top?q=The%20Bunong%20Indigenous%20People%20Association',
  youtubeName: 'BIPA Official Channel',
  youtubeUrl: 'https://www.youtube.com',
  telegramName: 'BIPA Telegram',
  telegramUrl: 'https://t.me/+85599987451',
  mapUrl:
    'https://www.google.com/maps/search/?api=1&query=Boeng+Tumpun+2+Meanchey+Phnom+Penh'
};

const CHART_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ec4899',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#14b8a6'
];

export function loadCachedContactConfig(): BipaContactConfig {
  try {
    const raw = localStorage.getItem(CONTACT_CONFIG_STORAGE_KEY);
    if (!raw) return defaultBipaContactConfig;
    const parsed = JSON.parse(raw);
    return {
      ...defaultBipaContactConfig,
      ...parsed
    };
  } catch {
    return defaultBipaContactConfig;
  }
}

export async function fetchContactConfigFromDb(): Promise<BipaContactConfig> {
  let current = loadCachedContactConfig();
  try {
    const { data: setRow } = await supabase
      .from('bipa_settings')
      .select('name_en')
      .eq('id', 'contact_config_v1')
      .maybeSingle();

    if (setRow && setRow.name_en) {
      const parsed = JSON.parse(setRow.name_en);
      if (parsed && typeof parsed === 'object') {
        current = {
          ...defaultBipaContactConfig,
          ...parsed
        };
        localStorage.setItem(CONTACT_CONFIG_STORAGE_KEY, JSON.stringify(current));
      }
    }
  } catch {}
  return current;
}

export async function saveContactConfigToDb(config: BipaContactConfig): Promise<void> {
  const jsonStr = JSON.stringify(config);
  localStorage.setItem(CONTACT_CONFIG_STORAGE_KEY, jsonStr);
  try {
    await supabase.from('bipa_settings').upsert({
      id: 'contact_config_v1',
      logo_url: 'CONTACT_CONFIG',
      name_km: 'ការកំណត់ព័ត៌មានទំនាក់ទំនង BIPA',
      name_en: jsonStr
    });
  } catch {}
  window.dispatchEvent(new Event('contact-config-updated'));
}

export async function fetchContactMessagesFromDb(): Promise<ContactMessageItem[]> {
  let list: ContactMessageItem[] = [];
  try {
    const raw = localStorage.getItem(CONTACT_MESSAGES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed;
    }
  } catch {}

  try {
    const { data: setRow } = await supabase
      .from('bipa_settings')
      .select('name_en')
      .eq('id', 'contact_messages_v1')
      .maybeSingle();

    if (setRow && setRow.name_en) {
      const parsed = JSON.parse(setRow.name_en);
      if (Array.isArray(parsed)) {
        list = parsed;
        localStorage.setItem(CONTACT_MESSAGES_STORAGE_KEY, JSON.stringify(list));
      }
    }
  } catch {}

  return list;
}

export async function saveContactMessagesToDb(list: ContactMessageItem[]): Promise<void> {
  const jsonStr = JSON.stringify(list);
  localStorage.setItem(CONTACT_MESSAGES_STORAGE_KEY, jsonStr);
  try {
    await supabase.from('bipa_settings').upsert({
      id: 'contact_messages_v1',
      logo_url: 'CONTACT_INBOX',
      name_km: 'ប្រអប់សារទំនាក់ទំនង',
      name_en: jsonStr
    });
  } catch {}
  window.dispatchEvent(new Event('contact-messages-updated'));
}

export function GlobalFooterContactEnhancer() {
  const [cfg, setCfg] = useState<BipaContactConfig>(() => loadCachedContactConfig());

  useEffect(() => {
    const load = () => {
      fetchContactConfigFromDb().then(setCfg);
    };
    load();
    window.addEventListener('contact-config-updated', load);
    return () => window.removeEventListener('contact-config-updated', load);
  }, []);

  useEffect(() => {
    const syncFooterNodes = () => {
      const footerNodes = Array.from(
        document.querySelectorAll('footer *, main *')
      ) as HTMLElement[];

      footerNodes.forEach((el) => {
        if (el.children.length > 0) return;
        const txt = (el.textContent || '').trim();
        if (
          txt === 'Khouvchvea123@gmail.com' ||
          txt === 'residence@example.edu'
        ) {
          el.textContent = cfg.email;
        } else if (
          txt === '+855 978114331' ||
          txt === '+855 00 000 000'
        ) {
          el.textContent = cfg.phoneDisplayKm;
        } else if (txt === 'Phnom Penh, Cambodia') {
          el.textContent = cfg.addressKm;
        }
      });
    };

    syncFooterNodes();
    const timer = setInterval(syncFooterNodes, 1200);
    return () => clearInterval(timer);
  }, [cfg]);

  return null;
}

export function Sidebar() {
  const { profile } = useAuth();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const isKhmer = lang === 'km';

  const isHomeManagerRoute =
    location.search.includes('page=home-manager') ||
    location.hash === '#home-manager' ||
    location.pathname === '/admin/home-manager';

  const isUserPasswordsRoute =
    location.search.includes('page=user-passwords') ||
    location.pathname === '/admin/user-passwords';

  const isResidenceManagerRoute = location.pathname.startsWith('/admin/residences');
  const isSettingsRoute = location.pathname.startsWith('/admin/settings');

  const [showHomeManager, setShowHomeManager] = useState(isHomeManagerRoute);
  const [manageTab, setManageTab] = useState<'news' | 'banners' | 'settings'>('news');
  const [settingsSectionTab, setSettingsSectionTab] = useState<'inbox' | 'contact' | 'system'>(
    'inbox'
  );

  const [banners, setBanners] = useState<HomeBannerItem[]>([]);
  const [newsList, setNewsList] = useState<HomeNewsItem[]>([]);
  const [inboxMessages, setInboxMessages] = useState<ContactMessageItem[]>([]);
  const [contactCfg, setContactCfg] = useState<BipaContactConfig>(() =>
    loadCachedContactConfig()
  );

  const [hoveredPointIdx, setHoveredPointIdx] = useState<number | null>(null);
  const [bannerToast, setBannerToast] = useState('');

  const [editingNews, setEditingNews] = useState<HomeNewsItem | null>(null);
  const [formTitleKm, setFormTitleKm] = useState('');
  const [formTitleEn, setFormTitleEn] = useState('');
  const [formSubtitleKm, setFormSubtitleKm] = useState('');
  const [formDescKm, setFormDescKm] = useState('');
  const [formDescEn, setFormDescEn] = useState('');
  const [formDateKm, setFormDateKm] = useState('');
  const [formDateEn, setFormDateEn] = useState('');
  const [formImagesText, setFormImagesText] = useState('');
  const [formFbUrl, setFormFbUrl] = useState('');
  const [formYtUrl, setFormYtUrl] = useState('');

  const [newBannerUrl, setNewBannerUrl] = useState('');
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [copiedBannerId, setCopiedBannerId] = useState<string | null>(null);

  const [sysLogo, setSysLogo] = useState('');
  const [sysNameKm, setSysNameKm] = useState('');
  const [sysNameEn, setSysNameEn] = useState('');

  useEffect(() => {
    setShowHomeManager(isHomeManagerRoute);
  }, [isHomeManagerRoute]);

  const showBannerFeedback = (msg: string) => {
    setBannerToast(msg);
    setTimeout(() => setBannerToast(''), 3000);
  };

  const loadHomeData = async () => {
    const data = await fetchHomeContentFromDb();
    let finalBanners = data.banners;

    try {
      const { data: backupRow } = await supabase
        .from('bipa_settings')
        .select('name_en')
        .eq('id', 'home_banners_override_v1')
        .maybeSingle();

      if (backupRow && backupRow.name_en) {
        const parsedBanners = JSON.parse(backupRow.name_en);
        if (Array.isArray(parsedBanners)) {
          finalBanners = parsedBanners;
          localStorage.setItem(HOME_BANNERS_STORAGE_KEY, JSON.stringify(finalBanners));
        }
      }
    } catch {}

    setBanners(finalBanners);
    setNewsList(data.news);

    try {
      const { data: setDb } = await supabase
        .from('bipa_settings')
        .select('*')
        .eq('id', '1')
        .single();
      if (setDb) {
        setSysLogo(setDb.logo_url || '');
        setSysNameKm(setDb.name_km || '');
        setSysNameEn(setDb.name_en || '');
      }
    } catch {}
  };

  const loadSettingsAndInboxData = async () => {
    const [msgs, cfgData] = await Promise.all([
      fetchContactMessagesFromDb(),
      fetchContactConfigFromDb()
    ]);
    setInboxMessages(msgs);
    setContactCfg(cfgData);

    try {
      const { data: setDb } = await supabase
        .from('bipa_settings')
        .select('*')
        .eq('id', '1')
        .single();
      if (setDb) {
        setSysLogo(setDb.logo_url || '');
        setSysNameKm(setDb.name_km || '');
        setSysNameEn(setDb.name_en || '');
      }
    } catch {}
  };

  useEffect(() => {
    loadSettingsAndInboxData();
    const syncCustomBannersOnMount = async () => {
      try {
        const { data: backupRow } = await supabase
          .from('bipa_settings')
          .select('name_en')
          .eq('id', 'home_banners_override_v1')
          .maybeSingle();

        if (backupRow && backupRow.name_en) {
          localStorage.setItem(HOME_BANNERS_STORAGE_KEY, backupRow.name_en);
          window.dispatchEvent(new Event('home-content-updated'));
        }
      } catch {}
    };
    syncCustomBannersOnMount();

    const handleInboxUpdate = () => {
      fetchContactMessagesFromDb().then(setInboxMessages);
    };
    window.addEventListener('contact-messages-updated', handleInboxUpdate);
    return () => window.removeEventListener('contact-messages-updated', handleInboxUpdate);
  }, []);

  useEffect(() => {
    if (showHomeManager) {
      loadHomeData();
    }
  }, [showHomeManager]);

  useEffect(() => {
    if (isSettingsRoute) {
      loadSettingsAndInboxData();
    }
  }, [isSettingsRoute]);

  const handleSaveSettings = async () => {
    try {
      await supabase.from('bipa_settings').upsert({
        id: '1',
        logo_url: sysLogo,
        name_km: sysNameKm,
        name_en: sysNameEn
      });
      window.dispatchEvent(new Event('system-settings-updated'));
      showBannerFeedback('បានរក្សាទុកការកំណត់ប្រព័ន្ធដោយជោគជ័យ!');
    } catch (error) {
      console.error(error);
    }
  };

  const handleSaveContactConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveContactConfigToDb(contactCfg);
    showBannerFeedback('បានរក្សាទុកព័ត៌មានទំនាក់ទំនង និងលីងបណ្តាញសង្គមដោយជោគជ័យ!');
  };

  const openEditNewsForm = (item?: HomeNewsItem) => {
    if (item) {
      setEditingNews(item);
      setFormTitleKm(item.title_km || '');
      setFormTitleEn(item.title_en || '');
      setFormSubtitleKm(item.subtitle_km || '');
      setFormDescKm(item.description_km || '');
      setFormDescEn(item.description_en || '');
      setFormDateKm(item.date_text_km || '');
      setFormDateEn(item.date_text_en || '');
      setFormImagesText(item.images ? item.images.join('\n') : '');
      setFormFbUrl(item.facebook_url || '');
      setFormYtUrl(item.youtube_url || '');
    } else {
      setEditingNews(null);
      setFormTitleKm('');
      setFormTitleEn('');
      setFormSubtitleKm('');
      setFormDescKm('');
      setFormDescEn('');
      setFormDateKm(
        new Date().toLocaleDateString('km-KH', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      );
      setFormDateEn(
        new Date().toLocaleDateString('en-US', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })
      );
      setFormImagesText('');
      setFormFbUrl('');
      setFormYtUrl('');
    }
  };

  const handleSaveNewsItem = async () => {
    if (!formTitleKm.trim() || !formDescKm.trim()) return;
    const imgArray = formImagesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const itemData: HomeNewsItem = {
      id: editingNews ? editingNews.id : `news-${Date.now()}`,
      title_km: formTitleKm.trim(),
      title_en: formTitleEn.trim() || formTitleKm.trim(),
      subtitle_km: formSubtitleKm.trim() || formTitleKm.trim(),
      subtitle_en: formTitleEn.trim() || formTitleKm.trim(),
      description_km: formDescKm.trim(),
      description_en: formDescEn.trim() || formDescKm.trim(),
      date_text_km: formDateKm.trim() || 'ថ្ងៃនេះ',
      date_text_en: formDateEn.trim() || 'Today',
      views: editingNews ? editingNews.views : 1,
      likes: editingNews ? editingNews.likes : 0,
      images: imgArray,
      facebook_url: formFbUrl.trim(),
      youtube_url: formYtUrl.trim()
    };

    const nextList = editingNews
      ? newsList.map((n) => (n.id === editingNews.id ? itemData : n))
      : [itemData, ...newsList];

    setNewsList(nextList);
    localStorage.setItem(HOME_NEWS_STORAGE_KEY, JSON.stringify(nextList));

    try {
      await supabase.from('bipa_home_news').upsert([itemData]);
    } catch {}

    openEditNewsForm(undefined);
    window.dispatchEvent(new Event('home-content-updated'));
    showBannerFeedback('បានរក្សាទុកព័ត៌មានដោយជោគជ័យ!');
  };

  const handleDeleteNewsItem = async (id: string) => {
    if (!window.confirm('តើអ្នកពិតជាចង់លុបព័ត៌មាននេះមែនទេ?')) return;
    const nextList = newsList.filter((n) => n.id !== id);
    setNewsList(nextList);
    localStorage.setItem(HOME_NEWS_STORAGE_KEY, JSON.stringify(nextList));
    try {
      await supabase.from('bipa_home_news').delete().eq('id', id);
    } catch {}
    window.dispatchEvent(new Event('home-content-updated'));
    showBannerFeedback('បានលុបព័ត៌មានដោយជោគជ័យ!');
  };

  const persistBannersPermanently = async (
    nextBanners: HomeBannerItem[],
    feedbackText?: string
  ) => {
    setBanners(nextBanners);
    const jsonStr = JSON.stringify(nextBanners);
    localStorage.setItem(HOME_BANNERS_STORAGE_KEY, jsonStr);

    try {
      await supabase.from('bipa_settings').upsert({
        id: 'home_banners_override_v1',
        logo_url: 'HOME_BANNERS_OVERRIDE',
        name_km: 'BIPA Home Banners',
        name_en: jsonStr
      });
    } catch {}

    try {
      const { data: existingRows } = await supabase.from('bipa_home_banners').select('id');
      if (existingRows && existingRows.length > 0) {
        const keepIds = new Set(nextBanners.map((b) => b.id));
        const idsToDelete = existingRows
          .map((r: any) => String(r.id))
          .filter((id) => !keepIds.has(id));

        if (idsToDelete.length > 0) {
          await supabase.from('bipa_home_banners').delete().in('id', idsToDelete);
        }
      }

      if (nextBanners.length > 0) {
        const toUpsert = nextBanners.map((b, idx) => ({
          id: b.id,
          image_url: b.image_url,
          title_km: b.title_km || '',
          title_en: b.title_en || '',
          link_url: b.link_url || '',
          sort_order: idx
        }));
        await supabase.from('bipa_home_banners').upsert(toUpsert);
      }
    } catch {}

    window.dispatchEvent(new Event('home-content-updated'));
    if (feedbackText) {
      showBannerFeedback(feedbackText);
    }
  };

  const handleAddOrUpdateBanner = async () => {
    if (!newBannerUrl.trim()) return;

    if (editingBannerId) {
      const updated = banners.map((b) =>
        b.id === editingBannerId ? { ...b, image_url: newBannerUrl.trim() } : b
      );
      setEditingBannerId(null);
      setNewBannerUrl('');
      await persistBannersPermanently(updated, 'បានកែប្រែ Link រូប Banner ដោយជោគជ័យ!');
      return;
    }

    const newB: HomeBannerItem = {
      id: `banner-${Date.now()}`,
      image_url: newBannerUrl.trim()
    };
    const nextBanners = [...banners, newB];
    setNewBannerUrl('');
    await persistBannersPermanently(nextBanners, 'បានបន្ថែមរូប Banner ថ្មីដោយជោគជ័យ!');
  };

  const handleStartEditBanner = (banner: HomeBannerItem) => {
    setEditingBannerId(banner.id);
    setNewBannerUrl(banner.image_url);
  };

  const handleCancelEditBanner = () => {
    setEditingBannerId(null);
    setNewBannerUrl('');
  };

  const handleMoveBanner = async (index: number, direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= banners.length) return;
    const nextBanners = [...banners];
    const temp = nextBanners[index];
    nextBanners[index] = nextBanners[targetIdx];
    nextBanners[targetIdx] = temp;
    await persistBannersPermanently(nextBanners, 'បានប្តូរទីតាំងរូប Banner រួចរាល់!');
  };

  const handleCopyBannerUrl = (banner: HomeBannerItem) => {
    navigator.clipboard.writeText(banner.image_url).then(() => {
      setCopiedBannerId(banner.id);
      setTimeout(() => setCopiedBannerId(null), 1800);
    });
  };

  const handleDeleteBanner = async (id: string) => {
    if (!window.confirm('តើអ្នកពិតជាចង់លុបរូប Banner នេះមែនទេ?')) return;
    const nextBanners = banners.filter((b) => b.id !== id);
    if (editingBannerId === id) {
      setEditingBannerId(null);
      setNewBannerUrl('');
    }
    await persistBannersPermanently(nextBanners, 'បានលុបរូប Banner ចេញជាអចិន្ត្រៃយ៍!');
  };

  const handleSaveBanners = async () => {
    await persistBannersPermanently(banners, 'បានរក្សាទុករូប Banner ទាំងអស់ដោយជោគជ័យ!');
  };

  const handleMarkMessageRead = async (msgId: string) => {
    const next = inboxMessages.map((m) => (m.id === msgId ? { ...m, isRead: true } : m));
    setInboxMessages(next);
    await saveContactMessagesToDb(next);
  };

  const handleDeleteContactMessage = async (msgId: string) => {
    if (!window.confirm('តើអ្នកពិតជាចង់លុបសារនេះមែនទេ?')) return;
    const next = inboxMessages.filter((m) => m.id !== msgId);
    setInboxMessages(next);
    await saveContactMessagesToDb(next);
    showBannerFeedback('បានលុបសារទំនាក់ទំនងរួចរាល់!');
  };

  const adminItems: NavItem[] = [
    {
      label: t('dashboard.overview'),
      path: '/admin',
      icon: LayoutDashboard,
      roles: ['super_admin', 'residence_admin', 'finance_admin', 'duty_manager']
    },
    {
      label: isKhmer ? 'គ្រប់គ្រងទំព័រដើម (Home)' : 'Manage Home',
      path: '/admin?page=home-manager',
      icon: LayoutTemplate,
      roles: ['super_admin', 'residence_admin', 'finance_admin', 'duty_manager']
    },
    {
      label: t('feature.studentInfo'),
      path: '/admin/students',
      icon: Users,
      roles: ['super_admin', 'residence_admin']
    },
    {
      label: isKhmer ? 'គ្រប់គ្រង User' : 'User Management',
      path: '/admin?page=user-passwords',
      icon: KeyRound,
      roles: ['super_admin', 'residence_admin', 'finance_admin', 'duty_manager']
    },
    {
      label: t('feature.facilities'),
      path: '/admin/residences',
      icon: Building2,
      roles: ['super_admin', 'residence_admin', 'finance_admin', 'duty_manager']
    },
    {
      label: t('feature.qrAttendance'),
      path: '/admin/attendance',
      icon: QrCode,
      roles: ['super_admin', 'residence_admin', 'duty_manager']
    },
    {
      label: t('feature.payments'),
      path: '/admin/payments',
      icon: DollarSign,
      roles: ['super_admin', 'residence_admin', 'finance_admin']
    },
    {
      label: t('feature.duty'),
      path: '/admin/duties',
      icon: CalendarClock,
      roles: ['super_admin', 'residence_admin', 'duty_manager']
    },
    {
      label: t('feature.leave'),
      path: '/admin/leave-requests',
      icon: FileText,
      roles: ['super_admin', 'residence_admin']
    },
    {
      label: isKhmer ? 'របាយការណ៍បង់អង្ករនិស្សិត' : 'Student Rice Report',
      path: '/admin/assets',
      icon: Package,
      roles: ['super_admin', 'residence_admin', 'finance_admin', 'duty_manager']
    },
    {
      label: t('feature.announcements'),
      path: '/admin/announcements',
      icon: Megaphone,
      roles: ['super_admin', 'residence_admin', 'finance_admin', 'duty_manager']
    },
    {
      label: t('settings.title'),
      path: '/admin/settings',
      icon: Settings,
      roles: ['super_admin', 'residence_admin', 'finance_admin', 'duty_manager']
    }
  ];

  const studentItems: NavItem[] = [
    { label: t('dashboard.studentDashboard'), path: '/dashboard', icon: LayoutDashboard, roles: ['student'] },
    { label: t('feature.qrAttendance'), path: '/dashboard/scan', icon: QrCode, roles: ['student'] },
    { label: t('qr.history'), path: '/dashboard/attendance', icon: ClipboardList, roles: ['student'] },
    { label: t('feature.payments'), path: '/dashboard/payments', icon: DollarSign, roles: ['student'] },
    { label: t('feature.duty'), path: '/dashboard/duties', icon: CalendarClock, roles: ['student'] },
    { label: t('feature.leave'), path: '/dashboard/leave', icon: FileText, roles: ['student'] }
  ];

  const isAdminRole =
    profile && ['super_admin', 'residence_admin', 'finance_admin', 'duty_manager'].includes(profile.role);
  const items = isAdminRole ? adminItems : studentItems;
  const visibleItems = items.filter((item) => profile && item.roles.includes(profile.role));

  const isActive = (path: string) => {
    if (path === '/admin?page=home-manager') return showHomeManager;
    if (path === '/admin?page=user-passwords') return isUserPasswordsRoute;
    if (showHomeManager || isUserPasswordsRoute) return false;
    if (path === '/admin' || path === '/dashboard') {
      return (
        location.pathname === path &&
        !location.search.includes('page=home-manager') &&
        !location.search.includes('page=user-passwords')
      );
    }
    return location.pathname.startsWith(path);
  };

  const totalViews = newsList.reduce((acc, n) => acc + (n.views || 0), 0);
  const totalLikes = newsList.reduce((acc, n) => acc + (n.likes || 0), 0);
  const totalEngagement = Math.max(totalViews + totalLikes, 1);

  const chartItems = [...newsList].reverse();
  const maxStockVal = Math.max(...chartItems.map((n) => Math.max(n.views || 0, n.likes || 0)), 10);

  const svgWidth = 640;
  const svgHeight = 210;
  const padX = 36;
  const padY = 24;
  const plotW = svgWidth - padX * 2;
  const plotH = svgHeight - padY * 2;

  const getCoord = (idx: number, val: number, count: number) => {
    const x = count <= 1 ? padX + plotW / 2 : padX + (idx / (count - 1)) * plotW;
    const y = padY + plotH - (Math.min(val, maxStockVal) / maxStockVal) * plotH;
    return { x, y };
  };

  const viewCoords = chartItems.map((n, i) => getCoord(i, n.views || 0, chartItems.length));
  const likeCoords = chartItems.map((n, i) => getCoord(i, n.likes || 0, chartItems.length));

  const buildSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x - 20} ${pts[0].y} L ${pts[0].x + 20} ${pts[0].y}`;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const cX = (pts[i].x + pts[i + 1].x) / 2;
      d += ` C ${cX} ${pts[i].y}, ${cX} ${pts[i + 1].y}, ${pts[i + 1].x} ${pts[i + 1].y}`;
    }
    return d;
  };

  const buildAreaPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) {
      return `M ${pts[0].x - 20} ${padY + plotH} L ${pts[0].x - 20} ${pts[0].y} L ${pts[0].x + 20} ${pts[0].y} L ${pts[0].x + 20} ${padY + plotH} Z`;
    }
    const lineD = buildSmoothPath(pts);
    return `${lineD} L ${pts[pts.length - 1].x} ${padY + plotH} L ${pts[0].x} ${padY + plotH} Z`;
  };

  const donutRadius = 64;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let accumulatedPercent = 0;

  const donutSegments = newsList.slice(0, 6).map((item, index) => {
    const itemScore = (item.views || 0) + (item.likes || 0);
    const pct = totalEngagement > 0 ? itemScore / totalEngagement : 0;
    const strokeDasharray = `${pct * donutCircumference} ${donutCircumference}`;
    const strokeDashoffset = -accumulatedPercent * donutCircumference;
    accumulatedPercent += pct;
    return {
      id: item.id,
      title: item.title_km,
      views: item.views || 0,
      likes: item.likes || 0,
      percent: Math.round(pct * 100),
      color: CHART_COLORS[index % CHART_COLORS.length],
      strokeDasharray,
      strokeDashoffset
    };
  });

  const unreadInboxCount = inboxMessages.filter((m) => !m.isRead).length;
  const activeTabIndex = manageTab === 'news' ? 0 : manageTab === 'banners' ? 1 : 2;

  return (
    <>
      <GlobalFooterContactEnhancer />

      {bannerToast && (
        <div className="fixed top-20 right-4 z-[250] px-4 py-3 rounded-2xl bg-emerald-950/95 border border-emerald-500 text-emerald-300 shadow-2xl flex items-center gap-2 text-xs sm:text-sm font-black animate-in slide-in-from-top-3 duration-200 font-khmer">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span>{bannerToast}</span>
        </div>
      )}

      {location.pathname.startsWith('/admin/students') && (
        <style>{`
          @media screen and (max-width: 768px) {
            main > div {
              padding-left: 0.25rem !important;
              padding-right: 0.25rem !important;
              padding-top: 0.25rem !important;
            }
          }
          @media screen {
            main table {
              border-collapse: separate !important;
              border-spacing: 0 !important;
            }
            main table thead th {
              position: sticky !important;
              top: 0 !important;
              z-index: 20 !important;
              background-color: #f3d078 !important;
            }
            main div:has(> table) {
              max-height: 64vh !important;
              overflow-y: auto !important;
              overflow-x: auto !important;
              -webkit-overflow-scrolling: touch !important;
              border-radius: 0.75rem;
            }
          }
          @media print {
            main div:has(> table) {
              max-height: none !important;
              overflow: visible !important;
            }
          }
        `}</style>
      )}

      <aside className="hidden lg:flex w-64 shrink-0 border-r bg-card flex-col z-40 sticky top-20 h-[calc(100vh-5rem)] overflow-hidden">
        <div className="p-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-navy-gradient">
              <GraduationCap className="h-5 w-5 text-gold" />
            </div>
            <span className="text-sm font-semibold">
              {isAdminRole ? t('dashboard.adminDashboard') : t('dashboard.studentDashboard')}
            </span>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
          {visibleItems.map((item) => (
            <button
              key={item.path}
              onClick={() => {
                if (item.path === '/admin?page=home-manager') {
                  openEditNewsForm(undefined);
                  setShowHomeManager(true);
                  navigate('/admin?page=home-manager');
                } else {
                  setShowHomeManager(false);
                  navigate(item.path);
                }
              }}
              className={cn(
                'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left',
                isActive(item.path)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </div>
              {item.path === '/admin/settings' && unreadInboxCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black shrink-0">
                  {unreadInboxCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      {isSettingsRoute && isAdminRole && !showHomeManager && !isUserPasswordsRoute && (
        <div
          style={{ height: 'calc(100dvh - 4rem)' }}
          className="fixed top-16 sm:top-20 left-0 lg:left-64 right-0 z-30 bg-[#f4f6fb] dark:bg-[#0b1120] overflow-y-auto p-3 sm:p-6 pb-28 font-khmer space-y-5 scrollbar-thin"
        >
          <div className="bg-white dark:bg-[#162033] rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="space-y-1">
              <Badge className="bg-amber-500 text-slate-950 font-extrabold px-2.5 py-0.5 text-[10px] sm:text-xs">
                SYSTEM SETTINGS, INBOX & CONTACT LINKS
              </Badge>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2 pt-1">
                <Settings className="h-6 w-6 text-amber-500 shrink-0" />
                <span>ការកំណត់ប្រព័ន្ធ ប្រអប់សារទំនាក់ទំនង និងលីងបណ្តាញសង្គម</span>
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
                ទទួលសារពីអ្នកប្រើប្រាស់ និងកែប្រែអ៊ីមែល លេខទូរស័ព្ទ អាសយដ្ឋាន គេហទំព័រ និងលីង Facebook / YouTube / Telegram
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 bg-slate-100 dark:bg-[#0f172a] p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 w-fit">
              <button
                type="button"
                onClick={() => setSettingsSectionTab('inbox')}
                className={cn(
                  'px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all',
                  settingsSectionTab === 'inbox'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-600 dark:text-slate-300'
                )}
              >
                <Mail className="h-3.5 w-3.5" />
                <span>ប្រអប់សារទទួលបាន ({inboxMessages.length})</span>
                {unreadInboxCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-black">
                    {unreadInboxCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSettingsSectionTab('contact')}
                className={cn(
                  'px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all',
                  settingsSectionTab === 'contact'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-600 dark:text-slate-300'
                )}
              >
                <Link2 className="h-3.5 w-3.5" />
                <span>កែប្រែព័ត៌មានទំនាក់ទំនង & លីង</span>
              </button>

              <button
                type="button"
                onClick={() => setSettingsSectionTab('system')}
                className={cn(
                  'px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all',
                  settingsSectionTab === 'system'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-600 dark:text-slate-300'
                )}
              >
                <Settings className="h-3.5 w-3.5" />
                <span>Logo & ឈ្មោះប្រព័ន្ធ</span>
              </button>
            </div>
          </div>

          {settingsSectionTab === 'inbox' && (
            <Card className="bg-white dark:bg-[#162033] border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                <CardTitle className="text-slate-900 dark:text-white text-sm sm:text-base font-black flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-500" />
                  <span>សារដែលបានផ្ញើមកពីទំព័រទំនាក់ទំនង ({inboxMessages.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 max-h-[560px] overflow-y-auto scrollbar-thin">
                {inboxMessages.length > 0 ? (
                  inboxMessages.map((msg) => (
                    <div
                      key={msg.id}
                      onClick={() => handleMarkMessageRead(msg.id)}
                      className={cn(
                        'p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer',
                        !msg.isRead
                          ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 dark:border-blue-500/60'
                          : 'bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800'
                      )}
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {!msg.isRead && (
                            <Badge className="bg-rose-600 text-white text-[10px] font-black px-2 py-0">
                              សារថ្មី
                            </Badge>
                          )}
                          <span className="text-sm font-black text-slate-900 dark:text-white">
                            {msg.senderName}
                          </span>
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                            ({msg.senderEmail})
                          </span>
                          <span className="text-[11px] text-slate-400">
                            • {new Date(msg.createdAt).toLocaleString('km-KH')}
                          </span>
                        </div>
                        <div className="text-xs font-black text-amber-600 dark:text-amber-400">
                          ប្រធានបទ៖ {msg.subject || 'មិនបញ្ជាក់'}
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                          {msg.message}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <a
                          href={`mailto:${msg.senderEmail}?subject=Re: ${encodeURIComponent(
                            msg.subject || 'BIPA Support'
                          )}`}
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                        >
                          ឆ្លើយតប Email
                        </a>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteContactMessage(msg.id);
                          }}
                          className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 text-rose-500"
                          title="លុបសារ"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-400 text-xs font-bold">
                    មិនទាន់មានសារផ្ញើចូលនៅឡើយទេ
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {settingsSectionTab === 'contact' && (
            <Card className="bg-white dark:bg-[#162033] border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-slate-900 dark:text-white text-sm sm:text-base font-black flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-amber-500" />
                  <span>កែប្រែព័ត៌មានទំនាក់ទំនង អាសយដ្ឋាន អ៊ីមែល និងលីងបណ្តាញសង្គម</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <form onSubmit={handleSaveContactConfig} className="space-y-4 max-w-4xl">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">
                        អ៊ីមែលផ្លូវការ (Email)
                      </label>
                      <Input
                        value={contactCfg.email}
                        onChange={(e) =>
                          setContactCfg({ ...contactCfg, email: e.target.value })
                        }
                        className="h-10 rounded-xl bg-slate-50 dark:bg-[#0f172a] text-xs font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">
                        លេខទូរស័ព្ទបង្ហាញលើអេក្រង់
                      </label>
                      <Input
                        value={contactCfg.phoneDisplayKm}
                        onChange={(e) =>
                          setContactCfg({ ...contactCfg, phoneDisplayKm: e.target.value })
                        }
                        className="h-10 rounded-xl bg-slate-50 dark:bg-[#0f172a] text-xs font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">
                        លេខទូរស័ព្ទពេលចុចខល (Dial Number)
                      </label>
                      <Input
                        value={contactCfg.phoneDial}
                        onChange={(e) =>
                          setContactCfg({ ...contactCfg, phoneDial: e.target.value })
                        }
                        placeholder="+85599987451"
                        className="h-10 rounded-xl bg-slate-50 dark:bg-[#0f172a] text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">
                        អាសយដ្ឋាន (ភាសាខ្មែរ)
                      </label>
                      <Input
                        value={contactCfg.addressKm}
                        onChange={(e) =>
                          setContactCfg({ ...contactCfg, addressKm: e.target.value })
                        }
                        className="h-10 rounded-xl bg-slate-50 dark:bg-[#0f172a] text-xs font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">
                        Link ផែនទី Google Maps (ពេលចុចលើអាសយដ្ឋាន)
                      </label>
                      <Input
                        value={contactCfg.mapUrl}
                        onChange={(e) =>
                          setContactCfg({ ...contactCfg, mapUrl: e.target.value })
                        }
                        className="h-10 rounded-xl bg-slate-50 dark:bg-[#0f172a] text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">
                        ឈ្មោះគេហទំព័រ (Website)
                      </label>
                      <Input
                        value={contactCfg.websiteDisplay}
                        onChange={(e) =>
                          setContactCfg({ ...contactCfg, websiteDisplay: e.target.value })
                        }
                        className="h-10 rounded-xl bg-slate-50 dark:bg-[#0f172a] text-xs font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">
                        Link គេហទំព័រ (Website URL)
                      </label>
                      <Input
                        value={contactCfg.websiteUrl}
                        onChange={(e) =>
                          setContactCfg({ ...contactCfg, websiteUrl: e.target.value })
                        }
                        className="h-10 rounded-xl bg-slate-50 dark:bg-[#0f172a] text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">
                        ឈ្មោះ Facebook Page
                      </label>
                      <Input
                        value={contactCfg.facebookPageName}
                        onChange={(e) =>
                          setContactCfg({ ...contactCfg, facebookPageName: e.target.value })
                        }
                        className="h-10 rounded-xl bg-slate-50 dark:bg-[#0f172a] text-xs font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">
                        Link Facebook Page (URL)
                      </label>
                      <Input
                        value={contactCfg.facebookUrl}
                        onChange={(e) =>
                          setContactCfg({ ...contactCfg, facebookUrl: e.target.value })
                        }
                        className="h-10 rounded-xl bg-slate-50 dark:bg-[#0f172a] text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">
                        Link YouTube Channel (URL)
                      </label>
                      <Input
                        value={contactCfg.youtubeUrl}
                        onChange={(e) =>
                          setContactCfg({ ...contactCfg, youtubeUrl: e.target.value })
                        }
                        className="h-10 rounded-xl bg-slate-50 dark:bg-[#0f172a] text-xs font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">
                        Link Telegram (URL)
                      </label>
                      <Input
                        value={contactCfg.telegramUrl}
                        onChange={(e) =>
                          setContactCfg({ ...contactCfg, telegramUrl: e.target.value })
                        }
                        className="h-10 rounded-xl bg-slate-50 dark:bg-[#0f172a] text-xs font-bold"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-10 px-6 rounded-xl shadow-md"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    រក្សាទុកព័ត៌មានទំនាក់ទំនង និងលីងទាំងអស់
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {settingsSectionTab === 'system' && (
            <Card className="bg-white dark:bg-[#162033] border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-amber-500 text-sm sm:text-base font-black flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  <span>កំណត់ Logo និងឈ្មោះប្រព័ន្ធ BIPA</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-5 max-w-2xl">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-2">
                    Logo ប្រព័ន្ធ (URL)
                  </label>
                  <div className="flex gap-4 items-center">
                    {sysLogo && (
                      <img
                        src={sysLogo}
                        alt="Logo"
                        className="w-16 h-16 rounded-xl object-contain bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 p-1 shrink-0"
                      />
                    )}
                    <Input
                      value={sysLogo}
                      onChange={(e) => setSysLogo(e.target.value)}
                      placeholder="https://..."
                      className="bg-slate-50 dark:bg-[#0f172a] text-xs font-bold"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-2">
                      ឈ្មោះប្រព័ន្ធ (ភាសាខ្មែរ)
                    </label>
                    <Input
                      value={sysNameKm}
                      onChange={(e) => setSysNameKm(e.target.value)}
                      className="bg-slate-50 dark:bg-[#0f172a] text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-2">
                      System Name (English)
                    </label>
                    <Input
                      value={sysNameEn}
                      onChange={(e) => setSysNameEn(e.target.value)}
                      className="bg-slate-50 dark:bg-[#0f172a] text-xs font-bold"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSaveSettings}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-10 px-6 rounded-xl shadow-md"
                >
                  <Save className="h-4 w-4 mr-2" /> រក្សាទុកការផ្លាស់ប្តូរ
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {isUserPasswordsRoute && isAdminRole && !showHomeManager && (
        <div
          style={{ height: 'calc(100dvh - 4rem)' }}
          className="fixed top-16 sm:top-20 left-0 lg:left-64 right-0 z-30 bg-[#f4f6fb] dark:bg-[#0b1120] overflow-y-auto p-3 sm:p-6 pb-28 scrollbar-thin"
        >
          <AdminUserPasswordDashboard />
        </div>
      )}

      {isResidenceManagerRoute && isAdminRole && !showHomeManager && !isUserPasswordsRoute && (
        <div
          style={{ height: 'calc(100dvh - 4rem)' }}
          className="fixed top-16 sm:top-20 left-0 lg:left-64 right-0 z-30 bg-[#f4f6fb] dark:bg-[#0b1120] overflow-y-auto p-3 sm:p-6 pb-28 scrollbar-thin"
        >
          <ResidenceManagerPanel />
        </div>
      )}

      {showHomeManager && isAdminRole && (
        <div
          style={{ height: 'calc(100dvh - 4rem)' }}
          className="fixed top-16 sm:top-20 left-0 lg:left-64 right-0 z-30 bg-[#0b1120] overflow-y-auto p-3 sm:p-6 pb-28 font-khmer text-slate-200 space-y-5 scrollbar-thin"
        >
          <div className="bg-[#1e293b] rounded-2xl p-4 sm:p-6 shadow-md border border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div>
              <Badge className="bg-[#eab308] text-[#0f172a] font-bold px-2.5 py-1 mb-2">
                HOME & NEWS CMS
              </Badge>
              <h1 className="text-lg sm:text-2xl font-bold text-white">
                គ្រប់គ្រងព័ត៌មានទំព័រដើម (Home Page)
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
                បង្ហោះ និងកែប្រែព័ត៌មានទូទៅ រូបភាព Banner និងតាមដានក្រាបស្ថិតិអ្នកមើល/ចុចបេះដូង។
              </p>
            </div>

            <div className="relative grid grid-cols-3 bg-[#0f172a] p-1.5 rounded-2xl border border-slate-800 w-full xl:w-[520px] shrink-0">
              <div
                className="absolute top-1.5 bottom-1.5 w-[calc(33.333%-4px)] rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-600/30 transition-transform duration-300 ease-out"
                style={{ transform: `translateX(${activeTabIndex * 100}%)`, left: '6px' }}
              />
              <button
                type="button"
                onClick={() => setManageTab('news')}
                className={cn(
                  'relative z-10 py-2.5 px-1.5 text-[11px] sm:text-xs font-bold rounded-xl transition-colors duration-200 truncate',
                  manageTab === 'news' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                )}
              >
                ព័ត៌មានទូទៅ ({newsList.length})
              </button>
              <button
                type="button"
                onClick={() => setManageTab('banners')}
                className={cn(
                  'relative z-10 py-2.5 px-1.5 text-[11px] sm:text-xs font-bold rounded-xl transition-colors duration-200 truncate',
                  manageTab === 'banners' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                )}
              >
                រូប Banner ({banners.length})
              </button>
              <button
                type="button"
                onClick={() => setManageTab('settings')}
                className={cn(
                  'relative z-10 py-2.5 px-1.5 text-[11px] sm:text-xs font-bold rounded-xl transition-colors duration-200 flex items-center justify-center gap-1 truncate',
                  manageTab === 'settings' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                )}
              >
                <Settings className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">ការកំណត់</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            <Card className="bg-[#1e293b] border-slate-800 shadow-lg xl:col-span-7 overflow-hidden">
              <CardHeader className="pb-3 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-cyan-400 shrink-0" />
                    <span>ក្រាបសន្ទុះអ្នកមើល និងចុចបេះដូង (Market Trend Analytics)</span>
                  </CardTitle>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    ទិន្នន័យប្រៀបធៀបសន្ទុះ Views និង Likes តាមកាតព័ត៌មាននីមួយៗ
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold bg-[#0f172a] px-3.5 py-2 rounded-xl border border-slate-800 w-fit">
                  <span className="flex items-center gap-1.5 text-cyan-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
                    Views: {totalViews}
                  </span>
                  <span className="w-px h-3.5 bg-slate-700" />
                  <span className="flex items-center gap-1.5 text-rose-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                    Likes: {totalLikes}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-3.5 sm:p-5">
                <div className="relative bg-[#0b1325] rounded-2xl border border-slate-800/90 p-3">
                  <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-44 sm:h-52 overflow-visible">
                    <defs>
                      <linearGradient id="stockViewsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="stockLikesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {[0, 0.25, 0.5, 0.75, 1].map((step, i) => {
                      const yPos = padY + step * plotH;
                      const labelVal = Math.round(maxStockVal * (1 - step));
                      return (
                        <g key={i}>
                          <line
                            x1={padX}
                            y1={yPos}
                            x2={svgWidth - padX}
                            y2={yPos}
                            stroke="#1e293b"
                            strokeDasharray="4 4"
                            strokeWidth="1"
                          />
                          <text x={8} y={yPos + 4} fill="#64748b" fontSize="10" fontWeight="bold">
                            {labelVal}
                          </text>
                        </g>
                      );
                    })}

                    {viewCoords.length > 0 && (
                      <>
                        <path d={buildAreaPath(viewCoords)} fill="url(#stockViewsGrad)" />
                        <path
                          d={buildSmoothPath(viewCoords)}
                          fill="none"
                          stroke="#22d3ee"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                      </>
                    )}

                    {likeCoords.length > 0 && (
                      <>
                        <path d={buildAreaPath(likeCoords)} fill="url(#stockLikesGrad)" />
                        <path
                          d={buildSmoothPath(likeCoords)}
                          fill="none"
                          stroke="#fb7185"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      </>
                    )}

                    {viewCoords.map((pt, i) => {
                      const lk = likeCoords[i];
                      const isHovered = hoveredPointIdx === i;
                      return (
                        <g
                          key={i}
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredPointIdx(i)}
                          onMouseLeave={() => setHoveredPointIdx(null)}
                          onClick={() => setHoveredPointIdx(isHovered ? null : i)}
                        >
                          {isHovered && (
                            <line
                              x1={pt.x}
                              y1={padY}
                              x2={pt.x}
                              y2={padY + plotH}
                              stroke="#94a3b8"
                              strokeDasharray="3 3"
                              strokeWidth="1"
                            />
                          )}
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isHovered ? 6 : 4}
                            fill="#0b1325"
                            stroke="#22d3ee"
                            strokeWidth="2.5"
                          />
                          {lk && (
                            <circle
                              cx={lk.x}
                              cy={lk.y}
                              r={isHovered ? 5.5 : 3.5}
                              fill="#0b1325"
                              stroke="#fb7185"
                              strokeWidth="2.5"
                            />
                          )}
                        </g>
                      );
                    })}
                  </svg>

                  {hoveredPointIdx !== null && chartItems[hoveredPointIdx] && (
                    <div className="mt-2 flex items-center justify-between bg-[#1e293b] border border-slate-700 px-3.5 py-2 rounded-xl text-xs">
                      <span className="font-bold text-white truncate max-w-[60%]">
                        {chartItems[hoveredPointIdx].title_km}
                      </span>
                      <div className="flex items-center gap-3 font-bold shrink-0">
                        <span className="text-cyan-400">
                          {chartItems[hoveredPointIdx].views} Views
                        </span>
                        <span className="text-rose-400">
                          {chartItems[hoveredPointIdx].likes} Likes
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#1e293b] border-slate-800 shadow-lg xl:col-span-5">
              <CardHeader className="pb-3 border-b border-slate-800">
                <CardTitle className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-amber-400 shrink-0" />
                  <span>ក្រាបរង្វង់មូលតាមពណ៌ (Engagement Share)</span>
                </CardTitle>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  សមាមាត្រភាគរយនៃការចាប់អារម្មណ៍សរុបតាមព័ត៌មាននីមួយៗ
                </p>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-5">
                <div className="relative w-36 h-36 sm:w-40 sm:h-40 shrink-0 flex items-center justify-center">
                  <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
                    <circle
                      cx="80"
                      cy="80"
                      r={donutRadius}
                      fill="transparent"
                      stroke="#0f172a"
                      strokeWidth="18"
                    />
                    {donutSegments.map((seg) => (
                      <circle
                        key={seg.id}
                        cx="80"
                        cy="80"
                        r={donutRadius}
                        fill="transparent"
                        stroke={seg.color}
                        strokeWidth="18"
                        strokeDasharray={seg.strokeDasharray}
                        strokeDashoffset={seg.strokeDashoffset}
                        className="transition-all duration-700"
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-xl font-black text-white">{totalViews + totalLikes}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      សរុបរួម
                    </span>
                  </div>
                </div>

                <div className="flex-1 w-full space-y-2.5 max-h-44 overflow-y-auto pr-1 scrollbar-thin">
                  {donutSegments.map((seg) => (
                    <div
                      key={seg.id}
                      className="flex items-center justify-between gap-2 bg-[#0f172a] px-3 py-2 rounded-xl border border-slate-800/80 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: seg.color }}
                        />
                        <span className="text-slate-200 font-semibold truncate">{seg.title}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 font-bold">
                        <span className="text-blue-400 text-[11px]">{seg.views}👁</span>
                        <span className="text-rose-400 text-[11px]">{seg.likes}♥</span>
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] text-white"
                          style={{ backgroundColor: seg.color }}
                        >
                          {seg.percent}%
                        </span>
                      </div>
                    </div>
                  ))}
                  {donutSegments.length === 0 && (
                    <div className="text-center text-slate-500 text-xs py-6">
                      មិនទាន់មានទិន្នន័យ
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {manageTab === 'settings' && (
            <Card className="bg-[#1e293b] border-slate-800 shadow-md animate-in fade-in duration-300">
              <CardHeader className="border-b border-slate-800">
                <CardTitle className="text-amber-500 text-base sm:text-lg font-bold flex items-center gap-2">
                  <Settings className="h-5 w-5" /> ការកំណត់ទូទៅ (General Settings)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-5 max-w-2xl">
                <div>
                  <label className="text-sm text-slate-300 font-bold block mb-2">
                    Logo ប្រព័ន្ធ (URL)
                  </label>
                  <div className="flex gap-4 items-center">
                    {sysLogo && (
                      <img
                        src={sysLogo}
                        alt="Logo"
                        className="w-16 h-16 rounded-xl object-contain bg-slate-800 border border-slate-700 p-1 shrink-0"
                      />
                    )}
                    <Input
                      value={sysLogo}
                      onChange={(e) => setSysLogo(e.target.value)}
                      placeholder="https://..."
                      className="bg-[#0f172a] border-slate-700 text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-300 font-bold block mb-2">
                      ឈ្មោះប្រព័ន្ធ (ភាសាខ្មែរ)
                    </label>
                    <Input
                      value={sysNameKm}
                      onChange={(e) => setSysNameKm(e.target.value)}
                      className="bg-[#0f172a] border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-300 font-bold block mb-2">
                      System Name (English)
                    </label>
                    <Input
                      value={sysNameEn}
                      onChange={(e) => setSysNameEn(e.target.value)}
                      className="bg-[#0f172a] border-slate-700 text-white"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSaveSettings}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-8 rounded-xl shadow-md"
                >
                  <Save className="h-4 w-4 mr-2" /> រក្សាទុកការផ្លាស់ប្តូរ
                </Button>
              </CardContent>
            </Card>
          )}

          {manageTab === 'news' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pb-12 animate-in fade-in duration-300">
              <Card className="bg-[#1e293b] border-slate-800 shadow-md h-fit">
                <CardHeader className="pb-3 border-b border-slate-800">
                  <CardTitle className="text-blue-400 text-sm sm:text-base font-bold">
                    {editingNews ? 'កែប្រែព័ត៌មានដែលបានជ្រើសរើស' : 'បង្ហោះព័ត៌មានថ្មីទៅកាន់ទំព័រដើម'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      value={formTitleKm}
                      onChange={(e) => setFormTitleKm(e.target.value)}
                      placeholder="ចំណងជើងព័ត៌មាន (ខ្មែរ)..."
                      className="bg-[#0f172a] border-slate-700 text-white text-xs h-10"
                    />
                    <Input
                      value={formTitleEn}
                      onChange={(e) => setFormTitleEn(e.target.value)}
                      placeholder="Title (English)..."
                      className="bg-[#0f172a] border-slate-700 text-white text-xs h-10"
                    />
                    <Input
                      value={formDateKm}
                      onChange={(e) => setFormDateKm(e.target.value)}
                      placeholder="ថ្ងៃខែឆ្នាំខ្មែរ (ឧ. ព្រហស្បតិ៍ 3 កញ្ញា 2026)"
                      className="bg-[#0f172a] border-slate-700 text-white text-xs h-10"
                    />
                    <Input
                      value={formDateEn}
                      onChange={(e) => setFormDateEn(e.target.value)}
                      placeholder="Date English (e.g. Thu 3 Sep 2026)"
                      className="bg-[#0f172a] border-slate-700 text-white text-xs h-10"
                    />
                    <Input
                      value={formFbUrl}
                      onChange={(e) => setFormFbUrl(e.target.value)}
                      placeholder="Facebook Link (Optional)..."
                      className="bg-[#0f172a] border-slate-700 text-white text-xs h-10"
                    />
                    <Input
                      value={formYtUrl}
                      onChange={(e) => setFormYtUrl(e.target.value)}
                      placeholder="YouTube Link (Optional)..."
                      className="bg-[#0f172a] border-slate-700 text-white text-xs h-10"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-semibold block mb-1">
                      Link រូបភាព (ដាក់ ១ បន្ទាត់ ១ Link អាចបន្ថែមរូបភាពបានច្រើនសន្លឹក)
                    </label>
                    <textarea
                      value={formImagesText}
                      onChange={(e) => setFormImagesText(e.target.value)}
                      placeholder="https://example.com/photo1.jpg&#10;https://example.com/photo2.jpg"
                      className="w-full h-24 bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-xs text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-semibold block mb-1">
                      អត្ថបទព័ត៌មានពេញលេញ (ភាសាខ្មែរ)
                    </label>
                    <textarea
                      value={formDescKm}
                      onChange={(e) => setFormDescKm(e.target.value)}
                      placeholder="សរសេរអត្ថបទព័ត៌មានលម្អិត..."
                      className="w-full h-28 bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-xs text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-semibold block mb-1">
                      Full Description (English - Optional)
                    </label>
                    <textarea
                      value={formDescEn}
                      onChange={(e) => setFormDescEn(e.target.value)}
                      placeholder="Write full English description..."
                      className="w-full h-20 bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-xs text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    {editingNews && (
                      <Button
                        variant="outline"
                        onClick={() => openEditNewsForm(undefined)}
                        className="border-slate-600 text-slate-300 text-xs"
                      >
                        បោះបង់ការកែ
                      </Button>
                    )}
                    <Button
                      onClick={handleSaveNewsItem}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5"
                    >
                      <Save className="h-4 w-4 mr-1.5" />{' '}
                      {editingNews ? 'រក្សាទុកការកែប្រែ' : 'បង្ហោះព័ត៌មាន'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#1e293b] border-slate-800 shadow-md">
                <CardHeader className="pb-3 border-b border-slate-800">
                  <CardTitle className="text-white text-sm sm:text-base font-bold">
                    បញ្ជីព័ត៌មានដែលកំពុងបង្ហាញលើទំព័រដើម
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 max-h-[580px] overflow-y-auto space-y-3 scrollbar-thin">
                  {newsList.map((n, index) => (
                    <div
                      key={n.id}
                      className="bg-[#0f172a] border border-slate-800 p-3 rounded-xl flex items-center gap-3 hover:border-slate-700 transition-colors"
                    >
                      {n.images && n.images[0] ? (
                        <img
                          src={n.images[0]}
                          alt=""
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover shrink-0 bg-slate-800"
                        />
                      ) : (
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-800 shrink-0 flex items-center justify-center text-[10px] text-slate-500">
                          No Img
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                          />
                          <h4 className="font-bold text-xs sm:text-sm text-white truncate">
                            {n.title_km}
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {n.description_km}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1.5 font-semibold">
                          <span>{n.images ? n.images.length : 0} រូបភាព</span>
                          <span className="flex items-center gap-1 text-blue-400">
                            <Eye className="h-3 w-3" /> {n.views}
                          </span>
                          <span className="flex items-center gap-1 text-rose-400">
                            <Heart className="h-3 w-3 fill-rose-500" /> {n.likes}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button
                          onClick={() => openEditNewsForm(n)}
                          className="p-2 bg-blue-500/15 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
                          title="កែប្រែ"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteNewsItem(n.id)}
                          className="p-2 bg-red-500/15 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                          title="លុប"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {manageTab === 'banners' && (
            <Card className="bg-[#1e293b] border-slate-800 shadow-md animate-in fade-in duration-300">
              <CardHeader className="pb-3 border-b border-slate-800">
                <CardTitle className="text-white text-sm sm:text-base font-bold">
                  គ្រប់គ្រង កែប្រែ Link និងប្តូរទីតាំងរូបភាព Banner (រក្សាទុកស្វ័យប្រវត្តិ)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6">
                <div className="flex flex-col sm:flex-row gap-3 max-w-3xl">
                  <Input
                    value={newBannerUrl}
                    onChange={(e) => setNewBannerUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddOrUpdateBanner();
                    }}
                    placeholder={
                      editingBannerId
                        ? 'កែប្រែ Link រូបភាព Banner នៅទីនេះ...'
                        : 'បញ្ចូល Link រូបភាព Banner ថ្មី (https://...)...'
                    }
                    className={cn(
                      'bg-[#0f172a] text-white text-xs h-10',
                      editingBannerId ? 'border-amber-500 ring-1 ring-amber-500/40' : 'border-slate-700'
                    )}
                  />
                  <div className="flex gap-2 shrink-0">
                    {editingBannerId && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancelEditBanner}
                        className="border-slate-700 text-slate-300 text-xs h-10"
                      >
                        <X className="h-4 w-4 mr-1" /> បោះបង់
                      </Button>
                    )}
                    <Button
                      type="button"
                      onClick={handleAddOrUpdateBanner}
                      className={cn(
                        'text-white font-bold text-xs h-10 shrink-0',
                        editingBannerId
                          ? 'bg-amber-500 hover:bg-amber-600'
                          : 'bg-[#3b82f6] hover:bg-blue-600'
                      )}
                    >
                      {editingBannerId ? (
                        <>
                          <Edit2 className="h-4 w-4 mr-1.5" /> រក្សាទុក Link ថ្មី
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-1.5" /> បន្ថែមរូប Banner
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {banners.map((b, idx) => (
                    <div
                      key={b.id}
                      className={cn(
                        'rounded-2xl overflow-hidden border bg-[#0f172a] flex flex-col transition-all',
                        editingBannerId === b.id
                          ? 'border-amber-500 shadow-lg shadow-amber-500/10'
                          : 'border-slate-700'
                      )}
                    >
                      <div className="relative h-40 w-full bg-slate-900">
                        <img src={b.image_url} alt="" className="w-full h-full object-cover" />
                        <div className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-sm text-white text-xs font-extrabold px-2.5 py-1 rounded-lg border border-white/15">
                          #{idx + 1}
                        </div>
                        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyBannerUrl(b)}
                            className="bg-slate-900/80 hover:bg-slate-800 text-white p-2 rounded-lg shadow border border-white/10"
                            title="ចម្លង Link"
                          >
                            {copiedBannerId === b.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEditBanner(b)}
                            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg shadow"
                            title="កែប្រែ Link"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBanner(b.id)}
                            className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg shadow"
                            title="លុប"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="p-2.5 flex items-center justify-between gap-2 border-t border-slate-800 bg-[#0b1325]">
                        <span className="text-[11px] text-slate-400 truncate flex-1">
                          {b.image_url}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveBanner(idx, 'left')}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 transition-colors"
                            title="រំកិលទៅមុខ"
                          >
                            <ArrowLeft className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === banners.length - 1}
                            onClick={() => handleMoveBanner(idx, 'right')}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 transition-colors"
                            title="រំកិលទៅក្រោយ"
                          >
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end border-t border-slate-800 pt-4">
                  <Button
                    onClick={handleSaveBanners}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-8 rounded-xl shadow-md"
                  >
                    <Save className="h-4 w-4 mr-2" /> រក្សាទុករូប Banner
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {location.pathname.startsWith('/admin/duties') &&
        isAdminRole &&
        !showHomeManager &&
        !isUserPasswordsRoute && (
          <div
            style={{ height: 'calc(100dvh - 4rem)' }}
            className="fixed top-16 sm:top-20 left-0 lg:left-64 right-0 z-30 bg-[#f4f6fb] dark:bg-[#0b1120] overflow-y-auto p-3 sm:p-6 pb-28 scrollbar-thin"
          >
            <DutyRosterAdminPanel />
          </div>
        )}

      {(location.pathname.startsWith('/dashboard/duties') || location.pathname === '/duties') &&
        !showHomeManager &&
        !isUserPasswordsRoute && (
          <div
            style={{ height: 'calc(100dvh - 4rem)' }}
            className="fixed top-16 sm:top-20 left-0 lg:left-64 right-0 z-30 bg-[#f4f6fb] dark:bg-[#0b1120] overflow-y-auto p-3 sm:p-6 pb-28 scrollbar-thin"
          >
            <DutyScheduleUserView
              onSwitchToAdmin={isAdminRole ? () => navigate('/admin/duties') : undefined}
            />
          </div>
        )}

      {location.pathname.startsWith('/admin/payments') &&
        isAdminRole &&
        !showHomeManager &&
        !isUserPasswordsRoute && (
          <div
            style={{ height: 'calc(100dvh - 4rem)' }}
            className="fixed top-16 sm:top-20 left-0 lg:left-64 right-0 z-30 bg-[#f4f6fb] dark:bg-[#0b1120] overflow-y-auto p-3 sm:p-6 pb-28 scrollbar-thin"
          >
            <PaymentAdminDashboard />
          </div>
        )}

      {location.pathname.startsWith('/dashboard/payments') &&
        !showHomeManager &&
        !isUserPasswordsRoute && (
          <div
            style={{ height: 'calc(100dvh - 4rem)' }}
            className="fixed top-16 sm:top-20 left-0 lg:left-64 right-0 z-30 bg-[#f4f6fb] dark:bg-[#0b1120] overflow-y-auto p-3 sm:p-6 pb-28 scrollbar-thin"
          >
            <PaymentStudentView
              onSwitchToAdmin={isAdminRole ? () => navigate('/admin/payments') : undefined}
            />
          </div>
        )}

      {location.pathname.startsWith('/admin/assets') &&
        isAdminRole &&
        !showHomeManager &&
        !isUserPasswordsRoute && (
          <div
            style={{ height: 'calc(100dvh - 4rem)' }}
            className="fixed top-16 sm:top-20 left-0 lg:left-64 right-0 z-30 bg-[#f4f6fb] dark:bg-[#0b1120] overflow-y-auto p-3 sm:p-6 pb-28 scrollbar-thin"
          >
            <RiceAdminDashboard />
          </div>
        )}

      {(location.pathname.startsWith('/dashboard/assets') || location.pathname === '/rice') &&
        !showHomeManager &&
        !isUserPasswordsRoute && (
          <div
            style={{ height: 'calc(100dvh - 4rem)' }}
            className="fixed top-16 sm:top-20 left-0 lg:left-64 right-0 z-30 bg-[#f4f6fb] dark:bg-[#0b1120] overflow-y-auto p-3 sm:p-6 pb-28 scrollbar-thin"
          >
            <RiceStudentView
              onSwitchToAdmin={isAdminRole ? () => navigate('/admin/assets') : undefined}
            />
          </div>
        )}

      {location.pathname.startsWith('/admin/leave-requests') &&
        isAdminRole &&
        !showHomeManager &&
        !isUserPasswordsRoute && (
          <div
            style={{ height: 'calc(100dvh - 4rem)' }}
            className="fixed top-16 sm:top-20 left-0 lg:left-64 right-0 z-30 bg-[#f4f6fb] dark:bg-[#0b1120] overflow-y-auto p-3 sm:p-6 pb-28 scrollbar-thin"
          >
            <LeaveAdminDashboard />
          </div>
        )}
    </>
  );
}