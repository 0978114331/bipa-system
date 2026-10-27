import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ChevronDown, ChevronUp, Clock, Eye, Heart, Share2,
  Users, QrCode, DollarSign, Package, FileText, CalendarClock, Building2, Megaphone,
  X, Bell, User as UserIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TranslationKey } from '@/types';

export interface HomeBannerItem {
  id: string;
  image_url: string;
  title_km?: string;
  title_en?: string;
  link_url?: string;
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
}

export const HOME_BANNERS_STORAGE_KEY = 'bipa_home_banners_v1';
export const HOME_NEWS_STORAGE_KEY = 'bipa_home_news_v1';

export const defaultHomeBanners: HomeBannerItem[] = [
  {
    id: 'banner-1',
    image_url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80',
    title_km: 'សកម្មភាពនិស្សិតមណ្ឌល BIPA',
    title_en: 'BIPA Student Activities',
  },
  {
    id: 'banner-2',
    image_url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=80',
    title_km: 'អាហារូបករណ៍សិក្សា ១០០%',
    title_en: '100% Study Scholarship',
  },
];

export const defaultHomeNews: HomeNewsItem[] = [
  {
    id: 'news-1',
    title_km: '📚 បទពិសោធន៍ដ៏មានតម្លៃពីការចូលរួមកម្មវិធី EBC',
    title_en: '📚 Valuable Experience from Participating in EBC Program',
    subtitle_km: '📚 បទពិសោធន៍ដ៏មានតម្លៃពីការចូលរួមកម្មវិធី EBC',
    subtitle_en: '📚 Valuable Experience from EBC Program',
    description_km: 'ថ្ងៃនេះ ខ្ញុំ និងមិត្តរួមក្រុម មានឱកាសបានចូលរួមក្នុងកម្មវិធីទស្សនកិច្ចនៅអង្គការ អ៊ី ប៊ី ស៊ី (EBC) តាមការអញ្ជើញរបស់លោកគ្រូ។\n\nការចូលរួមនេះ គឺជាបទពិសោធន៍ដ៏ល្អមួយសម្រាប់ពួកយើង ក្នុងការស្វែងយល់បន្ថែមអំពីការអនុវត្តការងារជាក់ស្តែង ការប្រើប្រាស់បច្ចេកវិទ្យាទំនើប និងការពង្រឹងសមត្ថភាពសិក្សាស្រាវជ្រាវ។',
    description_en: 'Today, my teammates and I had the opportunity to join a study visit at EBC organization at the invitation of our lecturer.\n\nThis participation is a great experience for us to learn more about practical workflows, modern technology, and research skills.',
    date_text_km: 'ព្រហស្បតិ៍ 3 កញ្ញា 2026',
    date_text_en: 'Thu, 3 Sep 2026',
    views: 126,
    likes: 18,
    images: [
      'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80',
    ],
    facebook_url: 'https://facebook.com',
    youtube_url: 'https://youtube.com',
  },
  {
    id: 'news-2',
    title_km: '🖥️ អនុវត្ត ផ្នែក IT',
    title_en: '🖥️ IT Practical Session',
    subtitle_km: '🖥️ សកម្មភាពអនុវត្តផ្ទាល់ក្នុងបន្ទប់កុំព្យូទ័រ',
    subtitle_en: '🖥️ Hands-on practice in the computer lab',
    description_km: 'សកម្មភាពសិស្សនិស្សិតកំពុងសិក្សា និងអនុវត្តជំនាញ IT តាមរយៈការប្រើប្រាស់កុំព្យូទ័រ។ ការរៀនត្រូវបានផ្តោតលើការអនុវត្តជាក់ស្តែង ដើម្បីឱ្យនិស្សិតមានសមត្ថភាពគ្រប់គ្រាន់ក្នុងការសរសេរកូដ និងគ្រប់គ្រងប្រព័ន្ធទិន្នន័យ។',
    description_en: 'Students studying and practicing IT skills using computers. Learning is focused on practical application to build strong coding and database management skills.',
    date_text_km: 'អាទិត្យ 30 សីហា 2026',
    date_text_en: 'Sun, 30 Aug 2026',
    views: 75,
    likes: 30,
    images: [
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80',
    ],
    facebook_url: 'https://facebook.com',
    youtube_url: 'https://youtube.com',
  },
  {
    id: 'news-3',
    title_km: '🎓 ពិធីចុះអនុស្សរណៈនៃការយោគយល់គ្នា (MoU)',
    title_en: '🎓 Memorandum of Understanding (MoU) Signing Ceremony',
    subtitle_km: '🎓 កិច្ចសហប្រតិបត្តិការអប់រំ និងបច្ចេកវិទ្យា',
    subtitle_en: '🎓 Educational and Technology Cooperation',
    description_km: 'ពិធីចុះអនុស្សរណៈនៃការយោគយល់គ្នា រវាងសាកលវិទ្យាល័យ និងអង្គការដៃគូ ដើម្បីផ្តល់ឱកាសកម្មសិក្សា និងអាហារូបករណ៍ជូនដល់និស្សិតឆ្នើម។',
    description_en: 'Signing ceremony of Memorandum of Understanding between the university and partner organizations to provide internships and scholarships.',
    date_text_km: 'សៅរ៍ 12 កញ្ញា 2026',
    date_text_en: 'Sat, 12 Sep 2026',
    views: 118,
    likes: 42,
    images: [
      'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=800&q=80',
    ],
    facebook_url: 'https://facebook.com',
    youtube_url: 'https://youtube.com',
  },
  {
    id: 'news-4',
    title_km: '🏆 សិក្ខាសាលាស្តីពីសុវត្ថិភាពឌីជីថល និងបច្ចេកវិទ្យា AI',
    title_en: '🏆 Workshop on Digital Safety and AI Technology',
    subtitle_km: '🏆 ការចែករំលែកចំណេះដឹងថ្មីៗជូននិស្សិត',
    subtitle_en: '🏆 Sharing modern knowledge with students',
    description_km: 'វគ្គបណ្តុះបណ្តាលពិសេសស្តីពីការប្រើប្រាស់បច្ចេកវិទ្យា AI ប្រកបដោយក្រមសីលធម៌ និងការការពារសុវត្ថិភាពទិន្នន័យផ្ទាល់ខ្លួននៅលើប្រព័ន្ធអ៊ីនធឺណិត។',
    description_en: 'Special training workshop on ethical AI usage and personal data security on the internet.',
    date_text_km: 'អង្គារ 10 តុលា 2026',
    date_text_en: 'Tue, 10 Oct 2026',
    views: 95,
    likes: 27,
    images: [
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1591115765373-5207764f72e7?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80',
    ],
    facebook_url: 'https://facebook.com',
    youtube_url: 'https://youtube.com',
  },
];

function mountFloatingBackButton(isKhmer: boolean) {
  const existing = document.getElementById('bipa-feature-back-btn');
  if (existing) existing.remove();

  const btn = document.createElement('button');
  btn.id = 'bipa-feature-back-btn';
  btn.type = 'button';
  btn.innerHTML = `<span style="font-size:15px;line-height:1;">←</span> <span>${isKhmer ? 'ត្រឡប់ទៅវិញ' : 'Back to Home'}</span>`;
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
  let banners: HomeBannerItem[] = [];
  let news: HomeNewsItem[] = [];

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
      }));
      localStorage.setItem(HOME_NEWS_STORAGE_KEY, JSON.stringify(news));
    }
  } catch {}

  //  (Default)
  return { banners, news };
}

export function HomePage() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const isKhmer = lang === 'km';

  const [banners, setBanners] = useState<HomeBannerItem[]>(defaultHomeBanners);
  const [newsList, setNewsList] = useState<HomeNewsItem[]>(defaultHomeNews);
  const [currentBannerIdx, setCurrentBannerIdx] = useState(0);
  const [visibleNewsCount, setVisibleNewsCount] = useState(4);

  const [selectedNews, setSelectedNews] = useState<HomeNewsItem | null>(null);
  const [likedIds, setLikedIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('bipa_liked_news_ids') || '[]');
    } catch {
      return [];
    }
  });

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
    setSelectedNews((prev) => {
      if (!prev) return null;
      const updated = data.news.find((n) => n.id === prev.id);
      return updated ? updated : prev;
    });
  };

  useEffect(() => {
    const existingBtn = document.getElementById('bipa-feature-back-btn');
    if (existingBtn) existingBtn.remove();

    loadContent();
    const syncInterval = setInterval(loadContent, 2500);
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
    setSelectedNews(updatedItem);

    const updatedList = newsList.map((n) => (n.id === item.id ? updatedItem : n));
    setNewsList(updatedList);
    localStorage.setItem(HOME_NEWS_STORAGE_KEY, JSON.stringify(updatedList));

    try {
      await supabase.from('bipa_home_news').upsert([{ ...updatedItem, views: nextViews }]);
    } catch {}
    window.dispatchEvent(new Event('home-content-updated'));
  };

  const handleToggleLike = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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

    if (selectedNews && selectedNews.id === id) {
      setSelectedNews({ ...selectedNews, likes: nextLikes });
    }

    try {
      await supabase.from('bipa_home_news').upsert([updatedItem]);
    } catch {}
    window.dispatchEvent(new Event('home-content-updated'));
  };

  const handleShareNews = (item: HomeNewsItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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

  return (
    <div className="min-h-screen bg-[#f4f6fb] dark:bg-[#0b1120] pb-24 font-khmer">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 pt-3 sm:pt-5 space-y-6">

        <div className="relative w-full h-[185px] sm:h-[320px] md:h-[400px] rounded-[24px] overflow-hidden shadow-md bg-slate-900 border border-white/40 dark:border-slate-800">
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
                  'min-w-[145px] sm:min-w-[185px] h-28 sm:h-36 rounded-2xl p-3.5 shrink-0 snap-start relative overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all bg-gradient-to-br flex flex-col justify-between text-white group',
                  fac.color
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
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
            <h2 className="text-lg sm:text-xl font-extrabold text-[#2541b2] dark:text-blue-400 tracking-wide">
              {isKhmer ? 'ព័ត៌មានទូទៅ' : 'General News'}
            </h2>
            <div className="w-12 h-1.5 bg-[#4f6ef7] rounded-full mx-auto mt-1.5" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {newsList.slice(0, visibleNewsCount).map((news) => {
              const isLiked = likedIds.includes(news.id);
              const imgs = news.images && news.images.length > 0 ? news.images : defaultHomeNews[0].images;

              return (
                <Card
                  key={news.id}
                  onClick={() => handleOpenNewsModal(news)}
                  className="bg-white dark:bg-[#1e293b] border border-slate-100 dark:border-slate-800 rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-lg transition-all cursor-pointer overflow-hidden flex flex-col h-[315px] sm:h-[360px]"
                >
                  <div className="p-2 sm:p-2.5 pb-0 shrink-0">
                    <div className="h-[138px] sm:h-[172px] w-full rounded-[18px] overflow-hidden bg-slate-100 dark:bg-slate-800">
                      {imgs.length === 1 ? (
                        <img src={imgs[0]} alt="News" className="w-full h-full object-cover" />
                      ) : imgs.length === 2 ? (
                        <div className="grid grid-cols-2 gap-1 h-full">
                          <img src={imgs[0]} alt="1" className="w-full h-full object-cover rounded-l-xl" />
                          <img src={imgs[1]} alt="2" className="w-full h-full object-cover rounded-r-xl" />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 grid-rows-2 gap-1 h-full">
                          {imgs.slice(0, 4).map((imgUrl, idx) => (
                            <div key={idx} className="relative w-full h-full overflow-hidden rounded-[10px]">
                              <img src={imgUrl} alt={`grid-${idx}`} className="w-full h-full object-cover" />
                              {idx === 3 && imgs.length >= 4 && (
                                <div className="absolute inset-0 bg-black/55 flex items-center justify-center text-white font-extrabold text-sm sm:text-base backdrop-blur-[1px]">
                                  +{imgs.length > 4 ? imgs.length - 4 : 1}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <CardContent className="p-3 sm:p-4 pt-2.5 flex flex-col flex-1 justify-between overflow-hidden">
                    <div className="space-y-1.5 overflow-hidden">
                      <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-400">
                        <span className="flex items-center gap-1 truncate">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span className="truncate">{isKhmer ? news.date_text_km : news.date_text_en}</span>
                        </span>
                        <span className="flex items-center gap-1 shrink-0 ml-1">
                          <Eye className="h-3 w-3" /> {news.views}
                        </span>
                      </div>

                      <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-2 overflow-hidden text-ellipsis leading-snug h-[34px] sm:h-[40px]">
                        {isKhmer ? news.title_km : news.title_en}
                      </h3>

                      <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-300 line-clamp-2 overflow-hidden text-ellipsis leading-relaxed h-[32px] sm:h-[36px]">
                        {isKhmer ? news.description_km : news.description_en}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleToggleLike(news.id, e)}
                        className={cn(
                          'px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 transition-colors border',
                          isLiked
                            ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/70 dark:text-rose-400 dark:border-rose-800'
                            : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        )}
                      >
                        <Heart
                          className={cn(
                            'h-3.5 w-3.5 transition-colors',
                            isLiked ? 'fill-rose-500 text-rose-500' : 'fill-white dark:fill-slate-900 text-slate-400'
                          )}
                        />
                        <span>{news.likes}</span>
                      </button>

                      <div className="flex items-center gap-2 text-slate-400">
                        {news.facebook_url !== '' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(news.facebook_url || 'https://facebook.com', '_blank');
                            }}
                            className="hover:text-blue-600 transition-colors text-xs font-bold px-1"
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
                            className="hover:text-red-500 transition-colors border border-slate-300 dark:border-slate-600 rounded px-1 py-0.5 text-[8px] leading-none"
                          >
                            ▶
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleShareNews(news, e)}
                          className="hover:text-blue-500 transition-colors p-0.5"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {newsList.length > 4 && (
            <div className="flex justify-center pt-3">
              {visibleNewsCount < newsList.length ? (
                <Button
                  onClick={() => setVisibleNewsCount((prev) => prev + 4)}
                  className="bg-white dark:bg-[#1e293b] text-[#3b82f6] border border-[#3b82f6]/30 hover:bg-blue-50 rounded-full px-7 h-10 text-xs sm:text-sm font-bold shadow-sm"
                >
                  {isKhmer ? 'See More' : 'See More'} <ChevronDown className="h-4 w-4 ml-1.5" />
                </Button>
              ) : (
                <Button
                  onClick={() => setVisibleNewsCount(4)}
                  className="bg-white dark:bg-[#1e293b] text-slate-500 border border-slate-200 dark:border-slate-700 rounded-full px-7 h-10 text-xs sm:text-sm font-bold shadow-sm"
                >
                  {isKhmer ? 'See Less' : 'See Less'} <ChevronUp className="h-4 w-4 ml-1.5" />
                </Button>
              )}
            </div>
          )}
        </section>
      </div>

      {selectedNews && (
        <div
          onClick={() => setSelectedNews(null)}
          className="fixed inset-0 z-[120] bg-[#0f172a]/85 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 font-khmer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-white dark:bg-[#1e293b] rounded-[28px] overflow-hidden shadow-2xl flex flex-col h-[88vh] max-h-[820px] border border-white/20"
          >
            <button
              onClick={() => setSelectedNews(null)}
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

            <div className="shrink-0 p-3.5 bg-white dark:bg-[#1e293b] flex items-center gap-2.5 border-t border-slate-100 dark:border-slate-800">
              {(() => {
                const isModalLiked = likedIds.includes(selectedNews.id);
                return (
                  <button
                    type="button"
                    onClick={() => handleToggleLike(selectedNews.id)}
                    className={cn(
                      'flex-1 h-11 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all border',
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

              <div className="flex-1 h-11 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm">
                <Eye className="h-4 w-4 text-slate-500" />
                <span>{selectedNews.views} Views</span>
              </div>

              <button
                type="button"
                onClick={() => handleShareNews(selectedNews)}
                className="w-12 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/70 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-sm active:scale-95 transition-transform"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}