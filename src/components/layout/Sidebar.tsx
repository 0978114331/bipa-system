import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, Building2, QrCode, DollarSign,
  CalendarClock, FileText, Package, Megaphone, Settings,
  GraduationCap, ClipboardList, LayoutTemplate, Plus, Edit2,
  Trash2, Eye, Heart, BarChart3, Save
} from 'lucide-react';
import { UserRole } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { HomeBannerItem, HomeNewsItem, fetchHomeContentFromDb, HOME_NEWS_STORAGE_KEY } from '@/pages/public/HomePage';

interface NavItem {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
  roles: UserRole[];
}

export function Sidebar() {
  const { profile } = useAuth();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const isKhmer = lang === 'km';

  const [showHomeManager, setShowHomeManager] = useState(false);
  const [manageTab, setManageTab] = useState<'news' | 'banners' | 'settings'>('news');
  const [banners, setBanners] = useState<HomeBannerItem[]>([]);
  const [newsList, setNewsList] = useState<HomeNewsItem[]>([]);

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

  const [sysLogo, setSysLogo] = useState('');
  const [sysNameKm, setSysNameKm] = useState('');
  const [sysNameEn, setSysNameEn] = useState('');

  const loadHomeData = async () => {
    const data = await fetchHomeContentFromDb();
    setBanners(data.banners);
    setNewsList(data.news);
    
    // ទាញការកំណត់ពី Database
    const { data: setDb } = await supabase.from('bipa_settings').select('*').eq('id', '1').single();
    if (setDb) {
      setSysLogo(setDb.logo_url);
      setSysNameKm(setDb.name_km);
      setSysNameEn(setDb.name_en);
    }
  };

  useEffect(() => {
    if (showHomeManager) {
      loadHomeData();
    }
  }, [showHomeManager]);

  const handleSaveSettings = async () => {
    try {
      await supabase.from('bipa_settings').upsert({
        id: '1',
        logo_url: sysLogo,
        name_km: sysNameKm,
        name_en: sysNameEn
      });
      window.dispatchEvent(new Event('system-settings-updated'));
      alert('បានរក្សាទុកការកំណត់ប្រព័ន្ធដោយជោគជ័យ!');
    } catch (error) {
      console.error(error);
    }
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
      setFormDateKm(new Date().toLocaleDateString('km-KH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
      setFormDateEn(new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }));
      setFormImagesText('');
      setFormFbUrl('');
      setFormYtUrl('');
    }
  };

  const handleSaveNewsItem = async () => {
    if (!formTitleKm.trim() || !formDescKm.trim()) return;
    const imgArray = formImagesText.split('\n').map((s) => s.trim()).filter(Boolean);
    const finalImages = imgArray.length > 0 ? imgArray : ['https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80'];

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
      images: finalImages,
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
    if (!window.confirm('តើអ្នកពិតជាចង់លុបព័ត៌មាននេះមែនទេ?')) return;
    const nextList = newsList.filter((n) => n.id !== id);
    setNewsList(nextList);
    localStorage.setItem(HOME_NEWS_STORAGE_KEY, JSON.stringify(nextList));
    try {
      await supabase.from('bipa_home_news').delete().eq('id', id);
    } catch {}
    window.dispatchEvent(new Event('home-content-updated'));
  };

  const handleAddBanner = () => {
    if (!newBannerUrl.trim()) return;
    const newB: HomeBannerItem = {
      id: `banner-${Date.now()}`,
      image_url: newBannerUrl.trim(),
    };
    setBanners([...banners, newB]);
    setNewBannerUrl('');
  };

  const handleDeleteBanner = (id: string) => {
    setBanners(banners.filter((b) => b.id !== id));
  };

  const handleSaveBanners = async () => {
    try {
      // លុប Banner ចាស់ចោលទាំងអស់ក្នុង Database រួចបញ្ចូលថ្មី
      await supabase.from('bipa_home_banners').delete().neq('id', 'dummy_value');
      
      if (banners.length > 0) {
        const toInsert = banners.map((b, idx) => ({ ...b, sort_order: idx }));
        await supabase.from('bipa_home_banners').insert(toInsert);
      }
      
      alert('បានរក្សាទុករូប Banner ជោគជ័យ!');
      window.dispatchEvent(new Event('home-content-updated'));
    } catch (error) {
      console.error(error);
    }
  };

  const adminItems: NavItem[] = [
    { label: t('dashboard.overview'), path: '/admin', icon: LayoutDashboard, roles: ['super_admin', 'residence_admin', 'finance_admin', 'duty_manager'] },
    { label: isKhmer ? 'គ្រប់គ្រងទំព័រដើម (Home)' : 'Manage Home', path: '#home-manager', icon: LayoutTemplate, roles: ['super_admin', 'residence_admin', 'finance_admin', 'duty_manager'] },
    { label: t('feature.studentInfo'), path: '/admin/students', icon: Users, roles: ['super_admin', 'residence_admin'] },
    { label: t('feature.facilities'), path: '/admin/residences', icon: Building2, roles: ['super_admin', 'residence_admin'] },
    { label: t('feature.qrAttendance'), path: '/admin/attendance', icon: QrCode, roles: ['super_admin', 'residence_admin', 'duty_manager'] },
    { label: t('feature.payments'), path: '/admin/payments', icon: DollarSign, roles: ['super_admin', 'residence_admin', 'finance_admin'] },
    { label: t('feature.duty'), path: '/admin/duties', icon: CalendarClock, roles: ['super_admin', 'residence_admin', 'duty_manager'] },
    { label: t('feature.leave'), path: '/admin/leave-requests', icon: FileText, roles: ['super_admin', 'residence_admin'] },
    { label: t('feature.facilities') + ' (Assets)', path: '/admin/assets', icon: Package, roles: ['super_admin', 'residence_admin'] },
    { label: t('feature.announcements'), path: '/admin/announcements', icon: Megaphone, roles: ['super_admin', 'residence_admin', 'finance_admin', 'duty_manager'] },
    { label: t('settings.title'), path: '/admin/settings', icon: Settings, roles: ['super_admin'] },
  ];

  const studentItems: NavItem[] = [
    { label: t('dashboard.studentDashboard'), path: '/dashboard', icon: LayoutDashboard, roles: ['student'] },
    { label: t('feature.qrAttendance'), path: '/dashboard/scan', icon: QrCode, roles: ['student'] },
    { label: t('qr.history'), path: '/dashboard/attendance', icon: ClipboardList, roles: ['student'] },
    { label: t('feature.payments'), path: '/dashboard/payments', icon: DollarSign, roles: ['student'] },
    { label: t('feature.duty'), path: '/dashboard/duties', icon: CalendarClock, roles: ['student'] },
    { label: t('feature.leave'), path: '/dashboard/leave', icon: FileText, roles: ['student'] },
  ];

  const isAdminRole = profile && ['super_admin', 'residence_admin', 'finance_admin', 'duty_manager'].includes(profile.role);
  const items = isAdminRole ? adminItems : studentItems;
  const visibleItems = items.filter((item) => profile && item.roles.includes(profile.role));

  const isActive = (path: string) => {
    if (path === '#home-manager') return showHomeManager;
    if (showHomeManager) return false;
    if (path === '/admin' || path === '/dashboard') return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const totalViews = newsList.reduce((acc, n) => acc + (n.views || 0), 0);
  const totalLikes = newsList.reduce((acc, n) => acc + (n.likes || 0), 0);
  const maxViews = Math.max(...newsList.map((n) => n.views || 1), 1);

  return (
    <>
      <aside className="hidden lg:flex w-64 shrink-0 border-r bg-card flex-col z-40">
        <div className="p-4 border-b">
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
                if (item.path === '#home-manager') {
                  openEditNewsForm(undefined);
                  setShowHomeManager(true);
                } else {
                  setShowHomeManager(false);
                  navigate(item.path);
                }
              }}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left',
                isActive(item.path)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {showHomeManager && isAdminRole && (
        <div className="fixed top-16 sm:top-20 left-0 lg:left-64 right-0 bottom-0 z-30 bg-[#0b1120] overflow-y-auto p-4 sm:p-6 font-khmer text-slate-200 space-y-6">
          <div className="bg-[#1e293b] rounded-2xl p-6 shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <Badge className="bg-[#eab308] text-[#0f172a] font-bold px-2.5 py-1 mb-2">
                HOME & NEWS CMS
              </Badge>
              <h1 className="text-2xl font-bold text-white">គ្រប់គ្រងព័ត៌មានទំព័រដើម (Home Page)</h1>
              <p className="text-slate-400 text-sm">បង្ហោះ និងកែប្រែព័ត៌មានទូទៅ រូបភាព Banner និងតាមដានស្ថិតិអ្នកមើល/ចុចបេះដូង។</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setManageTab('news')} className={cn('font-bold rounded-xl', manageTab === 'news' ? 'bg-[#3b82f6] text-white' : 'bg-[#0f172a] text-slate-400 border border-slate-700')}>
                គ្រប់គ្រងព័ត៌មានទូទៅ ({newsList.length})
              </Button>
              <Button onClick={() => setManageTab('banners')} className={cn('font-bold rounded-xl', manageTab === 'banners' ? 'bg-[#3b82f6] text-white' : 'bg-[#0f172a] text-slate-400 border border-slate-700')}>
                គ្រប់គ្រងរូប Banner ({banners.length})
              </Button>
              <Button onClick={() => setManageTab('settings')} className={cn('font-bold rounded-xl', manageTab === 'settings' ? 'bg-amber-500 text-white' : 'bg-[#0f172a] text-slate-400 border border-slate-700')}>
                <Settings className="h-4 w-4 mr-2" /> ការកំណត់ប្រព័ន្ធ
              </Button>
            </div>
          </div>

          <Card className="bg-[#1e293b] border-slate-800 shadow-md">
            <CardHeader className="pb-3 border-b border-slate-800 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-emerald-400" /> ក្រាបស្ថិតិអ្នកមើល និងចុចបេះដូង (Views & Likes Chart)
              </CardTitle>
              <div className="flex items-center gap-4 text-xs font-bold">
                <span className="text-blue-400 flex items-center gap-1"><Eye className="h-4 w-4" /> សរុប: {totalViews} Views</span>
                <span className="text-rose-400 flex items-center gap-1"><Heart className="h-4 w-4 fill-rose-500" /> សរុប: {totalLikes} Likes</span>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-4 max-h-[240px] overflow-y-auto scrollbar-thin">
              {newsList.map((n) => {
                const viewPct = Math.round(((n.views || 0) / maxViews) * 100);
                const likePct = Math.round(((n.likes || 0) / maxViews) * 100);
                return (
                  <div key={n.id} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-white truncate max-w-[70%]">{n.title_km}</span>
                      <span className="text-slate-400 shrink-0">
                        <span className="text-blue-400 mr-3">{n.views} Views</span>
                        <span className="text-rose-400">{n.likes} Likes</span>
                      </span>
                    </div>
                    <div className="w-full bg-[#0f172a] h-2.5 rounded-full overflow-hidden flex gap-0.5 p-0.5 border border-slate-800">
                      <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(viewPct, 3)}%` }} />
                      <div className="bg-rose-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(likePct, 2)}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {manageTab === 'settings' && (
            <Card className="bg-[#1e293b] border-slate-800 shadow-md">
              <CardHeader className="border-b border-slate-800">
                <CardTitle className="text-amber-500 text-lg font-bold flex items-center gap-2">
                  <Settings className="h-5 w-5" /> ការកំណត់ទូទៅ (General Settings)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-5 max-w-2xl">
                <div>
                  <label className="text-sm text-slate-300 font-bold block mb-2">Logo ប្រព័ន្ធ (URL)</label>
                  <div className="flex gap-4 items-center">
                    {sysLogo && <img src={sysLogo} alt="Logo" className="w-16 h-16 rounded-xl object-contain bg-slate-800 border border-slate-700 p-1 shrink-0" />}
                    <Input value={sysLogo} onChange={(e) => setSysLogo(e.target.value)} placeholder="https://..." className="bg-[#0f172a] border-slate-700 text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-300 font-bold block mb-2">ឈ្មោះប្រព័ន្ធ (ភាសាខ្មែរ)</label>
                    <Input value={sysNameKm} onChange={(e) => setSysNameKm(e.target.value)} className="bg-[#0f172a] border-slate-700 text-white" />
                  </div>
                  <div>
                    <label className="text-sm text-slate-300 font-bold block mb-2">System Name (English)</label>
                    <Input value={sysNameEn} onChange={(e) => setSysNameEn(e.target.value)} className="bg-[#0f172a] border-slate-700 text-white" />
                  </div>
                </div>
                <Button onClick={handleSaveSettings} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-8 rounded-xl shadow-md">
                  <Save className="h-4 w-4 mr-2" /> រក្សាទុកការផ្លាស់ប្តូរ
                </Button>
              </CardContent>
            </Card>
          )}

          {manageTab === 'news' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
              <Card className="bg-[#1e293b] border-slate-800 shadow-md h-fit">
                <CardHeader className="pb-3 border-b border-slate-800">
                  <CardTitle className="text-blue-400 text-base font-bold">
                    {editingNews ? 'កែប្រែព័ត៌មានដែលបានជ្រើសរើស' : 'បង្ហោះព័ត៌មានថ្មីទៅកាន់ទំព័រដើម'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input value={formTitleKm} onChange={(e) => setFormTitleKm(e.target.value)} placeholder="ចំណងជើងព័ត៌មាន (ខ្មែរ)..." className="bg-[#0f172a] border-slate-700 text-white text-xs h-10" />
                    <Input value={formTitleEn} onChange={(e) => setFormTitleEn(e.target.value)} placeholder="Title (English)..." className="bg-[#0f172a] border-slate-700 text-white text-xs h-10" />
                    <Input value={formDateKm} onChange={(e) => setFormDateKm(e.target.value)} placeholder="ថ្ងៃខែឆ្នាំខ្មែរ (ឧ. ព្រហស្បតិ៍ 3 កញ្ញា 2026)" className="bg-[#0f172a] border-slate-700 text-white text-xs h-10" />
                    <Input value={formDateEn} onChange={(e) => setFormDateEn(e.target.value)} placeholder="Date English (e.g. Thu 3 Sep 2026)" className="bg-[#0f172a] border-slate-700 text-white text-xs h-10" />
                    <Input value={formFbUrl} onChange={(e) => setFormFbUrl(e.target.value)} placeholder="Facebook Link (Optional)..." className="bg-[#0f172a] border-slate-700 text-white text-xs h-10" />
                    <Input value={formYtUrl} onChange={(e) => setFormYtUrl(e.target.value)} placeholder="YouTube Link (Optional)..." className="bg-[#0f172a] border-slate-700 text-white text-xs h-10" />
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
                    <label className="text-xs text-slate-400 font-semibold block mb-1">អត្ថបទព័ត៌មានពេញលេញ (ភាសាខ្មែរ)</label>
                    <textarea
                      value={formDescKm}
                      onChange={(e) => setFormDescKm(e.target.value)}
                      placeholder="សរសេរអត្ថបទព័ត៌មានលម្អិត..."
                      className="w-full h-28 bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-xs text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-semibold block mb-1">Full Description (English - Optional)</label>
                    <textarea
                      value={formDescEn}
                      onChange={(e) => setFormDescEn(e.target.value)}
                      placeholder="Write full English description..."
                      className="w-full h-20 bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-xs text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    {editingNews && (
                      <Button variant="outline" onClick={() => openEditNewsForm(undefined)} className="border-slate-600 text-slate-300 text-xs">
                        បោះបង់ការកែ
                      </Button>
                    )}
                    <Button onClick={handleSaveNewsItem} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5">
                      <Save className="h-4 w-4 mr-1.5" /> {editingNews ? 'រក្សាទុកការកែប្រែ' : 'បង្ហោះព័ត៌មាន'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#1e293b] border-slate-800 shadow-md">
                <CardHeader className="pb-3 border-b border-slate-800">
                  <CardTitle className="text-white text-base font-bold">បញ្ជីព័ត៌មានដែលកំពុងបង្ហាញលើទំព័រដើម</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 max-h-[620px] overflow-y-auto space-y-3 scrollbar-thin">
                  {newsList.map((n) => (
                    <div key={n.id} className="bg-[#0f172a] border border-slate-800 p-3.5 rounded-xl flex items-center gap-3.5 hover:border-slate-700 transition-colors">
                      <img src={n.images[0]} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0 bg-slate-800" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs sm:text-sm text-white truncate">{n.title_km}</h4>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{n.description_km}</p>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1.5 font-semibold">
                          <span>{n.images.length} រូបភាព</span>
                          <span className="flex items-center gap-1 text-blue-400"><Eye className="h-3 w-3" /> {n.views}</span>
                          <span className="flex items-center gap-1 text-rose-400"><Heart className="h-3 w-3 fill-rose-500" /> {n.likes}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
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
            <Card className="bg-[#1e293b] border-slate-800 shadow-md">
              <CardContent className="p-6 space-y-6">
                <div className="flex flex-col sm:flex-row gap-3 max-w-2xl">
                  <Input
                    value={newBannerUrl}
                    onChange={(e) => setNewBannerUrl(e.target.value)}
                    placeholder="បញ្ចូល Link រូបភាព Banner ថ្មី (https://...)..."
                    className="bg-[#0f172a] border-slate-700 text-white text-xs h-10"
                  />
                  <Button onClick={handleAddBanner} className="bg-[#3b82f6] hover:bg-blue-600 text-white font-bold text-xs h-10 shrink-0">
                    <Plus className="h-4 w-4 mr-1.5" /> បន្ថែមរូប Banner
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {banners.map((b) => (
                    <div key={b.id} className="relative rounded-2xl overflow-hidden h-44 border border-slate-700 group bg-[#0f172a]">
                      <img src={b.image_url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => handleDeleteBanner(b.id)}
                        className="absolute top-3 right-3 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                
                {/* នេះជាប៊ូតុងរក្សាទុក Banner ថ្មីដែលបានបន្ថែម */}
                <div className="flex justify-end border-t border-slate-800 pt-4">
                  <Button onClick={handleSaveBanners} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-8 rounded-xl shadow-md">
                    <Save className="h-4 w-4 mr-2" /> រក្សាទុករូប Banner
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </>
  );
}