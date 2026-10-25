import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Search, Plus, Printer, Edit2, Trash2, Save, X, Settings2, RotateCcw, Languages
} from 'lucide-react';

export interface BipaStudent {
  id: string;
  student_code: string;
  full_name_km: string;
  full_name_en: string;
  gender_km: string;
  gender_en: string;
  dob: string;
  major_km: string;
  major_en: string;
  generation_km: string;
  generation_en: string;
  graduated_year_km: string;
  graduated_year_en: string;
  address_km: string;
  address_en: string;
  ethnicity_km: string;
  ethnicity_en: string;
  current_job_km: string;
  current_job_en: string;
  contact_number: string;
  others_km: string;
  others_en: string;
}

interface DocSettings {
  logo_url: string;
  org_name_km: string;
  org_name_en: string;
  address_line1_km: string;
  address_line1_en: string;
  address_line2: string;
}

const defaultSettings: DocSettings = {
  logo_url: 'https://i.ibb.co/tphX7kd4/ce2e43f3-9d48-4d71-86a6-dd1ac3d77c49.png',
  org_name_km: 'សមាគមជនជាតិដើមភាគតិចព្នង',
  org_name_en: 'BUNONG INDIGENOUS PEOPLE ASSOCIATION',
  address_line1_km: 'អាស័យដ្ឋានៈ ផ្ទះលេខBE0E1E2 ភូមិត្នោតជ្រុំ សង្កាត់បឹងទំពុនទី២, ខណ្ឌមានជ័យ, រាជធានីភ្នំពេញ, លេខទូរស័ព្ទៈ (៨៥៥) ៩៩ ៩៨៧ ៤៥១',
  address_line1_en: 'Address: #BE0E1E2, Tnot Chrum Village, Sangkat Boeng Tumpun 2, Khan Meanchey, Phnom Penh, Tel: (855) 99 987 451',
  address_line2: 'Email: info@bunong.org, Website: www.bunong.org, Facebook Page: The Bunong Indigenous People Association',
};

export const initialStudents: BipaStudent[] = [
  {
    id: '1',
    student_code: 'BIPA-001',
    full_name_km: 'ប្រាក់ ណែត',
    full_name_en: 'Prak Neth',
    gender_km: 'ប្រុស',
    gender_en: 'M',
    dob: '13-12-1980',
    major_km: 'សង្គមកិច្ច',
    major_en: 'Social work',
    generation_km: 'ជំនាន់ទី ១',
    generation_en: 'Gen 1',
    graduated_year_km: 'អនុបណ្ឌិត',
    graduated_year_en: 'Master degree',
    address_km: 'ប៊ូស្រា',
    address_en: 'Bousra',
    ethnicity_km: 'ព្នង',
    ethnicity_en: 'Bunong',
    current_job_km: 'នាយកប្រតិបត្តិ',
    current_job_en: 'Executive Director',
    contact_number: '099 987 451',
    others_km: '',
    others_en: '',
  },
  {
    id: '2',
    student_code: 'BIPA-002',
    full_name_km: 'សាលី ពរ',
    full_name_en: 'Saly Por',
    gender_km: 'ប្រុស',
    gender_en: 'M',
    dob: '',
    major_km: 'សេដ្ឋកិច្ច',
    major_en: 'Economic',
    generation_km: 'ជំនាន់ទី ១',
    generation_en: 'Gen 1',
    graduated_year_km: 'បរិញ្ញាបត្រ',
    graduated_year_en: 'Bachelor degree',
    address_km: 'ដាក់ដាំ',
    address_en: 'Dakdam',
    ethnicity_km: 'ព្នង',
    ethnicity_en: 'Bunong',
    current_job_km: 'មន្ត្រីរាជការ',
    current_job_en: 'Government',
    contact_number: '097 57 26 258',
    others_km: '',
    others_en: '',
  },
  {
    id: '3',
    student_code: 'BIPA-003',
    full_name_km: 'សុខ មករា',
    full_name_en: 'Sok Makra',
    gender_km: 'ប្រុស',
    gender_en: 'M',
    dob: '',
    major_km: 'ភាសាវិទ្យា',
    major_en: 'Linguistic',
    generation_km: 'ជំនាន់ទី ១',
    generation_en: 'Gen 1',
    graduated_year_km: 'អនុបណ្ឌិត',
    graduated_year_en: 'Master degree',
    address_km: 'តាកែវ',
    address_en: 'Takeo',
    ethnicity_km: 'ខ្មែរ',
    ethnicity_en: 'Khmer',
    current_job_km: 'អ្នកបកប្រែ Google',
    current_job_en: 'Translator for Google',
    contact_number: '099 99 24 23',
    others_km: '',
    others_en: '',
  },
  {
    id: '4',
    student_code: 'BIPA-004',
    full_name_km: 'គីម សូនា',
    full_name_en: 'Kim Sonea',
    gender_km: 'ប្រុស',
    gender_en: 'M',
    dob: '',
    major_km: 'ព័ត៌មានវិទ្យា',
    major_en: 'IT',
    generation_km: 'ជំនាន់ទី ២',
    generation_en: 'Gen 2',
    graduated_year_km: 'បរិញ្ញាបត្រ',
    graduated_year_en: 'Bachelor degree',
    address_km: 'សែនមនោរម្យ',
    address_en: 'Sen Monorom',
    ethnicity_km: 'ព្នង',
    ethnicity_en: 'Bunong',
    current_job_km: 'មន្ត្រីរាជការ',
    current_job_en: 'Government',
    contact_number: '',
    others_km: '',
    others_en: '',
  },
  {
    id: '5',
    student_code: 'BIPA-005',
    full_name_km: 'រិន ទួង',
    full_name_en: 'Rin Tuong',
    gender_km: 'ប្រុស',
    gender_en: 'M',
    dob: '',
    major_km: 'គណនេយ្យ',
    major_en: 'Accounting',
    generation_km: 'ជំនាន់ទី ២',
    generation_en: 'Gen 2',
    graduated_year_km: 'បរិញ្ញាបត្រ',
    graduated_year_en: 'Bachelor degree',
    address_km: 'ក្រុងទេស',
    address_en: 'Krongtes',
    ethnicity_km: 'ព្នង',
    ethnicity_en: 'Bunong',
    current_job_km: 'អង្គការ',
    current_job_en: 'Organization',
    contact_number: '012 42 01 27',
    others_km: '',
    others_en: '',
  },
  {
    id: '6',
    student_code: 'BIPA-006',
    full_name_km: 'ប្រាក់ ប៊ុនហុង',
    full_name_en: 'Prak Bunhong',
    gender_km: 'ប្រុស',
    gender_en: 'M',
    dob: '',
    major_km: 'ទស្សនវិជ្ជា',
    major_en: 'Philosophy',
    generation_km: 'ជំនាន់ទី ២',
    generation_en: 'Gen 2',
    graduated_year_km: 'បរិញ្ញាបត្រ',
    graduated_year_en: 'Bachelor degree',
    address_km: 'ប៊ូស្រា',
    address_en: 'Bousra',
    ethnicity_km: 'ព្នង',
    ethnicity_en: 'Bunong',
    current_job_km: 'បូជាចារ្យ',
    current_job_en: 'Become priest',
    contact_number: '',
    others_km: '',
    others_en: '',
  },
  {
    id: '7',
    student_code: 'BIPA-007',
    full_name_km: 'ខ្វេ ថេន',
    full_name_en: 'Kve Then',
    gender_km: 'ប្រុស',
    gender_en: 'M',
    dob: '',
    major_km: 'អក្សរសាស្ត្រអង់គ្លេស',
    major_en: 'English literature',
    generation_km: 'ជំនាន់ទី ២',
    generation_en: 'Gen 2',
    graduated_year_km: 'បរិញ្ញាបត្រ',
    graduated_year_en: 'Bachelor degree',
    address_km: 'ប៊ូស្រា',
    address_en: 'Bousra',
    ethnicity_km: 'ព្នង',
    ethnicity_en: 'Bunong',
    current_job_km: 'សណ្ឋាគារ',
    current_job_en: 'Hotel',
    contact_number: '096 97 19 014',
    others_km: '',
    others_en: '',
  },
  {
    id: '8',
    student_code: 'BIPA-008',
    full_name_km: 'ប្រាក់ ប៊ុនញ៉ុង',
    full_name_en: 'Prak Bunnhong',
    gender_km: 'ប្រុស',
    gender_en: 'M',
    dob: '',
    major_km: 'កសិកម្ម',
    major_en: 'Agriculture',
    generation_km: 'ជំនាន់ទី ៣',
    generation_en: 'Gen 3',
    graduated_year_km: 'បរិញ្ញាបត្រ',
    graduated_year_en: 'Bachelor degree',
    address_km: 'ប៊ូស្រា',
    address_en: 'Bousra',
    ethnicity_km: 'ព្នង',
    ethnicity_en: 'Bunong',
    current_job_km: 'បុគ្គលិក BIPA',
    current_job_en: 'BIPA',
    contact_number: '097 55 34 547',
    others_km: '',
    others_en: '',
  },
  {
    id: '9',
    student_code: 'BIPA-009',
    full_name_km: 'ស្រួច បី',
    full_name_en: 'Srouch Bei',
    gender_km: 'ប្រុស',
    gender_en: 'M',
    dob: '',
    major_km: 'ទីផ្សារ',
    major_en: 'Marketing',
    generation_km: 'ជំនាន់ទី ៣',
    generation_en: 'Gen 3',
    graduated_year_km: 'បរិញ្ញាបត្រ',
    graduated_year_en: 'Bachelor degree',
    address_km: 'អូររាំង',
    address_en: 'Orang',
    ethnicity_km: 'ព្នង',
    ethnicity_en: 'Bunong',
    current_job_km: 'ក្រុមហ៊ុនកាហ្វេ',
    current_job_en: 'Coffee Company',
    contact_number: '',
    others_km: '',
    others_en: '',
  },
  {
    id: '10',
    student_code: 'BIPA-010',
    full_name_km: 'សារឿន លឿង',
    full_name_en: 'Saroeun Loueng',
    gender_km: 'ប្រុស',
    gender_en: 'M',
    dob: '',
    major_km: 'អក្សរសាស្ត្រអង់គ្លេស',
    major_en: 'English literature',
    generation_km: 'ជំនាន់ទី ៣',
    generation_en: 'Gen 3',
    graduated_year_km: 'បរិញ្ញាបត្រ',
    graduated_year_en: 'Bachelor degree',
    address_km: 'ដាក់ដាំ',
    address_en: 'Dakdam',
    ethnicity_km: 'ព្នង',
    ethnicity_en: 'Bunong',
    current_job_km: 'ទាហាន',
    current_job_en: 'Soldier',
    contact_number: '097 99 63 088',
    others_km: '',
    others_en: '',
  },
  {
    id: '11',
    student_code: 'BIPA-011',
    full_name_km: 'ស៊ី ធាន',
    full_name_en: 'Ci Thien',
    gender_km: 'ប្រុស',
    gender_en: 'M',
    dob: '',
    major_km: 'នីតិសាស្ត្រ',
    major_en: 'Law',
    generation_km: 'ជំនាន់ទី ៣',
    generation_en: 'Gen 3',
    graduated_year_km: 'បរិញ្ញាបត្រ',
    graduated_year_en: 'Bachelor degree',
    address_km: 'ប៊ូស្រា',
    address_en: 'Bousra',
    ethnicity_km: 'ព្នង',
    ethnicity_en: 'Bunong',
    current_job_km: 'នគរបាល',
    current_job_en: 'Policeman',
    contact_number: '',
    others_km: '',
    others_en: '',
  },
  {
    id: '12',
    student_code: 'BIPA-012',
    full_name_km: 'រិន ម៉ារីនិត',
    full_name_en: 'Rin Marynit',
    gender_km: 'ស្រី',
    gender_en: 'F',
    dob: '',
    major_km: 'គណនេយ្យ',
    major_en: 'Accounting',
    generation_km: 'ជំនាន់ទី ៣',
    generation_en: 'Gen 3',
    graduated_year_km: 'បរិញ្ញាបត្រ',
    graduated_year_en: 'Bachelor degree',
    address_km: 'ក្រុងទេស',
    address_en: 'Krongtes',
    ethnicity_km: 'ព្នង',
    ethnicity_en: 'Bunong',
    current_job_km: 'ប្រធានហិរញ្ញវត្ថុ',
    current_job_en: 'Finance manager',
    contact_number: '097 43 79 010',
    others_km: '',
    others_en: '',
  },
];

const emptyForm: Omit<BipaStudent, 'id'> = {
  student_code: '',
  full_name_km: '',
  full_name_en: '',
  gender_km: 'ប្រុស',
  gender_en: 'M',
  dob: '',
  major_km: '',
  major_en: '',
  generation_km: 'ជំនាន់ទី ១',
  generation_en: 'Gen 1',
  graduated_year_km: 'បរិញ្ញាបត្រ',
  graduated_year_en: 'Bachelor degree',
  address_km: '',
  address_en: '',
  ethnicity_km: 'ព្នង',
  ethnicity_en: 'Bunong',
  current_job_km: '',
  current_job_en: '',
  contact_number: '',
  others_km: '',
  others_en: '',
};

const STORAGE_KEY = 'bipa_students_directory_v2';
const SETTINGS_KEY = 'bipa_doc_settings_v2';

export function StudentListPage() {
  const [students, setStudents] = useState<BipaStudent[]>([]);
  const [docSettings, setDocSettings] = useState<DocSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [docLang, setDocLang] = useState<'km' | 'en'>('km');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGen, setSelectedGen] = useState('ALL');
  const [selectedMajor, setSelectedMajor] = useState('ALL');

  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<BipaStudent, 'id'>>(emptyForm);
  const [settingsForm, setSettingsForm] = useState<DocSettings>(defaultSettings);
  const [saving, setSaving] = useState(false);

  const normalizeRow = (row: any): BipaStudent => ({
    id: String(row.id || Date.now()),
    student_code: row.student_code || 'BIPA-001',
    full_name_km: row.full_name_km || row.full_name || '',
    full_name_en: row.full_name_en || row.full_name || '',
    gender_km: row.gender_km || (row.gender === 'F' || row.gender === 'ស្រី' ? 'ស្រី' : 'ប្រុស'),
    gender_en: row.gender_en || (row.gender === 'ស្រី' || row.gender === 'F' ? 'F' : 'M'),
    dob: row.dob || '',
    major_km: row.major_km || row.major || '',
    major_en: row.major_en || row.major || '',
    generation_km: row.generation_km || row.generation || 'ជំនាន់ទី ១',
    generation_en: row.generation_en || 'Gen 1',
    graduated_year_km: row.graduated_year_km || row.graduated_year || 'បរិញ្ញាបត្រ',
    graduated_year_en: row.graduated_year_en || 'Bachelor degree',
    address_km: row.address_km || row.address || '',
    address_en: row.address_en || row.address || '',
    ethnicity_km: row.ethnicity_km || row.ethnicity || 'ព្នង',
    ethnicity_en: row.ethnicity_en || 'Bunong',
    current_job_km: row.current_job_km || row.current_job || '',
    current_job_en: row.current_job_en || row.current_job || '',
    contact_number: row.contact_number || '',
    others_km: row.others_km || row.others || '',
    others_en: row.others_en || row.others || '',
  });

  const syncWithAttendanceList = (directoryList: BipaStudent[]) => {
    const todayStr = new Date().toDateString();
    const savedAtt = localStorage.getItem('bipa_attendance_records');
    const existingAtt: any[] = savedAtt ? JSON.parse(savedAtt) : [];
    const todayExisting = existingAtt.filter((r) => r.date === todayStr);

    const mergedAttendance = directoryList.map((stu, idx) => {
      const found = todayExisting.find(
        (r) =>
          (r.student_code && r.student_code.toLowerCase() === stu.student_code.toLowerCase()) ||
          r.name === stu.full_name_km ||
          r.name === `${stu.full_name_km} (${stu.student_code})`
      );
      if (found) {
        return {
          ...found,
          student_code: stu.student_code,
          name: stu.full_name_km || stu.full_name_en,
          gender: stu.gender_km,
        };
      }
      return {
        id: Number(stu.id) || Date.now() + idx,
        student_code: stu.student_code,
        name: stu.full_name_km || stu.full_name_en,
        gender: stu.gender_km,
        time: '--:--:--',
        status: 'អវត្តមាន',
        date: todayStr,
      };
    });

    localStorage.setItem('bipa_attendance_records', JSON.stringify(mergedAttendance));
    window.dispatchEvent(new Event('attendance-updated'));
  };

  const syncLocalCache = (list: BipaStudent[]) => {
    setStudents(list);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    localStorage.setItem('bipa_students_directory', JSON.stringify(list));
    syncWithAttendanceList(list);
    window.dispatchEvent(new Event('students-updated'));
  };

  const fetchAllData = async () => {
    setLoading(true);
    let loadedStudents: BipaStudent[] = [];

    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loadedStudents = parsed.map(normalizeRow);
        }
      } catch {}
    }

    try {
      const { data: studentData, error } = await supabase
        .from('bipa_students')
        .select('*')
        .order('student_code', { ascending: true });

      if (!error && studentData && studentData.length > 0) {
        const dbList = studentData.map(normalizeRow);
        if (dbList.length >= loadedStudents.length) {
          loadedStudents = dbList;
        }
      }
    } catch {}

    if (loadedStudents.length === 0) {
      loadedStudents = initialStudents;
    }

    syncLocalCache(loadedStudents);

    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setDocSettings(parsedSettings);
        setSettingsForm(parsedSettings);
      } catch {}
    }

    try {
      const { data: settingData } = await supabase
        .from('bipa_doc_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (settingData) {
        const merged: DocSettings = {
          logo_url: settingData.logo_url || defaultSettings.logo_url,
          org_name_km: settingData.org_name_km || defaultSettings.org_name_km,
          org_name_en: settingData.org_name_en || defaultSettings.org_name_en,
          address_line1_km: settingData.address_line1_km || settingData.address_line1 || defaultSettings.address_line1_km,
          address_line1_en: settingData.address_line1_en || defaultSettings.address_line1_en,
          address_line2: settingData.address_line2 || defaultSettings.address_line2,
        };
        setDocSettings(merged);
        setSettingsForm(merged);
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
      }
    } catch {}

    setLoading(false);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const generateNextId = () => {
    const numbers = students
      .map((s) => {
        const match = s.student_code.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      })
      .filter((n) => !isNaN(n));
    const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
    return `BIPA-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      ...emptyForm,
      student_code: generateNextId(),
    });
    setShowStudentModal(true);
  };

  const openEditModal = (student: BipaStudent) => {
    setEditingId(student.id);
    setFormData({
      student_code: student.student_code,
      full_name_km: student.full_name_km,
      full_name_en: student.full_name_en,
      gender_km: student.gender_km,
      gender_en: student.gender_en,
      dob: student.dob,
      major_km: student.major_km,
      major_en: student.major_en,
      generation_km: student.generation_km,
      generation_en: student.generation_en,
      graduated_year_km: student.graduated_year_km,
      graduated_year_en: student.graduated_year_en,
      address_km: student.address_km,
      address_en: student.address_en,
      ethnicity_km: student.ethnicity_km,
      ethnicity_en: student.ethnicity_en,
      current_job_km: student.current_job_km,
      current_job_en: student.current_job_en,
      contact_number: student.contact_number,
      others_km: student.others_km,
      others_en: student.others_en,
    });
    setShowStudentModal(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalNameKm = formData.full_name_km.trim() || formData.full_name_en.trim();
    const finalNameEn = formData.full_name_en.trim() || formData.full_name_km.trim();
    if (!finalNameKm || !formData.student_code.trim()) return;

    setSaving(true);

    const prepared: Omit<BipaStudent, 'id'> = {
      ...formData,
      student_code: formData.student_code.trim(),
      full_name_km: finalNameKm,
      full_name_en: finalNameEn,
      major_km: formData.major_km.trim() || formData.major_en.trim(),
      major_en: formData.major_en.trim() || formData.major_km.trim(),
      generation_km: formData.generation_km.trim() || formData.generation_en.trim(),
      generation_en: formData.generation_en.trim() || formData.generation_km.trim(),
      graduated_year_km: formData.graduated_year_km.trim() || formData.graduated_year_en.trim(),
      graduated_year_en: formData.graduated_year_en.trim() || formData.graduated_year_km.trim(),
      address_km: formData.address_km.trim() || formData.address_en.trim(),
      address_en: formData.address_en.trim() || formData.address_km.trim(),
      ethnicity_km: formData.ethnicity_km.trim() || formData.ethnicity_en.trim(),
      ethnicity_en: formData.ethnicity_en.trim() || formData.ethnicity_km.trim(),
      current_job_km: formData.current_job_km.trim() || formData.current_job_en.trim(),
      current_job_en: formData.current_job_en.trim() || formData.current_job_km.trim(),
      others_km: formData.others_km.trim() || formData.others_en.trim(),
      others_en: formData.others_en.trim() || formData.others_km.trim(),
    };

    const dbPayload = {
      ...prepared,
      full_name: prepared.full_name_km,
      gender: prepared.gender_km,
      major: prepared.major_km,
      generation: prepared.generation_km,
      graduated_year: prepared.graduated_year_km,
      address: prepared.address_km,
      ethnicity: prepared.ethnicity_km,
      current_job: prepared.current_job_km,
      others: prepared.others_km,
    };

    if (editingId) {
      const updatedList = students.map((item) =>
        item.id === editingId ? { ...prepared, id: editingId } : item
      );
      syncLocalCache(updatedList);
      try {
        await supabase.from('bipa_students').update(dbPayload).eq('id', editingId);
      } catch {}
    } else {
      const newStudent: BipaStudent = {
        ...prepared,
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      };
      const updatedList = [...students, newStudent].sort((a, b) =>
        a.student_code.localeCompare(b.student_code)
      );
      syncLocalCache(updatedList);
      try {
        await supabase.from('bipa_students').insert([{ id: newStudent.id, ...dbPayload }]);
      } catch {}
    }

    setSaving(false);
    setShowStudentModal(false);
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    if (!window.confirm(`តើអ្នកពិតជាចង់លុបឈ្មោះ "${name}" ចេញពីបញ្ជីមែនទេ?`)) return;
    const updatedList = students.filter((s) => s.id !== id);
    syncLocalCache(updatedList);
    try {
      await supabase.from('bipa_students').delete().eq('id', id);
    } catch {}
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setDocSettings(settingsForm);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settingsForm));
    try {
      await supabase.from('bipa_doc_settings').upsert({
        id: 1,
        logo_url: settingsForm.logo_url,
        org_name_km: settingsForm.org_name_km,
        org_name_en: settingsForm.org_name_en,
        address_line1: settingsForm.address_line1_km,
        address_line2: settingsForm.address_line2,
        updated_at: new Date().toISOString(),
      });
    } catch {}
    setSaving(false);
    setShowSettingsModal(false);
  };

  const uniqueGenerations = Array.from(
    new Set(students.map((s) => (docLang === 'km' ? s.generation_km : s.generation_en)).filter(Boolean))
  );
  const uniqueMajors = Array.from(
    new Set(students.map((s) => (docLang === 'km' ? s.major_km : s.major_en)).filter(Boolean))
  );

  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      s.student_code.toLowerCase().includes(q) ||
      s.full_name_km.toLowerCase().includes(q) ||
      s.full_name_en.toLowerCase().includes(q) ||
      s.contact_number.toLowerCase().includes(q) ||
      s.address_km.toLowerCase().includes(q) ||
      s.address_en.toLowerCase().includes(q);

    const genVal = docLang === 'km' ? s.generation_km : s.generation_en;
    const majVal = docLang === 'km' ? s.major_km : s.major_en;

    const matchGen = selectedGen === 'ALL' || genVal === selectedGen;
    const matchMajor = selectedMajor === 'ALL' || majVal === selectedMajor;

    return matchSearch && matchGen && matchMajor;
  });

  const handlePrintDocument = () => {
    const printWindow = window.open('', '_blank', 'width=1280,height=850');
    if (!printWindow) {
      window.print();
      return;
    }

    const isKm = docLang === 'km';
    const filterSubtitle =
      selectedGen !== 'ALL' || selectedMajor !== 'ALL'
        ? `<div style="font-size:11px;font-weight:700;color:#1e40af;margin-top:4px;">
            ${selectedGen !== 'ALL' ? `${isKm ? 'ជំនាន់៖ ' : 'Generation: '}${selectedGen}` : ''}
            ${selectedGen !== 'ALL' && selectedMajor !== 'ALL' ? ' | ' : ''}
            ${selectedMajor !== 'ALL' ? `${isKm ? 'ជំនាញ៖ ' : 'Major: '}${selectedMajor}` : ''}
          </div>`
        : '';

    const headersHtml = isKm
      ? `<tr class="header-row">
          <th style="width:28px;">ល.រ</th>
          <th style="width:74px;">(ID)</th>
          <th style="text-align:left;padding-left:8px;">គោត្តនាម និងនាម</th>
          <th style="width:42px;">ភេទ</th>
          <th style="width:82px;">ថ្ងៃខែឆ្នាំកំណើត</th>
          <th>ជំនាញ</th>
          <th style="width:68px;">ជំនាន់</th>
          <th>កម្រិត/ឆ្នាំបញ្ចប់</th>
          <th>អាសយដ្ឋាន</th>
          <th style="width:52px;">ជនជាតិ</th>
          <th>មុខរបរបច្ចុប្បន្ន</th>
          <th style="width:95px;">លេខទូរស័ព្ទ</th>
          <th style="width:65px;">ផ្សេងៗ</th>
        </tr>`
      : `<tr class="header-row">
          <th style="width:28px;">Nº</th>
          <th style="width:74px;">ID</th>
          <th style="text-align:left;padding-left:8px;">Name</th>
          <th style="width:45px;">Gender</th>
          <th style="width:82px;">Date of Birth</th>
          <th>Major</th>
          <th style="width:68px;">Gen</th>
          <th>Graduated Year</th>
          <th>Address</th>
          <th style="width:58px;">Ethnicity</th>
          <th>Current Job</th>
          <th style="width:95px;">Contact Number</th>
          <th style="width:65px;">Others</th>
        </tr>`;

    const rowsHtml = filteredStudents
      .map(
        (stu, i) => `<tr class="data-row">
          <td>${i + 1}</td>
          <td style="font-weight:700;color:#1e3a8a;">${stu.student_code}</td>
          <td style="text-align:left;padding-left:8px;font-weight:600;">${isKm ? stu.full_name_km : stu.full_name_en}</td>
          <td>${isKm ? stu.gender_km : stu.gender_en}</td>
          <td>${stu.dob || ''}</td>
          <td>${isKm ? stu.major_km : stu.major_en}</td>
          <td>${isKm ? stu.generation_km : stu.generation_en}</td>
          <td>${isKm ? stu.graduated_year_km : stu.graduated_year_en}</td>
          <td>${isKm ? stu.address_km : stu.address_en}</td>
          <td>${isKm ? stu.ethnicity_km : stu.ethnicity_en}</td>
          <td>${isKm ? stu.current_job_km : stu.current_job_en}</td>
          <td>${stu.contact_number || ''}</td>
          <td>${isKm ? stu.others_km : stu.others_en}</td>
        </tr>`
      )
      .join('');

    printWindow.document.write(`<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>BIPA Student Directory</title>
          <link href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            @page {
              size: A4 landscape;
              margin: 8mm 10mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: 'Kantumruy Pro', 'Khmer OS Battambang', sans-serif;
              margin: 0;
              padding: 0;
              color: #000;
              background: #fff;
            }
            table.report-container {
              width: 100%;
              border-collapse: collapse;
            }
            thead {
              display: table-header-group;
            }
            tfoot {
              display: table-footer-group;
            }
            tr {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .doc-banner {
              position: relative;
              min-height: 100px;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 10px;
            }
            .doc-logo {
              position: absolute;
              left: 10px;
              top: 0;
              width: 88px;
              height: 88px;
              object-fit: contain;
            }
            .doc-titles {
              text-align: center;
              padding: 0 110px;
              color: #1e1b4b;
            }
            .doc-titles h2 {
              margin: 0;
              font-size: 16px;
              font-weight: 700;
            }
            .doc-titles h3 {
              margin: 2px 0;
              font-size: 14px;
              font-weight: 700;
            }
            .doc-titles .divider-symbol {
              font-size: 11px;
              letter-spacing: 3px;
            }
            .doc-titles h1 {
              margin: 4px 0 2px 0;
              font-size: 16px;
              font-weight: 800;
            }
            .doc-titles p {
              margin: 0;
              font-size: 12px;
              font-weight: 600;
              letter-spacing: 0.5px;
              text-transform: uppercase;
            }
            .doc-titles .underline-bar {
              width: 260px;
              height: 3px;
              background: #1e1b4b;
              margin: 4px auto 0 auto;
              border-radius: 4px;
            }
            tr.header-row th {
              background-color: #f3d98b !important;
              border: 1px solid #000;
              padding: 6px 4px;
              font-size: 11px;
              font-weight: 700;
              text-align: center;
              white-space: nowrap;
            }
            tr.data-row td {
              border: 1px solid #000;
              padding: 5px 5px;
              font-size: 11px;
              text-align: center;
              white-space: nowrap;
            }
            .footer-box {
              padding-top: 8px;
              font-size: 10.5px;
              color: #1e1b4b;
              text-align: left;
              line-height: 1.45;
            }
          </style>
        </head>
        <body>
          <table class="report-container">
            <thead>
              <tr>
                <td colspan="13" style="border:none;padding:0 0 6px 0;">
                  <div class="doc-banner">
                    ${docSettings.logo_url ? `<img src="${docSettings.logo_url}" class="doc-logo" alt="Logo" />` : ''}
                    <div class="doc-titles">
                      <h2>ព្រះរាជាណាចក្រកម្ពុជា</h2>
                      <h3>ជាតិ សាសនា ព្រះមហាក្សត្រ</h3>
                      <div class="divider-symbol">~ ~ ~ ❁ ~ ~ ~</div>
                      <h1>${docSettings.org_name_km}</h1>
                      <p>${docSettings.org_name_en}</p>
                      <div class="underline-bar"></div>
                      ${filterSubtitle}
                    </div>
                  </div>
                </td>
              </tr>
              ${headersHtml}
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="13" style="border:none;padding:0;">
                  <div class="footer-box">
                    <div style="font-weight:700;">${isKm ? docSettings.address_line1_km : docSettings.address_line1_en}</div>
                    <div style="font-weight:500;">${docSettings.address_line2}</div>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 300);
            };
          </script>
        </body>
      </html>`);
    printWindow.document.close();
  };

  return (
    <div className="p-4 sm:p-6 font-khmer space-y-6">
      <Card className="bg-[#1e293b] border-slate-800">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                {docLang === 'km' ? 'បញ្ជីឈ្មោះសិស្សនិស្សិត (BIPA)' : 'BIPA Student Directory'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                {docLang === 'km'
                  ? 'គ្រប់គ្រងទិន្នន័យនិស្សិត ស្វែងរកតាមអត្តលេខ (ID) ច្រោះតាមជំនាន់/ជំនាញ និងបោះពុម្ពជាក្រដាសផ្តេក'
                  : 'Manage student records, search by ID, filter by generation/major, and print in A4 landscape'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDocLang(docLang === 'km' ? 'en' : 'km');
                  setSelectedGen('ALL');
                  setSelectedMajor('ALL');
                }}
                className="bg-[#0f172a] border-slate-700 text-amber-400 hover:bg-slate-800 hover:text-amber-300 font-semibold"
              >
                <Languages className="h-4 w-4 mr-1.5" />
                {docLang === 'km' ? 'ប្តូរជា English' : 'ប្តូរជា ភាសាខ្មែរ'}
              </Button>

              <Button
                onClick={openAddModal}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                {docLang === 'km' ? 'បន្ថែមនិស្សិតថ្មី' : 'Add Student'}
              </Button>

              <Button
                variant="outline"
                onClick={() => setShowSettingsModal(true)}
                className="bg-[#0f172a] border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white"
              >
                <Settings2 className="h-4 w-4 mr-1.5 text-[#eab308]" />
                {docLang === 'km' ? 'កំណត់ Logo & អាសយដ្ឋាន' : 'Logo & Address'}
              </Button>

              <Button
                onClick={handlePrintDocument}
                className="bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold"
              >
                <Printer className="h-4 w-4 mr-1.5" />
                {docLang === 'km' ? 'បោះពុម្ព (Print)' : 'Print'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={docLang === 'km' ? 'ស្វែងរក ID (ឧ. BIPA-001) ឬឈ្មោះ...' : 'Search ID (e.g. BIPA-001) or Name...'}
                className="pl-9 bg-[#0f172a] border-slate-700 text-white h-10 text-sm"
              />
            </div>

            <select
              value={selectedGen}
              onChange={(e) => setSelectedGen(e.target.value)}
              className="h-10 rounded-md border border-slate-700 bg-[#0f172a] text-white px-3 text-sm"
            >
              <option value="ALL">
                {docLang === 'km' ? `-- គ្រប់ជំនាន់ទាំងអស់ (${students.length}) --` : `-- All Generations (${students.length}) --`}
              </option>
              {uniqueGenerations.map((gen) => (
                <option key={gen} value={gen}>{gen}</option>
              ))}
            </select>

            <select
              value={selectedMajor}
              onChange={(e) => setSelectedMajor(e.target.value)}
              className="h-10 rounded-md border border-slate-700 bg-[#0f172a] text-white px-3 text-sm"
            >
              <option value="ALL">
                {docLang === 'km' ? '-- គ្រប់ជំនាញទាំងអស់ --' : '-- All Majors --'}
              </option>
              {uniqueMajors.map((maj) => (
                <option key={maj} value={maj}>{maj}</option>
              ))}
            </select>

            <Button
              variant="ghost"
              onClick={() => {
                setSearchQuery('');
                setSelectedGen('ALL');
                setSelectedMajor('ALL');
              }}
              className="text-slate-300 hover:text-white hover:bg-slate-800 h-10"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {docLang === 'km' ? 'បង្ហាញទាំងអស់វិញ' : 'Reset Filters'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto pb-6">
        <div
          id="printable-sheet"
          className="min-w-[1080px] max-w-[1400px] mx-auto bg-white text-black p-8 rounded-xl shadow-2xl border border-slate-300"
        >
          <div className="relative flex items-center justify-center mb-5 min-h-[105px]">
            <div className="absolute left-4 top-0">
              {docSettings.logo_url && (
                <img
                  src={docSettings.logo_url}
                  alt="Association Logo"
                  className="w-24 h-24 object-contain"
                />
              )}
            </div>

            <div className="text-center space-y-1 px-28">
              <h2 className="text-lg font-bold text-[#1e1b4b] tracking-wide">ព្រះរាជាណាចក្រកម្ពុជា</h2>
              <h3 className="text-base font-bold text-[#1e1b4b]">ជាតិ សាសនា ព្រះមហាក្សត្រ</h3>
              <div className="text-[#1e1b4b] text-xs tracking-widest py-0.5">~ ~ ~ ❁ ~ ~ ~</div>
              <h1 className="text-lg font-extrabold text-[#1e1b4b] pt-1">{docSettings.org_name_km}</h1>
              <p className="text-sm font-semibold text-[#1e1b4b] tracking-wider uppercase">{docSettings.org_name_en}</p>
              <div className="w-72 h-1 bg-[#1e1b4b] mx-auto rounded-full mt-1" />
              {(selectedGen !== 'ALL' || selectedMajor !== 'ALL') && (
                <p className="text-xs font-bold text-blue-800 pt-1">
                  {selectedGen !== 'ALL' ? `${docLang === 'km' ? 'ជំនាន់៖ ' : 'Generation: '}${selectedGen}` : ''}
                  {selectedGen !== 'ALL' && selectedMajor !== 'ALL' ? ' | ' : ''}
                  {selectedMajor !== 'ALL' ? `${docLang === 'km' ? 'ជំនាញ៖ ' : 'Major: '}${selectedMajor}` : ''}
                </p>
              )}
            </div>
          </div>

          <p className="text-[11px] text-slate-500 mb-2 text-right">
            * ដាក់ Mouse ពីលើជួរនិស្សិត ដើម្បីកែប្រែ (Edit) ឬលុប (Delete)
          </p>

          <table className="w-full border-collapse border border-black text-[12px]">
            <thead>
              {docLang === 'km' ? (
                <tr className="bg-[#f3d98b] text-black font-bold text-center whitespace-nowrap">
                  <th className="border border-black px-1.5 py-2.5 w-8">ល.រ</th>
                  <th className="border border-black px-1.5 py-2.5 w-[76px]">(ID)</th>
                  <th className="border border-black px-2.5 py-2.5 text-left">គោត្តនាម និងនាម</th>
                  <th className="border border-black px-1.5 py-2.5 w-11">ភេទ</th>
                  <th className="border border-black px-1.5 py-2.5 w-24">ថ្ងៃខែឆ្នាំកំណើត</th>
                  <th className="border border-black px-2 py-2.5">ជំនាញ</th>
                  <th className="border border-black px-1.5 py-2.5 w-[72px]">ជំនាន់</th>
                  <th className="border border-black px-2 py-2.5">កម្រិត/ឆ្នាំបញ្ចប់</th>
                  <th className="border border-black px-2 py-2.5">អាសយដ្ឋាន</th>
                  <th className="border border-black px-1.5 py-2.5 w-14">ជនជាតិ</th>
                  <th className="border border-black px-2 py-2.5">មុខរបរបច្ចុប្បន្ន</th>
                  <th className="border border-black px-2 py-2.5 w-28">លេខទូរស័ព្ទ</th>
                  <th className="border border-black px-2 py-2.5 w-24">ផ្សេងៗ</th>
                </tr>
              ) : (
                <tr className="bg-[#f3d98b] text-black font-bold text-center whitespace-nowrap">
                  <th className="border border-black px-1.5 py-2.5 w-8">Nº</th>
                  <th className="border border-black px-1.5 py-2.5 w-[76px]">ID</th>
                  <th className="border border-black px-2.5 py-2.5 text-left">Name</th>
                  <th className="border border-black px-1.5 py-2.5 w-12">Gender</th>
                  <th className="border border-black px-1.5 py-2.5 w-24">Date of Birth</th>
                  <th className="border border-black px-2 py-2.5">Major</th>
                  <th className="border border-black px-1.5 py-2.5 w-[72px]">Gen</th>
                  <th className="border border-black px-2 py-2.5">Graduated Year</th>
                  <th className="border border-black px-2 py-2.5">Address</th>
                  <th className="border border-black px-1.5 py-2.5 w-16">Ethnicity</th>
                  <th className="border border-black px-2 py-2.5">Current Job</th>
                  <th className="border border-black px-2 py-2.5 w-28">Contact Number</th>
                  <th className="border border-black px-2 py-2.5 w-24">Others</th>
                </tr>
              )}
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={13} className="border border-black py-8 text-center text-slate-500">
                    កំពុងទាញទិន្នន័យ...
                  </td>
                </tr>
              ) : filteredStudents.length > 0 ? (
                filteredStudents.map((student, index) => (
                  <tr
                    key={student.id}
                    className="group hover:bg-amber-50/70 text-center align-middle transition-colors whitespace-nowrap"
                  >
                    <td className="border border-black px-1.5 py-2 font-medium">{index + 1}</td>
                    <td className="border border-black px-1.5 py-2 font-bold text-blue-900 text-[11px]">
                      {student.student_code}
                    </td>
                    <td className="border border-black px-2.5 py-2 text-left font-semibold">
                      {docLang === 'km' ? student.full_name_km : student.full_name_en}
                    </td>
                    <td className="border border-black px-1.5 py-2">
                      {docLang === 'km' ? student.gender_km : student.gender_en}
                    </td>
                    <td className="border border-black px-1.5 py-2 text-[11px]">
                      {student.dob}
                    </td>
                    <td className="border border-black px-2 py-2">
                      {docLang === 'km' ? student.major_km : student.major_en}
                    </td>
                    <td className="border border-black px-1.5 py-2 text-[11px]">
                      {docLang === 'km' ? student.generation_km : student.generation_en}
                    </td>
                    <td className="border border-black px-2 py-2">
                      {docLang === 'km' ? student.graduated_year_km : student.graduated_year_en}
                    </td>
                    <td className="border border-black px-2 py-2">
                      {docLang === 'km' ? student.address_km : student.address_en}
                    </td>
                    <td className="border border-black px-1.5 py-2">
                      {docLang === 'km' ? student.ethnicity_km : student.ethnicity_en}
                    </td>
                    <td className="border border-black px-2 py-2">
                      {docLang === 'km' ? student.current_job_km : student.current_job_en}
                    </td>
                    <td className="border border-black px-2 py-2 text-[11px]">
                      {student.contact_number}
                    </td>
                    <td className="border border-black px-2 py-2 relative">
                      <span>{docLang === 'km' ? student.others_km : student.others_en}</span>
                      <div className="hidden group-hover:flex items-center justify-center gap-1.5 absolute inset-0 bg-white/95">
                        <button
                          type="button"
                          onClick={() => openEditModal(student)}
                          className="bg-blue-600 text-white p-1.5 rounded hover:bg-blue-700 shadow"
                          title="Edit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteStudent(
                              student.id,
                              docLang === 'km' ? student.full_name_km : student.full_name_en
                            )
                          }
                          className="bg-red-600 text-white p-1.5 rounded hover:bg-red-700 shadow"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={13} className="border border-black py-8 text-center text-slate-500">
                    មិនមានទិន្នន័យនិស្សិតត្រូវនឹងការស្វែងរកទេ
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="mt-4 pt-2 text-[11px] text-[#1e1b4b] space-y-1">
            <p className="font-semibold">
              {docLang === 'km' ? docSettings.address_line1_km : docSettings.address_line1_en}
            </p>
            <p className="font-medium">{docSettings.address_line2}</p>
          </div>
        </div>
      </div>

      {showStudentModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#1e293b] border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3 mb-4">
              <div>
                <h3 className="text-lg font-bold">
                  {editingId ? 'កែប្រែព័ត៌មាននិស្សិត (Edit Student)' : 'បន្ថែមនិស្សិតថ្មី (Add New Student)'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  អ្នកអាចបំពេញទាំងភាសាខ្មែរ និងអង់គ្លេស (បើបំពេញតែម្ខាង ប្រព័ន្ធនឹងចម្លងដាក់ម្ខាងទៀតឱ្យស្វ័យប្រវត្តិ)
                </p>
              </div>
              <button onClick={() => setShowStudentModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-amber-400 font-semibold block mb-1">អត្តលេខ (Student ID) *</label>
                  <Input
                    value={formData.student_code}
                    onChange={(e) => setFormData({ ...formData, student_code: e.target.value })}
                    placeholder="BIPA-013"
                    required
                    className="bg-[#0f172a] border-slate-700 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 block mb-1">ភេទ (Gender)</label>
                  <select
                    value={formData.gender_km}
                    onChange={(e) => {
                      const isFemale = e.target.value === 'ស្រី';
                      setFormData({
                        ...formData,
                        gender_km: isFemale ? 'ស្រី' : 'ប្រុស',
                        gender_en: isFemale ? 'F' : 'M',
                      });
                    }}
                    className="w-full h-10 rounded-md border border-slate-700 bg-[#0f172a] text-white px-3"
                  >
                    <option value="ប្រុស">ប្រុស (M)</option>
                    <option value="ស្រី">ស្រី (F)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 block mb-1">ថ្ងៃខែឆ្នាំកំណើត (DOB)</label>
                  <Input
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    placeholder="14-03-2001"
                    className="bg-[#0f172a] border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="text-xs text-blue-400 font-semibold block mb-1">គោត្តនាម និងនាម (ខ្មែរ) *</label>
                  <Input
                    value={formData.full_name_km}
                    onChange={(e) => setFormData({ ...formData, full_name_km: e.target.value })}
                    placeholder="ឧ. ឃូវ ជ្វា"
                    className="bg-[#0f172a] border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-emerald-400 font-semibold block mb-1">Full Name (English) *</label>
                  <Input
                    value={formData.full_name_en}
                    onChange={(e) => setFormData({ ...formData, full_name_en: e.target.value })}
                    placeholder="e.g. Khouv Chvea"
                    className="bg-[#0f172a] border-slate-700 text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-blue-400 block mb-1">ជំនាញ (ខ្មែរ)</label>
                  <Input
                    value={formData.major_km}
                    onChange={(e) => setFormData({ ...formData, major_km: e.target.value })}
                    placeholder="ឧ. ព័ត៌មានវិទ្យា"
                    className="bg-[#0f172a] border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-emerald-400 block mb-1">Major (English)</label>
                  <Input
                    value={formData.major_en}
                    onChange={(e) => setFormData({ ...formData, major_en: e.target.value })}
                    placeholder="e.g. IT / Computer Science"
                    className="bg-[#0f172a] border-slate-700 text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-blue-400 block mb-1">ជំនាន់ (ខ្មែរ)</label>
                  <Input
                    value={formData.generation_km}
                    onChange={(e) => setFormData({ ...formData, generation_km: e.target.value })}
                    placeholder="ឧ. ជំនាន់ទី ១"
                    className="bg-[#0f172a] border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-emerald-400 block mb-1">Generation (English)</label>
                  <Input
                    value={formData.generation_en}
                    onChange={(e) => setFormData({ ...formData, generation_en: e.target.value })}
                    placeholder="e.g. Gen 1"
                    className="bg-[#0f172a] border-slate-700 text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-blue-400 block mb-1">កម្រិត/ឆ្នាំបញ្ចប់ (ខ្មែរ)</label>
                  <Input
                    value={formData.graduated_year_km}
                    onChange={(e) => setFormData({ ...formData, graduated_year_km: e.target.value })}
                    placeholder="ឧ. បរិញ្ញាបត្រ"
                    className="bg-[#0f172a] border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-emerald-400 block mb-1">Graduated Year / Degree (English)</label>
                  <Input
                    value={formData.graduated_year_en}
                    onChange={(e) => setFormData({ ...formData, graduated_year_en: e.target.value })}
                    placeholder="e.g. Bachelor degree"
                    className="bg-[#0f172a] border-slate-700 text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-blue-400 block mb-1">អាសយដ្ឋាន (ខ្មែរ)</label>
                  <Input
                    value={formData.address_km}
                    onChange={(e) => setFormData({ ...formData, address_km: e.target.value })}
                    placeholder="ឧ. ប៊ូស្រា"
                    className="bg-[#0f172a] border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-emerald-400 block mb-1">Address (English)</label>
                  <Input
                    value={formData.address_en}
                    onChange={(e) => setFormData({ ...formData, address_en: e.target.value })}
                    placeholder="e.g. Bousra"
                    className="bg-[#0f172a] border-slate-700 text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-blue-400 block mb-1">ជនជាតិ (ខ្មែរ)</label>
                  <Input
                    value={formData.ethnicity_km}
                    onChange={(e) => setFormData({ ...formData, ethnicity_km: e.target.value })}
                    placeholder="ឧ. ព្នង"
                    className="bg-[#0f172a] border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-emerald-400 block mb-1">Ethnicity (English)</label>
                  <Input
                    value={formData.ethnicity_en}
                    onChange={(e) => setFormData({ ...formData, ethnicity_en: e.target.value })}
                    placeholder="e.g. Bunong"
                    className="bg-[#0f172a] border-slate-700 text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-blue-400 block mb-1">មុខរបរបច្ចុប្បន្ន (ខ្មែរ)</label>
                  <Input
                    value={formData.current_job_km}
                    onChange={(e) => setFormData({ ...formData, current_job_km: e.target.value })}
                    placeholder="ឧ. និស្សិត / បុគ្គលិកអង្គការ"
                    className="bg-[#0f172a] border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-emerald-400 block mb-1">Current Job (English)</label>
                  <Input
                    value={formData.current_job_en}
                    onChange={(e) => setFormData({ ...formData, current_job_en: e.target.value })}
                    placeholder="e.g. Student / Organization"
                    className="bg-[#0f172a] border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">លេខទូរស័ព្ទ (Contact Number)</label>
                  <Input
                    value={formData.contact_number}
                    onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                    placeholder="097 55 34 547"
                    className="bg-[#0f172a] border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-blue-400 block mb-1">ផ្សេងៗ (ខ្មែរ)</label>
                  <Input
                    value={formData.others_km}
                    onChange={(e) => setFormData({ ...formData, others_km: e.target.value })}
                    placeholder="កំណត់សម្គាល់..."
                    className="bg-[#0f172a] border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-emerald-400 block mb-1">Others (English)</label>
                  <Input
                    value={formData.others_en}
                    onChange={(e) => setFormData({ ...formData, others_en: e.target.value })}
                    placeholder="Notes..."
                    className="bg-[#0f172a] border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-700">
                <Button type="button" variant="ghost" onClick={() => setShowStudentModal(false)}>
                  បោះបង់ (Cancel)
                </Button>
                <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                  <Save className="h-4 w-4 mr-1.5" />
                  {saving ? 'កំពុងរក្សាទុក...' : 'រក្សាទុកទិន្នន័យ (Save)'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#1e293b] border border-slate-700 rounded-2xl max-w-xl w-full p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3 mb-4">
              <h3 className="text-lg font-bold">កំណត់ Logo និងអាសយដ្ឋានលើក្រដាសបញ្ជី</h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-sm">
              <div>
                <label className="text-xs text-slate-300 block mb-1">តំណភ្ជាប់រូបភាព Logo (Image Link)</label>
                <Input
                  value={settingsForm.logo_url}
                  onChange={(e) => setSettingsForm({ ...settingsForm, logo_url: e.target.value })}
                  placeholder="https://..."
                  className="bg-[#0f172a] border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">ឈ្មោះសមាគម (ភាសាខ្មែរ)</label>
                <Input
                  value={settingsForm.org_name_km}
                  onChange={(e) => setSettingsForm({ ...settingsForm, org_name_km: e.target.value })}
                  className="bg-[#0f172a] border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">ឈ្មោះសមាគម (ភាសាអង់គ្លេស)</label>
                <Input
                  value={settingsForm.org_name_en}
                  onChange={(e) => setSettingsForm({ ...settingsForm, org_name_en: e.target.value })}
                  className="bg-[#0f172a] border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">អាសយដ្ឋានជួរទី ១ (ភាសាខ្មែរ)</label>
                <Input
                  value={settingsForm.address_line1_km}
                  onChange={(e) => setSettingsForm({ ...settingsForm, address_line1_km: e.target.value })}
                  className="bg-[#0f172a] border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">អាសយដ្ឋានជួរទី ១ (English)</label>
                <Input
                  value={settingsForm.address_line1_en}
                  onChange={(e) => setSettingsForm({ ...settingsForm, address_line1_en: e.target.value })}
                  className="bg-[#0f172a] border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">អាសយដ្ឋានជួរទី ២ (Email, Website, Facebook)</label>
                <Input
                  value={settingsForm.address_line2}
                  onChange={(e) => setSettingsForm({ ...settingsForm, address_line2: e.target.value })}
                  className="bg-[#0f172a] border-slate-700 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-700">
                <Button type="button" variant="ghost" onClick={() => setShowSettingsModal(false)}>
                  បោះបង់
                </Button>
                <Button type="submit" disabled={saving} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">
                  <Save className="h-4 w-4 mr-1.5" />
                  {saving ? 'កំពុងរក្សាទុក...' : 'រក្សាទុកការកំណត់'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}