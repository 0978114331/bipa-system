export type UserRole = 'super_admin' | 'residence_admin' | 'finance_admin' | 'duty_manager' | 'student';

export type ResidenceType = 'boys' | 'girls';

export type AttendanceAction = 'check_in' | 'check_out';

export type PaymentStatus = 'paid' | 'partial' | 'unpaid' | 'overdue';

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'returned';

export type DutyStatus = 'pending' | 'completed' | 'missed';

export type AssetCondition = 'good' | 'damaged' | 'under_maintenance';

export type Language = 'en' | 'km';

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  user_id: string | null;
  student_id: string;
  khmer_name: string | null;
  english_name: string;
  gender: 'male' | 'female' | 'other' | null;
  date_of_birth: string | null;
  phone: string | null;
  email: string | null;
  generation: string | null;
  major: string | null;
  academic_year: string | null;
  residence_type: ResidenceType | null;
  room_id: string | null;
  bed_number: string | null;
  start_date: string | null;
  status: 'active' | 'inactive' | null;
  photo_url: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Residence {
  id: string;
  name: string;
  name_km: string | null;
  type: ResidenceType;
  description: string | null;
  created_at: string;
}

export interface Room {
  id: string;
  residence_id: string;
  room_number: string;
  capacity: number;
  floor: number | null;
  created_at: string;
}

export interface Bed {
  id: string;
  room_id: string;
  bed_number: string;
  student_id: string | null;
  status: 'available' | 'occupied' | 'maintenance';
  created_at: string;
}

export interface AttendanceSession {
  id: string;
  session_token: string;
  residence_type: ResidenceType | null;
  action: AttendanceAction;
  valid_from: string;
  valid_until: string;
  created_by: string;
  is_active: boolean;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  session_id: string;
  action: AttendanceAction;
  recorded_at: string;
  ip_address: string | null;
  device_info: string | null;
}

export interface MonthlyPayment {
  id: string;
  student_id: string;
  month: number;
  year: number;
  required_amount: number;
  amount_paid: number;
  required_rice_kg: number;
  rice_received_kg: number;
  payment_date: string | null;
  status: PaymentStatus;
  received_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentTransaction {
  id: string;
  payment_id: string;
  amount: number;
  rice_kg: number;
  transaction_type: 'cash' | 'rice' | 'both';
  received_by: string;
  transaction_date: string;
  notes: string | null;
}

export interface DutyType {
  id: string;
  name: string;
  name_km: string | null;
  residence_type: ResidenceType;
  description: string | null;
  created_at: string;
}

export interface DutySchedule {
  id: string;
  duty_type_id: string;
  student_id: string;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  status: DutyStatus;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface LeaveRequest {
  id: string;
  student_id: string;
  reason: string;
  departure_date: string;
  return_date: string;
  status: LeaveStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: string;
  asset_id: string;
  name: string;
  category: string;
  quantity: number;
  location: string | null;
  condition: AssetCondition;
  purchase_date: string | null;
  responsible_staff: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssetMaintenance {
  id: string;
  asset_id: string;
  maintenance_type: 'repair' | 'replacement' | 'inspection';
  description: string;
  cost: number | null;
  performed_by: string | null;
  maintenance_date: string;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  title_km: string | null;
  content: string;
  content_km: string | null;
  category: string;
  is_published: boolean;
  published_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export type TranslationKey = string;


