import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  CalendarClock,
  Users,
  ClipboardList,
  Plus,
  Trash2,
  Save,
  X,
  Crown,
  Eye,
  Settings2,
  UserPlus,
  Lock,
  Globe,
  LogIn,
  ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DutyGroupItem {
  id: string;
  groupNumber: number;
  nameKm: string;
  nameEn: string;
  leaderNameKm: string;
  leaderNameEn: string;
  leaderAvatar: string;
  color: string;
  members: string[];
}

export interface DutyTaskItem {
  id: string;
  code: string;
  titleKm: string;
  titleEn: string;
  shortKm: string;
  shortEn: string;
  badgeColor: string;
  bulletsKm: string[];
  bulletsEn: string[];
}

export interface DutyDaySchedule {
  dayKey: string;
  dayNameKm: string;
  dayNameEn: string;
  assignments: Record<string, string>;
}

export interface DutyRosterPayload {
  allowPublicView: boolean;
  academicYearKm: string;
  academicYearEn: string;
  femaleRepKm: string;
  maleRepKm: string;
  centerDirectorKm: string;
  groups: DutyGroupItem[];
  tasks: DutyTaskItem[];
  schedule: DutyDaySchedule[];
}

export const DUTY_STORAGE_KEY = 'bipa_duty_roster_system_v1';

const TASK_BADGE_COLORS = [
  'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
  'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
  'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
  'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30'
];

export const defaultDutyRosterPayload: DutyRosterPayload = {
  allowPublicView: true,
  academicYearKm: 'ឆ្នាំ២០២៦-២០២៧',
  academicYearEn: '2026-2027',
  femaleRepKm: 'កញ្ញា វាសនា អ៊ុត ជាប្រធាននិស្សិតស្រី',
  maleRepKm: 'លោក ព្យច ខាន់ទី ជាប្រធាននិស្សិតប្រុស',
  centerDirectorKm: 'ណន ស្រីនាង',
  groups: [
    {
      id: 'grp-1',
      groupNumber: 1,
      nameKm: 'ក្រុមទី ១',
      nameEn: 'Group 1',
      leaderNameKm: 'ផន ចាន់តារា',
      leaderNameEn: 'Phan Chandara',
      leaderAvatar: '',
      color: 'from-blue-600 to-indigo-600',
      members: [
        'ផន ចាន់តារា (ប្រធាន)',
        'អំប៉ិល ធីតា',
        'គីរ៉ា ម៉ាឡានី',
        'យូវ ជ្ជា',
        'ណៃ ម៉ាយូរ៉ា',
        'បាត ខ្វិត',
        'ញ៉ន លា',
        'ឡាច ដាលី',
        'ភេទ លី'
      ]
    },
    {
      id: 'grp-2',
      groupNumber: 2,
      nameKm: 'ក្រុមទី ២',
      nameEn: 'Group 2',
      leaderNameKm: 'ម៉ម ម៉ូនីត',
      leaderNameEn: 'Mom Monit',
      leaderAvatar: '',
      color: 'from-emerald-600 to-teal-600',
      members: [
        'ម៉ម ម៉ូនីត (ប្រធាន)',
        'ពែក ស្រីលាក់',
        'ឆៃ សាមិត',
        'ច្រិត ដារ៉ា',
        'ប៉ិច រីយ៉ា',
        'ពេន យ៉ាំ',
        'គ្រើត ម៉ាលីហ្សា',
        'រ៉ត សុខទុំ',
        'ឃីន សុឃឿ'
      ]
    },
    {
      id: 'grp-3',
      groupNumber: 3,
      nameKm: 'ក្រុមទី ៣',
      nameEn: 'Group 3',
      leaderNameKm: 'ជា រ៉ូ',
      leaderNameEn: 'Chea Ro',
      leaderAvatar: '',
      color: 'from-amber-500 to-orange-600',
      members: [
        'ជា រ៉ូ (ប្រធាន)',
        'តាយ ហ៊ាន',
        'ឃឹម ញៀន',
        'ឡាញ ហាណា',
        'ជិន លុច',
        'ធួញ ស្រីញ៉ែ',
        'ភា សុភ័ណ្ឌ',
        'ជ្រើប អៃដា'
      ]
    },
    {
      id: 'grp-4',
      groupNumber: 4,
      nameKm: 'ក្រុមទី ៤',
      nameEn: 'Group 4',
      leaderNameKm: 'ថេ នី',
      leaderNameEn: 'Thea Ni',
      leaderAvatar: '',
      color: 'from-purple-600 to-pink-600',
      members: [
        'ថេ នី (ប្រធាន)',
        'កុំសាញ់ ស្រីលីន',
        'សុក តែន',
        'អន សុម៉ាលាភ',
        'កាំ សុឃៀង',
        'សឺន សាវ៉ន',
        'ច្រែត កាស្សា',
        'នឿន ស្រីលីន',
        'ប្រាន វិចិត្រ'
      ]
    },
    {
      id: 'grp-5',
      groupNumber: 5,
      nameKm: 'ក្រុមទី ៥',
      nameEn: 'Group 5',
      leaderNameKm: 'ជឿ ខៀត',
      leaderNameEn: 'Choeu Khiet',
      leaderAvatar: '',
      color: 'from-rose-600 to-red-600',
      members: [
        'ជឿ ខៀត (ប្រធាន)',
        'សួន ស្រីនិច',
        'ញ៉ាល់ ប៉ាន់ថៃ',
        'ភ្លឺតពិសិទ្ធិ សំនៀង',
        'ចន សុខរ៉ាត់',
        'តេន សាំ',
        'បូរ៉ាត់ រស្មី',
        'ឡុង មី',
        'ឃ្លីវ ស្រីពៅ'
      ]
    }
  ],
  tasks: [
    {
      id: 'task-a',
      code: 'កិច្ចការ A',
      titleKm: 'កិច្ចការ A (ចម្អិនអាហារថ្ងៃត្រង់)',
      titleEn: 'Task A (Cook Lunch)',
      shortKm: 'ចម្អិនអាហារថ្ងៃត្រង់',
      shortEn: 'Cook Lunch',
      badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
      bulletsKm: [
        'ចម្អិនអាហារថ្ងៃត្រង់',
        'លាងសម្អាតក្រោយចម្អិន',
        'រៀបចំផ្ទះបាយ ទុកដាក់គ្រឿងទេសកន្លែងដើមវិញ',
        'រៀបចំកន្លែងញ៉ាំបាយ ចាន ស្លាបព្រា កែវទឹក កៅអី លើកម្ហូបដាក់តាមតុ'
      ],
      bulletsEn: [
        'Cook lunch for residents',
        'Clean kitchen utensils after cooking',
        'Organize kitchen and return spices to their original place',
        'Set dining tables, plates, spoons, water glasses, chairs, and serve food'
      ]
    },
    {
      id: 'task-b',
      code: 'កិច្ចការ B',
      titleKm: 'កិច្ចការ B (លាងចានពេលថ្ងៃត្រង់)',
      titleEn: 'Task B (Wash Lunch Dishes)',
      shortKm: 'លាងចានពេលថ្ងៃត្រង់',
      shortEn: 'Wash Lunch Dishes',
      badgeColor: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
      bulletsKm: [
        'លាងចាន ពេលថ្ងៃត្រង់',
        'ជូតសម្អាតតុ និងកន្លែងញ៉ាំ ក្រោយញ៉ាំរួច',
        'រៀបចំចាន ឆ្នាំង ឱ្យមានរបៀប',
        'ពិនិត្យមើលបិទហ្គាស',
        'បោកកន្សែងជូតតុ និងរៀបចំទុកតាមកន្លែងដើមវិញ'
      ],
      bulletsEn: [
        'Wash dishes at lunchtime',
        'Wipe dining tables and eating area after meals',
        'Arrange plates and pots neatly',
        'Check and turn off the gas valve safely',
        'Wash table cloths and return them to their place'
      ]
    },
    {
      id: 'task-c',
      code: 'កិច្ចការ C',
      titleKm: 'កិច្ចការ C (ចម្អិនអាហារពេលល្ងាច)',
      titleEn: 'Task C (Cook Dinner)',
      shortKm: 'ចម្អិនអាហារពេលល្ងាច',
      shortEn: 'Cook Dinner',
      badgeColor: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
      bulletsKm: [
        'ចម្អិនអាហារពេលល្ងាច',
        'លាងសម្អាតក្រោយចម្អិន',
        'រៀបចំផ្ទះបាយ និងទុកដាក់គ្រឿងទេសកន្លែងដើមវិញ',
        'រៀបចំកន្លែងញ៉ាំបាយ ចាន ស្លាបព្រា កែវទឹក កៅអី លើកម្ហូបដាក់តាមតុ'
      ],
      bulletsEn: [
        'Cook dinner for residents',
        'Clean up after cooking',
        'Organize kitchen and store spices properly',
        'Prepare dining area, plates, spoons, glasses, chairs, and serve dinner'
      ]
    },
    {
      id: 'task-d',
      code: 'កិច្ចការ D',
      titleKm: 'កិច្ចការ D (ទៅផ្សារទិញម្ហូប & សម្អាតផ្ទះ)',
      titleEn: 'Task D (Market Shopping & Cleaning)',
      shortKm: 'ទៅផ្សារទិញម្ហូប & សម្អាតផ្ទះ',
      shortEn: 'Market & House Cleaning',
      badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      bulletsKm: [
        'ទៅផ្សារទិញម្ហូប',
        'សម្អាតផ្ទះ បោសជូត ជណ្តើរគ្រប់ជាន់',
        'សម្អាតកន្លែងដាក់ម៉ូតូ',
        'បន្ទប់ទឹកជាន់ក្រោម',
        'យកសំរាមបោះចោល'
      ],
      bulletsEn: [
        'Go to the market to buy groceries',
        'Sweep and mop the house and stairs on all floors',
        'Clean the motorbike parking area',
        'Clean the ground floor restroom',
        'Take out and dispose of the trash'
      ]
    },
    {
      id: 'task-e',
      code: 'កិច្ចការ E',
      titleKm: 'កិច្ចការ E (លាងចានពេលល្ងាច)',
      titleEn: 'Task E (Wash Dinner Dishes)',
      shortKm: 'លាងចានពេលល្ងាច',
      shortEn: 'Wash Dinner Dishes',
      badgeColor: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
      bulletsKm: [
        'លាងចានពេលល្ងាច',
        'ជូតសម្អាតតុ កន្លែងញ៉ាំ ក្រោយញ៉ាំរួច',
        'រៀបចំចាន ឆ្នាំង ឱ្យមានរបៀបតាមកន្លែងដើម',
        'ពិនិត្យមើលបិទហ្គាស',
        'បោកកន្សែងជូតតុ រៀបចំទុកតាមកន្លែងដើមវិញ'
      ],
      bulletsEn: [
        'Wash dishes in the evening',
        'Wipe tables and dining area after dinner',
        'Arrange dishes and pots neatly in their place',
        'Check and turn off the gas valve',
        'Wash table cloths and store them properly'
      ]
    }
  ],
  schedule: [
    {
      dayKey: 'mon',
      dayNameKm: 'ថ្ងៃចន្ទ',
      dayNameEn: 'Monday',
      assignments: {
        'task-a': 'grp-1',
        'task-b': 'grp-3',
        'task-c': 'grp-5',
        'task-d': 'grp-2',
        'task-e': 'grp-4'
      }
    },
    {
      dayKey: 'tue',
      dayNameKm: 'ថ្ងៃអង្គារ',
      dayNameEn: 'Tuesday',
      assignments: {
        'task-a': 'grp-2',
        'task-b': 'grp-4',
        'task-c': 'grp-1',
        'task-d': 'grp-3',
        'task-e': 'grp-5'
      }
    },
    {
      dayKey: 'wed',
      dayNameKm: 'ថ្ងៃពុធ',
      dayNameEn: 'Wednesday',
      assignments: {
        'task-a': 'grp-3',
        'task-b': 'grp-5',
        'task-c': 'grp-2',
        'task-d': 'grp-4',
        'task-e': 'grp-1'
      }
    },
    {
      dayKey: 'thu',
      dayNameKm: 'ថ្ងៃព្រហស្បតិ៍',
      dayNameEn: 'Thursday',
      assignments: {
        'task-a': 'grp-4',
        'task-b': 'grp-1',
        'task-c': 'grp-3',
        'task-d': 'grp-5',
        'task-e': 'grp-2'
      }
    },
    {
      dayKey: 'fri',
      dayNameKm: 'ថ្ងៃសុក្រ',
      dayNameEn: 'Friday',
      assignments: {
        'task-a': 'grp-5',
        'task-b': 'grp-2',
        'task-c': 'grp-4',
        'task-d': 'grp-1',
        'task-e': 'grp-3'
      }
    },
    {
      dayKey: 'sat',
      dayNameKm: 'ថ្ងៃសៅរ៍',
      dayNameEn: 'Saturday',
      assignments: {
        'task-a': 'grp-1',
        'task-b': 'grp-3',
        'task-c': 'grp-5',
        'task-d': 'grp-2',
        'task-e': 'grp-4'
      }
    },
    {
      dayKey: 'sun',
      dayNameKm: 'ថ្ងៃអាទិត្យ',
      dayNameEn: 'Sunday',
      assignments: {
        'task-a': 'grp-2',
        'task-b': 'grp-4',
        'task-c': 'grp-1',
        'task-d': 'grp-3',
        'task-e': 'grp-5'
      }
    }
  ]
};

const GROUP_GRADIENTS = [
  'from-blue-600 to-indigo-600',
  'from-emerald-600 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-purple-600 to-pink-600',
  'from-rose-600 to-red-600',
  'from-cyan-600 to-blue-600',
  'from-lime-600 to-emerald-600'
];

export function loadCachedDutyRoster(): DutyRosterPayload {
  try {
    const raw = localStorage.getItem(DUTY_STORAGE_KEY);
    if (!raw) return defaultDutyRosterPayload;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.groups) && Array.isArray(parsed.schedule)) {
      return {
        ...defaultDutyRosterPayload,
        ...parsed,
        allowPublicView:
          typeof parsed.allowPublicView === 'boolean' ? parsed.allowPublicView : true
      };
    }
    return defaultDutyRosterPayload;
  } catch {
    return defaultDutyRosterPayload;
  }
}

export async function fetchDutyRosterFromDb(): Promise<DutyRosterPayload> {
  let current = loadCachedDutyRoster();
  try {
    const { data, error } = await supabase
      .from('bipa_duty_roster')
      .select('payload')
      .eq('id', '1')
      .maybeSingle();

    if (!error && data && data.payload) {
      current = {
        ...defaultDutyRosterPayload,
        ...data.payload,
        allowPublicView:
          typeof data.payload.allowPublicView === 'boolean'
            ? data.payload.allowPublicView
            : true
      };
      localStorage.setItem(DUTY_STORAGE_KEY, JSON.stringify(current));
    } else if (!error && !data) {
      await supabase.from('bipa_duty_roster').upsert({
        id: '1',
        payload: current,
        updated_at: new Date().toISOString()
      });
    }
  } catch {}
  return current;
}

export async function saveDutyRosterToDb(payload: DutyRosterPayload): Promise<void> {
  localStorage.setItem(DUTY_STORAGE_KEY, JSON.stringify(payload));
  try {
    await supabase.from('bipa_duty_roster').upsert({
      id: '1',
      payload,
      updated_at: new Date().toISOString()
    });
  } catch {}
  window.dispatchEvent(new Event('duty-roster-updated'));
}

function getTodayDayKey(): string {
  const dayIdx = new Date().getDay();
  const map: Record<number, string> = {
    1: 'mon',
    2: 'tue',
    3: 'wed',
    4: 'thu',
    5: 'fri',
    6: 'sat',
    0: 'sun'
  };
  return map[dayIdx] || 'mon';
}

export function DutyScheduleUserView({
  onSwitchToAdmin
}: {
  onSwitchToAdmin?: () => void;
}) {
  const { user, hasRole } = useAuth();
  const { lang } = useI18n();
  const navigate = useNavigate();
  const isKhmer = lang === 'km';
  const isAdmin = hasRole('super_admin', 'residence_admin', 'finance_admin', 'duty_manager');

  const [roster, setRoster] = useState<DutyRosterPayload>(() => loadCachedDutyRoster());
  const [selectedDayKey, setSelectedDayKey] = useState<string>(() => getTodayDayKey());
  const [selectedGroupModal, setSelectedGroupModal] = useState<{
    group: DutyGroupItem;
    task?: DutyTaskItem;
  } | null>(null);

  const loadRoster = async () => {
    const data = await fetchDutyRosterFromDb();
    setRoster(data);
  };

  useEffect(() => {
    loadRoster();
    window.addEventListener('duty-roster-updated', loadRoster);
    return () => window.removeEventListener('duty-roster-updated', loadRoster);
  }, []);

  if (!roster.allowPublicView && !user && !isAdmin) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 rounded-3xl bg-white dark:bg-[#162033] border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-4 font-khmer">
        <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center mx-auto">
          <Lock className="h-8 w-8" />
        </div>
        <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
          {isKhmer ? 'តម្រូវឱ្យចូលគណនី (Sign In)' : 'Sign In Required'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          {isKhmer
            ? 'គណៈគ្រប់គ្រងបានកំណត់សិទ្ធិឱ្យចូលគណនីជាមុនសិន ទើបអាចមើលកាលវិភាគកិច្ចការតាមក្រុមបាន។'
            : 'Please sign in to your account to view the group duty schedule.'}
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="rounded-xl text-xs font-bold h-10 px-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            {isKhmer ? 'ត្រឡប់ទៅវិញ' : 'Back'}
          </Button>
          <Button
            onClick={() => navigate('/signin')}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold h-10 px-5 shadow-md"
          >
            <LogIn className="h-4 w-4 mr-1.5" />
            {isKhmer ? 'ចូលគណនី (Sign In)' : 'Sign In'}
          </Button>
        </div>
      </div>
    );
  }

  const currentDayObj =
    roster.schedule.find((d) => d.dayKey === selectedDayKey) || roster.schedule[0];

  const getGroupTaskForDay = (groupId: string, day: DutyDaySchedule): DutyTaskItem | undefined => {
    const foundEntry = Object.entries(day.assignments || {}).find(
      ([, assignedGroupId]) => assignedGroupId === groupId
    );
    if (!foundEntry) return undefined;
    return roster.tasks.find((t) => t.id === foundEntry[0]);
  };

  const todayKey = getTodayDayKey();

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-5 font-khmer pb-20 pt-1">
      <div className="bg-white dark:bg-[#162033] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#0f172a] dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-blue-500" />
            <span>{isKhmer ? 'ត្រឡប់ទៅវិញ' : 'Back'}</span>
          </button>

          <div className="flex items-center gap-2">
            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-extrabold text-[10px] px-2.5 py-0.5">
              {isKhmer ? roster.academicYearKm : roster.academicYearEn}
            </Badge>

            {isAdmin && onSwitchToAdmin && (
              <Button
                type="button"
                size="sm"
                onClick={onSwitchToAdmin}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 px-3 rounded-xl shadow-xs"
              >
                <Settings2 className="h-3.5 w-3.5 mr-1" />
                {isKhmer ? 'កែប្រែ' : 'Edit'}
              </Button>
            )}
          </div>
        </div>

        <div>
          <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarClock className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 shrink-0" />
            <span>{isKhmer ? 'កាលវិភាគកិច្ចការប្រចាំថ្ងៃ' : 'Daily Duty Schedule'}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isKhmer
              ? 'ចុចលើរូបប្រធានក្រុម ដើម្បីមើលឈ្មោះសមាជិក និងការងារប្រចាំថ្ងៃ'
              : 'Tap on a group leader to view members and daily tasks'}
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none pt-1 pb-0.5">
          {roster.schedule.map((day) => {
            const isSelected = day.dayKey === selectedDayKey;
            const isToday = day.dayKey === todayKey;
            return (
              <button
                key={day.dayKey}
                type="button"
                onClick={() => setSelectedDayKey(day.dayKey)}
                className={cn(
                  'px-3.5 py-2 rounded-2xl text-xs font-extrabold transition-all shrink-0 flex items-center gap-1.5 border active:scale-95',
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                    : 'bg-slate-50 dark:bg-[#0f172a] text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:border-blue-400'
                )}
              >
                <span>{isKhmer ? day.dayNameKm : day.dayNameEn}</span>
                {isToday && (
                  <span
                    className={cn(
                      'px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase',
                      isSelected
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    )}
                  >
                    {isKhmer ? 'ថ្ងៃនេះ' : 'Today'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {roster.groups.map((grp) => {
          const assignedTask = currentDayObj
            ? getGroupTaskForDay(grp.id, currentDayObj)
            : undefined;

          return (
            <div
              key={grp.id}
              onClick={() => setSelectedGroupModal({ group: grp, task: assignedTask })}
              className="group relative rounded-3xl p-3.5 sm:p-4 bg-white dark:bg-[#162033] border border-slate-200/90 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 shadow-sm hover:shadow-xl hover:-translate-y-1 active:scale-95 transition-all duration-300 cursor-pointer flex flex-col items-center text-center"
            >
              <div className="w-full flex items-center justify-between gap-1 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 dark:bg-[#0f172a] text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-800">
                  {isKhmer ? grp.nameKm : grp.nameEn}
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  {isKhmer ? currentDayObj?.dayNameKm : currentDayObj?.dayNameEn}
                </span>
              </div>

              <div className="relative my-1.5 shrink-0">
                <div
                  style={{ width: '76px', height: '76px' }}
                  className={cn(
                    'rounded-full p-1 bg-gradient-to-tr shadow-md group-hover:scale-105 transition-transform duration-300 shrink-0',
                    grp.color || 'from-blue-600 to-indigo-600'
                  )}
                >
                  <div className="w-full h-full rounded-full bg-white dark:bg-[#162033] flex items-center justify-center overflow-hidden border-2 border-white dark:border-[#0f172a]">
                    {grp.leaderAvatar ? (
                      <img
                        src={grp.leaderAvatar}
                        alt={grp.leaderNameKm}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className={cn(
                          'w-full h-full flex items-center justify-center text-white font-black bg-gradient-to-br text-2xl',
                          grp.color || 'from-blue-600 to-indigo-600'
                        )}
                      >
                        {grp.leaderNameKm.charAt(0)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-amber-400 text-slate-950 border-2 border-white dark:border-[#0f172a] flex items-center justify-center shadow">
                  <Crown className="h-3 w-3" />
                </div>
              </div>

              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors line-clamp-1 mt-1">
                {isKhmer ? grp.leaderNameKm : grp.leaderNameEn || grp.leaderNameKm}
              </h3>

              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                {isKhmer ? `ប្រធានក្រុម (${grp.members.length} នាក់)` : `Leader (${grp.members.length})`}
              </p>

              <div className="w-full mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/90">
                {assignedTask ? (
                  <div
                    className={cn(
                      'px-2 py-1.5 rounded-xl border text-[11px] font-extrabold line-clamp-2 leading-snug',
                      assignedTask.badgeColor
                    )}
                  >
                    {isKhmer ? assignedTask.shortKm : assignedTask.shortEn}
                  </div>
                ) : (
                  <div className="px-2 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-slate-500 text-[11px] font-bold">
                    {isKhmer ? 'សម្រាក / គ្មានវេន' : 'Rest / No Duty'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedGroupModal && (
        <div
          onClick={() => setSelectedGroupModal(null)}
          className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 font-khmer animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-white dark:bg-[#162033] border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[84dvh] flex flex-col"
          >
            <div
              className={cn(
                'p-4 sm:p-5 text-white bg-gradient-to-r flex items-center justify-between gap-3 shrink-0',
                selectedGroupModal.group.color || 'from-blue-600 to-indigo-600'
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    minWidth: '52px',
                    minHeight: '52px',
                    maxWidth: '52px',
                    maxHeight: '52px'
                  }}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/20 border-2 border-white flex items-center justify-center text-lg font-black overflow-hidden shrink-0 shadow-md"
                >
                  {selectedGroupModal.group.leaderAvatar ? (
                    <img
                      src={selectedGroupModal.group.leaderAvatar}
                      alt={selectedGroupModal.group.leaderNameKm}
                      style={{ width: '52px', height: '52px', objectFit: 'cover' }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{selectedGroupModal.group.leaderNameKm.charAt(0)}</span>
                  )}
                </div>

                <div className="min-w-0">
                  <Badge className="bg-black/30 hover:bg-black/30 text-white border-0 text-[10px] font-extrabold mb-1 px-2.5 py-0.5">
                    {selectedGroupModal.group.nameKm} • សមាជិក {selectedGroupModal.group.members.length} នាក់
                  </Badge>
                  <h3 className="text-sm sm:text-base font-black leading-tight truncate">
                    ប្រធានក្រុម៖ {selectedGroupModal.group.leaderNameKm}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedGroupModal(null)}
                className="w-8 h-8 rounded-full bg-black/25 hover:bg-black/40 flex items-center justify-center text-white shrink-0 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 scrollbar-thin flex-1">
              {selectedGroupModal.task ? (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      វេន{currentDayObj?.dayNameKm}៖
                    </span>
                    <Badge className={cn('text-[11px] font-extrabold border', selectedGroupModal.task.badgeColor)}>
                      {selectedGroupModal.task.code} - {selectedGroupModal.task.shortKm}
                    </Badge>
                  </div>
                  <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300 pl-4 list-disc">
                    {selectedGroupModal.task.bulletsKm.map((item, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 text-center text-xs font-bold text-slate-500">
                  គ្មានវេនកិច្ចការសម្រាប់{currentDayObj?.dayNameKm}ទេ
                </div>
              )}

              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                  តារាងឈ្មោះសមាជិកក្នុង{selectedGroupModal.group.nameKm} ({selectedGroupModal.group.members.length} នាក់)
                </h4>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-200/70 dark:divide-slate-800">
                  {selectedGroupModal.group.members.map((memberName, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'px-3.5 py-2.5 flex items-center justify-between text-xs sm:text-sm',
                        idx === 0
                          ? 'bg-amber-500/10 font-black text-amber-700 dark:text-amber-400'
                          : 'bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-200 font-semibold'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-extrabold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="truncate">{memberName}</span>
                      </div>
                      {idx === 0 && (
                        <Badge className="bg-amber-500 hover:bg-amber-500 text-slate-950 text-[10px] font-extrabold shrink-0 ml-2">
                          ប្រធានក្រុម
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0f172a] flex justify-end shrink-0">
              <Button
                onClick={() => setSelectedGroupModal(null)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl px-6 h-9"
              >
                បិទផ្ទាំង
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function DutyRosterAdminPanel() {
  const { lang } = useI18n();
  const isKhmer = lang === 'km';

  const [roster, setRoster] = useState<DutyRosterPayload>(() => loadCachedDutyRoster());
  const [activeTab, setActiveTab] = useState<'preview' | 'groups' | 'schedule' | 'tasks'>('groups');
  const [saving, setSaving] = useState(false);

  const [editingGroupId, setEditingGroupId] = useState<string>('grp-1');
  const [newMemberName, setNewMemberName] = useState('');
  const [newBulletInputs, setNewBulletInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchDutyRosterFromDb().then((data) => {
      setRoster(data);
      if (data.groups.length > 0 && !data.groups.some((g) => g.id === editingGroupId)) {
        setEditingGroupId(data.groups[0].id);
      }
    });
  }, []);

  const currentGroup =
    roster.groups.find((g) => g.id === editingGroupId) || roster.groups[0];

  const handleTogglePublicAccess = async () => {
    const nextVal = !roster.allowPublicView;
    const updated = { ...roster, allowPublicView: nextVal };
    setRoster(updated);
    await saveDutyRosterToDb(updated);
  };

  const handleUpdateGroup = (groupId: string, patch: Partial<DutyGroupItem>) => {
    setRoster((prev) => ({
      ...prev,
      groups: prev.groups.map((g) => (g.id === groupId ? { ...g, ...patch } : g))
    }));
  };

  const handleAddNewGroup = () => {
    const nextNum =
      roster.groups.length > 0
        ? Math.max(...roster.groups.map((g) => g.groupNumber)) + 1
        : 1;
    const newId = `grp-${Date.now()}`;
    const newGroup: DutyGroupItem = {
      id: newId,
      groupNumber: nextNum,
      nameKm: `ក្រុមទី ${nextNum}`,
      nameEn: `Group ${nextNum}`,
      leaderNameKm: `ប្រធានក្រុមទី ${nextNum}`,
      leaderNameEn: `Leader ${nextNum}`,
      leaderAvatar: '',
      color: GROUP_GRADIENTS[(nextNum - 1) % GROUP_GRADIENTS.length],
      members: [`ប្រធានក្រុមទី ${nextNum} (ប្រធាន)`]
    };

    setRoster((prev) => ({
      ...prev,
      groups: [...prev.groups, newGroup]
    }));
    setEditingGroupId(newId);
  };

  const handleDeleteGroup = (groupId: string) => {
    if (roster.groups.length <= 1) return;
    if (!window.confirm('តើអ្នកពិតជាចង់លុបក្រុមនេះមែនទេ?')) return;
    const nextGroups = roster.groups.filter((g) => g.id !== groupId);
    setRoster((prev) => ({
      ...prev,
      groups: nextGroups
    }));
    if (editingGroupId === groupId && nextGroups.length > 0) {
      setEditingGroupId(nextGroups[0].id);
    }
  };

  const handleAddMemberToCurrentGroup = () => {
    if (!newMemberName.trim() || !currentGroup) return;
    handleUpdateGroup(currentGroup.id, {
      members: [...currentGroup.members, newMemberName.trim()]
    });
    setNewMemberName('');
  };

  const handleUpdateMemberName = (idx: number, val: string) => {
    if (!currentGroup) return;
    const nextMembers = [...currentGroup.members];
    nextMembers[idx] = val;
    handleUpdateGroup(currentGroup.id, { members: nextMembers });
  };

  const handleRemoveMemberFromGroup = (idx: number) => {
    if (!currentGroup) return;
    handleUpdateGroup(currentGroup.id, {
      members: currentGroup.members.filter((_, i) => i !== idx)
    });
  };

  const handleScheduleAssignmentChange = (
    dayKey: string,
    taskId: string,
    groupId: string
  ) => {
    setRoster((prev) => ({
      ...prev,
      schedule: prev.schedule.map((d) =>
        d.dayKey === dayKey
          ? {
              ...d,
              assignments: {
                ...d.assignments,
                [taskId]: groupId
              }
            }
          : d
      )
    }));
  };

  const handleUpdateTaskItem = (taskId: string, patch: Partial<DutyTaskItem>) => {
    setRoster((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t))
    }));
  };

  const handleAddNewTask = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nextLetter = letters[roster.tasks.length] || String(roster.tasks.length + 1);
    const newTaskId = `task-${Date.now()}`;
    const newTask: DutyTaskItem = {
      id: newTaskId,
      code: `កិច្ចការ ${nextLetter}`,
      titleKm: `កិច្ចការ ${nextLetter}`,
      titleEn: `Task ${nextLetter}`,
      shortKm: `កិច្ចការថ្មី ${nextLetter}`,
      shortEn: `New Task ${nextLetter}`,
      badgeColor: TASK_BADGE_COLORS[roster.tasks.length % TASK_BADGE_COLORS.length],
      bulletsKm: ['សរសេរការងារដែលត្រូវធ្វើនៅទីនេះ...'],
      bulletsEn: ['Task detail...']
    };

    const defaultGrpId = roster.groups[0]?.id || '';
    setRoster((prev) => ({
      ...prev,
      tasks: [...prev.tasks, newTask],
      schedule: prev.schedule.map((d) => ({
        ...d,
        assignments: {
          ...d.assignments,
          [newTaskId]: defaultGrpId
        }
      }))
    }));
  };

  const handleDeleteTask = (taskId: string) => {
    if (roster.tasks.length <= 1) return;
    if (!window.confirm('តើអ្នកពិតជាចង់លុបកិច្ចការនេះមែនទេ?')) return;
    setRoster((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== taskId)
    }));
  };

  const handleAddBulletToTask = (taskId: string) => {
    const text = (newBulletInputs[taskId] || '').trim();
    const target = roster.tasks.find((t) => t.id === taskId);
    if (!target) return;
    const lineToAdd = text || 'កិច្ចការបន្ថែមថ្មី...';
    handleUpdateTaskItem(taskId, {
      bulletsKm: [...target.bulletsKm, lineToAdd]
    });
    setNewBulletInputs((prev) => ({ ...prev, [taskId]: '' }));
  };

  const handleUpdateTaskBulletLine = (taskId: string, bulletIdx: number, val: string) => {
    const target = roster.tasks.find((t) => t.id === taskId);
    if (!target) return;
    const nextBullets = [...target.bulletsKm];
    nextBullets[bulletIdx] = val;
    handleUpdateTaskItem(taskId, { bulletsKm: nextBullets });
  };

  const handleRemoveTaskBulletLine = (taskId: string, bulletIdx: number) => {
    const target = roster.tasks.find((t) => t.id === taskId);
    if (!target) return;
    handleUpdateTaskItem(taskId, {
      bulletsKm: target.bulletsKm.filter((_, i) => i !== bulletIdx)
    });
  };

  const handleSaveAll = async () => {
    setSaving(true);
    await saveDutyRosterToDb(roster);
    setSaving(false);
    alert(isKhmer ? 'បានរក្សាទុកកាលវិភាគកិច្ចការដោយជោគជ័យ!' : 'Duty Roster saved successfully!');
  };

  return (
    <div className="space-y-6 font-khmer pb-24 pt-2">
      <div className="bg-white dark:bg-[#162033] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <Badge className="bg-[#eab308] text-slate-950 font-extrabold px-2.5 py-0.5 mb-2">
            DUTY ROSTER MANAGEMENT
          </Badge>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {isKhmer ? 'គ្រប់គ្រងកាលវិភាគកិច្ចការប្រចាំថ្ងៃតាមក្រុម' : 'Manage Group Duty Roster'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {isKhmer
              ? 'បន្ថែម ឬកែប្រែចំនួនក្រុម ប្រធានក្រុម សមាជិកក្រុម កិច្ចការ និងវេនប្រចាំថ្ងៃពីចន្ទ ដល់ អាទិត្យ។'
              : 'Add or edit groups, group leaders, members, tasks, and Monday-Sunday schedule.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleTogglePublicAccess}
            className={cn(
              'flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-extrabold transition-all h-10',
              roster.allowPublicView
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400'
            )}
          >
            {roster.allowPublicView ? (
              <>
                <Globe className="h-4 w-4 shrink-0" />
                <span>បើកសិទ្ធិ៖ មើលដោយសេរី (មិនបាច់ Sign In)</span>
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 shrink-0" />
                <span>បិទសិទ្ធិ៖ តម្រូវឱ្យ Sign In ទើបមើលឃើញ</span>
              </>
            )}
          </button>

          <Button
            disabled={saving}
            onClick={handleSaveAll}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm h-10 px-5 rounded-xl shadow-md"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'កំពុងរក្សាទុក...' : 'រក្សាទុកទិន្នន័យ'}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 bg-white dark:bg-[#162033] p-2 rounded-2xl border border-slate-200 dark:border-slate-800 w-fit">
        <Button
          size="sm"
          onClick={() => setActiveTab('groups')}
          className={cn(
            'rounded-xl text-xs font-bold h-9 px-4',
            activeTab === 'groups'
              ? 'bg-blue-600 text-white'
              : 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          )}
        >
          <Users className="h-3.5 w-3.5 mr-1.5" />
          ១. គ្រប់គ្រងក្រុម & សមាជិក ({roster.groups.length})
        </Button>
        <Button
          size="sm"
          onClick={() => setActiveTab('schedule')}
          className={cn(
            'rounded-xl text-xs font-bold h-9 px-4',
            activeTab === 'schedule'
              ? 'bg-blue-600 text-white'
              : 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          )}
        >
          <CalendarClock className="h-3.5 w-3.5 mr-1.5" />
          ២. រៀបវេន ចន្ទ-អាទិត្យ
        </Button>
        <Button
          size="sm"
          onClick={() => setActiveTab('tasks')}
          className={cn(
            'rounded-xl text-xs font-bold h-9 px-4',
            activeTab === 'tasks'
              ? 'bg-blue-600 text-white'
              : 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          )}
        >
          <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
          ៣. កែប្រែកិច្ចការ ({roster.tasks.length})
        </Button>
        <Button
          size="sm"
          onClick={() => setActiveTab('preview')}
          className={cn(
            'rounded-xl text-xs font-bold h-9 px-4',
            activeTab === 'preview'
              ? 'bg-amber-500 text-slate-950'
              : 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          )}
        >
          <Eye className="h-3.5 w-3.5 mr-1.5" />
          មើលទម្រង់ User ផ្ទាល់
        </Button>
      </div>

      {activeTab === 'preview' && <DutyScheduleUserView />}

      {activeTab === 'groups' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#162033] p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              {roster.groups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setEditingGroupId(g.id)}
                  className={cn(
                    'px-4 py-2 rounded-xl text-xs font-extrabold transition-all border flex items-center gap-2',
                    g.id === currentGroup?.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'bg-slate-50 dark:bg-[#0f172a] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                  )}
                >
                  <span>{g.nameKm}</span>
                  <Badge className="bg-black/20 text-white text-[10px] px-1.5 py-0">
                    {g.members.length}
                  </Badge>
                </button>
              ))}
            </div>

            <Button
              type="button"
              onClick={handleAddNewGroup}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl h-10 px-4"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              បន្ថែមក្រុមថ្មី
            </Button>
          </div>

          {currentGroup && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <Card className="bg-white dark:bg-[#162033] border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm lg:col-span-5 h-fit">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    ព័ត៌មានប្រធានក្រុម ({currentGroup.nameKm})
                  </CardTitle>
                  {roster.groups.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteGroup(currentGroup.id)}
                      className="text-xs font-bold text-red-500 hover:text-red-400 flex items-center gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      លុបក្រុមនេះ
                    </button>
                  )}
                </CardHeader>
                <CardContent className="p-4 space-y-3.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        ឈ្មោះក្រុម (ខ្មែរ)
                      </label>
                      <Input
                        value={currentGroup.nameKm}
                        onChange={(e) =>
                          handleUpdateGroup(currentGroup.id, { nameKm: e.target.value })
                        }
                        className="text-xs h-9"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        Group Name (EN)
                      </label>
                      <Input
                        value={currentGroup.nameEn}
                        onChange={(e) =>
                          handleUpdateGroup(currentGroup.id, { nameEn: e.target.value })
                        }
                        className="text-xs h-9"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-amber-500 block mb-1">
                      ឈ្មោះប្រធានក្រុម (ខ្មែរ)
                    </label>
                    <Input
                      value={currentGroup.leaderNameKm}
                      onChange={(e) =>
                        handleUpdateGroup(currentGroup.id, { leaderNameKm: e.target.value })
                      }
                      className="text-xs h-10 font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                      Link រូបភាព Profile ប្រធានក្រុម (Optional)
                    </label>
                    <Input
                      value={currentGroup.leaderAvatar}
                      onChange={(e) =>
                        handleUpdateGroup(currentGroup.id, { leaderAvatar: e.target.value })
                      }
                      placeholder="https://..."
                      className="text-xs h-9"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-[#162033] border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm lg:col-span-7">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                  <CardTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    បញ្ជីសមាជិកក្នុង «{currentGroup.nameKm}» ({currentGroup.members.length} នាក់)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddMemberToCurrentGroup();
                      }}
                      placeholder="វាយឈ្មោះសមាជិកថ្មីដើម្បីបន្ថែមចូលក្រុមនេះ..."
                      className="text-xs h-10"
                    />
                    <Button
                      type="button"
                      onClick={handleAddMemberToCurrentGroup}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-10 px-4 shrink-0"
                    >
                      <UserPlus className="h-4 w-4 mr-1.5" />
                      បន្ថែមសមាជិក
                    </Button>
                  </div>

                  <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                    {currentGroup.members.map((mem, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800"
                      >
                        <span className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-500 text-xs font-black flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <Input
                          value={mem}
                          onChange={(e) => handleUpdateMemberName(idx, e.target.value)}
                          className="text-xs h-9 font-semibold flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveMemberFromGroup(idx)}
                          className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {activeTab === 'schedule' && (
        <Card className="bg-white dark:bg-[#162033] border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              កំណត់វេនប្រចាំថ្ងៃ (ថ្ងៃចន្ទ ដល់ ថ្ងៃអាទិត្យ)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-[640px]">
              <thead>
                <tr className="bg-slate-100 dark:bg-[#0f172a] text-slate-700 dark:text-slate-300 font-extrabold">
                  <th className="p-3 text-left border border-slate-200 dark:border-slate-800">
                    ថ្ងៃប្រចាំសប្តាហ៍
                  </th>
                  {roster.tasks.map((t) => (
                    <th
                      key={t.id}
                      className="p-3 text-left border border-slate-200 dark:border-slate-800"
                    >
                      <div className="text-blue-500">{t.code}</div>
                      <div className="text-[11px] font-semibold">{t.shortKm}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roster.schedule.map((day) => (
                  <tr key={day.dayKey} className="border-b border-slate-200 dark:border-slate-800">
                    <td className="p-3 font-black text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 whitespace-nowrap">
                      {day.dayNameKm}
                    </td>
                    {roster.tasks.map((task) => (
                      <td
                        key={task.id}
                        className="p-2.5 border border-slate-200 dark:border-slate-800"
                      >
                        <select
                          value={day.assignments?.[task.id] || ''}
                          onChange={(e) =>
                            handleScheduleAssignmentChange(day.dayKey, task.id, e.target.value)
                          }
                          className="w-full h-9 rounded-xl px-2.5 bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-xs"
                        >
                          <option value="">-- សម្រាក / គ្មានក្រុម --</option>
                          {roster.groups.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.nameKm} ({g.leaderNameKm})
                            </option>
                          ))}
                        </select>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#162033] p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                គ្រប់គ្រង និងបន្ថែមប្រភេទកិច្ចការប្រចាំថ្ងៃ (A, B, C, D, E, F...)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                អ្នកអាចកែប្រែចំណងជើងកិច្ចការ បន្ថែមបន្ទាត់អក្សរកិច្ចការថ្មីក្នុងប្រអប់នីមួយៗ ឬបន្ថែមប្រភេទកិច្ចការថ្មីសម្រាប់ក្រុមថ្មី
              </p>
            </div>
            <Button
              type="button"
              onClick={handleAddNewTask}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl h-10 px-4 shrink-0 self-start sm:self-center"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              បន្ថែមប្រភេទកិច្ចការថ្មី (ឧ. កិច្ចការ F)
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roster.tasks.map((task) => (
              <Card
                key={task.id}
                className="bg-white dark:bg-[#162033] border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm"
              >
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={task.code}
                      onChange={(e) => handleUpdateTaskItem(task.id, { code: e.target.value })}
                      className="text-xs font-black h-8 w-28 bg-slate-50 dark:bg-[#0f172a]"
                    />
                    <Input
                      value={task.shortKm}
                      onChange={(e) =>
                        handleUpdateTaskItem(task.id, {
                          shortKm: e.target.value,
                          titleKm: `${task.code} (${e.target.value})`
                        })
                      }
                      placeholder="ឈ្មោះកិច្ចការ..."
                      className="text-xs font-bold h-8 flex-1 bg-slate-50 dark:bg-[#0f172a]"
                    />
                  </div>
                  {roster.tasks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 shrink-0"
                      title="លុបប្រភេទកិច្ចការនេះ"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </CardHeader>

                <CardContent className="p-4 space-y-3">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 block">
                      បញ្ជីអក្សរការងារដែលត្រូវធ្វើ ({task.bulletsKm.length} ចំណុច)៖
                    </label>
                    {task.bulletsKm.map((line, bIdx) => (
                      <div key={bIdx} className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 w-4">•</span>
                        <Input
                          value={line}
                          onChange={(e) =>
                            handleUpdateTaskBulletLine(task.id, bIdx, e.target.value)
                          }
                          className="text-xs h-9 flex-1 bg-slate-50 dark:bg-[#0f172a]"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveTaskBulletLine(task.id, bIdx)}
                          className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <Input
                      value={newBulletInputs[task.id] || ''}
                      onChange={(e) =>
                        setNewBulletInputs((prev) => ({ ...prev, [task.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddBulletToTask(task.id);
                      }}
                      placeholder="វាយបន្ថែមអក្សរកិច្ចការថ្មីនៅទីនេះ..."
                      className="text-xs h-9 flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleAddBulletToTask(task.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-9 px-3 shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      បន្ថែមអក្សរ
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}