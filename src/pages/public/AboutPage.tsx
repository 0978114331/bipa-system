import { useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Target,
  Eye,
  Compass,
  Award,
  Sparkles,
  UserCheck,
  Edit2,
  Plus,
  Trash2,
  Save,
  X,
  ArrowLeft,
  ArrowRight,
  Building2,
  ShieldCheck,
  BookOpen,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AboutValueItem {
  id: string;
  titleKm: string;
  titleEn: string;
  descKm: string;
  descEn: string;
}

export interface AboutMemberItem {
  id: string;
  nameKm: string;
  nameEn: string;
  roleKm: string;
  roleEn: string;
  orgKm: string;
  orgEn: string;
  bioKm: string;
  bioEn: string;
  imageUrl: string;
}

export interface AboutPageContent {
  badgeKm: string;
  badgeEn: string;
  pageTitleKm: string;
  pageTitleEn: string;
  pageSubtitleKm: string;
  pageSubtitleEn: string;
  purposeTitleKm: string;
  purposeTitleEn: string;
  purposeDescKm: string;
  purposeDescEn: string;
  visionTitleKm: string;
  visionTitleEn: string;
  visionDescKm: string;
  visionDescEn: string;
  missionTitleKm: string;
  missionTitleEn: string;
  missionDescKm: string;
  missionDescEn: string;
  introHeadingKm: string;
  introHeadingEn: string;
  introFullKm: string;
  introFullEn: string;
  principlesHeadingKm: string;
  principlesHeadingEn: string;
  principlesSubKm: string;
  principlesSubEn: string;
  valuesHeadingKm: string;
  valuesHeadingEn: string;
  values: AboutValueItem[];
  goalsHeadingKm: string;
  goalsHeadingEn: string;
  goals: AboutValueItem[];
  directorsTitleKm: string;
  directorsTitleEn: string;
  directorsSubtitleKm: string;
  directorsSubtitleEn: string;
  directorsBadgeKm: string;
  directorsBadgeEn: string;
  directors: AboutMemberItem[];
  managersTitleKm: string;
  managersTitleEn: string;
  managersSubtitleKm: string;
  managersSubtitleEn: string;
  managers: AboutMemberItem[];
}

const ABOUT_STORAGE_KEY = 'bipa_about_page_content_v2';

const defaultAboutContent: AboutPageContent = {
  badgeKm: 'អំពីមណ្ឌលនិស្សិត BIPA',
  badgeEn: 'ABOUT BIPA RESIDENCE',
  pageTitleKm: 'អំពីយើង',
  pageTitleEn: 'About Us',
  pageSubtitleKm:
    'ស្វែងយល់អំពីគោលបំណង ចក្ខុវិស័យ បេសកកម្ម និងគណៈកម្មការគ្រប់គ្រងមណ្ឌលសិស្សនិស្សិតរបស់យើង',
  pageSubtitleEn:
    'Learn about our residence purpose, vision, mission, and our leadership & management committee',
  purposeTitleKm: 'គោលបំណងមណ្ឌល',
  purposeTitleEn: 'Residence Purpose',
  purposeDescKm:
    'ប្រព័ន្ធគ្រប់គ្រងមណ្ឌលសិស្សនិស្សិត ត្រូវបានបង្កើតឡើងដើម្បីផ្តល់នូវបរិយាកាសរស់នៅប្រកបដោយសុវត្ថិភាព របៀបរៀបរយ និងផាសុកភាពសម្រាប់និស្សិត។ ប្រព័ន្ធនេះជួយសម្រួលដល់ការតាមដានវត្តមាន ការបង់ប្រាក់ ការរៀបចំវេនប្រចាំថ្ងៃ និងការទំនាក់ទំនងរវាងនិស្សិត និងគណៈគ្រប់គ្រងមណ្ឌល។',
  purposeDescEn:
    'The Student Residence Management System is designed to provide a safe, organized, and comfortable living environment for students. It streamlines residence operations including attendance tracking, payment management, duty scheduling, and communication between students and residence administrators.',
  visionTitleKm: 'ចក្ខុវិស័យ',
  visionTitleEn: 'Our Vision',
  visionDescKm:
    'មើលឃើញនិស្សិតគ្រប់រូបទទួលបានការអប់រំប្រកបដោយគុណភាព បរិយាប័ន្ន មានសីលធម៌ល្អ និងមានសមត្ថភាពពេញលេញក្នុងការអភិវឌ្ឍខ្លួន និងសង្គមជាតិ។',
  visionDescEn:
    'To see every student receive quality, inclusive education with strong ethics and full capability to develop themselves and the nation.',
  missionTitleKm: 'បេសកកម្ម',
  missionTitleEn: 'Our Mission',
  missionDescKm:
    'ផ្តល់កន្លែងស្នាក់នៅប្រកបដោយសុវត្ថិភាព ពង្រឹងវិន័យ និងសាមគ្គីភាព ព្រមទាំងបណ្តុះបណ្តាលជំនាញបន្ថែម ដើម្បីលើកកម្ពស់សិទ្ធិ និងឱកាសសិក្សាពេញមួយជីវិតសម្រាប់និស្សិតទាំងអស់។',
  missionDescEn:
    'Provide a safe living environment, strengthen discipline and solidarity, and offer supplemental skill training to promote lifelong learning opportunities for all students.',
  introHeadingKm: 'សេចក្តីផ្តើម',
  introHeadingEn: 'Introduction',
  introFullKm:
    'មណ្ឌលសិស្សនិស្សិត BIPA គឺជាមណ្ឌលស្នាក់នៅ និងបណ្តុះបណ្តាលសមត្ថភាពយុវជន និស្សិត ដែលផ្តោតសំខាន់លើការគាំទ្រការសិក្សាថ្នាក់ឧត្តមសិក្សា ការកសាងវិន័យ សីលធម៌ ការងារជាក្រុម និងការអភិវឌ្ឍជំនាញបច្ចេកវិទ្យាឌីជីថល។ យើងប្តេជ្ញាផ្តល់នូវការសម្របសម្រួលប្រកបដោយប្រសិទ្ធភាព ការផ្លាស់ប្តូរព័ត៌មាន និងចំណេះដឹង ដែលចាំបាច់ដើម្បីបង្កើនគុណភាពនៃការសិក្សា និងការរស់នៅរបស់និស្សិតគ្រប់រូប។',
  introFullEn:
    'BIPA Student Residence is a living and youth capacity-building center focused on supporting higher education, building discipline, ethics, teamwork, and developing digital technology skills. We are committed to providing effective coordination, information sharing, and knowledge essential to enhancing the quality of study and living for every student.',
  principlesHeadingKm: 'គុណតម្លៃ និងគោលដៅយុទ្ធសាស្ត្រ',
  principlesHeadingEn: 'Core Values & Strategic Goals',
  principlesSubKm: 'គោលការណ៍គ្រឹះសម្រាប់ការដឹកនាំ និងការរស់នៅប្រចាំថ្ងៃក្នុងមណ្ឌល',
  principlesSubEn: 'Core principles guiding our residence leadership and daily student life',
  valuesHeadingKm: 'គុណតម្លៃស្នូលរបស់មណ្ឌល',
  valuesHeadingEn: 'Core Values',
  values: [
    {
      id: 'val-1',
      titleKm: 'ភាពយុត្តិធម៌ និងការទទួលខុសត្រូវ',
      titleEn: 'Fairness & Accountability',
      descKm:
        'យើងប្តេជ្ញាប្រើប្រាស់ធនធានដែលមានប្រកបដោយប្រសិទ្ធភាព និងតម្លាភាព ដើម្បីគាំទ្រដល់ការសិក្សា និងការរស់នៅរបស់និស្សិត។',
      descEn:
        'We commit to utilizing available resources effectively and transparently to support student living and education.'
    },
    {
      id: 'val-2',
      titleKm: 'កិច្ចសហប្រតិបត្តិការ និងសាមគ្គីភាព',
      titleEn: 'Cooperation & Solidarity',
      descKm:
        'យើងបំពេញបេសកកម្មក្នុងស្មារតីនៃកិច្ចសហការ ដោយឱ្យតម្លៃលើការគោរពគ្នា មិនរើសអើង និងជួយយកអាសាគ្នាទៅវិញទៅមក។',
      descEn:
        'We fulfill our mission in a spirit of cooperation, valuing mutual respect, non-discrimination, and mutual support.'
    },
    {
      id: 'val-3',
      titleKm: 'ការកែលម្អជាបន្តបន្ទាប់',
      titleEn: 'Continuous Improvement',
      descKm:
        'យើងប្តេជ្ញាអភិវឌ្ឍប្រព័ន្ធគ្រប់គ្រងឌីជីថល និងកម្មវិធីសិក្សាបន្ថែមជាប្រចាំ ដើម្បីលើកកម្ពស់គុណភាពជីវិតនិស្សិត។',
      descEn:
        'We continuously improve our digital management system and learning programs to elevate student quality of life.'
    }
  ],
  goalsHeadingKm: 'គោលដៅយុទ្ធសាស្ត្រ',
  goalsHeadingEn: 'Strategic Goals',
  goals: [
    {
      id: 'goal-1',
      titleKm: 'សុវត្ថិភាព និងវិន័យមណ្ឌល',
      titleEn: 'Safety & Residence Discipline',
      descKm:
        'ពង្រឹងការគ្រប់គ្រងវត្តមានចេញ-ចូលតាមប្រព័ន្ធ QR និងរក្សាសណ្តាប់ធ្នាប់រស់នៅប្រចាំថ្ងៃប្រកបដោយសុខដុមរមនា។',
      descEn:
        'Strengthen check-in/out attendance via QR system and maintain harmonious daily living order.'
    },
    {
      id: 'goal-2',
      titleKm: 'ចំណេះដឹង និងបំណិនជីវិត',
      titleEn: 'Knowledge & Life Skills',
      descKm:
        'លើកកម្ពស់វប្បធម៌នៃការសិក្សាស្រាវជ្រាវ ការចែករំលែកចំណេះដឹង និងជំនាញបច្ចេកវិទ្យាក្នុងចំណោមសមាជិកមណ្ឌល។',
      descEn:
        'Promote a culture of research, knowledge sharing, and technological skills among residence members.'
    },
    {
      id: 'goal-3',
      titleKm: 'ភាពជាអ្នកដឹកនាំយុវជន',
      titleEn: 'Youth Leadership',
      descKm:
        'បណ្តុះស្មារតីទទួលខុសត្រូវតាមរយៈការបែងចែកវេនកិច្ចការ និងការចូលរួមសកម្មភាពសង្គមនានា។',
      descEn:
        'Foster responsibility through duty rosters and active participation in community initiatives.'
    }
  ],
  directorsTitleKm: 'ប្រធានមណ្ឌល និងថ្នាក់ដឹកនាំ',
  directorsTitleEn: 'Center Director & Executive Leadership',
  directorsSubtitleKm: 'ថ្នាក់ដឹកនាំទទួលបន្ទុកតម្រង់ទិស និងសម្របសម្រួលទូទៅប្រចាំមណ្ឌលសិស្សនិស្សិត',
  directorsSubtitleEn:
    'Executive leaders responsible for strategic guidance and general coordination of the residence',
  directorsBadgeKm: 'ថ្នាក់ដឹកនាំមណ្ឌល',
  directorsBadgeEn: 'Leadership',
  directors: [],
  managersTitleKm: 'សមាជិកគ្រប់គ្រងរបស់យើង',
  managersTitleEn: 'Our Management Committee',
  managersSubtitleKm: 'គណៈកម្មការ និងសមាជិកគ្រប់គ្រងតាមផ្នែកនីមួយៗនៃមណ្ឌលសិស្សនិស្សិត',
  managersSubtitleEn: 'Committee members and section managers of our student residence',
  managers: []
};

function sanitizeImageList(items: any[]): AboutMemberItem[] {
  if (!Array.isArray(items)) return [];
  return items.map((m) => ({
    ...m,
    imageUrl:
      typeof m.imageUrl === 'string' && !m.imageUrl.includes('images.unsplash.com')
        ? m.imageUrl
        : ''
  }));
}

function loadCachedAboutContent(): AboutPageContent {
  try {
    const raw = localStorage.getItem(ABOUT_STORAGE_KEY);
    if (!raw) return defaultAboutContent;
    const parsed = JSON.parse(raw);
    return {
      ...defaultAboutContent,
      ...parsed,
      values: Array.isArray(parsed.values) ? parsed.values : defaultAboutContent.values,
      goals: Array.isArray(parsed.goals) ? parsed.goals : defaultAboutContent.goals,
      directors: sanitizeImageList(parsed.directors),
      managers: sanitizeImageList(parsed.managers)
    };
  } catch {
    return defaultAboutContent;
  }
}

function ScrollReveal({
  children,
  delay = 0,
  className = ''
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        'transition-all duration-700 ease-out will-change-transform',
        visible
          ? 'opacity-100 translate-y-0 scale-100 blur-0'
          : 'opacity-0 translate-y-10 scale-[0.97] blur-[2px]',
        className
      )}
    >
      {children}
    </div>
  );
}

export function AboutPage() {
  const { hasRole } = useAuth();
  const { lang } = useI18n();
  const isKhmer = lang === 'km';
  const isAdmin = hasRole('super_admin', 'residence_admin', 'finance_admin', 'duty_manager');

  const [content, setContent] = useState<AboutPageContent>(() => loadCachedAboutContent());
  const [selectedMember, setSelectedMember] = useState<AboutMemberItem | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editTab, setEditTab] = useState<'overview' | 'principles' | 'directors' | 'managers'>(
    'overview'
  );
  const [draft, setDraft] = useState<AboutPageContent>(() => loadCachedAboutContent());
  const [saving, setSaving] = useState(false);

  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [mNameKm, setMNameKm] = useState('');
  const [mNameEn, setMNameEn] = useState('');
  const [mRoleKm, setMRoleKm] = useState('');
  const [mRoleEn, setMRoleEn] = useState('');
  const [mOrgKm, setMOrgKm] = useState('');
  const [mOrgEn, setMOrgEn] = useState('');
  const [mBioKm, setMBioKm] = useState('');
  const [mBioEn, setMBioEn] = useState('');
  const [mImageUrl, setMImageUrl] = useState('');

  const [editingValType, setEditingValType] = useState<'values' | 'goals'>('values');
  const [editingValId, setEditingValId] = useState<string | null>(null);
  const [vTitleKm, setVTitleKm] = useState('');
  const [vTitleEn, setVTitleEn] = useState('');
  const [vDescKm, setVDescKm] = useState('');
  const [vDescEn, setVDescEn] = useState('');

  const fetchAboutData = async () => {
    try {
      const { data, error } = await supabase
        .from('bipa_about_page')
        .select('content')
        .eq('id', '1')
        .maybeSingle();

      if (!error && data && data.content) {
        const merged: AboutPageContent = {
          ...defaultAboutContent,
          ...data.content,
          values: Array.isArray(data.content.values)
            ? data.content.values
            : defaultAboutContent.values,
          goals: Array.isArray(data.content.goals)
            ? data.content.goals
            : defaultAboutContent.goals,
          directors: sanitizeImageList(data.content.directors),
          managers: sanitizeImageList(data.content.managers)
        };
        setContent(merged);
        localStorage.setItem(ABOUT_STORAGE_KEY, JSON.stringify(merged));
      }
    } catch {}
  };

  useEffect(() => {
    fetchAboutData();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const totalScroll =
        document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (totalScroll <= 0) {
        setScrollProgress(0);
        return;
      }
      const current = window.scrollY;
      setScrollProgress(Math.min(100, Math.max(0, (current / totalScroll) * 100)));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const resetMemberForm = () => {
    setEditingMemberId(null);
    setMNameKm('');
    setMNameEn('');
    setMRoleKm('');
    setMRoleEn('');
    setMOrgKm('');
    setMOrgEn('');
    setMBioKm('');
    setMBioEn('');
    setMImageUrl('');
  };

  const resetValueForm = () => {
    setEditingValId(null);
    setVTitleKm('');
    setVTitleEn('');
    setVDescKm('');
    setVDescEn('');
  };

  const handleOpenEditModal = (
    initialTab: 'overview' | 'principles' | 'directors' | 'managers' = 'overview'
  ) => {
    setDraft(content);
    setEditTab(initialTab);
    resetMemberForm();
    resetValueForm();
    setShowEditModal(true);
  };

  const handleStartEditMember = (item: AboutMemberItem) => {
    setEditingMemberId(item.id);
    setMNameKm(item.nameKm);
    setMNameEn(item.nameEn);
    setMRoleKm(item.roleKm);
    setMRoleEn(item.roleEn);
    setMOrgKm(item.orgKm);
    setMOrgEn(item.orgEn);
    setMBioKm(item.bioKm || '');
    setMBioEn(item.bioEn || '');
    setMImageUrl(item.imageUrl || '');
  };

  const handleAddOrUpdateMemberInDraft = (type: 'directors' | 'managers') => {
    if (!mNameKm.trim() || !mRoleKm.trim()) return;

    const newItem: AboutMemberItem = {
      id: editingMemberId || `${type}-${Date.now()}`,
      nameKm: mNameKm.trim(),
      nameEn: mNameEn.trim() || mNameKm.trim(),
      roleKm: mRoleKm.trim(),
      roleEn: mRoleEn.trim() || mRoleKm.trim(),
      orgKm: mOrgKm.trim(),
      orgEn: mOrgEn.trim() || mOrgKm.trim(),
      bioKm: mBioKm.trim(),
      bioEn: mBioEn.trim() || mBioKm.trim(),
      imageUrl: mImageUrl.trim()
    };

    const currentList = draft[type];
    const nextList = editingMemberId
      ? currentList.map((m) => (m.id === editingMemberId ? newItem : m))
      : [...currentList, newItem];

    setDraft({ ...draft, [type]: nextList });
    resetMemberForm();
  };

  const handleDeleteMemberFromDraft = (type: 'directors' | 'managers', id: string) => {
    setDraft({
      ...draft,
      [type]: draft[type].filter((m) => m.id !== id)
    });
    if (editingMemberId === id) {
      resetMemberForm();
    }
  };

  const handleMoveMemberInDraft = (
    type: 'directors' | 'managers',
    index: number,
    dir: 'left' | 'right'
  ) => {
    const list = [...draft[type]];
    const targetIdx = dir === 'left' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    setDraft({ ...draft, [type]: list });
  };

  const handleStartEditValueItem = (type: 'values' | 'goals', item: AboutValueItem) => {
    setEditingValType(type);
    setEditingValId(item.id);
    setVTitleKm(item.titleKm);
    setVTitleEn(item.titleEn);
    setVDescKm(item.descKm);
    setVDescEn(item.descEn);
  };

  const handleSaveValueItemInDraft = () => {
    if (!vTitleKm.trim() || !vDescKm.trim()) return;
    const newItem: AboutValueItem = {
      id: editingValId || `${editingValType}-${Date.now()}`,
      titleKm: vTitleKm.trim(),
      titleEn: vTitleEn.trim() || vTitleKm.trim(),
      descKm: vDescKm.trim(),
      descEn: vDescEn.trim() || vDescKm.trim()
    };

    const list = draft[editingValType];
    const nextList = editingValId
      ? list.map((v) => (v.id === editingValId ? newItem : v))
      : [...list, newItem];

    setDraft({ ...draft, [editingValType]: nextList });
    resetValueForm();
  };

  const handleDeleteValueItemFromDraft = (type: 'values' | 'goals', id: string) => {
    setDraft({
      ...draft,
      [type]: draft[type].filter((v) => v.id !== id)
    });
    if (editingValId === id) {
      resetValueForm();
    }
  };

  const handleSaveAllAboutContent = async () => {
    setSaving(true);
    setContent(draft);
    localStorage.setItem(ABOUT_STORAGE_KEY, JSON.stringify(draft));

    try {
      await supabase.from('bipa_about_page').upsert({
        id: '1',
        content: draft,
        updated_at: new Date().toISOString()
      });
    } catch {}

    setSaving(false);
    setShowEditModal(false);
  };

  const highlightCards = [
    {
      id: 'card-purpose',
      icon: Target,
      title: isKhmer ? content.purposeTitleKm : content.purposeTitleEn,
      desc: isKhmer ? content.purposeDescKm : content.purposeDescEn,
      accent: 'from-amber-500/25 via-amber-500/5 to-transparent border-amber-500/40',
      iconBg: 'bg-amber-500/15 border-amber-500/30 text-amber-400'
    },
    {
      id: 'card-vision',
      icon: Eye,
      title: isKhmer ? content.visionTitleKm : content.visionTitleEn,
      desc: isKhmer ? content.visionDescKm : content.visionDescEn,
      accent: 'from-blue-500/25 via-cyan-500/5 to-transparent border-blue-500/40',
      iconBg: 'bg-blue-500/15 border-blue-500/30 text-blue-400'
    },
    {
      id: 'card-mission',
      icon: Compass,
      title: isKhmer ? content.missionTitleKm : content.missionTitleEn,
      desc: isKhmer ? content.missionDescKm : content.missionDescEn,
      accent: 'from-emerald-500/25 via-teal-500/5 to-transparent border-emerald-500/40',
      iconBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
    }
  ];

  return (
    <div className="min-h-screen bg-[#f4f6fb] dark:bg-[#0b1120] text-slate-900 dark:text-slate-100 pb-24 font-khmer overflow-x-hidden scroll-smooth">
      <div className="fixed top-16 sm:top-20 left-0 right-0 z-40 h-1 bg-transparent pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-emerald-400 to-amber-400 shadow-[0_0_12px_rgba(59,130,246,0.8)] transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <section
        id="about-hero"
        className="relative overflow-hidden bg-gradient-to-b from-[#0f172a] via-[#131d33] to-[#0b1120] text-white border-b border-slate-800/80"
      >
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-blue-500/15 blur-3xl animate-pulse pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl animate-pulse pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <ScrollReveal>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-3 max-w-2xl">
                <Badge className="bg-amber-500/15 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 text-xs font-extrabold tracking-wide">
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  {isKhmer ? content.badgeKm : content.badgeEn}
                </Badge>

                <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                  {isKhmer ? content.pageTitleKm : content.pageTitleEn}
                </h1>

                <p className="text-xs sm:text-base text-slate-300 leading-relaxed">
                  {isKhmer ? content.pageSubtitleKm : content.pageSubtitleEn}
                </p>
              </div>

              {isAdmin && (
                <Button
                  onClick={() => handleOpenEditModal('overview')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm h-11 px-5 rounded-xl shadow-lg shadow-blue-600/25 shrink-0 self-start sm:self-center active:scale-95 transition-all"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  {isKhmer ? 'កែប្រែទំព័រអំពីយើង' : 'Edit About Page'}
                </Button>
              )}
            </div>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pt-6 pb-1">
              <button
                type="button"
                onClick={() => scrollToSection('about-intro')}
                className="px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-xs font-bold text-slate-200 shrink-0 transition-all active:scale-95"
              >
                {isKhmer ? content.introHeadingKm : content.introHeadingEn}
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('about-principles')}
                className="px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-xs font-bold text-slate-200 shrink-0 transition-all active:scale-95"
              >
                {isKhmer ? content.principlesHeadingKm : content.principlesHeadingEn}
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('about-directors')}
                className="px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-xs font-bold text-slate-200 shrink-0 transition-all active:scale-95"
              >
                {isKhmer ? content.directorsTitleKm : content.directorsTitleEn}
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('about-managers')}
                className="px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-xs font-bold text-slate-200 shrink-0 transition-all active:scale-95"
              >
                {isKhmer ? content.managersTitleKm : content.managersTitleEn}
              </button>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 mt-6">
            {highlightCards.map((card, index) => {
              const IconComp = card.icon;
              const isTouched = activeCardId === card.id;
              return (
                <ScrollReveal key={card.id} delay={150 + index * 120}>
                  <div
                    onClick={() => setActiveCardId(isTouched ? null : card.id)}
                    className={cn(
                      'group relative h-full rounded-2xl p-5 sm:p-6 bg-[#162033]/90 backdrop-blur-md border transition-all duration-500 cursor-pointer hover:-translate-y-2 hover:shadow-2xl',
                      isTouched
                        ? 'border-amber-400/80 shadow-xl shadow-amber-500/15 scale-[1.02]'
                        : 'border-slate-800 hover:border-slate-600'
                    )}
                  >
                    <div
                      className={cn(
                        'absolute inset-0 rounded-2xl bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none',
                        card.accent
                      )}
                    />
                    <div className="relative z-10 space-y-3.5">
                      <div className="flex items-center gap-3.5">
                        <div
                          className={cn(
                            'w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6',
                            card.iconBg
                          )}
                        >
                          <IconComp className="h-5 w-5" />
                        </div>
                        <h2 className="text-base sm:text-lg font-extrabold text-white">
                          {card.title}
                        </h2>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                        {card.desc}
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 space-y-12 sm:space-y-16">
        <ScrollReveal>
          <section
            id="about-intro"
            className="bg-white dark:bg-[#162033] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-8 lg:p-10 shadow-sm space-y-8 sm:space-y-10"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8 items-start">
              <div className="lg:col-span-4 flex items-center justify-between">
                <div className="inline-flex items-center gap-2.5 text-blue-600 dark:text-blue-400 font-extrabold text-base sm:text-lg">
                  <span className="w-2 h-6 rounded-full bg-blue-600 dark:bg-blue-400 inline-block" />
                  <BookOpen className="h-5 w-5 shrink-0" />
                  <span>{isKhmer ? content.introHeadingKm : content.introHeadingEn}</span>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal('overview')}
                    className="lg:hidden text-xs font-bold text-blue-500 flex items-center gap-1"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>{isKhmer ? 'កែប្រែ' : 'Edit'}</span>
                  </button>
                )}
              </div>
              <div className="lg:col-span-8 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {isKhmer ? content.introFullKm : content.introFullEn}
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800/90" />

            <div
              id="about-principles"
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start"
            >
              <div className="lg:col-span-4 space-y-2">
                <div className="inline-flex items-center gap-2.5 text-blue-600 dark:text-blue-400 font-extrabold text-base sm:text-lg leading-snug">
                  <span className="w-2 h-6 rounded-full bg-amber-500 inline-block shrink-0" />
                  <span>{isKhmer ? content.principlesHeadingKm : content.principlesHeadingEn}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 pl-4">
                  {isKhmer ? content.principlesSubKm : content.principlesSubEn}
                </p>
                {isAdmin && (
                  <div className="pl-4 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEditModal('principles')}
                      className="h-8 text-xs font-bold rounded-xl border-amber-500/40 text-amber-600 dark:text-amber-400"
                    >
                      <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                      {isKhmer ? 'កែប្រែគុណតម្លៃ & គោលដៅ' : 'Edit Values & Goals'}
                    </Button>
                  </div>
                )}
              </div>

              <div className="lg:col-span-8 space-y-7">
                <div className="space-y-3">
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Award className="h-4 w-4 text-amber-500" />
                    {isKhmer ? content.valuesHeadingKm : content.valuesHeadingEn}
                  </h4>
                  <div className="space-y-2.5">
                    {content.values.map((val, idx) => (
                      <ScrollReveal key={val.id || idx} delay={idx * 80}>
                        <div className="group flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50/80 dark:bg-[#0f172a]/90 border border-slate-200/60 dark:border-slate-800/80 hover:border-amber-500/50 hover:shadow-md transition-all duration-300">
                          <span className="w-6 h-6 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-black flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                            {idx + 1}
                          </span>
                          <div className="text-xs sm:text-sm leading-relaxed">
                            <span className="font-extrabold text-slate-900 dark:text-white">
                              {isKhmer ? val.titleKm : val.titleEn}៖{' '}
                            </span>
                            <span className="text-slate-600 dark:text-slate-300">
                              {isKhmer ? val.descKm : val.descEn}
                            </span>
                          </div>
                        </div>
                      </ScrollReveal>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-blue-500" />
                    {isKhmer ? content.goalsHeadingKm : content.goalsHeadingEn}
                  </h4>
                  <div className="space-y-2.5">
                    {content.goals.map((goal, idx) => (
                      <ScrollReveal key={goal.id || idx} delay={idx * 80}>
                        <div className="group flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50/80 dark:bg-[#0f172a]/90 border border-slate-200/60 dark:border-slate-800/80 hover:border-blue-500/50 hover:shadow-md transition-all duration-300">
                          <span className="w-6 h-6 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs font-black flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                            {idx + 1}
                          </span>
                          <div className="text-xs sm:text-sm leading-relaxed">
                            <span className="font-extrabold text-slate-900 dark:text-white">
                              {isKhmer ? goal.titleKm : goal.titleEn}៖{' '}
                            </span>
                            <span className="text-slate-600 dark:text-slate-300">
                              {isKhmer ? goal.descKm : goal.descEn}
                            </span>
                          </div>
                        </div>
                      </ScrollReveal>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        <section id="about-directors" className="space-y-6">
          <ScrollReveal>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-7 rounded-full bg-blue-600 inline-block" />
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    {isKhmer ? content.directorsTitleKm : content.directorsTitleEn}
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 pl-4">
                  {isKhmer ? content.directorsSubtitleKm : content.directorsSubtitleEn}
                </p>
              </div>

              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenEditModal('directors')}
                  className="self-start sm:self-auto rounded-xl border-blue-500/40 text-blue-600 dark:text-blue-400 text-xs font-bold"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  {isKhmer ? 'បន្ថែម / កែប្រែប្រធានមណ្ឌល' : 'Manage Leadership'}
                </Button>
              )}
            </div>
          </ScrollReveal>

          {content.directors.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {content.directors.map((person, index) => (
                <ScrollReveal key={person.id} delay={index * 100}>
                  <Card
                    onClick={() => setSelectedMember(person)}
                    className="group bg-white dark:bg-[#162033] border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 active:scale-[0.99] transition-all duration-500 cursor-pointer flex flex-col h-full"
                  >
                    <div className="relative h-60 sm:h-64 w-full overflow-hidden bg-gradient-to-br from-slate-800 via-[#162033] to-slate-900 flex items-center justify-center">
                      {person.imageUrl ? (
                        <img
                          src={person.imageUrl}
                          alt={isKhmer ? person.nameKm : person.nameEn}
                          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-amber-500/15 border-2 border-amber-400/40 flex items-center justify-center text-amber-400 text-3xl font-black shadow-inner group-hover:scale-110 transition-transform duration-500">
                          {(isKhmer ? person.nameKm : person.nameEn).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-70 group-hover:opacity-90 transition-opacity" />
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-extrabold text-[10px] uppercase tracking-wider shadow">
                          {isKhmer ? content.directorsBadgeKm : content.directorsBadgeEn}
                        </span>
                      </div>
                    </div>

                    <CardContent className="p-4 sm:p-5 space-y-1.5 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">
                          {isKhmer ? person.nameKm : person.nameEn}
                        </h3>
                        <p className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                          {isKhmer ? person.roleKm : person.roleEn}
                        </p>
                        {(person.orgKm || person.orgEn) && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {isKhmer ? person.orgKm : person.orgEn}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              ))}
            </div>
          ) : (
            <ScrollReveal>
              <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-[#162033]/50 p-8 text-center space-y-3">
                <UserCheck className="h-10 w-10 text-blue-500 mx-auto opacity-80" />
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  {isKhmer
                    ? 'មិនទាន់មានរូបភាព និងព័ត៌មានប្រធានមណ្ឌលនៅឡើយទេ'
                    : 'No leadership profiles added yet'}
                </p>
                {isAdmin && (
                  <Button
                    size="sm"
                    onClick={() => handleOpenEditModal('directors')}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl"
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    {isKhmer ? 'បន្ថែមប្រធានមណ្ឌលឥឡូវនេះ' : 'Add Leadership Now'}
                  </Button>
                )}
              </div>
            </ScrollReveal>
          )}
        </section>

        <section id="about-managers" className="space-y-6">
          <ScrollReveal>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-7 rounded-full bg-emerald-500 inline-block" />
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    {isKhmer ? content.managersTitleKm : content.managersTitleEn}
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 pl-4">
                  {isKhmer ? content.managersSubtitleKm : content.managersSubtitleEn}
                </p>
              </div>

              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenEditModal('managers')}
                  className="self-start sm:self-auto rounded-xl border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  {isKhmer ? 'បន្ថែម / កែប្រែសមាជិកគ្រប់គ្រង' : 'Manage Committee'}
                </Button>
              )}
            </div>
          </ScrollReveal>

          {content.managers.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-6">
              {content.managers.map((member, index) => (
                <ScrollReveal key={member.id} delay={index * 80}>
                  <Card
                    onClick={() => setSelectedMember(member)}
                    className="group bg-white dark:bg-[#162033] border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 active:scale-[0.99] transition-all duration-500 cursor-pointer flex flex-col h-full"
                  >
                    <div className="relative h-44 sm:h-56 w-full overflow-hidden bg-gradient-to-br from-slate-800 via-[#162033] to-slate-900 flex items-center justify-center">
                      {member.imageUrl ? (
                        <img
                          src={member.imageUrl}
                          alt={isKhmer ? member.nameKm : member.nameEn}
                          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-400/40 flex items-center justify-center text-emerald-400 text-2xl font-black shadow-inner group-hover:scale-110 transition-transform duration-500">
                          {(isKhmer ? member.nameKm : member.nameEn).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    <CardContent className="p-3.5 sm:p-4 space-y-1 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-xs sm:text-base font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors line-clamp-1">
                          {isKhmer ? member.nameKm : member.nameEn}
                        </h3>
                        <p className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 line-clamp-1 mt-0.5">
                          {isKhmer ? member.roleKm : member.roleEn}
                        </p>
                        {(member.orgKm || member.orgEn) && (
                          <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-400 line-clamp-1 mt-0.5">
                            {isKhmer ? member.orgKm : member.orgEn}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              ))}
            </div>
          ) : (
            <ScrollReveal>
              <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-[#162033]/50 p-8 text-center space-y-3">
                <Users className="h-10 w-10 text-emerald-500 mx-auto opacity-80" />
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  {isKhmer
                    ? 'មិនទាន់មានរូបភាព និងព័ត៌មានសមាជិកគ្រប់គ្រងនៅឡើយទេ'
                    : 'No committee members added yet'}
                </p>
                {isAdmin && (
                  <Button
                    size="sm"
                    onClick={() => handleOpenEditModal('managers')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    {isKhmer ? 'បន្ថែមសមាជិកគ្រប់គ្រងឥឡូវនេះ' : 'Add Committee Member Now'}
                  </Button>
                )}
              </div>
            </ScrollReveal>
          )}
        </section>
      </div>

      {selectedMember && (
        <div
          onClick={() => setSelectedMember(null)}
          className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 font-khmer animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-white dark:bg-[#162033] border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
          >
            <button
              onClick={() => setSelectedMember(null)}
              className="absolute top-3.5 right-3.5 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="h-64 sm:h-72 w-full bg-slate-900 overflow-hidden flex items-center justify-center">
              {selectedMember.imageUrl ? (
                <img
                  src={selectedMember.imageUrl}
                  alt={isKhmer ? selectedMember.nameKm : selectedMember.nameEn}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-blue-500/20 border-2 border-blue-400/40 flex items-center justify-center text-blue-400 text-3xl font-black">
                  {(isKhmer ? selectedMember.nameKm : selectedMember.nameEn).charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="p-5 sm:p-6 space-y-3">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  {isKhmer ? selectedMember.nameKm : selectedMember.nameEn}
                </h3>
                <p className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                  {isKhmer ? selectedMember.roleKm : selectedMember.roleEn}
                </p>
                {(selectedMember.orgKm || selectedMember.orgEn) && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1">
                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                    <span>{isKhmer ? selectedMember.orgKm : selectedMember.orgEn}</span>
                  </p>
                )}
              </div>

              {(selectedMember.bioKm || selectedMember.bioEn) && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {isKhmer ? selectedMember.bioKm : selectedMember.bioEn}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showEditModal && isAdmin && (
        <div className="fixed inset-0 z-[130] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 font-khmer">
          <div className="bg-white dark:bg-[#162033] border border-slate-200 dark:border-slate-700 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-[#0f172a]">
              <div className="flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  onClick={() => setEditTab('overview')}
                  className={cn(
                    'text-xs font-bold rounded-xl',
                    editTab === 'overview'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  )}
                >
                  ១. ខ្លឹមសារ & ចក្ខុវិស័យ
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditTab('principles');
                    resetValueForm();
                  }}
                  className={cn(
                    'text-xs font-bold rounded-xl',
                    editTab === 'principles'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  )}
                >
                  ២. គុណតម្លៃ & គោលដៅ
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditTab('directors');
                    resetMemberForm();
                  }}
                  className={cn(
                    'text-xs font-bold rounded-xl',
                    editTab === 'directors'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  )}
                >
                  ៣. ប្រធានមណ្ឌល ({draft.directors.length})
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditTab('managers');
                    resetMemberForm();
                  }}
                  className={cn(
                    'text-xs font-bold rounded-xl',
                    editTab === 'managers'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  )}
                >
                  ៤. សមាជិកគ្រប់គ្រង ({draft.managers.length})
                </Button>
              </div>

              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 scrollbar-thin">
              {editTab === 'overview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">
                        ផ្លាកសញ្ញាខាងលើ (Badge ខ្មែរ)
                      </label>
                      <Input
                        value={draft.badgeKm}
                        onChange={(e) => setDraft({ ...draft, badgeKm: e.target.value })}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">
                        Top Badge (English)
                      </label>
                      <Input
                        value={draft.badgeEn}
                        onChange={(e) => setDraft({ ...draft, badgeEn: e.target.value })}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">
                        ចំណងជើងទំព័រ (ខ្មែរ)
                      </label>
                      <Input
                        value={draft.pageTitleKm}
                        onChange={(e) => setDraft({ ...draft, pageTitleKm: e.target.value })}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">
                        Page Title (English)
                      </label>
                      <Input
                        value={draft.pageTitleEn}
                        onChange={(e) => setDraft({ ...draft, pageTitleEn: e.target.value })}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">
                        អត្ថបទរងខាងលើ (Subtitle ខ្មែរ)
                      </label>
                      <Input
                        value={draft.pageSubtitleKm}
                        onChange={(e) => setDraft({ ...draft, pageSubtitleKm: e.target.value })}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">
                        Page Subtitle (English)
                      </label>
                      <Input
                        value={draft.pageSubtitleEn}
                        onChange={(e) => setDraft({ ...draft, pageSubtitleEn: e.target.value })}
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-800 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-amber-500 block mb-1">
                        ចំណងជើងកាតទី១ (គោលបំណង - ខ្មែរ)
                      </label>
                      <Input
                        value={draft.purposeTitleKm}
                        onChange={(e) => setDraft({ ...draft, purposeTitleKm: e.target.value })}
                        className="text-xs mb-2"
                      />
                      <textarea
                        value={draft.purposeDescKm}
                        onChange={(e) => setDraft({ ...draft, purposeDescKm: e.target.value })}
                        className="w-full h-24 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f172a] p-2.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-amber-500 block mb-1">
                        Card 1 Title & Text (Purpose - English)
                      </label>
                      <Input
                        value={draft.purposeTitleEn}
                        onChange={(e) => setDraft({ ...draft, purposeTitleEn: e.target.value })}
                        className="text-xs mb-2"
                      />
                      <textarea
                        value={draft.purposeDescEn}
                        onChange={(e) => setDraft({ ...draft, purposeDescEn: e.target.value })}
                        className="w-full h-24 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f172a] p-2.5 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-blue-400 block mb-1">
                        ចំណងជើងកាតទី២ (ចក្ខុវិស័យ - ខ្មែរ)
                      </label>
                      <Input
                        value={draft.visionTitleKm}
                        onChange={(e) => setDraft({ ...draft, visionTitleKm: e.target.value })}
                        className="text-xs mb-2"
                      />
                      <textarea
                        value={draft.visionDescKm}
                        onChange={(e) => setDraft({ ...draft, visionDescKm: e.target.value })}
                        className="w-full h-20 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f172a] p-2.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-blue-400 block mb-1">
                        Card 2 Title & Text (Vision - English)
                      </label>
                      <Input
                        value={draft.visionTitleEn}
                        onChange={(e) => setDraft({ ...draft, visionTitleEn: e.target.value })}
                        className="text-xs mb-2"
                      />
                      <textarea
                        value={draft.visionDescEn}
                        onChange={(e) => setDraft({ ...draft, visionDescEn: e.target.value })}
                        className="w-full h-20 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f172a] p-2.5 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-emerald-400 block mb-1">
                        ចំណងជើងកាតទី៣ (បេសកកម្ម - ខ្មែរ)
                      </label>
                      <Input
                        value={draft.missionTitleKm}
                        onChange={(e) => setDraft({ ...draft, missionTitleKm: e.target.value })}
                        className="text-xs mb-2"
                      />
                      <textarea
                        value={draft.missionDescKm}
                        onChange={(e) => setDraft({ ...draft, missionDescKm: e.target.value })}
                        className="w-full h-20 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f172a] p-2.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-emerald-400 block mb-1">
                        Card 3 Title & Text (Mission - English)
                      </label>
                      <Input
                        value={draft.missionTitleEn}
                        onChange={(e) => setDraft({ ...draft, missionTitleEn: e.target.value })}
                        className="text-xs mb-2"
                      />
                      <textarea
                        value={draft.missionDescEn}
                        onChange={(e) => setDraft({ ...draft, missionDescEn: e.target.value })}
                        className="w-full h-20 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f172a] p-2.5 text-xs"
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-800 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">
                        ចំណងជើង និងអត្ថបទសេចក្តីផ្តើម (ខ្មែរ)
                      </label>
                      <Input
                        value={draft.introHeadingKm}
                        onChange={(e) => setDraft({ ...draft, introHeadingKm: e.target.value })}
                        className="text-xs mb-2"
                      />
                      <textarea
                        value={draft.introFullKm}
                        onChange={(e) => setDraft({ ...draft, introFullKm: e.target.value })}
                        className="w-full h-28 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f172a] p-2.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">
                        Introduction Heading & Full Text (English)
                      </label>
                      <Input
                        value={draft.introHeadingEn}
                        onChange={(e) => setDraft({ ...draft, introHeadingEn: e.target.value })}
                        className="text-xs mb-2"
                      />
                      <textarea
                        value={draft.introFullEn}
                        onChange={(e) => setDraft({ ...draft, introFullEn: e.target.value })}
                        className="w-full h-28 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f172a] p-2.5 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {editTab === 'principles' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">
                        ចំណងជើងផ្នែកគុណតម្លៃ & គោលដៅ (ខ្មែរ)
                      </label>
                      <Input
                        value={draft.principlesHeadingKm}
                        onChange={(e) =>
                          setDraft({ ...draft, principlesHeadingKm: e.target.value })
                        }
                        className="text-xs mb-2"
                      />
                      <Input
                        value={draft.principlesSubKm}
                        onChange={(e) => setDraft({ ...draft, principlesSubKm: e.target.value })}
                        placeholder="អត្ថបទរង (ខ្មែរ)..."
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">
                        Section Heading & Subtitle (English)
                      </label>
                      <Input
                        value={draft.principlesHeadingEn}
                        onChange={(e) =>
                          setDraft({ ...draft, principlesHeadingEn: e.target.value })
                        }
                        className="text-xs mb-2"
                      />
                      <Input
                        value={draft.principlesSubEn}
                        onChange={(e) => setDraft({ ...draft, principlesSubEn: e.target.value })}
                        placeholder="Subtitle (English)..."
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-amber-500 block mb-1">
                        ចំណងជើងគុណតម្លៃស្នូល (ខ្មែរ / EN)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={draft.valuesHeadingKm}
                          onChange={(e) => setDraft({ ...draft, valuesHeadingKm: e.target.value })}
                          className="text-xs"
                        />
                        <Input
                          value={draft.valuesHeadingEn}
                          onChange={(e) => setDraft({ ...draft, valuesHeadingEn: e.target.value })}
                          className="text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-blue-400 block mb-1">
                        ចំណងជើងគោលដៅយុទ្ធសាស្ត្រ (ខ្មែរ / EN)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={draft.goalsHeadingKm}
                          onChange={(e) => setDraft({ ...draft, goalsHeadingKm: e.target.value })}
                          className="text-xs"
                        />
                        <Input
                          value={draft.goalsHeadingEn}
                          onChange={(e) => setDraft({ ...draft, goalsHeadingEn: e.target.value })}
                          className="text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-blue-400">
                        {editingValId
                          ? 'កែប្រែចំណុចដែលបានជ្រើសរើស'
                          : 'បន្ថែមចំណុចគុណតម្លៃ ឬគោលដៅយុទ្ធសាស្ត្រថ្មី'}
                      </span>
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          type="button"
                          onClick={() => setEditingValType('values')}
                          className={cn(
                            'h-7 text-[11px] font-bold rounded-lg',
                            editingValType === 'values'
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-800 text-slate-300'
                          )}
                        >
                          គុណតម្លៃស្នូល
                        </Button>
                        <Button
                          size="sm"
                          type="button"
                          onClick={() => setEditingValType('goals')}
                          className={cn(
                            'h-7 text-[11px] font-bold rounded-lg',
                            editingValType === 'goals'
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-800 text-slate-300'
                          )}
                        >
                          គោលដៅយុទ្ធសាស្ត្រ
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <Input
                        value={vTitleKm}
                        onChange={(e) => setVTitleKm(e.target.value)}
                        placeholder="ចំណងជើងចំណុច (ខ្មែរ)..."
                        className="text-xs"
                      />
                      <Input
                        value={vTitleEn}
                        onChange={(e) => setVTitleEn(e.target.value)}
                        placeholder="Point Title (English)..."
                        className="text-xs"
                      />
                      <textarea
                        value={vDescKm}
                        onChange={(e) => setVDescKm(e.target.value)}
                        placeholder="ការពិពណ៌នា (ខ្មែរ)..."
                        className="w-full h-16 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs"
                      />
                      <textarea
                        value={vDescEn}
                        onChange={(e) => setVDescEn(e.target.value)}
                        placeholder="Description (English)..."
                        className="w-full h-16 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      {editingValId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={resetValueForm}
                          className="text-xs"
                        >
                          បោះបង់
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={handleSaveValueItemInDraft}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        {editingValId ? 'រក្សាទុកចំណុចនេះ' : 'បន្ថែមចូលបញ្ជី'}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h5 className="text-xs font-extrabold text-amber-500">
                        បញ្ជីគុណតម្លៃស្នូល ({draft.values.length})
                      </h5>
                      {draft.values.map((v, i) => (
                        <div
                          key={v.id}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-2"
                        >
                          <div className="text-xs min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white truncate">
                              {i + 1}. {v.titleKm}
                            </p>
                            <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                              {v.descKm}
                            </p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEditValueItem('values', v)}
                              className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteValueItemFromDraft('values', v.id)}
                              className="p-1.5 rounded-lg bg-red-500/15 text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <h5 className="text-xs font-extrabold text-blue-400">
                        បញ្ជីគោលដៅយុទ្ធសាស្ត្រ ({draft.goals.length})
                      </h5>
                      {draft.goals.map((g, i) => (
                        <div
                          key={g.id}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-2"
                        >
                          <div className="text-xs min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white truncate">
                              {i + 1}. {g.titleKm}
                            </p>
                            <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                              {g.descKm}
                            </p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEditValueItem('goals', g)}
                              className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteValueItemFromDraft('goals', g.id)}
                              className="p-1.5 rounded-lg bg-red-500/15 text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {(editTab === 'directors' || editTab === 'managers') && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-[#0f172a] p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    {editTab === 'directors' ? (
                      <>
                        <div>
                          <label className="text-[11px] font-bold text-slate-400 block mb-1">
                            ចំណងជើងផ្នែកប្រធានមណ្ឌល (ខ្មែរ / EN)
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              value={draft.directorsTitleKm}
                              onChange={(e) =>
                                setDraft({ ...draft, directorsTitleKm: e.target.value })
                              }
                              className="text-xs"
                            />
                            <Input
                              value={draft.directorsTitleEn}
                              onChange={(e) =>
                                setDraft({ ...draft, directorsTitleEn: e.target.value })
                              }
                              className="text-xs"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-400 block mb-1">
                            អត្ថបទរងផ្នែកប្រធានមណ្ឌល (ខ្មែរ / EN)
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              value={draft.directorsSubtitleKm}
                              onChange={(e) =>
                                setDraft({ ...draft, directorsSubtitleKm: e.target.value })
                              }
                              className="text-xs"
                            />
                            <Input
                              value={draft.directorsSubtitleEn}
                              onChange={(e) =>
                                setDraft({ ...draft, directorsSubtitleEn: e.target.value })
                              }
                              className="text-xs"
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="text-[11px] font-bold text-slate-400 block mb-1">
                            ចំណងជើងផ្នែកសមាជិកគ្រប់គ្រង (ខ្មែរ / EN)
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              value={draft.managersTitleKm}
                              onChange={(e) =>
                                setDraft({ ...draft, managersTitleKm: e.target.value })
                              }
                              className="text-xs"
                            />
                            <Input
                              value={draft.managersTitleEn}
                              onChange={(e) =>
                                setDraft({ ...draft, managersTitleEn: e.target.value })
                              }
                              className="text-xs"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-400 block mb-1">
                            អត្ថបទរងផ្នែកសមាជិកគ្រប់គ្រង (ខ្មែរ / EN)
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              value={draft.managersSubtitleKm}
                              onChange={(e) =>
                                setDraft({ ...draft, managersSubtitleKm: e.target.value })
                              }
                              className="text-xs"
                            />
                            <Input
                              value={draft.managersSubtitleEn}
                              onChange={(e) =>
                                setDraft({ ...draft, managersSubtitleEn: e.target.value })
                              }
                              className="text-xs"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="bg-slate-50 dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <h4 className="text-xs sm:text-sm font-extrabold text-blue-500">
                      {editingMemberId
                        ? 'កែប្រែព័ត៌មានសមាជិក (Edit Member)'
                        : editTab === 'directors'
                        ? 'បន្ថែមប្រធានមណ្ឌល / ថ្នាក់ដឹកនាំថ្មី'
                        : 'បន្ថែមសមាជិកគ្រប់គ្រងថ្មី'}
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <Input
                        value={mNameKm}
                        onChange={(e) => setMNameKm(e.target.value)}
                        placeholder="ឈ្មោះ (ភាសាខ្មែរ)..."
                        className="text-xs"
                      />
                      <Input
                        value={mNameEn}
                        onChange={(e) => setMNameEn(e.target.value)}
                        placeholder="Full Name (English)..."
                        className="text-xs"
                      />
                      <Input
                        value={mRoleKm}
                        onChange={(e) => setMRoleKm(e.target.value)}
                        placeholder="តួនាទី (ភាសាខ្មែរ)..."
                        className="text-xs"
                      />
                      <Input
                        value={mRoleEn}
                        onChange={(e) => setMRoleEn(e.target.value)}
                        placeholder="Role / Position (English)..."
                        className="text-xs"
                      />
                      <Input
                        value={mOrgKm}
                        onChange={(e) => setMOrgKm(e.target.value)}
                        placeholder="ផ្នែក / អង្គភាព (ខ្មែរ)..."
                        className="text-xs"
                      />
                      <Input
                        value={mOrgEn}
                        onChange={(e) => setMOrgEn(e.target.value)}
                        placeholder="Unit / Organization (English)..."
                        className="text-xs"
                      />
                    </div>

                    <Input
                      value={mImageUrl}
                      onChange={(e) => setMImageUrl(e.target.value)}
                      placeholder="Link រូបភាពផ្ទាល់ខ្លួនរបស់អ្នក (https://...)..."
                      className="text-xs"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <textarea
                        value={mBioKm}
                        onChange={(e) => setMBioKm(e.target.value)}
                        placeholder="ពិពណ៌នាសង្ខេប (ភាសាខ្មែរ - Optional)..."
                        className="w-full h-16 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs"
                      />
                      <textarea
                        value={mBioEn}
                        onChange={(e) => setMBioEn(e.target.value)}
                        placeholder="Short Bio (English - Optional)..."
                        className="w-full h-16 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      {editingMemberId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={resetMemberForm}
                          className="text-xs"
                        >
                          បោះបង់
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => handleAddOrUpdateMemberInDraft(editTab)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        {editingMemberId ? 'កែប្រែក្នុងបញ្ជី' : 'បន្ថែមចូលបញ្ជី'}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {draft[editTab].map((item, idx) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt=""
                              className="w-12 h-12 rounded-xl object-cover shrink-0 bg-slate-800"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 font-black flex items-center justify-center shrink-0">
                              {item.nameKm.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                              {item.nameKm}
                            </p>
                            <p className="text-[11px] text-blue-500 truncate">{item.roleKm}</p>
                            <p className="text-[10px] text-slate-400 truncate">{item.orgKm}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveMemberInDraft(editTab, idx, 'left')}
                            className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 disabled:opacity-30"
                          >
                            <ArrowLeft className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === draft[editTab].length - 1}
                            onClick={() => handleMoveMemberInDraft(editTab, idx, 'right')}
                            className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 disabled:opacity-30"
                          >
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEditMember(item)}
                            className="p-1.5 rounded-lg bg-blue-500/15 text-blue-500"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMemberFromDraft(editTab, item.id)}
                            className="p-1.5 rounded-lg bg-red-500/15 text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5 bg-slate-50 dark:bg-[#0f172a]">
              <Button
                variant="outline"
                onClick={() => setShowEditModal(false)}
                className="text-xs font-bold rounded-xl"
              >
                បិទផ្ទាំង
              </Button>
              <Button
                disabled={saving}
                onClick={handleSaveAllAboutContent}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-6 rounded-xl shadow-md"
              >
                <Save className="h-4 w-4 mr-1.5" />
                {saving ? 'កំពុងរក្សាទុក...' : 'រក្សាទុកការផ្លាស់ប្តូរទាំងអស់'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}