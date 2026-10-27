import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/contexts/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  DoorOpen,
  BedDouble,
  Users,
  Monitor,
  CheckCircle2,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Package,
  Layers,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ResidenceEquipmentItem {
  id: string;
  nameKm: string;
  nameEn: string;
  categoryKm: string;
  categoryEn: string;
  total: number;
  inUse: number;
  available: number;
  status: 'good' | 'maintenance';
}

export interface ResidenceRoomItem {
  id: string;
  roomNameKm: string;
  roomNameEn: string;
  floorKm: string;
  floorEn: string;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  noteKm: string;
  noteEn: string;
}

export interface ResidenceBuildingData {
  id: string;
  type: 'male' | 'female';
  nameKm: string;
  nameEn: string;
  descKm: string;
  descEn: string;
  genderLabelKm: string;
  genderLabelEn: string;
  studentCount: number;
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  studyComputers: number;
  computersInUse: number;
  computersAvailable: number;
  equipment: ResidenceEquipmentItem[];
  rooms: ResidenceRoomItem[];
}

export const RESIDENCE_STORAGE_KEY = 'bipa_residences_data_v2';

export const defaultResidencesData: ResidenceBuildingData[] = [
  {
    id: 'res-male',
    type: 'male',
    nameKm: 'អន្តេវាសិកដ្ឋានប្រុស',
    nameEn: 'Male Student Residence',
    descKm: 'មណ្ឌលស្នាក់នៅ និងសិក្សាសម្រាប់និស្សិតប្រុស',
    descEn: 'Residence for male students',
    genderLabelKm: 'ប្រុស',
    genderLabelEn: 'Male',
    studentCount: 14,
    totalRooms: 6,
    occupiedRooms: 4,
    availableRooms: 2,
    totalBeds: 20,
    occupiedBeds: 14,
    availableBeds: 6,
    studyComputers: 10,
    computersInUse: 7,
    computersAvailable: 3,
    equipment: [
      {
        id: 'eq-m-1',
        nameKm: 'កុំព្យូទ័ររៀន (Study Computers)',
        nameEn: 'Study Computers',
        categoryKm: 'បច្ចេកវិទ្យា & សិក្សា',
        categoryEn: 'IT & Study',
        total: 10,
        inUse: 7,
        available: 3,
        status: 'good'
      },
      {
        id: 'eq-m-2',
        nameKm: 'គ្រែគេងនិស្សិត (Student Beds)',
        nameEn: 'Student Bunk Beds',
        categoryKm: 'បន្ទប់គេង',
        categoryEn: 'Dormitory',
        total: 20,
        inUse: 14,
        available: 6,
        status: 'good'
      },
      {
        id: 'eq-m-3',
        nameKm: 'តុ និងកៅអីសិក្សា (Study Desks)',
        nameEn: 'Study Desks & Chairs',
        categoryKm: 'សម្ភារៈសិក្សា',
        categoryEn: 'Study Furniture',
        total: 16,
        inUse: 14,
        available: 2,
        status: 'good'
      },
      {
        id: 'eq-m-4',
        nameKm: 'ទូដាក់សម្លៀកបំពាក់ & សៀវភៅ',
        nameEn: 'Lockers & Bookshelves',
        categoryKm: 'សម្ភារៈបន្ទប់',
        categoryEn: 'Room Storage',
        total: 18,
        inUse: 14,
        available: 4,
        status: 'good'
      },
      {
        id: 'eq-m-5',
        nameKm: 'ប្រព័ន្ធអ៊ីនធឺណិត Wi-Fi',
        nameEn: 'High-Speed Wi-Fi Routers',
        categoryKm: 'បណ្តាញអ៊ីនធឺណិត',
        categoryEn: 'Network',
        total: 3,
        inUse: 3,
        available: 0,
        status: 'good'
      },
      {
        id: 'eq-m-6',
        nameKm: 'ផ្ទះបាយ និងសម្ភារៈចម្អិនអាហារ',
        nameEn: 'Kitchen & Cooking Sets',
        categoryKm: 'រួមមណ្ឌល',
        categoryEn: 'Common Area',
        total: 2,
        inUse: 2,
        available: 0,
        status: 'good'
      }
    ],
    rooms: [
      {
        id: 'rm-m-1',
        roomNameKm: 'បន្ទប់ M-101',
        roomNameEn: 'Room M-101',
        floorKm: 'ជាន់ទី ១',
        floorEn: 'Floor 1',
        totalBeds: 4,
        occupiedBeds: 4,
        availableBeds: 0,
        noteKm: 'ពេញហើយ',
        noteEn: 'Full'
      },
      {
        id: 'rm-m-2',
        roomNameKm: 'បន្ទប់ M-102',
        roomNameEn: 'Room M-102',
        floorKm: 'ជាន់ទី ១',
        floorEn: 'Floor 1',
        totalBeds: 4,
        occupiedBeds: 4,
        availableBeds: 0,
        noteKm: 'ពេញហើយ',
        noteEn: 'Full'
      },
      {
        id: 'rm-m-3',
        roomNameKm: 'បន្ទប់ M-201',
        roomNameEn: 'Room M-201',
        floorKm: 'ជាន់ទី ២',
        floorEn: 'Floor 2',
        totalBeds: 4,
        occupiedBeds: 3,
        availableBeds: 1,
        noteKm: 'នៅសល់ ១ គ្រែ',
        noteEn: '1 Bed Available'
      },
      {
        id: 'rm-m-4',
        roomNameKm: 'បន្ទប់ M-202',
        roomNameEn: 'Room M-202',
        floorKm: 'ជាន់ទី ២',
        floorEn: 'Floor 2',
        totalBeds: 4,
        occupiedBeds: 3,
        availableBeds: 1,
        noteKm: 'នៅសល់ ១ គ្រែ',
        noteEn: '1 Bed Available'
      },
      {
        id: 'rm-m-5',
        roomNameKm: 'បន្ទប់ M-301',
        roomNameEn: 'Room M-301',
        floorKm: 'ជាន់ទី ៣',
        floorEn: 'Floor 3',
        totalBeds: 2,
        occupiedBeds: 0,
        availableBeds: 2,
        noteKm: 'បន្ទប់ទំនេរ',
        noteEn: 'Available Room'
      },
      {
        id: 'rm-m-6',
        roomNameKm: 'បន្ទប់ M-302',
        roomNameEn: 'Room M-302',
        floorKm: 'ជាន់ទី ៣',
        floorEn: 'Floor 3',
        totalBeds: 2,
        occupiedBeds: 0,
        availableBeds: 2,
        noteKm: 'បន្ទប់ទំនេរ',
        noteEn: 'Available Room'
      }
    ]
  },
  {
    id: 'res-female',
    type: 'female',
    nameKm: 'អន្តេវាសិកដ្ឋានស្រី',
    nameEn: 'Female Student Residence',
    descKm: 'មណ្ឌលស្នាក់នៅ និងសិក្សាសម្រាប់និស្សិតស្រី',
    descEn: 'Residence for female students',
    genderLabelKm: 'ស្រី',
    genderLabelEn: 'Female',
    studentCount: 8,
    totalRooms: 4,
    occupiedRooms: 3,
    availableRooms: 1,
    totalBeds: 12,
    occupiedBeds: 8,
    availableBeds: 4,
    studyComputers: 6,
    computersInUse: 4,
    computersAvailable: 2,
    equipment: [
      {
        id: 'eq-f-1',
        nameKm: 'កុំព្យូទ័ររៀន (Study Computers)',
        nameEn: 'Study Computers',
        categoryKm: 'បច្ចេកវិទ្យា & សិក្សា',
        categoryEn: 'IT & Study',
        total: 6,
        inUse: 4,
        available: 2,
        status: 'good'
      },
      {
        id: 'eq-f-2',
        nameKm: 'គ្រែគេងនិស្សិត (Student Beds)',
        nameEn: 'Student Bunk Beds',
        categoryKm: 'បន្ទប់គេង',
        categoryEn: 'Dormitory',
        total: 12,
        inUse: 8,
        available: 4,
        status: 'good'
      },
      {
        id: 'eq-f-3',
        nameKm: 'តុ និងកៅអីសិក្សា (Study Desks)',
        nameEn: 'Study Desks & Chairs',
        categoryKm: 'សម្ភារៈសិក្សា',
        categoryEn: 'Study Furniture',
        total: 10,
        inUse: 8,
        available: 2,
        status: 'good'
      },
      {
        id: 'eq-f-4',
        nameKm: 'ទូដាក់សម្លៀកបំពាក់ & សៀវភៅ',
        nameEn: 'Lockers & Bookshelves',
        categoryKm: 'សម្ភារៈបន្ទប់',
        categoryEn: 'Room Storage',
        total: 12,
        inUse: 8,
        available: 4,
        status: 'good'
      },
      {
        id: 'eq-f-5',
        nameKm: 'ប្រព័ន្ធអ៊ីនធឺណិត Wi-Fi',
        nameEn: 'High-Speed Wi-Fi Routers',
        categoryKm: 'បណ្តាញអ៊ីនធឺណិត',
        categoryEn: 'Network',
        total: 2,
        inUse: 2,
        available: 0,
        status: 'good'
      },
      {
        id: 'eq-f-6',
        nameKm: 'ផ្ទះបាយ និងសម្ភារៈចម្អិនអាហារ',
        nameEn: 'Kitchen & Cooking Sets',
        categoryKm: 'រួមមណ្ឌល',
        categoryEn: 'Common Area',
        total: 2,
        inUse: 2,
        available: 0,
        status: 'good'
      }
    ],
    rooms: [
      {
        id: 'rm-f-1',
        roomNameKm: 'បន្ទប់ F-101',
        roomNameEn: 'Room F-101',
        floorKm: 'ជាន់ទី ១',
        floorEn: 'Floor 1',
        totalBeds: 4,
        occupiedBeds: 4,
        availableBeds: 0,
        noteKm: 'ពេញហើយ',
        noteEn: 'Full'
      },
      {
        id: 'rm-f-2',
        roomNameKm: 'បន្ទប់ F-102',
        roomNameEn: 'Room F-102',
        floorKm: 'ជាន់ទី ១',
        floorEn: 'Floor 1',
        totalBeds: 4,
        occupiedBeds: 2,
        availableBeds: 2,
        noteKm: 'នៅសល់ ២ គ្រែ',
        noteEn: '2 Beds Available'
      },
      {
        id: 'rm-f-3',
        roomNameKm: 'បន្ទប់ F-201',
        roomNameEn: 'Room F-201',
        floorKm: 'ជាន់ទី ២',
        floorEn: 'Floor 2',
        totalBeds: 2,
        occupiedBeds: 2,
        availableBeds: 0,
        noteKm: 'ពេញហើយ',
        noteEn: 'Full'
      },
      {
        id: 'rm-f-4',
        roomNameKm: 'បន្ទប់ F-202',
        roomNameEn: 'Room F-202',
        floorKm: 'ជាន់ទី ២',
        floorEn: 'Floor 2',
        totalBeds: 2,
        occupiedBeds: 0,
        availableBeds: 2,
        noteKm: 'បន្ទប់ទំនេរ',
        noteEn: 'Available Room'
      }
    ]
  }
];

export function loadCachedResidences(): ResidenceBuildingData[] {
  try {
    const raw = localStorage.getItem(RESIDENCE_STORAGE_KEY);
    if (!raw) return defaultResidencesData;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return defaultResidencesData;
  } catch {
    return defaultResidencesData;
  }
}

export async function fetchResidencesFromDb(): Promise<ResidenceBuildingData[]> {
  let list = loadCachedResidences();

  try {
    const { data, error } = await supabase
      .from('bipa_residences_data')
      .select('residences')
      .eq('id', '1')
      .maybeSingle();

    if (!error && data && Array.isArray(data.residences) && data.residences.length > 0) {
      list = data.residences;
      localStorage.setItem(RESIDENCE_STORAGE_KEY, JSON.stringify(list));
    } else if (!error && !data) {
      await supabase.from('bipa_residences_data').upsert({
        id: '1',
        residences: list,
        updated_at: new Date().toISOString()
      });
    }
  } catch {}

  return list;
}

export async function saveResidencesToDb(list: ResidenceBuildingData[]): Promise<void> {
  localStorage.setItem(RESIDENCE_STORAGE_KEY, JSON.stringify(list));
  try {
    await supabase.from('bipa_residences_data').upsert({
      id: '1',
      residences: list,
      updated_at: new Date().toISOString()
    });
  } catch {}
  window.dispatchEvent(new Event('residence-data-updated'));
}

export function ResidenceManagerPanel({ onClose }: { onClose?: () => void }) {
  const { lang } = useI18n();
  const isKhmer = lang === 'km';

  const [residences, setResidences] = useState<ResidenceBuildingData[]>(() =>
    loadCachedResidences()
  );
  const [selectedResId, setSelectedResId] = useState<string>('res-male');
  const [subTab, setSubTab] = useState<'stats' | 'equipment' | 'rooms'>('stats');
  const [saving, setSaving] = useState(false);

  const [editingEqId, setEditingEqId] = useState<string | null>(null);
  const [eqNameKm, setEqNameKm] = useState('');
  const [eqNameEn, setEqNameEn] = useState('');
  const [eqCatKm, setEqCatKm] = useState('');
  const [eqCatEn, setEqCatEn] = useState('');
  const [eqTotal, setEqTotal] = useState('1');
  const [eqInUse, setEqInUse] = useState('0');
  const [eqStatus, setEqStatus] = useState<'good' | 'maintenance'>('good');

  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [rmNameKm, setRmNameKm] = useState('');
  const [rmNameEn, setRmNameEn] = useState('');
  const [rmFloorKm, setRmFloorKm] = useState('ជាន់ទី ១');
  const [rmFloorEn, setRmFloorEn] = useState('Floor 1');
  const [rmTotalBeds, setRmTotalBeds] = useState('4');
  const [rmOccupiedBeds, setRmOccupiedBeds] = useState('0');
  const [rmNoteKm, setRmNoteKm] = useState('');
  const [rmNoteEn, setRmNoteEn] = useState('');

  useEffect(() => {
    fetchResidencesFromDb().then((data) => {
      setResidences(data);
      if (data.length > 0 && !data.some((r) => r.id === selectedResId)) {
        setSelectedResId(data[0].id);
      }
    });
  }, []);

  const currentRes = residences.find((r) => r.id === selectedResId) || residences[0];

  const updateCurrentResidence = (patch: Partial<ResidenceBuildingData>) => {
    setResidences((prev) =>
      prev.map((r) => (r.id === currentRes.id ? { ...r, ...patch } : r))
    );
  };

  const resetEquipmentForm = () => {
    setEditingEqId(null);
    setEqNameKm('');
    setEqNameEn('');
    setEqCatKm('');
    setEqCatEn('');
    setEqTotal('1');
    setEqInUse('0');
    setEqStatus('good');
  };

  const handleStartEditEquipment = (item: ResidenceEquipmentItem) => {
    setEditingEqId(item.id);
    setEqNameKm(item.nameKm);
    setEqNameEn(item.nameEn);
    setEqCatKm(item.categoryKm);
    setEqCatEn(item.categoryEn);
    setEqTotal(String(item.total));
    setEqInUse(String(item.inUse));
    setEqStatus(item.status);
  };

  const handleSaveEquipmentItem = () => {
    if (!eqNameKm.trim() || !currentRes) return;
    const totalNum = Math.max(0, Number(eqTotal) || 0);
    const inUseNum = Math.min(totalNum, Math.max(0, Number(eqInUse) || 0));
    const availNum = Math.max(0, totalNum - inUseNum);

    const newItem: ResidenceEquipmentItem = {
      id: editingEqId || `eq-${Date.now()}`,
      nameKm: eqNameKm.trim(),
      nameEn: eqNameEn.trim() || eqNameKm.trim(),
      categoryKm: eqCatKm.trim() || 'សម្ភារៈមណ្ឌល',
      categoryEn: eqCatEn.trim() || eqCatKm.trim() || 'Facility',
      total: totalNum,
      inUse: inUseNum,
      available: availNum,
      status: eqStatus
    };

    const nextEq = editingEqId
      ? currentRes.equipment.map((e) => (e.id === editingEqId ? newItem : e))
      : [...currentRes.equipment, newItem];

    updateCurrentResidence({ equipment: nextEq });
    resetEquipmentForm();
  };

  const handleDeleteEquipment = (id: string) => {
    if (!currentRes) return;
    updateCurrentResidence({
      equipment: currentRes.equipment.filter((e) => e.id !== id)
    });
    if (editingEqId === id) resetEquipmentForm();
  };

  const resetRoomForm = () => {
    setEditingRoomId(null);
    setRmNameKm('');
    setRmNameEn('');
    setRmFloorKm('ជាន់ទី ១');
    setRmFloorEn('Floor 1');
    setRmTotalBeds('4');
    setRmOccupiedBeds('0');
    setRmNoteKm('');
    setRmNoteEn('');
  };

  const handleStartEditRoom = (rm: ResidenceRoomItem) => {
    setEditingRoomId(rm.id);
    setRmNameKm(rm.roomNameKm);
    setRmNameEn(rm.roomNameEn);
    setRmFloorKm(rm.floorKm);
    setRmFloorEn(rm.floorEn);
    setRmTotalBeds(String(rm.totalBeds));
    setRmOccupiedBeds(String(rm.occupiedBeds));
    setRmNoteKm(rm.noteKm);
    setRmNoteEn(rm.noteEn);
  };

  const handleSaveRoomItem = () => {
    if (!rmNameKm.trim() || !currentRes) return;
    const tBeds = Math.max(1, Number(rmTotalBeds) || 1);
    const oBeds = Math.min(tBeds, Math.max(0, Number(rmOccupiedBeds) || 0));
    const aBeds = Math.max(0, tBeds - oBeds);

    const defaultNoteKm =
      oBeds === 0 ? 'បន្ទប់ទំនេរ' : aBeds === 0 ? 'ពេញហើយ' : `នៅសល់ ${aBeds} គ្រែ`;
    const defaultNoteEn =
      oBeds === 0 ? 'Available Room' : aBeds === 0 ? 'Full' : `${aBeds} Beds Available`;

    const newRoom: ResidenceRoomItem = {
      id: editingRoomId || `rm-${Date.now()}`,
      roomNameKm: rmNameKm.trim(),
      roomNameEn: rmNameEn.trim() || rmNameKm.trim(),
      floorKm: rmFloorKm.trim() || 'ជាន់ទី ១',
      floorEn: rmFloorEn.trim() || 'Floor 1',
      totalBeds: tBeds,
      occupiedBeds: oBeds,
      availableBeds: aBeds,
      noteKm: rmNoteKm.trim() || defaultNoteKm,
      noteEn: rmNoteEn.trim() || defaultNoteEn
    };

    const nextRooms = editingRoomId
      ? currentRes.rooms.map((r) => (r.id === editingRoomId ? newRoom : r))
      : [...currentRes.rooms, newRoom];

    const totalR = nextRooms.length;
    const availR = nextRooms.filter((r) => r.occupiedBeds === 0).length;
    const occR = totalR - availR;
    const sumTotalBeds = nextRooms.reduce((acc, r) => acc + r.totalBeds, 0);
    const sumOccBeds = nextRooms.reduce((acc, r) => acc + r.occupiedBeds, 0);
    const sumAvailBeds = Math.max(0, sumTotalBeds - sumOccBeds);

    updateCurrentResidence({
      rooms: nextRooms,
      totalRooms: totalR,
      availableRooms: availR,
      occupiedRooms: occR,
      totalBeds: sumTotalBeds,
      occupiedBeds: sumOccBeds,
      availableBeds: sumAvailBeds
    });
    resetRoomForm();
  };

  const handleDeleteRoom = (id: string) => {
    if (!currentRes) return;
    const nextRooms = currentRes.rooms.filter((r) => r.id !== id);
    const totalR = nextRooms.length;
    const availR = nextRooms.filter((r) => r.occupiedBeds === 0).length;
    const occR = totalR - availR;
    const sumTotalBeds = nextRooms.reduce((acc, r) => acc + r.totalBeds, 0);
    const sumOccBeds = nextRooms.reduce((acc, r) => acc + r.occupiedBeds, 0);
    const sumAvailBeds = Math.max(0, sumTotalBeds - sumOccBeds);

    updateCurrentResidence({
      rooms: nextRooms,
      totalRooms: totalR,
      availableRooms: availR,
      occupiedRooms: occR,
      totalBeds: sumTotalBeds,
      occupiedBeds: sumOccBeds,
      availableBeds: sumAvailBeds
    });
    if (editingRoomId === id) resetRoomForm();
  };

  const handleSaveAllToDatabase = async () => {
    setSaving(true);
    await saveResidencesToDb(residences);
    setSaving(false);
    if (onClose) {
      onClose();
    } else {
      alert(isKhmer ? 'បានរក្សាទុកទិន្នន័យមណ្ឌលដោយជោគជ័យ!' : 'Residence data saved successfully!');
    }
  };

  if (!currentRes) return null;

  return (
    <div className="space-y-6 font-khmer">
      <div className="bg-white dark:bg-[#162033] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <Badge className="bg-[#eab308] text-slate-950 font-extrabold px-2.5 py-0.5 mb-2">
            RESIDENCE & FACILITIES CMS
          </Badge>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {isKhmer ? 'សេវាកម្មមណ្ឌល (គ្រប់គ្រងទិន្នន័យមណ្ឌលទាំងអស់)' : 'Manage Residences & Facilities'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {isKhmer
              ? 'ជ្រើសរើសមណ្ឌលប្រុស ឬមណ្ឌលស្រី ដើម្បីកែប្រែឈ្មោះ ចំនួននិស្សិត បន្ទប់ទំនេរ គ្រែរវល់ កុំព្យូទ័ររៀន និងសម្ភារៈមណ្ឌល។'
              : 'Select Male or Female Residence to edit names, students, rooms, beds, study computers, and equipment.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onClose && (
            <Button
              variant="outline"
              onClick={onClose}
              className="rounded-xl text-xs font-bold h-10"
            >
              <X className="h-4 w-4 mr-1.5" />
              {isKhmer ? 'បិទ' : 'Close'}
            </Button>
          )}
          <Button
            disabled={saving}
            onClick={handleSaveAllToDatabase}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm h-10 sm:h-11 px-6 rounded-xl shadow-md"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving
              ? isKhmer
                ? 'កំពុងរក្សាទុក...'
                : 'Saving...'
              : isKhmer
              ? 'រក្សាទុកទិន្នន័យទាំងអស់'
              : 'Save All Changes'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {residences.map((res) => {
          const isSelected = res.id === currentRes.id;
          const isMale = res.type === 'male';
          return (
            <button
              key={res.id}
              type="button"
              onClick={() => {
                setSelectedResId(res.id);
                resetEquipmentForm();
                resetRoomForm();
              }}
              className={cn(
                'p-4 sm:p-5 rounded-2xl border text-left transition-all flex items-center justify-between gap-4',
                isSelected
                  ? isMale
                    ? 'bg-blue-600/15 border-blue-500 shadow-lg shadow-blue-500/10'
                    : 'bg-pink-600/15 border-pink-500 shadow-lg shadow-pink-500/10'
                  : 'bg-white dark:bg-[#162033] border-slate-200 dark:border-slate-800 hover:border-slate-400'
              )}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={cn(
                    'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border',
                    isMale
                      ? 'bg-blue-500/15 border-blue-500/30 text-blue-500'
                      : 'bg-pink-500/15 border-pink-500/30 text-pink-500'
                  )}
                >
                  <Building2 className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                      {isKhmer ? res.nameKm : res.nameEn}
                    </h3>
                    {isSelected && (
                      <Badge className="bg-amber-500 text-slate-950 text-[10px] font-extrabold px-2 py-0">
                        កំពុងកែប្រែ
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {res.studentCount} នាក់ • {res.totalRooms} បន្ទប់ ({res.availableRooms} ទំនេរ) •{' '}
                    {res.totalBeds} គ្រែ ({res.occupiedBeds} រវល់) • កុំព្យូទ័រ {res.studyComputers}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 bg-white dark:bg-[#162033] p-2 rounded-2xl border border-slate-200 dark:border-slate-800 w-fit">
        <Button
          size="sm"
          onClick={() => setSubTab('stats')}
          className={cn(
            'rounded-xl text-xs font-bold h-9 px-4',
            subTab === 'stats'
              ? 'bg-blue-600 text-white'
              : 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          )}
        >
          ១. ព័ត៌មាន & តួលេខ ({isKhmer ? currentRes.nameKm : currentRes.nameEn})
        </Button>
        <Button
          size="sm"
          onClick={() => setSubTab('equipment')}
          className={cn(
            'rounded-xl text-xs font-bold h-9 px-4',
            subTab === 'equipment'
              ? 'bg-blue-600 text-white'
              : 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          )}
        >
          ២. សម្ភារៈមណ្ឌល ({currentRes.equipment.length})
        </Button>
        <Button
          size="sm"
          onClick={() => setSubTab('rooms')}
          className={cn(
            'rounded-xl text-xs font-bold h-9 px-4',
            subTab === 'rooms'
              ? 'bg-blue-600 text-white'
              : 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          )}
        >
          ៣. បន្ទប់ & គ្រែគេង ({currentRes.rooms.length})
        </Button>
      </div>

      {subTab === 'stats' && (
        <Card className="bg-white dark:bg-[#162033] border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              កែប្រែព័ត៌មាន និងតួលេខរបស់ «{currentRes.nameKm}»
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  ឈ្មោះមណ្ឌល (ភាសាខ្មែរ)
                </label>
                <Input
                  value={currentRes.nameKm}
                  onChange={(e) => updateCurrentResidence({ nameKm: e.target.value })}
                  className="text-xs h-10 bg-slate-50 dark:bg-[#0f172a]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Residence Name (English)
                </label>
                <Input
                  value={currentRes.nameEn}
                  onChange={(e) => updateCurrentResidence({ nameEn: e.target.value })}
                  className="text-xs h-10 bg-slate-50 dark:bg-[#0f172a]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                    ភេទ (ខ្មែរ)
                  </label>
                  <Input
                    value={currentRes.genderLabelKm}
                    onChange={(e) => updateCurrentResidence({ genderLabelKm: e.target.value })}
                    className="text-xs h-10 bg-slate-50 dark:bg-[#0f172a]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                    Gender (EN)
                  </label>
                  <Input
                    value={currentRes.genderLabelEn}
                    onChange={(e) => updateCurrentResidence({ genderLabelEn: e.target.value })}
                    className="text-xs h-10 bg-slate-50 dark:bg-[#0f172a]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  ការពិពណ៌នា (ភាសាខ្មែរ)
                </label>
                <textarea
                  value={currentRes.descKm}
                  onChange={(e) => updateCurrentResidence({ descKm: e.target.value })}
                  className="w-full h-20 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0f172a] p-2.5 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Description (English)
                </label>
                <textarea
                  value={currentRes.descEn}
                  onChange={(e) => updateCurrentResidence({ descEn: e.target.value })}
                  className="w-full h-20 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0f172a] p-2.5 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
                <label className="text-[11px] font-bold text-blue-500 block mb-1">
                  ចំនួននិស្សិត ({currentRes.genderLabelKm})
                </label>
                <Input
                  type="number"
                  min={0}
                  value={currentRes.studentCount}
                  onChange={(e) =>
                    updateCurrentResidence({ studentCount: Math.max(0, Number(e.target.value)) })
                  }
                  className="text-sm font-black h-9"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
                <label className="text-[11px] font-bold text-indigo-500 block mb-1">
                  បន្ទប់សរុប (Total Rooms)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={currentRes.totalRooms}
                  onChange={(e) => {
                    const total = Math.max(0, Number(e.target.value));
                    const avail = Math.min(total, currentRes.availableRooms);
                    updateCurrentResidence({
                      totalRooms: total,
                      availableRooms: avail,
                      occupiedRooms: Math.max(0, total - avail)
                    });
                  }}
                  className="text-sm font-black h-9"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
                <label className="text-[11px] font-bold text-emerald-500 block mb-1">
                  បន្ទប់ទំនេរ (Available Rooms)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={currentRes.availableRooms}
                  onChange={(e) => {
                    const avail = Math.min(
                      currentRes.totalRooms,
                      Math.max(0, Number(e.target.value))
                    );
                    updateCurrentResidence({
                      availableRooms: avail,
                      occupiedRooms: Math.max(0, currentRes.totalRooms - avail)
                    });
                  }}
                  className="text-sm font-black h-9"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
                <label className="text-[11px] font-bold text-amber-500 block mb-1">
                  គ្រែគេងសរុប (Total Beds)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={currentRes.totalBeds}
                  onChange={(e) => {
                    const totalB = Math.max(0, Number(e.target.value));
                    const occB = Math.min(totalB, currentRes.occupiedBeds);
                    updateCurrentResidence({
                      totalBeds: totalB,
                      occupiedBeds: occB,
                      availableBeds: Math.max(0, totalB - occB)
                    });
                  }}
                  className="text-sm font-black h-9"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
                <label className="text-[11px] font-bold text-rose-500 block mb-1">
                  គ្រែរវល់ (Occupied Beds)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={currentRes.occupiedBeds}
                  onChange={(e) => {
                    const occB = Math.min(
                      currentRes.totalBeds,
                      Math.max(0, Number(e.target.value))
                    );
                    updateCurrentResidence({
                      occupiedBeds: occB,
                      availableBeds: Math.max(0, currentRes.totalBeds - occB)
                    });
                  }}
                  className="text-sm font-black h-9"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
                <label className="text-[11px] font-bold text-teal-500 block mb-1">
                  គ្រែទំនេរ (Available Beds)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={currentRes.availableBeds}
                  onChange={(e) => {
                    const availB = Math.min(
                      currentRes.totalBeds,
                      Math.max(0, Number(e.target.value))
                    );
                    updateCurrentResidence({
                      availableBeds: availB,
                      occupiedBeds: Math.max(0, currentRes.totalBeds - availB)
                    });
                  }}
                  className="text-sm font-black h-9"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
                <label className="text-[11px] font-bold text-cyan-500 block mb-1">
                  កុំព្យូទ័ររៀនសរុប (Computers)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={currentRes.studyComputers}
                  onChange={(e) => {
                    const totalC = Math.max(0, Number(e.target.value));
                    const usedC = Math.min(totalC, currentRes.computersInUse);
                    updateCurrentResidence({
                      studyComputers: totalC,
                      computersInUse: usedC,
                      computersAvailable: Math.max(0, totalC - usedC)
                    });
                  }}
                  className="text-sm font-black h-9"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
                <label className="text-[11px] font-bold text-purple-500 block mb-1">
                  កុំព្យូទ័រកំពុងប្រើ (In Use)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={currentRes.computersInUse}
                  onChange={(e) => {
                    const usedC = Math.min(
                      currentRes.studyComputers,
                      Math.max(0, Number(e.target.value))
                    );
                    updateCurrentResidence({
                      computersInUse: usedC,
                      computersAvailable: Math.max(0, currentRes.studyComputers - usedC)
                    });
                  }}
                  className="text-sm font-black h-9"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
                <label className="text-[11px] font-bold text-emerald-500 block mb-1">
                  កុំព្យូទ័រទំនេរ (Available PC)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={currentRes.computersAvailable}
                  onChange={(e) => {
                    const availC = Math.min(
                      currentRes.studyComputers,
                      Math.max(0, Number(e.target.value))
                    );
                    updateCurrentResidence({
                      computersAvailable: availC,
                      computersInUse: Math.max(0, currentRes.studyComputers - availC)
                    });
                  }}
                  className="text-sm font-black h-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {subTab === 'equipment' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <Card className="bg-white dark:bg-[#162033] border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm lg:col-span-5 h-fit">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-bold text-blue-500">
                {editingEqId
                  ? `កែប្រែសម្ភារៈក្នុង «${currentRes.nameKm}»`
                  : `បន្ថែមសម្ភារៈថ្មីក្នុង «${currentRes.nameKm}»`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <Input
                value={eqNameKm}
                onChange={(e) => setEqNameKm(e.target.value)}
                placeholder="ឈ្មោះសម្ភារៈ (ខ្មែរ) ឧ. កុំព្យូទ័ររៀន..."
                className="text-xs h-10"
              />
              <Input
                value={eqNameEn}
                onChange={(e) => setEqNameEn(e.target.value)}
                placeholder="Equipment Name (English)..."
                className="text-xs h-10"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={eqCatKm}
                  onChange={(e) => setEqCatKm(e.target.value)}
                  placeholder="ប្រភេទ (ខ្មែរ)..."
                  className="text-xs h-10"
                />
                <Input
                  value={eqCatEn}
                  onChange={(e) => setEqCatEn(e.target.value)}
                  placeholder="Category (EN)..."
                  className="text-xs h-10"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    ចំនួនសរុប (Total)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={eqTotal}
                    onChange={(e) => setEqTotal(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    កំពុងប្រើ / រវល់ (In Use)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={eqInUse}
                    onChange={(e) => setEqInUse(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEqStatus('good')}
                  className={cn(
                    'flex-1 py-2 rounded-xl text-xs font-bold border transition-all',
                    eqStatus === 'good'
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-500'
                      : 'border-slate-700 text-slate-400'
                  )}
                >
                  ដំណើរការល្អ
                </button>
                <button
                  type="button"
                  onClick={() => setEqStatus('maintenance')}
                  className={cn(
                    'flex-1 py-2 rounded-xl text-xs font-bold border transition-all',
                    eqStatus === 'maintenance'
                      ? 'bg-amber-500/15 border-amber-500 text-amber-500'
                      : 'border-slate-700 text-slate-400'
                  )}
                >
                  កំពុងជួសជុល
                </button>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                {editingEqId && (
                  <Button size="sm" variant="outline" onClick={resetEquipmentForm} className="text-xs">
                    បោះបង់
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleSaveEquipmentItem}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  {editingEqId ? 'រក្សាទុកការកែ' : 'បន្ថែមសម្ភារៈ'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#162033] border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm lg:col-span-7">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                បញ្ជីសម្ភារៈក្នុង «{currentRes.nameKm}» ({currentRes.equipment.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 max-h-[450px] overflow-y-auto space-y-2.5 scrollbar-thin">
              {currentRes.equipment.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                      {item.nameKm}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold mt-1">
                      <span className="text-slate-400">{item.categoryKm}</span>
                      <span className="text-blue-500">សរុប: {item.total}</span>
                      <span className="text-amber-500">កំពុងប្រើ: {item.inUse}</span>
                      <span className="text-emerald-500">ទំនេរ: {item.available}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEditEquipment(item)}
                      className="p-2 rounded-lg bg-blue-500/15 text-blue-500 hover:bg-blue-500/25"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteEquipment(item.id)}
                      className="p-2 rounded-lg bg-red-500/15 text-red-500 hover:bg-red-500/25"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {subTab === 'rooms' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <Card className="bg-white dark:bg-[#162033] border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm lg:col-span-5 h-fit">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-bold text-blue-500">
                {editingRoomId
                  ? `កែប្រែបន្ទប់ក្នុង «${currentRes.nameKm}»`
                  : `បន្ថែមបន្ទប់ថ្មីក្នុង «${currentRes.nameKm}»`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={rmNameKm}
                  onChange={(e) => setRmNameKm(e.target.value)}
                  placeholder="ឈ្មោះបន្ទប់ (ខ្មែរ)..."
                  className="text-xs h-10"
                />
                <Input
                  value={rmNameEn}
                  onChange={(e) => setRmNameEn(e.target.value)}
                  placeholder="Room Name (EN)..."
                  className="text-xs h-10"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={rmFloorKm}
                  onChange={(e) => setRmFloorKm(e.target.value)}
                  placeholder="ជាន់ទី (ខ្មែរ)..."
                  className="text-xs h-10"
                />
                <Input
                  value={rmFloorEn}
                  onChange={(e) => setRmFloorEn(e.target.value)}
                  placeholder="Floor (EN)..."
                  className="text-xs h-10"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    គ្រែសរុបក្នុងបន្ទប់
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={rmTotalBeds}
                    onChange={(e) => setRmTotalBeds(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    គ្រែរវល់ (មានអ្នកគេង)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={rmOccupiedBeds}
                    onChange={(e) => setRmOccupiedBeds(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={rmNoteKm}
                  onChange={(e) => setRmNoteKm(e.target.value)}
                  placeholder="សម្គាល់ (ខ្មែរ - Optional)..."
                  className="text-xs h-10"
                />
                <Input
                  value={rmNoteEn}
                  onChange={(e) => setRmNoteEn(e.target.value)}
                  placeholder="Note (EN - Optional)..."
                  className="text-xs h-10"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                {editingRoomId && (
                  <Button size="sm" variant="outline" onClick={resetRoomForm} className="text-xs">
                    បោះបង់
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleSaveRoomItem}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  {editingRoomId ? 'រក្សាទុកបន្ទប់' : 'បន្ថែមបន្ទប់'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#162033] border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm lg:col-span-7">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                បញ្ជីបន្ទប់ស្នាក់នៅក្នុង «{currentRes.nameKm}» ({currentRes.rooms.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 max-h-[450px] overflow-y-auto space-y-2.5 scrollbar-thin">
              {currentRes.rooms.map((rm) => (
                <div
                  key={rm.id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                        {rm.roomNameKm}
                      </p>
                      <Badge className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px]">
                        {rm.floorKm}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold mt-1">
                      <span className="text-blue-500">គ្រែសរុប: {rm.totalBeds}</span>
                      <span className="text-rose-500">គ្រែរវល់: {rm.occupiedBeds}</span>
                      <span className="text-emerald-500">គ្រែទំនេរ: {rm.availableBeds}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEditRoom(rm)}
                      className="p-2 rounded-lg bg-blue-500/15 text-blue-500 hover:bg-blue-500/25"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRoom(rm.id)}
                      className="p-2 rounded-lg bg-red-500/15 text-red-500 hover:bg-red-500/25"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export function ResidenceInfoPage() {
  const { lang } = useI18n();
  const isKhmer = lang === 'km';

  const [residences, setResidences] = useState<ResidenceBuildingData[]>(() =>
    loadCachedResidences()
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadData = async () => {
    const data = await fetchResidencesFromDb();
    setResidences(data);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('residence-data-updated', loadData);
    return () => window.removeEventListener('residence-data-updated', loadData);
  }, []);

  const activeResidence = selectedId
    ? residences.find((r) => r.id === selectedId) || null
    : null;

  return (
    <div className="min-h-screen bg-[#f4f6fb] dark:bg-[#0b1120] text-slate-900 dark:text-slate-100 pb-24 font-khmer">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <Building2 className="h-6 w-6 sm:h-7 sm:w-7 text-slate-800 dark:text-blue-400" />
              <h1 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {isKhmer ? 'ព័ត៌មានមណ្ឌល' : 'Residence Facilities'}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {isKhmer
                ? 'ចុចលើអន្តេវាសិកដ្ឋានប្រុស ឬអន្តេវាសិកដ្ឋានស្រី ដើម្បីមើលទិន្នន័យសម្ភារៈ បន្ទប់ និងគ្រែលម្អិត'
                : 'Information about our residence facilities'}
            </p>
          </div>

          {activeResidence && (
            <Button
              onClick={() => setSelectedId(null)}
              variant="outline"
              className="self-start sm:self-auto rounded-xl border-slate-300 dark:border-slate-700 font-bold text-xs sm:text-sm h-10 px-4"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              {isKhmer ? 'ត្រឡប់ទៅមណ្ឌលទាំងពីរវិញ' : 'Back to All Residences'}
            </Button>
          )}
        </div>

        {!activeResidence ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 animate-in fade-in duration-300">
            {residences.map((res) => {
              return (
                <div
                  key={res.id}
                  onClick={() => {
                    setSelectedId(res.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="group rounded-3xl overflow-hidden border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#162033] shadow-sm hover:shadow-xl hover:-translate-y-1 active:scale-[0.99] transition-all duration-300 cursor-pointer flex flex-col"
                >
                  <div className="relative h-40 sm:h-48 px-6 py-5 bg-gradient-to-b from-[#13203b] to-[#0f172a] flex flex-col justify-end overflow-hidden">
                    <Building2 className="h-24 w-24 text-amber-500/35 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 group-hover:scale-110 transition-transform duration-500" />
                    <h2 className="relative z-10 text-xl sm:text-2xl font-black text-white tracking-wide">
                      {isKhmer ? res.nameKm : res.nameEn}
                    </h2>
                  </div>

                  <div className="p-5 sm:p-6 space-y-5">
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                      {isKhmer ? res.descKm : res.descEn}
                    </p>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200/60 dark:border-slate-800 py-4 px-2 text-center space-y-1">
                        <DoorOpen className="h-5 w-5 mx-auto text-slate-700 dark:text-slate-300" />
                        <div className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white">
                          {res.totalRooms}
                        </div>
                        <div className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">
                          {isKhmer ? 'បន្ទប់' : 'Rooms'}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200/60 dark:border-slate-800 py-4 px-2 text-center space-y-1">
                        <BedDouble className="h-5 w-5 mx-auto text-slate-700 dark:text-slate-300" />
                        <div className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white">
                          {res.totalBeds}
                        </div>
                        <div className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">
                          {isKhmer ? 'គ្រែ' : 'Beds'}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200/60 dark:border-slate-800 py-4 px-2 text-center space-y-1">
                        <Users className="h-5 w-5 mx-auto text-slate-700 dark:text-slate-300" />
                        <div className="text-base sm:text-xl font-black text-slate-900 dark:text-white">
                          {isKhmer ? res.genderLabelKm : res.genderLabelEn} ({res.studentCount})
                        </div>
                        <div className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">
                          {isKhmer ? 'ភេទ' : 'Gender'}
                        </div>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-end text-xs font-extrabold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
                      <span>{isKhmer ? 'ចុចមើលទិន្នន័យក្នុងមណ្ឌលនេះ' : 'View Residence Details'}</span>
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="bg-white dark:bg-[#162033] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0',
                      activeResidence.type === 'male'
                        ? 'bg-blue-500/15 border-blue-500/30 text-blue-500'
                        : 'bg-pink-500/15 border-pink-500/30 text-pink-500'
                    )}
                  >
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-extrabold mb-1">
                      {isKhmer ? 'ទិន្នន័យលម្អិតប្រចាំមណ្ឌល' : 'RESIDENCE DETAILS'}
                    </Badge>
                    <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white">
                      {isKhmer ? activeResidence.nameKm : activeResidence.nameEn}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {residences.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedId(r.id)}
                      className={cn(
                        'px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all border',
                        r.id === activeResidence.id
                          ? r.type === 'male'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                            : 'bg-pink-600 text-white border-pink-600 shadow-md'
                          : 'bg-slate-100 dark:bg-[#0f172a] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                      )}
                    >
                      {isKhmer ? r.nameKm : r.nameEn}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200/70 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                    <span>{isKhmer ? `និស្សិត${activeResidence.genderLabelKm}` : 'Students'}</span>
                    <Users className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    {activeResidence.studentCount} {isKhmer ? 'នាក់' : ''}
                  </div>
                  <div className="text-[11px] font-bold text-blue-500 mt-1">
                    {isKhmer ? 'កំពុងស្នាក់នៅ' : 'Active Residents'}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200/70 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                    <span>{isKhmer ? 'បន្ទប់ទំនេរ' : 'Free Rooms'}</span>
                    <DoorOpen className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {activeResidence.availableRooms} / {activeResidence.totalRooms}
                  </div>
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                    {isKhmer
                      ? `មានអ្នកនៅ ${activeResidence.occupiedRooms} បន្ទប់`
                      : `${activeResidence.occupiedRooms} Occupied`}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200/70 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                    <span>{isKhmer ? 'គ្រែសរុប' : 'Total Beds'}</span>
                    <BedDouble className="h-4 w-4 text-indigo-500" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    {activeResidence.totalBeds} {isKhmer ? 'គ្រែ' : ''}
                  </div>
                  <div className="text-[11px] font-bold text-indigo-500 mt-1">
                    {isKhmer ? 'ក្នុងមណ្ឌលទាំងមូល' : 'Total Capacity'}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200/70 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                    <span>{isKhmer ? 'គ្រែរវល់' : 'Occupied Beds'}</span>
                    <Clock className="h-4 w-4 text-rose-500" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">
                    {activeResidence.occupiedBeds} {isKhmer ? 'គ្រែ' : ''}
                  </div>
                  <div className="text-[11px] font-bold text-rose-500 mt-1">
                    {isKhmer ? 'មាននិស្សិតគេង' : 'Currently Occupied'}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200/70 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                    <span>{isKhmer ? 'គ្រែទំនេរ' : 'Available Beds'}</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {activeResidence.availableBeds} {isKhmer ? 'គ្រែ' : ''}
                  </div>
                  <div className="text-[11px] font-bold text-emerald-500 mt-1">
                    {isKhmer ? 'អាចចូលស្នាក់នៅបាន' : 'Ready for Students'}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200/70 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                    <span>{isKhmer ? 'កុំព្យូទ័ររៀន' : 'Study PCs'}</span>
                    <Monitor className="h-4 w-4 text-cyan-500" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-cyan-600 dark:text-cyan-400">
                    {activeResidence.studyComputers} {isKhmer ? 'គ្រឿង' : ''}
                  </div>
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                    {isKhmer
                      ? `រវល់ ${activeResidence.computersInUse} • ទំនេរ ${activeResidence.computersAvailable}`
                      : `${activeResidence.computersInUse} Used • ${activeResidence.computersAvailable} Free`}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <Card className="bg-white dark:bg-[#162033] border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-sm lg:col-span-7">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                  <CardTitle className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-500" />
                    <span>
                      {isKhmer
                        ? `សម្ភារៈ និងបរិក្ខារក្នុង «${activeResidence.nameKm}»`
                        : `${activeResidence.nameEn} Equipment & Facilities`}
                    </span>
                  </CardTitle>
                  <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs font-bold">
                    {activeResidence.equipment.length} {isKhmer ? 'មុខ' : 'Items'}
                  </Badge>
                </CardHeader>
                <CardContent className="p-4 sm:p-5 space-y-3">
                  {activeResidence.equipment.map((eq) => {
                    const usedPct =
                      eq.total > 0 ? Math.min(100, Math.round((eq.inUse / eq.total) * 100)) : 0;
                    return (
                      <div
                        key={eq.id}
                        className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200/70 dark:border-slate-800 space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                              {isKhmer ? eq.nameKm : eq.nameEn}
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {isKhmer ? eq.categoryKm : eq.categoryEn}
                            </p>
                          </div>
                          <Badge
                            className={cn(
                              'text-[10px] font-bold',
                              eq.status === 'good'
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            )}
                          >
                            {eq.status === 'good'
                              ? isKhmer
                                ? 'ដំណើរការល្អ'
                                : 'Good'
                              : isKhmer
                              ? 'កំពុងជួសជុល'
                              : 'Maintenance'}
                          </Badge>
                        </div>

                        <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full transition-all duration-500"
                            style={{ width: `${usedPct}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-600 dark:text-slate-300">
                            {isKhmer ? `សរុប: ${eq.total}` : `Total: ${eq.total}`}
                          </span>
                          <span className="text-amber-600 dark:text-amber-400">
                            {isKhmer ? `កំពុងប្រើ/រវល់: ${eq.inUse}` : `In Use: ${eq.inUse}`}
                          </span>
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {isKhmer ? `ទំនេរ: ${eq.available}` : `Available: ${eq.available}`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-[#162033] border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-sm lg:col-span-5">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                  <CardTitle className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="h-5 w-5 text-amber-500" />
                    <span>
                      {isKhmer ? 'ស្ថានភាពបន្ទប់ និងគ្រែគេង' : 'Rooms & Beds Status'}
                    </span>
                  </CardTitle>
                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                    {isKhmer
                      ? `ទំនេរ ${activeResidence.availableRooms} បន្ទប់`
                      : `${activeResidence.availableRooms} Rooms Free`}
                  </Badge>
                </CardHeader>
                <CardContent className="p-4 sm:p-5 space-y-3">
                  {activeResidence.rooms.map((rm) => {
                    const isRoomFree = rm.occupiedBeds === 0;
                    const isRoomFull = rm.availableBeds === 0;
                    return (
                      <div
                        key={rm.id}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                              {isKhmer ? rm.roomNameKm : rm.roomNameEn}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {isKhmer ? rm.floorKm : rm.floorEn}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] font-bold">
                            <span className="text-slate-500">
                              {isKhmer ? `${rm.totalBeds} គ្រែ` : `${rm.totalBeds} Beds`}
                            </span>
                            <span className="text-rose-500">
                              {isKhmer ? `រវល់ ${rm.occupiedBeds}` : `${rm.occupiedBeds} Used`}
                            </span>
                            <span className="text-emerald-500">
                              {isKhmer ? `ទំនេរ ${rm.availableBeds}` : `${rm.availableBeds} Free`}
                            </span>
                          </div>
                        </div>

                        <Badge
                          className={cn(
                            'text-[10px] font-extrabold shrink-0',
                            isRoomFree
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : isRoomFull
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          )}
                        >
                          {isKhmer ? rm.noteKm : rm.noteEn}
                        </Badge>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}