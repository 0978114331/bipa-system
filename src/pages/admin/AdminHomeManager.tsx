import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, Eye, Heart, Save, BarChart3, Settings, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HomeBannerItem, HomeNewsItem } from '@/pages/public/HomePage';

export function AdminHomeManager() {
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

  const [sysLogo, setSysLogo] = useState(localStorage.getItem('bipa_sys_logo') || 'https://i.ibb.co/tphX7kd4/ce2e43f3-9d48-4d71-86a6-dd1ac3d77c49.png');
  const [sysNameKm, setSysNameKm] = useState(localStorage.getItem('bipa_sys_name_km') || 'BIPA');
  const [sysNameEn, setSysNameEn] = useState(localStorage.getItem('bipa_sys_name_en') || 'BIPA');

  const loadData = async () => {
    try {
      const { data: dbBanners } = await supabase.from('bipa_home_banners').select('*').order('sort_order', { ascending: true });
      if (dbBanners) setBanners(dbBanners);
      
      const { data: dbNews } = await supabase.from('bipa_home_news').select('*').order('created_at', { ascending: false });
      if (dbNews) setNewsList(dbNews);
    } catch {}
  };

  useEffect(() => { 
    loadData(); 
  }, []);

  const handleSaveSettings = () => {
    localStorage.setItem('bipa_sys_logo', sysLogo);
    localStorage.setItem('bipa_sys_name_km', sysNameKm);
    localStorage.setItem('bipa_sys_name_en', sysNameEn);
    window.dispatchEvent(new Event('system-settings-updated'));
    alert('System settings saved successfully!');
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

    try {
      await supabase.from('bipa_home_news').upsert([itemData]);
      await loadData();
      openEditNewsForm(undefined);
    } catch {}
  };

  const handleDeleteNewsItem = async (id: string) => {
    if (!window.confirm('Delete this news?')) return;
    try {
      await supabase.from('bipa_home_news').delete().eq('id', id);
      await loadData();
    } catch {}
  };

  const handleAddBanner = async () => {
    if (!newBannerUrl.trim()) return;
    const newB = { id: `banner-${Date.now()}`, image_url: newBannerUrl.trim(), sort_order: banners.length };
    try {
      await supabase.from('bipa_home_banners').insert([newB]);
      setNewBannerUrl('');
      await loadData();
    } catch {}
  };

  const handleDeleteBanner = async (id: string) => {
    try {
      await supabase.from('bipa_home_banners').delete().eq('id', id);
      await loadData();
    } catch {}
  };

  const totalViews = newsList.reduce((acc, n) => acc + (n.views || 0), 0);
  const totalLikes = newsList.reduce((acc, n) => acc + (n.likes || 0), 0);
  const maxViews = Math.max(...newsList.map((n) => n.views || 1), 1);
  const topNews = [...newsList].sort((a, b) => (b.views + b.likes) - (a.views + a.likes)).slice(0, 5);

  return (
    <div className="p-4 sm:p-6 font-khmer text-slate-200 space-y-6 min-h-screen bg-[#f1f5f9] dark:bg-[#0b1120]">
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold px-3 py-1.5 mb-2 shadow-sm">
            HOME & NEWS CMS
          </Badge>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-wide">គ្រប់គ្រងទំព័រដើម (Home Page)</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">បង្ហោះ និងកែប្រែព័ត៌មានទូទៅ រូបភាព Banner និងតាមដានស្ថិតិ។</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setManageTab('news')} className={cn('font-bold rounded-xl h-10', manageTab === 'news' ? 'bg-[#3b82f6] text-white shadow-md' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700')}>
            គ្រប់គ្រងព័ត៌មានទូទៅ ({newsList.length})
          </Button>
          <Button onClick={() => setManageTab('banners')} className={cn('font-bold rounded-xl h-10', manageTab === 'banners' ? 'bg-[#3b82f6] text-white shadow-md' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700')}>
            គ្រប់គ្រងរូប Banner ({banners.length})
          </Button>
          <Button onClick={() => setManageTab('settings')} className={cn('font-bold rounded-xl h-10', manageTab === 'settings' ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700')}>
            <Settings className="h-4 w-4 mr-2" /> ការកំណត់ប្រព័ន្ធ
          </Button>
        </div>
      </div>

      <Card className="bg-gradient-to-br from-white to-slate-50 dark:from-[#1e293b] dark:to-[#0f172a] border-slate-200 dark:border-slate-800 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800/50 relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-base sm:text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Activity className="h-6 w-6 text-emerald-500" /> ក្រាបស្ថិតិអ្នកមើល និងចុចបេះដូង (Views & Likes Chart)
          </CardTitle>
          <div className="flex items-center gap-4 text-xs font-bold bg-white dark:bg-slate-800/80 px-4 py-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1.5"><Eye className="h-4 w-4" /> សរុប: {totalViews} Views</span>
            <span className="w-px h-4 bg-slate-300 dark:bg-slate-600"></span>
            <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1.5"><Heart className="h-4 w-4 fill-rose-500" /> សរុប: {totalLikes} Likes</span>
          </div>
        </CardHeader>
        <CardContent className="pt-6 relative z-10">
          <div className="space-y-5">
            {topNews.map((n, idx) => {
              const viewPct = Math.min(Math.max(Math.round(((n.views || 0) / maxViews) * 100), 5), 100);
              const likePct = Math.min(Math.max(Math.round(((n.likes || 0) / maxViews) * 100), 2), 100);
              return (
                <div key={n.id} className="space-y-2">
                  <div className="flex justify-between text-xs sm:text-sm font-bold">
                    <span className="text-slate-700 dark:text-slate-200 truncate max-w-[65%] flex items-center gap-2">
                      <span className="text-slate-400 font-black">#{idx + 1}</span> {n.title_km}
                    </span>
                    <span className="flex items-center gap-4 shrink-0">
                      <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1"><Eye className="h-3.5 w-3.5"/> {n.views} Views</span>
                      <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1"><Heart className="h-3.5 w-3.5"/> {n.likes} Likes</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-[#09090b] h-3 rounded-full overflow-hidden flex flex-col gap-0.5 border border-slate-200 dark:border-slate-800 shadow-inner p-px">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-400 h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${viewPct}%` }} />
                    <div className="bg-gradient-to-r from-rose-600 to-rose-400 h-full rounded-full transition-all duration-1000 absolute top-px left-px bottom-px opacity-70" style={{ width: `${likePct}%` }} />
                  </div>
                </div>
              );
            })}
            {topNews.length === 0 && <div className="text-center text-slate-500 py-4">មិនទាន់មានទិន្នន័យវិភាគទេ</div>}
          </div>
        </CardContent>
      </Card>

      {manageTab === 'settings' && (
        <Card className="bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-800 shadow-md">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-amber-500 text-lg font-bold flex items-center gap-2">
              <Settings className="h-5 w-5" /> ការកំណត់ទូទៅ (General Settings)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-5 max-w-2xl">
            <div>
              <label className="text-sm text-slate-700 dark:text-slate-300 font-bold block mb-2">Logo ប្រព័ន្ធ (URL)</label>
              <div className="flex gap-4 items-center">
                <img src={sysLogo} alt="Logo" className="w-16 h-16 rounded-xl object-contain bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 shrink-0" />
                <Input value={sysLogo} onChange={(e) => setSysLogo(e.target.value)} placeholder="https://..." className="bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-700" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-700 dark:text-slate-300 font-bold block mb-2">ឈ្មោះប្រព័ន្ធ (ភាសាខ្មែរ)</label>
                <Input value={sysNameKm} onChange={(e) => setSysNameKm(e.target.value)} className="bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-700" />
              </div>
              <div>
                <label className="text-sm text-slate-700 dark:text-slate-300 font-bold block mb-2">System Name (English)</label>
                <Input value={sysNameEn} onChange={(e) => setSysNameEn(e.target.value)} className="bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-700" />
              </div>
            </div>
            <Button onClick={handleSaveSettings} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-8 rounded-xl shadow-md">
              <Save className="h-4 w-4 mr-2" /> រក្សាទុកការផ្លាស់ប្តូរ
            </Button>
          </CardContent>
        </Card>
      )}

      {manageTab === 'news' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 pb-12 items-start">
          <Card className="bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-800 shadow-md lg:col-span-3 sticky top-24">
            <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
              <CardTitle className="text-blue-600 dark:text-blue-400 text-base font-bold">
                {editingNews ? 'កែប្រែព័ត៌មានដែលបានជ្រើសរើស' : 'បង្ហោះព័ត៌មានថ្មីទៅកាន់ទំព័រដើម'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input value={formTitleKm} onChange={(e) => setFormTitleKm(e.target.value)} placeholder="ចំណងជើងព័ត៌មាន (ខ្មែរ)..." className="text-xs h-10 bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-700 dark:text-white" />
                <Input value={formTitleEn} onChange={(e) => setFormTitleEn(e.target.value)} placeholder="Title (English)..." className="text-xs h-10 bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-700 dark:text-white" />
                <Input value={formDateKm} onChange={(e) => setFormDateKm(e.target.value)} placeholder="ថ្ងៃខែឆ្នាំខ្មែរ (ឧ. ព្រហស្បតិ៍ 3 កញ្ញា 2026)" className="text-xs h-10 bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-700 dark:text-white" />
                <Input value={formDateEn} onChange={(e) => setFormDateEn(e.target.value)} placeholder="Date English (e.g. Thu 3 Sep 2026)" className="text-xs h-10 bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-700 dark:text-white" />
                <Input value={formFbUrl} onChange={(e) => setFormFbUrl(e.target.value)} placeholder="Facebook Link (Optional)..." className="text-xs h-10 bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-700 dark:text-white" />
                <Input value={formYtUrl} onChange={(e) => setFormYtUrl(e.target.value)} placeholder="YouTube Link (Optional)..." className="text-xs h-10 bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-700 dark:text-white" />
              </div>
              <div>
                <label className="text-xs text-slate-500 font-bold block mb-1">Link រូបភាព (ដាក់ ១ បន្ទាត់ ១ Link អាចបន្ថែមរូបភាពបានច្រើនសន្លឹក)</label>
                <textarea value={formImagesText} onChange={(e) => setFormImagesText(e.target.value)} placeholder="https://example.com/photo1.jpg&#10;https://example.com/photo2.jpg" className="w-full h-24 rounded-xl p-3 text-xs outline-none focus:border-blue-500 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 dark:text-white" />
              </div>
              <div>
                <label className="text-xs text-slate-500 font-bold block mb-1">អត្ថបទព័ត៌មានពេញលេញ (ភាសាខ្មែរ)</label>
                <textarea value={formDescKm} onChange={(e) => setFormDescKm(e.target.value)} placeholder="សរសេរអត្ថបទព័ត៌មានលម្អិត..." className="w-full h-32 rounded-xl p-3 text-xs outline-none focus:border-blue-500 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 dark:text-white" />
              </div>
              <div>
                <label className="text-xs text-slate-500 font-bold block mb-1">Full Description (English - Optional)</label>
                <textarea value={formDescEn} onChange={(e) => setFormDescEn(e.target.value)} placeholder="Write full English description..." className="w-full h-20 rounded-xl p-3 text-xs outline-none focus:border-blue-500 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 dark:text-white" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                {editingNews && <Button variant="outline" onClick={() => openEditNewsForm(undefined)} className="text-xs font-bold rounded-xl h-10 border-slate-300 dark:border-slate-600 dark:text-slate-300">បោះបង់ការកែ</Button>}
                <Button onClick={handleSaveNewsItem} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 rounded-xl h-10 shadow-md">
                  <Save className="h-4 w-4 mr-1.5" /> {editingNews ? 'រក្សាទុកការកែប្រែ' : 'បង្ហោះព័ត៌មាន'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-800 shadow-md lg:col-span-2">
            <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
              <CardTitle className="text-slate-900 dark:text-white text-base font-bold">បញ្ជីព័ត៌មានដែលកំពុងបង្ហាញលើទំព័រដើម</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 p-2 sm:p-4">
              
              <div className="h-[65vh] max-h-[600px] overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
                {newsList.map((n) => (
                  <div key={n.id} className="bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 p-3 rounded-xl flex items-center gap-3 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                    <img src={n.images[0]} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0 bg-slate-200 dark:bg-slate-800" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">{n.title_km}</h4>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-2 font-bold">
                        <span>{n.images.length} រូបភាព</span>
                        <span className="flex items-center gap-1 text-blue-500"><Eye className="h-3.5 w-3.5" /> {n.views}</span>
                        <span className="flex items-center gap-1 text-rose-500"><Heart className="h-3.5 w-3.5 fill-rose-500" /> {n.likes}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button onClick={() => openEditNewsForm(n)} className="p-2 bg-blue-100 dark:bg-blue-500/15 hover:bg-blue-200 dark:hover:bg-blue-500/30 text-blue-600 dark:text-blue-400 rounded-lg transition-colors" title="កែប្រែ"><Edit2 className="h-4 w-4" /></button>
                      <button onClick={() => handleDeleteNewsItem(n.id)} className="p-2 bg-red-100 dark:bg-red-500/15 hover:bg-red-200 dark:hover:bg-red-500/30 text-red-600 dark:text-red-400 rounded-lg transition-colors" title="លុប"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
                {newsList.length === 0 && <div className="text-center text-slate-500 text-sm py-10">មិនទាន់មានព័ត៌មានទេ</div>}
              </div>

            </CardContent>
          </Card>
        </div>
      )}

      {manageTab === 'banners' && (
        <Card className="bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-800 shadow-md">
          <CardContent className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row gap-3 max-w-2xl">
              <Input value={newBannerUrl} onChange={(e) => setNewBannerUrl(e.target.value)} placeholder="បញ្ចូល Link រូបភាព Banner ថ្មី (https://...)..." className="text-sm h-11 bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-700 dark:text-white rounded-xl" />
              <Button onClick={handleAddBanner} className="bg-[#3b82f6] hover:bg-blue-600 text-white font-bold h-11 px-6 shrink-0 rounded-xl shadow-md"><Plus className="h-4 w-4 mr-1.5" /> បន្ថែមរូប Banner</Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {banners.map((b) => (
                <div key={b.id} className="relative rounded-2xl overflow-hidden h-48 border border-slate-200 dark:border-slate-700 group bg-slate-100 dark:bg-[#0f172a] shadow-sm hover:shadow-md transition-shadow">
                  <img src={b.image_url} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => handleDeleteBanner(b.id)} className="absolute top-3 right-3 bg-red-600 hover:bg-red-700 text-white p-2.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity transform hover:scale-110">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}