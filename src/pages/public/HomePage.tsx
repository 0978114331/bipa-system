import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  Heart,
  Share2,
  Users,
  QrCode,
  DollarSign,
  Package,
  FileText,
  CalendarClock,
  Building2,
  Megaphone,
  X,
  Plus,
  Edit2,
  Trash2,
  Bell,
  User as UserIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TranslationKey } from '@/types';

export interface HomeBannerItem {
  id: string;
  image_url: string;
  title_km?: string;
  title_en?: string;
  link_url?: string;
  sort_order?: number;
}

export interface HomeNewsItem {
  id: string;
  title_km: string;
  title_en: string;
  subtitle_km: string;
  subtitle_en: string;
  description_km: string;
  description_en: string;
  date_text_km: string;
  date_text_en: string;
  views: number;
  likes: number;
  images: string[];
  facebook_url?: string;
  youtube_url?: string;
  created_at?: string;
}

export const HOME_BANNERS_STORAGE_KEY = 'bipa_home_banners_v2';
export const HOME_NEWS_STORAGE_KEY = 'bipa_home_news_v2';

export const defaultHomeBanners: HomeBannerItem[] = [];
export const defaultHomeNews: HomeNewsItem[] = [];

function getCachedBanners(): HomeBannerItem[] {
  try {
    const raw = localStorage.getItem(HOME_BANNERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getCachedNews(): HomeNewsItem[] {
  try {
    const raw = localStorage.getItem(HOME_NEWS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mountFloatingBackButton(isKhmer: boolean) {
  const existing = document.getElementById('bipa-feature-back-btn');
  if (existing) existing.remove();

  const btn = document.createElement('button');
  btn.id = 'bipa-feature-back-btn';
  btn.type = 'button';
  btn.innerHTML = `<span style="font-size:15px;line-height:1;">←</span> <span>${
    isKhmer ? 'ត្រឡប់ទៅវិញ' : 'Back to Home'
  }</span>`;
  btn.style.cssText = [
    'position:fixed',
    'top:74px',
    'left:14px',
    'z-index:90',
    'display:inline-flex',
    'align-items:center',
    'gap:6px',
    'padding:8px 14px',
    'border-radius:9999px',
    'background:#2563eb',
    'color:#ffffff',
    'font-family:"Kantumruy Pro",sans-serif',
    'font-size:12px',
    'font-weight:700',
    'border:1px solid rgba(255,255,255,0.25)',
    'box-shadow:0 6px 18px rgba(37,99,235,0.38)',
    'cursor:pointer',
  ].join(';');

  const cleanup = () => {
    const el = document.getElementById('bipa-feature-back-btn');
    if (el) el.remove();
  };

  btn.onclick = () => {
    cleanup();
    window.history.back();
  };

  const checkPath = setInterval(() => {
    if (window.location.pathname === '/') {
      cleanup();
      clearInterval(checkPath);
    }
  }, 300);

  document.body.appendChild(btn);
}

export async function fetchHomeContentFromDb(): Promise<{
  banners: HomeBannerItem[];
  news: HomeNewsItem[];
}> {
  let banners: HomeBannerItem[] = getCachedBanners();
  let news: HomeNewsItem[] = getCachedNews();

  try {
    const { data: dbBanners, error: bErr } = await supabase
      .from('bipa_home_banners')
      .select('*')
      .order('sort_order', { ascending: true });

    if (!bErr && dbBanners) {
      banners = dbBanners.map((b: any) => ({
        id: String(b.id),
        image_url: b.image_url,
        title_km: b.title_km || '',
        title_en: b.title_en || '',
        link_url: b.link_url || '',
        sort_order: Number(b.sort_order || 0),
      }));
      localStorage.setItem(HOME_BANNERS_STORAGE_KEY, JSON.stringify(banners));
    }
  } catch {}

  try {
    const { data: dbNews, error: nErr } = await supabase
      .from('bipa_home_news')
      .select('*')
      .order('created_at', { ascending: false });

    if (!nErr && dbNews) {
      news = dbNews.map((n: any) => ({
        id: String(n.id),
        title_km: n.title_km || '',
        title_en: n.title_en || n.title_km || '',
        subtitle_km: n.subtitle_km || n.title_km || '',
        subtitle_en: n.subtitle_en || n.title_en || '',
        description_km: n.description_km || '',
        description_en: n.description_en || n.description_km || '',
        date_text_km: n.date_text_km || '',
        date_text_en: n.date_text_en || n.date_text_km || '',
        views: Number(n.views || 0),
        likes: Number(n.likes || 0),
        images: Array.isArray(n.images) ? n.images : [],
        facebook_url: n.facebook_url || '',
        youtube_url: n.youtube_url || '',
        created_at: n.created_at || '',
      }));
      localStorage.setItem(HOME_NEWS_STORAGE_KEY, JSON.stringify(news));
    }
  } catch {}

  return { banners, news };
}

export function HomePage() {
  const { user, hasRole } = useAuth();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const isKhmer = lang === 'km';
  const isAdmin = hasRole('super_admin', 'residence_admin', 'finance_admin', 'duty_manager');

  const [banners, setBanners] = useState<HomeBannerItem[]>(() => getCachedBanners());
  const [newsList, setNewsList] = useState<HomeNewsItem[]>(() => getCachedNews());
  const [currentBannerIdx, setCurrentBannerIdx] = useState(0);
  const [visibleNewsCount, setVisibleNewsCount] = useState(6);

  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null);
  const selectedNews = newsList.find((n) => n.id === selectedNewsId) || null;

  const [likedIds, setLikedIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('bipa_liked_news_ids') || '[]');
    } catch {
      return [];
    }
  });

  const [showManageModal, setShowManageModal] = useState(false);
  const [manageTab, setManageTab] = useState<'news' | 'banners'>('news');
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

  const coreFeatures: { key: TranslationKey; route: string; icon: any; color: string }[] = [
    { key: 'feature.studentInfo', route: '/admin/students', icon: <Users className="h-6 w-6" />, color: 'from-amber-400 to-amber-600' },
    { key: 'feature.qrAttendance', route: '/attendance', icon: <QrCode className="h-6 w-6" />, color: 'from-emerald-500 to-teal-700' },
    { key: 'feature.payments', route: '/admin/payments', icon: <DollarSign className="h-6 w-6" />, color: 'from-blue-500 to-indigo-700' },
    { key: 'feature.rice', route: '/admin/rice', icon: <Package className="h-6 w-6" />, color: 'from-orange-400 to-red-600' },
    { key: 'feature.leave', route: '/leave', icon: <FileText className="h-6 w-6" />, color: 'from-purple-500 to-violet-700' },
    { key: 'feature.duty', route: '/admin/duties', icon: <CalendarClock className="h-6 w-6" />, color: 'from-cyan-500 to-sky-700' },
    { key: 'feature.facilities', route: '/admin/assets', icon: <Building2 className="h-6 w-6" />, color: 'from-slate-500 to-slate-800' },
    { key: 'feature.announcements', route: '/announcements', icon: <Megaphone className="h-6 w-6" />, color: 'from-rose-500 to-pink-700' },
  ];

  const loadContent = async () => {
    const data = await fetchHomeContentFromDb();
    setBanners(data.banners);
    setNewsList(data.news);
  };

  useEffect(() => {
    const existingBtn = document.getElementById('bipa-feature-back-btn');
    if (existingBtn) existingBtn.remove();

    loadContent();
    const syncInterval = setInterval(loadContent, 3000);
    window.addEventListener('home-content-updated', loadContent);
    window.addEventListener('storage', loadContent);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('home-content-updated', loadContent);
      window.removeEventListener('storage', loadContent);
    };
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const bannerTimer = setInterval(() => {
      setCurrentBannerIdx((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(bannerTimer);
  }, [banners.length]);

  const handleFeatureClick = (route: string) => {
    mountFloatingBackButton(isKhmer);
    if (!user && route.startsWith('/admin')) {
      navigate('/signin', { state: { from: route } });
      return;
    }
    navigate(route);
  };

  const handleOpenNewsModal = async (item: HomeNewsItem) => {
    setSelectedNewsId(item.id);
    let latestViews = item.views;
    try {
      const { data } = await supabase
        .from('bipa_home_news')
        .select('views')
        .eq('id', item.id)
        .maybeSingle();
      if (data && typeof data.views === 'number') {
        latestViews = data.views;
      }
    } catch {}

    const nextViews = latestViews + 1;
    const updatedItem = { ...item, views: nextViews };
    const updatedList = newsList.map((n) => (n.id === item.id ? updatedItem : n));
    setNewsList(updatedList);
    localStorage.setItem(HOME_NEWS_STORAGE_KEY, JSON.stringify(updatedList));

    try {
      await supabase.from('bipa_home_news').update({ views: nextViews }).eq('id', item.id);
    } catch {}
  };

  const handleToggleLike = async (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const alreadyLiked = likedIds.includes(id);
    const nextLikedIds = alreadyLiked ? likedIds.filter((i) => i !== id) : [...likedIds, id];
    setLikedIds(nextLikedIds);
    localStorage.setItem('bipa_liked_news_ids', JSON.stringify(nextLikedIds));

    const target = newsList.find((n) => n.id === id);
    if (!target) return;

    let latestLikes = target.likes;
    try {
      const { data } = await supabase
        .from('bipa_home_news')
        .select('likes')
        .eq('id', id)
        .maybeSingle();
      if (data && typeof data.likes === 'number') {
        latestLikes = data.likes;
      }
    } catch {}

    const nextLikes = Math.max(0, latestLikes + (alreadyLiked ? -1 : 1));
    const updatedItem = { ...target, likes: nextLikes };
    const updatedList = newsList.map((n) => (n.id === id ? updatedItem : n));
    setNewsList(updatedList);
    localStorage.setItem(HOME_NEWS_STORAGE_KEY, JSON.stringify(updatedList));

    try {
      await supabase.from('bipa_home_news').update({ likes: nextLikes }).eq('id', id);
    } catch {}
  };

  const handleShareNews = (item: HomeNewsItem, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const title = isKhmer ? item.title_km : item.title_en;
    const text = `${title}\n\n${isKhmer ? item.description_km : item.description_en}`;
    if (navigator.share) {
      navigator.share({ title, text, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => {
        alert(isKhmer ? 'បានចម្លងអត្ថបទព័ត៌មានរួចរាល់!' : 'News content copied to clipboard!');
      });
    }
  };

  const openEditNewsForm = (item?: HomeNewsItem) => {
    if (item) {
      setEditingNews(item);
      setFormTitleKm(item.title_km);
      setFormTitleEn(item.title_en);
      setFormSubtitleKm(item.subtitle_km);
      setFormDescKm(item.description_km);
      setFormDescEn(item.description_en);
      setFormDateKm(item.date_text_km);
      setFormDateEn(item.date_text_en);
      setFormImagesText(item.images.join('\n'));
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
          year: 'numeric',
        })
      );
      setFormDateEn(
        new Date().toLocaleDateString('en-US', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
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
      youtube_url: formYtUrl.trim(),
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
  };

  const handleDeleteNewsItem = async (id: string) => {
    if (!window.confirm(isKhmer ? 'តើអ្នកពិតជាចង់លុបព័ត៌មាននេះមែនទេ?' : 'Delete this news card?')) return;
    const nextList = newsList.filter((n) => n.id !== id);
    setNewsList(nextList);
    localStorage.setItem(HOME_NEWS_STORAGE_KEY, JSON.stringify(nextList));
    try {
      await supabase.from('bipa_home_news').delete().eq('id', id);
    } catch {}
    window.dispatchEvent(new Event('home-content-updated'));
  };

  const handleAddBanner = async () => {
    if (!newBannerUrl.trim()) return;
    const newB: HomeBannerItem = {
      id: `banner-${Date.now()}`,
      image_url: newBannerUrl.trim(),
      title_km: '',
      title_en: '',
    };
    const nextB = [...banners, newB];
    setBanners(nextB);
    localStorage.setItem(HOME_BANNERS_STORAGE_KEY, JSON.stringify(nextB));
    setNewBannerUrl('');
    try {
      await supabase.from('bipa_home_banners').insert([{ ...newB, sort_order: nextB.length }]);
    } catch {}
    window.dispatchEvent(new Event('home-content-updated'));
  };

  const handleDeleteBanner = async (id: string) => {
    const nextB = banners.filter((b) => b.id !== id);
    setBanners(nextB);
    localStorage.setItem(HOME_BANNERS_STORAGE_KEY, JSON.stringify(nextB));
    try {
      await supabase.from('bipa_home_banners').delete().eq('id', id);
    } catch {}
    window.dispatchEvent(new Event('home-content-updated'));
  };

  return (
    <div className="min-h-screen bg-[#f4f6fb] dark:bg-[#0b1120] pb-24 font-khmer">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 pt-3 sm:pt-5 space-y-6">
        {banners.length > 0 && (
          <div className="relative w-full h-[185px] sm:h-[320px] md:h-[400px] rounded-[20px] overflow-hidden shadow-md bg-slate-900 border border-white/40 dark:border-slate-800">
            {banners.map((b, idx) => (
              <img
                key={b.id}
                src={b.image_url}
                alt="Banner"
                className={cn(
                  'absolute inset-0 w-full h-full object-cover transition-opacity duration-700',
                  idx === currentBannerIdx % banners.length ? 'opacity-100' : 'opacity-0'
                )}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />

            <div className="absolute top-3.5 right-3.5 flex items-center gap-2 z-10">
              <button
                onClick={() => navigate('/announcements')}
                className="w-9 h-9 rounded-full bg-[#f97316] hover:bg-orange-600 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
              >
                <Bell className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigate(user ? '/profile' : '/signin')}
                className="w-9 h-9 rounded-full bg-[#f97316] hover:bg-orange-600 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
              >
                <UserIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
              {banners.map((b, idx) => (
                <button
                  key={b.id}
                  onClick={() => setCurrentBannerIdx(idx)}
                  className={cn(
                    'h-2 rounded-full transition-all duration-300',
                    idx === currentBannerIdx % banners.length ? 'bg-white w-5' : 'bg-white/50 w-2'
                  )}
                />
              ))}
            </div>
          </div>
        )}

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white px-1">
            {isKhmer ? 'មុខងារសំខាន់ៗ' : 'Core Features'}
          </h2>
          <div className="flex overflow-x-auto pb-2 gap-3 snap-x scrollbar-none">
            {coreFeatures.map((fac, idx) => (
              <div
                key={idx}
                onClick={() => handleFeatureClick(fac.route)}
                className={cn(
                  'min-w-[145px] sm:min-w-[185px] h-28 sm:h-36 rounded-xl p-3.5 shrink-0 snap-start relative overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all bg-gradient-to-br flex flex-col justify-between text-white group',
                  fac.color
                )}
              >
                <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                  {fac.icon}
                </div>
                <div className="font-bold text-xs sm:text-sm leading-snug drop-shadow">
                  {t(fac.key)}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="text-center pt-1 pb-2">
            <h2 className="text-lg sm:text-xl font-extrabold text-[#3b82f6] dark:text-blue-400 tracking-wide">
              {isKhmer ? 'ព័ត៌មានទូទៅ' : 'General News'}
            </h2>
            <div className="w-12 h-1.5 bg-[#4f6ef7] rounded-full mx-auto mt-1.5" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {newsList.slice(0, visibleNewsCount).map((news) => {
              const isLiked = likedIds.includes(news.id);
              const imgs = Array.isArray(news.images) ? news.images : [];

              return (
                <Card
                  key={news.id}
                  onClick={() => handleOpenNewsModal(news)}
                  className="bg-white dark:bg-[#161f33] border border-slate-200/80 dark:border-slate-800/90 rounded-xl shadow-sm hover:shadow-lg transition-all cursor-pointer overflow-hidden flex flex-col h-[238px] sm:h-[268px]"
                >
                  <div className="p-1.5 sm:p-2 pb-0 shrink-0">
                    <div className="h-[130px] sm:h-[152px] w-full rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
                      {imgs.length === 0 ? (
                        <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                          No Image
                        </div>
                      ) : imgs.length === 1 ? (
                        <img src={imgs[0]} alt="News" className="w-full h-full object-cover" />
                      ) : imgs.length === 2 ? (
                        <div className="grid grid-cols-2 gap-1 h-full">
                          <img src={imgs[0]} alt="1" className="w-full h-full object-cover rounded-l-md" />
                          <img src={imgs[1]} alt="2" className="w-full h-full object-cover rounded-r-md" />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 grid-rows-2 gap-1 h-full">
                          {imgs.slice(0, 4).map((imgUrl, idx) => (
                            <div key={idx} className="relative w-full h-full overflow-hidden rounded-[6px]">
                              <img src={imgUrl} alt={`grid-${idx}`} className="w-full h-full object-cover" />
                              {idx === 3 && imgs.length >= 4 && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-extrabold text-xs sm:text-sm backdrop-blur-[1px]">
                                  +{imgs.length > 4 ? imgs.length - 4 : 1}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <CardContent className="px-2.5 sm:px-3 pt-2 pb-2 flex flex-col flex-1 justify-between overflow-hidden">
                    <div className="space-y-1 overflow-hidden">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-400 leading-none">
                        <span className="flex items-center gap-1 truncate">
                          <Clock className="h-2.5 w-2.5 shrink-0" />
                          <span className="truncate">{isKhmer ? news.date_text_km : news.date_text_en}</span>
                        </span>
                        <span className="flex items-center gap-1 shrink-0 ml-1">
                          <Eye className="h-2.5 w-2.5" /> {news.views}
                        </span>
                      </div>

                      <h3 className="font-extrabold text-[11px] sm:text-xs text-slate-900 dark:text-white line-clamp-2 overflow-hidden text-ellipsis leading-snug h-[31px] sm:h-[34px]">
                        {isKhmer ? news.title_km : news.title_en}
                      </h3>
                    </div>

                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800/80 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleToggleLike(news.id, e)}
                        className={cn(
                          'px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors border',
                          isLiked
                            ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/70 dark:text-rose-400 dark:border-rose-800'
                            : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        )}
                      >
                        <Heart
                          className={cn(
                            'h-2.5 w-2.5 transition-colors',
                            isLiked ? 'fill-rose-500 text-rose-500' : 'fill-white dark:fill-slate-900 text-slate-400'
                          )}
                        />
                        <span>{news.likes}</span>
                      </button>

                      <div className="flex items-center gap-1.5 text-slate-400">
                        {news.facebook_url !== '' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(news.facebook_url || 'https://facebook.com', '_blank');
                            }}
                            className="hover:text-blue-500 transition-colors text-[11px] font-bold px-1 leading-none"
                          >
                            f
                          </button>
                        )}
                        {news.youtube_url !== '' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(news.youtube_url || 'https://youtube.com', '_blank');
                            }}
                            className="hover:text-red-500 transition-colors border border-slate-300 dark:border-slate-600 rounded px-1 py-[1px] text-[7px] leading-none"
                          >
                            ▶
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleShareNews(news, e)}
                          className="hover:text-blue-500 transition-colors p-0.5"
                        >
                          <Share2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {newsList.length > 6 && (
            <div className="flex justify-center pt-3">
              {visibleNewsCount < newsList.length ? (
                <Button
                  onClick={() => setVisibleNewsCount((prev) => prev + 4)}
                  className="bg-white dark:bg-[#1e293b] text-[#3b82f6] border border-[#3b82f6]/30 hover:bg-blue-50 rounded-full px-7 h-10 text-xs sm:text-sm font-bold shadow-sm"
                >
                  See More <ChevronDown className="h-4 w-4 ml-1.5" />
                </Button>
              ) : (
                <Button
                  onClick={() => setVisibleNewsCount(6)}
                  className="bg-white dark:bg-[#1e293b] text-slate-500 border border-slate-200 dark:border-slate-700 rounded-full px-7 h-10 text-xs sm:text-sm font-bold shadow-sm"
                >
                  See Less <ChevronUp className="h-4 w-4 ml-1.5" />
                </Button>
              )}
            </div>
          )}
        </section>
      </div>

      {selectedNews && (
        <div
          onClick={() => setSelectedNewsId(null)}
          className="fixed inset-0 z-[120] bg-[#0f172a]/85 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 font-khmer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-white dark:bg-[#1e293b] rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[88vh] max-h-[820px] border border-white/20"
          >
            <button
              onClick={() => setSelectedNewsId(null)}
              className="absolute top-3.5 right-3.5 z-30 w-10 h-10 rounded-full bg-black/55 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-md transition-colors shadow-lg"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="h-[44%] shrink-0 overflow-y-auto bg-slate-100 dark:bg-slate-900 space-y-1.5 border-b border-slate-200 dark:border-slate-800 scrollbar-thin">
              {selectedNews.images.map((imgUrl, index) => (
                <img
                  key={index}
                  src={imgUrl}
                  alt={`detail-${index}`}
                  className="w-full object-cover block"
                />
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3.5 scrollbar-thin">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                <Clock className="h-4 w-4" />
                <span>{isKhmer ? selectedNews.date_text_km : selectedNews.date_text_en}</span>
              </div>

              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-snug">
                {isKhmer ? selectedNews.title_km : selectedNews.title_en}
              </h2>

              {(selectedNews.subtitle_km || selectedNews.subtitle_en) && (
                <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {isKhmer ? selectedNews.subtitle_km : selectedNews.subtitle_en}
                </p>
              )}

              <div className="text-sm sm:text-base text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed pb-2">
                {isKhmer ? selectedNews.description_km : selectedNews.description_en}
              </div>
            </div>

            <div className="shrink-0 p-3 bg-white dark:bg-[#1e293b] flex items-center gap-2 border-t border-slate-100 dark:border-slate-800">
              {(() => {
                const isModalLiked = likedIds.includes(selectedNews.id);
                return (
                  <button
                    type="button"
                    onClick={(e) => handleToggleLike(selectedNews.id, e)}
                    className={cn(
                      'flex-1 h-10 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all border',
                      isModalLiked
                        ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                    )}
                  >
                    <Heart
                      className={cn(
                        'h-4 w-4 transition-colors',
                        isModalLiked ? 'fill-rose-500 text-rose-500' : 'fill-white dark:fill-slate-900 text-slate-400'
                      )}
                    />
                    <span>Liked ({selectedNews.likes})</span>
                  </button>
                );
              })()}

              <div className="flex-1 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm">
                <Eye className="h-4 w-4 text-slate-500" />
                <span>{selectedNews.views} Views</span>
              </div>

              <button
                type="button"
                onClick={(e) => handleShareNews(selectedNews, e)}
                className="w-11 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/70 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-sm active:scale-95 transition-transform"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {showManageModal && isAdmin && (
        <div className="fixed inset-0 z-[130] bg-black/80 flex items-center justify-center p-3 sm:p-4 font-khmer">
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => setManageTab('news')}
                  className={cn(
                    'text-xs font-bold rounded-lg',
                    manageTab === 'news' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  )}
                >
                  គ្រប់គ្រងព័ត៌មានទូទៅ ({newsList.length})
                </Button>
                <Button
                  size="sm"
                  onClick={() => setManageTab('banners')}
                  className={cn(
                    'text-xs font-bold rounded-lg',
                    manageTab === 'banners' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  )}
                >
                  គ្រប់គ្រងរូប Banner ({banners.length})
                </Button>
              </div>
              <button onClick={() => setShowManageModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-5 flex-1">
              {manageTab === 'news' ? (
                <>
                  <div className="bg-slate-50 dark:bg-[#0f172a] p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <h4 className="font-bold text-sm text-blue-500">
                      {editingNews ? 'កែប្រែព័ត៌មាន (Edit News)' : 'បន្ថែមព័ត៌មានថ្មី (Add News Card)'}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <Input value={formTitleKm} onChange={(e) => setFormTitleKm(e.target.value)} placeholder="ចំណងជើង (ខ្មែរ)..." className="text-xs" />
                      <Input value={formTitleEn} onChange={(e) => setFormTitleEn(e.target.value)} placeholder="Title (English)..." className="text-xs" />
                      <Input value={formDateKm} onChange={(e) => setFormDateKm(e.target.value)} placeholder="កាលបរិច្ឆេទខ្មែរ (ឧ. ព្រហស្បតិ៍ 3 កញ្ញា 2026)" className="text-xs" />
                      <Input value={formDateEn} onChange={(e) => setFormDateEn(e.target.value)} placeholder="Date English (e.g. Thu 3 Sep 2026)" className="text-xs" />
                      <Input value={formFbUrl} onChange={(e) => setFormFbUrl(e.target.value)} placeholder="Facebook Link (Optional)..." className="text-xs" />
                      <Input value={formYtUrl} onChange={(e) => setFormYtUrl(e.target.value)} placeholder="YouTube Link (Optional)..." className="text-xs" />
                    </div>
                    <textarea
                      value={formImagesText}
                      onChange={(e) => setFormImagesText(e.target.value)}
                      placeholder="ដាក់ Link រូបភាព (១ បន្ទាត់ ១ Link រូបភាព អាចដាក់ច្រើនសន្លឹក)..."
                      className="w-full h-20 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs"
                    />
                    <textarea
                      value={formDescKm}
                      onChange={(e) => setFormDescKm(e.target.value)}
                      placeholder="អត្ថបទព័ត៌មានលម្អិត (ភាសាខ្មែរ)..."
                      className="w-full h-24 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs"
                    />
                    <textarea
                      value={formDescEn}
                      onChange={(e) => setFormDescEn(e.target.value)}
                      placeholder="Full Description (English - Optional)..."
                      className="w-full h-20 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs"
                    />
                    <div className="flex justify-end gap-2">
                      {editingNews && (
                        <Button variant="outline" size="sm" onClick={() => openEditNewsForm(undefined)} className="text-xs">
                          បោះបង់ការកែ
                        </Button>
                      )}
                      <Button size="sm" onClick={handleSaveNewsItem} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold">
                        <Plus className="h-3.5 w-3.5 mr-1" /> {editingNews ? 'រក្សាទុកការកែប្រែ' : 'បង្ហោះព័ត៌មាន'}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {newsList.map((n) => (
                      <div
                        key={n.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {n.images[0] && (
                            <img src={n.images[0]} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-slate-900 dark:text-white truncate">{n.title_km}</p>
                            <p className="text-[10px] text-slate-400">
                              {n.date_text_km} • {n.images.length} រូប
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button size="sm" variant="outline" onClick={() => openEditNewsForm(n)} className="h-8 px-2.5 text-xs">
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteNewsItem(n.id)}
                            className="h-8 px-2.5 text-xs text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={newBannerUrl}
                      onChange={(e) => setNewBannerUrl(e.target.value)}
                      placeholder="បញ្ចូល Link រូបភាព Banner (https://...)..."
                      className="text-xs"
                    />
                    <Button onClick={handleAddBanner} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shrink-0">
                      <Plus className="h-4 w-4 mr-1" /> បន្ថែម Banner
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {banners.map((b) => (
                      <div key={b.id} className="relative rounded-xl overflow-hidden border border-slate-700 h-32 group">
                        <img src={b.image_url} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => handleDeleteBanner(b.id)}
                          className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full shadow-lg"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}