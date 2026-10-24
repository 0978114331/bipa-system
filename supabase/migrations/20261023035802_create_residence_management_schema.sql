/*
# Student Residence Management System - Core Schema

## Overview
Creates the complete database schema for a Student Residence Management System with:
- User profiles and role-based access control
- Student records with residence assignments
- Residence, room, and bed management
- QR attendance system with secure session tokens
- Monthly payments and rice contributions
- Duty schedules and completions
- Leave requests with approval workflow
- Asset management and maintenance tracking
- Announcements, notifications, system settings
- Audit logs for sensitive operations

## Security
- RLS enabled on ALL tables
- Students can only access their own records
- Admins access based on their role
- Public can read published announcements only
- Secure attendance validation via SECURITY DEFINER function
*/

-- ============================================================
-- PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  avatar_url text,
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('super_admin', 'residence_admin', 'finance_admin', 'duty_manager', 'student')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON profiles;
CREATE POLICY "profiles_select_own_or_admin" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin', 'finance_admin', 'duty_manager')));

DROP POLICY IF EXISTS "profiles_insert_self" ON profiles;
CREATE POLICY "profiles_insert_self" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id AND role = 'student');

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- RESIDENCES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS residences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_km text,
  type text NOT NULL CHECK (type IN ('boys', 'girls')),
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE residences ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON residences TO authenticated;

DROP POLICY IF EXISTS "residences_select_all" ON residences;
CREATE POLICY "residences_select_all" ON residences FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "residences_admin_insert" ON residences;
CREATE POLICY "residences_admin_insert" ON residences FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin')));

DROP POLICY IF EXISTS "residences_admin_update" ON residences;
CREATE POLICY "residences_admin_update" ON residences FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin')));

DROP POLICY IF EXISTS "residences_admin_delete" ON residences;
CREATE POLICY "residences_admin_delete" ON residences FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin')));

-- ============================================================
-- STUDENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  student_id text NOT NULL UNIQUE,
  khmer_name text,
  english_name text NOT NULL,
  gender text CHECK (gender IN ('male', 'female', 'other')),
  date_of_birth date,
  phone text,
  email text,
  generation text,
  major text,
  academic_year text,
  residence_type text CHECK (residence_type IN ('boys', 'girls')),
  room_id uuid,
  bed_number text,
  start_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  photo_url text,
  emergency_contact_name text,
  emergency_contact_phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);
CREATE INDEX IF NOT EXISTS idx_students_residence_type ON students(residence_type);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON students TO authenticated;

-- Students can see their own record; admins can see all
DROP POLICY IF EXISTS "students_select_own_or_admin" ON students;
CREATE POLICY "students_select_own_or_admin" ON students FOR SELECT
  TO authenticated USING (
    user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin', 'finance_admin', 'duty_manager'))
  );

-- Only admins can create student records
DROP POLICY IF EXISTS "students_admin_insert" ON students;
CREATE POLICY "students_admin_insert" ON students FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin')));

-- Students can update their own basic info; admins can update all
DROP POLICY IF EXISTS "students_update_own_or_admin" ON students;
CREATE POLICY "students_update_own_or_admin" ON students FOR UPDATE
  TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin')))
  WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin')));

-- Only super_admin can delete student records
DROP POLICY IF EXISTS "students_admin_delete" ON students;
CREATE POLICY "students_admin_delete" ON students FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'));

-- ============================================================
-- ROOMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  residence_id uuid NOT NULL REFERENCES residences(id) ON DELETE CASCADE,
  room_number text NOT NULL,
  capacity integer NOT NULL DEFAULT 2 CHECK (capacity > 0),
  floor integer,
  created_at timestamptz DEFAULT now(),
  UNIQUE(residence_id, room_number)
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON rooms TO authenticated;

DROP POLICY IF EXISTS "rooms_select_all" ON rooms;
CREATE POLICY "rooms_select_all" ON rooms FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "rooms_admin_write" ON rooms;
CREATE POLICY "rooms_admin_write" ON rooms FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin')));

DROP POLICY IF EXISTS "rooms_admin_update" ON rooms;
CREATE POLICY "rooms_admin_update" ON rooms FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin')));

DROP POLICY IF EXISTS "rooms_admin_delete" ON rooms;
CREATE POLICY "rooms_admin_delete" ON rooms FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin')));

-- ============================================================
-- BEDS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS beds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  bed_number text NOT NULL,
  student_id uuid REFERENCES students(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(room_id, bed_number)
);

ALTER TABLE beds ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON beds TO authenticated;

DROP POLICY IF EXISTS "beds_select_all" ON beds;
CREATE POLICY "beds_select_all" ON beds FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "beds_admin_write" ON beds;
CREATE POLICY "beds_admin_write" ON beds FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin')));

DROP POLICY IF EXISTS "beds_admin_update" ON beds;
CREATE POLICY "beds_admin_update" ON beds FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin')));

DROP POLICY IF EXISTS "beds_admin_delete" ON beds;
CREATE POLICY "beds_admin_delete" ON beds FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin')));

-- Add FK for students.room_id now that rooms exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'students_room_id_fkey' AND table_name = 'students'
  ) THEN
    ALTER TABLE students ADD CONSTRAINT students_room_id_fkey
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- ATTENDANCE SESSIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token text NOT NULL UNIQUE,
  residence_type text CHECK (residence_type IN ('boys', 'girls')),
  action text NOT NULL CHECK (action IN ('check_in', 'check_out')),
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_token ON attendance_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_active ON attendance_sessions(is_active);

ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON attendance_sessions TO authenticated;

DROP POLICY IF EXISTS "attendance_sessions_select" ON attendance_sessions;
CREATE POLICY "attendance_sessions_select" ON attendance_sessions FOR SELECT
  TO authenticated USING (is_active = true OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin', 'duty_manager')));

DROP POLICY IF EXISTS "attendance_sessions_admin_insert" ON attendance_sessions;
CREATE POLICY "attendance_sessions_admin_insert" ON attendance_sessions FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin', 'duty_manager')));

DROP POLICY IF EXISTS "attendance_sessions_admin_update" ON attendance_sessions;
CREATE POLICY "attendance_sessions_admin_update" ON attendance_sessions FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin', 'duty_manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin', 'duty_manager')));

DROP POLICY IF EXISTS "attendance_sessions_admin_delete" ON attendance_sessions;
CREATE POLICY "attendance_sessions_admin_delete" ON attendance_sessions FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin', 'duty_manager')));

-- ============================================================
-- ATTENDANCE RECORDS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  session_id uuid REFERENCES attendance_sessions(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('check_in', 'check_out')),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  device_info text
);

CREATE INDEX IF NOT EXISTS idx_attendance_records_student ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON attendance_records(recorded_at);

ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON attendance_records TO authenticated;

DROP POLICY IF EXISTS "attendance_records_select_own_or_admin" ON attendance_records;
CREATE POLICY "attendance_records_select_own_or_admin" ON attendance_records FOR SELECT
  TO authenticated USING (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin', 'duty_manager'))
  );

DROP POLICY IF EXISTS "attendance_records_insert_own" ON attendance_records;
CREATE POLICY "attendance_records_insert_own" ON attendance_records FOR INSERT
  TO authenticated WITH CHECK (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

-- ============================================================
-- MONTHLY PAYMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS monthly_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  year integer NOT NULL CHECK (year >= 2020),
  required_amount numeric NOT NULL DEFAULT 50000,
  amount_paid numeric NOT NULL DEFAULT 0,
  required_rice_kg numeric NOT NULL DEFAULT 10,
  rice_received_kg numeric NOT NULL DEFAULT 0,
  payment_date timestamptz,
  status text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid', 'partial', 'unpaid', 'overdue')),
  received_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id, month, year)
);

CREATE INDEX IF NOT EXISTS idx_monthly_payments_student ON monthly_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_monthly_payments_status ON monthly_payments(status);
CREATE INDEX IF NOT EXISTS idx_monthly_payments_month_year ON monthly_payments(month, year);

ALTER TABLE monthly_payments ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON monthly_payments TO authenticated;

DROP POLICY IF EXISTS "monthly_payments_select_own_or_admin" ON monthly_payments;
CREATE POLICY "monthly_payments_select_own_or_admin" ON monthly_payments FOR SELECT
  TO authenticated USING (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin', 'finance_admin'))
  );

DROP POLICY IF EXISTS "monthly_payments_admin_insert" ON monthly_payments;
CREATE POLICY "monthly_payments_admin_insert" ON monthly_payments FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('finance_admin', 'residence_admin', 'super_admin')));

DROP POLICY IF EXISTS "monthly_payments_admin_update" ON monthly_payments;
CREATE POLICY "monthly_payments_admin_update" ON monthly_payments FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('finance_admin', 'residence_admin', 'super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('finance_admin', 'residence_admin', 'super_admin')));

DROP POLICY IF EXISTS "monthly_payments_admin_delete" ON monthly_payments;
CREATE POLICY "monthly_payments_admin_delete" ON monthly_payments FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'));

-- ============================================================
-- PAYMENT TRANSACTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES monthly_payments(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  rice_kg numeric NOT NULL DEFAULT 0,
  transaction_type text NOT NULL CHECK (transaction_type IN ('cash', 'rice', 'both')),
  received_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  transaction_date timestamptz NOT NULL DEFAULT now(),
  notes text
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment ON payment_transactions(payment_id);

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON payment_transactions TO authenticated;

DROP POLICY IF EXISTS "payment_transactions_select_own_or_admin" ON payment_transactions;
CREATE POLICY "payment_transactions_select_own_or_admin" ON payment_transactions FOR SELECT
  TO authenticated USING (
    payment_id IN (
      SELECT mp.id FROM monthly_payments mp
      JOIN students s ON mp.student_id = s.id
      WHERE s.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin', 'finance_admin'))
  );

DROP POLICY IF EXISTS "payment_transactions_admin_insert" ON payment_transactions;
CREATE POLICY "payment_transactions_admin_insert" ON payment_transactions FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('finance_admin', 'residence_admin', 'super_admin')));

-- ============================================================
-- DUTY TYPES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS duty_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_km text,
  residence_type text NOT NULL CHECK (residence_type IN ('boys', 'girls')),
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE duty_types ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON duty_types TO authenticated;

DROP POLICY IF EXISTS "duty_types_select_all" ON duty_types;
CREATE POLICY "duty_types_select_all" ON duty_types FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "duty_types_admin_insert" ON duty_types;
CREATE POLICY "duty_types_admin_insert" ON duty_types FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin', 'duty_manager')));

DROP POLICY IF EXISTS "duty_types_admin_update" ON duty_types;
CREATE POLICY "duty_types_admin_update" ON duty_types FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin', 'duty_manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin', 'duty_manager')));

DROP POLICY IF EXISTS "duty_types_admin_delete" ON duty_types;
CREATE POLICY "duty_types_admin_delete" ON duty_types FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'duty_manager')));

-- ============================================================
-- DUTY SCHEDULES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS duty_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duty_type_id uuid NOT NULL REFERENCES duty_types(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  scheduled_date date NOT NULL,
  start_time time,
  end_time time,
  location text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'missed')),
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_duty_schedules_student ON duty_schedules(student_id);
CREATE INDEX IF NOT EXISTS idx_duty_schedules_date ON duty_schedules(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_duty_schedules_status ON duty_schedules(status);

ALTER TABLE duty_schedules ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON duty_schedules TO authenticated;

DROP POLICY IF EXISTS "duty_schedules_select_own_or_admin" ON duty_schedules;
CREATE POLICY "duty_schedules_select_own_or_admin" ON duty_schedules FOR SELECT
  TO authenticated USING (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin', 'duty_manager'))
  );

DROP POLICY IF EXISTS "duty_schedules_admin_insert" ON duty_schedules;
CREATE POLICY "duty_schedules_admin_insert" ON duty_schedules FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin', 'duty_manager')));

DROP POLICY IF EXISTS "duty_schedules_admin_update" ON duty_schedules;
CREATE POLICY "duty_schedules_admin_update" ON duty_schedules FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin', 'duty_manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin', 'duty_manager')));

DROP POLICY IF EXISTS "duty_schedules_admin_delete" ON duty_schedules;
CREATE POLICY "duty_schedules_admin_delete" ON duty_schedules FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin', 'duty_manager')));

-- ============================================================
-- LEAVE REQUESTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  reason text NOT NULL,
  departure_date timestamptz NOT NULL,
  return_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'returned')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_student ON leave_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON leave_requests TO authenticated;

DROP POLICY IF EXISTS "leave_requests_select_own_or_admin" ON leave_requests;
CREATE POLICY "leave_requests_select_own_or_admin" ON leave_requests FOR SELECT
  TO authenticated USING (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin'))
  );

DROP POLICY IF EXISTS "leave_requests_insert_own" ON leave_requests;
CREATE POLICY "leave_requests_insert_own" ON leave_requests FOR INSERT
  TO authenticated WITH CHECK (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "leave_requests_update_own_or_admin" ON leave_requests;
CREATE POLICY "leave_requests_update_own_or_admin" ON leave_requests FOR UPDATE
  TO authenticated USING (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin'))
  )
  WITH CHECK (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin'))
  );

DROP POLICY IF EXISTS "leave_requests_delete_own_or_admin" ON leave_requests;
CREATE POLICY "leave_requests_delete_own_or_admin" ON leave_requests FOR DELETE
  TO authenticated USING (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin'))
  );

-- ============================================================
-- ASSETS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  location text,
  condition text NOT NULL DEFAULT 'good' CHECK (condition IN ('good', 'damaged', 'under_maintenance')),
  purchase_date date,
  responsible_staff text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON assets TO authenticated;

DROP POLICY IF EXISTS "assets_select_all" ON assets;
CREATE POLICY "assets_select_all" ON assets FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "assets_admin_insert" ON assets;
CREATE POLICY "assets_admin_insert" ON assets FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin')));

DROP POLICY IF EXISTS "assets_admin_update" ON assets;
CREATE POLICY "assets_admin_update" ON assets FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin')));

DROP POLICY IF EXISTS "assets_admin_delete" ON assets;
CREATE POLICY "assets_admin_delete" ON assets FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin')));

-- ============================================================
-- ASSET MAINTENANCE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS asset_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  maintenance_type text NOT NULL CHECK (maintenance_type IN ('repair', 'replacement', 'inspection')),
  description text NOT NULL,
  cost numeric,
  performed_by text,
  maintenance_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asset_maintenance_asset ON asset_maintenance(asset_id);

ALTER TABLE asset_maintenance ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON asset_maintenance TO authenticated;

DROP POLICY IF EXISTS "asset_maintenance_select_all" ON asset_maintenance;
CREATE POLICY "asset_maintenance_select_all" ON asset_maintenance FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "asset_maintenance_admin_insert" ON asset_maintenance;
CREATE POLICY "asset_maintenance_admin_insert" ON asset_maintenance FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin')));

DROP POLICY IF EXISTS "asset_maintenance_admin_update" ON asset_maintenance;
CREATE POLICY "asset_maintenance_admin_update" ON asset_maintenance FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin')));

DROP POLICY IF EXISTS "asset_maintenance_admin_delete" ON asset_maintenance;
CREATE POLICY "asset_maintenance_admin_delete" ON asset_maintenance FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin')));

-- ============================================================
-- ANNOUNCEMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  title_km text,
  content text NOT NULL,
  content_km text,
  category text NOT NULL DEFAULT 'notice',
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(is_published);
CREATE INDEX IF NOT EXISTS idx_announcements_category ON announcements(category);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON announcements TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON announcements TO authenticated;

DROP POLICY IF EXISTS "announcements_select_published_or_admin" ON announcements;
CREATE POLICY "announcements_select_published_or_admin" ON announcements FOR SELECT
  TO anon, authenticated USING (is_published = true OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin', 'finance_admin', 'duty_manager')));

DROP POLICY IF EXISTS "announcements_admin_insert" ON announcements;
CREATE POLICY "announcements_admin_insert" ON announcements FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin', 'finance_admin', 'duty_manager')));

DROP POLICY IF EXISTS "announcements_admin_update" ON announcements;
CREATE POLICY "announcements_admin_update" ON announcements FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin', 'finance_admin', 'duty_manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin', 'finance_admin', 'duty_manager')));

DROP POLICY IF EXISTS "announcements_admin_delete" ON announcements;
CREATE POLICY "announcements_admin_delete" ON announcements FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin')));

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_insert_own_or_admin" ON notifications;
CREATE POLICY "notifications_insert_own_or_admin" ON notifications FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'residence_admin', 'duty_manager')));

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_delete_own" ON notifications FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- SYSTEM SETTINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  description text,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON system_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON system_settings TO authenticated;

DROP POLICY IF EXISTS "system_settings_select_all" ON system_settings;
CREATE POLICY "system_settings_select_all" ON system_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "system_settings_super_admin_insert" ON system_settings;
CREATE POLICY "system_settings_super_admin_insert" ON system_settings FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'));

DROP POLICY IF EXISTS "system_settings_super_admin_update" ON system_settings;
CREATE POLICY "system_settings_super_admin_update" ON system_settings FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'));

-- ============================================================
-- AUDIT LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON audit_logs TO authenticated;

DROP POLICY IF EXISTS "audit_logs_select_super_admin" ON audit_logs;
CREATE POLICY "audit_logs_select_super_admin" ON audit_logs FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'));

DROP POLICY IF EXISTS "audit_logs_insert_any" ON audit_logs;
CREATE POLICY "audit_logs_insert_any" ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- TRANSLATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  lang text NOT NULL CHECK (lang IN ('en', 'km')),
  value text NOT NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(key, lang)
);

ALTER TABLE translations ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON translations TO anon, authenticated;
GRANT INSERT, UPDATE ON translations TO authenticated;

DROP POLICY IF EXISTS "translations_select_all" ON translations;
CREATE POLICY "translations_select_all" ON translations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "translations_super_admin_insert" ON translations;
CREATE POLICY "translations_super_admin_insert" ON translations FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'));

DROP POLICY IF EXISTS "translations_super_admin_update" ON translations;
CREATE POLICY "translations_super_admin_update" ON translations FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'));

-- ============================================================
-- SECURITY DEFINER: Record Attendance
-- Validates QR token server-side and records attendance
-- ============================================================
CREATE OR REPLACE FUNCTION record_attendance(
  p_session_token text,
  p_action text,
  p_device_info text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session attendance_sessions%ROWTYPE;
  v_student_id uuid;
  v_existing_record attendance_records%ROWTYPE;
  v_record_id uuid;
  v_recorded_at timestamptz;
BEGIN
  -- Get the current user's student record
  SELECT id INTO v_student_id FROM students WHERE user_id = auth.uid() LIMIT 1;
  IF v_student_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Student record not found for current user');
  END IF;

  -- Validate the session token
  SELECT * INTO v_session FROM attendance_sessions WHERE session_token = p_session_token AND is_active = true;
  IF v_session IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or inactive session token');
  END IF;

  -- Check if token is within valid time window
  IF now() < v_session.valid_from OR now() > v_session.valid_until THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session token has expired');
  END IF;

  -- Verify action matches session action
  IF v_session.action != p_action THEN
    RETURN jsonb_build_object('success', false, 'error', 'Action does not match the QR code type');
  END IF;

  -- Check for duplicate records today
  SELECT * INTO v_existing_record FROM attendance_records
  WHERE student_id = v_student_id
    AND action = p_action
    AND recorded_at::date = now()::date
  LIMIT 1;

  IF v_existing_record IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You have already ' || p_action || ' today',
      'existing_record', jsonb_build_object('recorded_at', v_existing_record.recorded_at));
  END IF;

  -- Check if trying to check_out without check_in
  IF p_action = 'check_out' THEN
    SELECT * INTO v_existing_record FROM attendance_records
    WHERE student_id = v_student_id
      AND action = 'check_in'
      AND recorded_at::date = now()::date
    LIMIT 1;
    IF v_existing_record IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'You must check in before checking out');
    END IF;
  END IF;

  -- Check if trying to check_in when already checked out
  IF p_action = 'check_in' THEN
    SELECT * INTO v_existing_record FROM attendance_records
    WHERE student_id = v_student_id
      AND action = 'check_out'
      AND recorded_at::date = now()::date
    LIMIT 1;
    IF v_existing_record IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'You have already completed your attendance cycle today');
    END IF;
  END IF;

  -- Verify residence type matches if session has a residence_type
  IF v_session.residence_type IS NOT NULL THEN
    PERFORM 1 FROM students
    WHERE id = v_student_id AND residence_type = v_session.residence_type;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'This QR code is for the other residence');
    END IF;
  END IF;

  -- Record the attendance
  INSERT INTO attendance_records (student_id, session_id, action, recorded_at, device_info)
  VALUES (v_student_id, v_session.id, p_action, now(), p_device_info)
  RETURNING id, recorded_at INTO v_record_id, v_recorded_at;

  RETURN jsonb_build_object(
    'success', true,
    'record_id', v_record_id,
    'recorded_at', v_recorded_at,
    'action', p_action
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION record_attendance(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION record_attendance(text, text, text) TO authenticated;

-- ============================================================
-- SEED DATA: Default system settings
-- ============================================================
INSERT INTO system_settings (key, value, description) VALUES
  ('monthly_cash_payment', '50000', 'Monthly cash payment per student in KHR'),
  ('monthly_rice_kg', '10', 'Monthly rice contribution per student in kg'),
  ('contact_email', 'residence@example.edu', 'Contact email for the residence office'),
  ('contact_phone', '+855 978114331', 'Contact phone for the residence office'),
  ('contact_address', 'Phnom Penh, Cambodia', 'Address of the residence')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- SEED DATA: Default duty types
-- ============================================================
INSERT INTO duty_types (name, name_km, residence_type, description) VALUES
  ('Cooking', 'ការចម្អិនអាហារ', 'girls', 'Prepare meals for residents'),
  ('Dishwashing', 'ការបោសចាន', 'girls', 'Wash dishes after meals'),
  ('Grocery Shopping', 'ការទិញញ៉ាំ', 'girls', 'Purchase groceries and supplies'),
  ('Room Cleaning', 'ការសម្អាតបន្ទប់', 'girls', 'Clean rooms and common areas'),
  ('Residence Cleaning', 'ការសម្អាតអន្តេវាសិកដ្ឋាន', 'boys', 'Clean residence common areas'),
  ('Computer Room Cleaning', 'សម្អាតបន្ទប់កុំព្យូទ័រ', 'boys', 'Clean and maintain computer room'),
  ('Equipment Organization', 'រៀបចំឧបករណ៍', 'boys', 'Organize and maintain equipment')
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED DATA: Default residences
-- ============================================================
INSERT INTO residences (name, name_km, type, description) VALUES
  ('Boys Residence', 'អន្តេវាសិកដ្ឋានប្រុស', 'boys', 'Residence for male students'),
  ('Girls Residence', 'អន្តេវាសិកដ្ឋានស្រី', 'girls', 'Residence for female students')
ON CONFLICT DO NOTHING;
