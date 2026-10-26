CREATE TABLE IF NOT EXISTS public.bipa_doc_settings (
  id int PRIMARY KEY DEFAULT 1,
  logo_url text DEFAULT 'https://i.ibb.co/tphX7kd4/ce2e43f3-9d48-4d71-86a6-dd1ac3d77c49.png',
  org_name_km text DEFAULT 'សមាគមជនជាតិដើមភាគតិចព្នង',
  org_name_en text DEFAULT 'BUNONG INDIGENOUS PEOPLE ASSOCIATION',
  address_line1 text DEFAULT 'អាស័យដ្ឋានៈ ផ្ទះលេខBE0E1E2 ភូមិត្នោតជ្រុំ សង្កាត់បឹងទំពុនទី២, ខណ្ឌមានជ័យ, រាជធានីភ្នំពេញ, លេខទូរស័ព្ទៈ (៨៥៥) ៩៩ ៩៨៧ ៤៥១',
  address_line2 text DEFAULT 'Email: info@bunong.org, Website: www.bunong.org, Facebook Page: The Bunong Indigenous People Association',
  updated_at timestamptz DEFAULT now()
);

INSERT INTO public.bipa_doc_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.bipa_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_code text UNIQUE NOT NULL,
  full_name text NOT NULL,
  gender text DEFAULT 'ប្រុស',
  dob text DEFAULT '',
  major text DEFAULT '',
  generation text DEFAULT 'ជំនាន់ទី ១',
  graduated_year text DEFAULT 'បរិញ្ញាបត្រ',
  address text DEFAULT '',
  ethnicity text DEFAULT 'ព្នង',
  religion text DEFAULT 'កាតូលិក',
  current_job text DEFAULT '',
  contact_number text DEFAULT '',
  others text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.bipa_students
  ADD COLUMN IF NOT EXISTS full_name_km text DEFAULT '',
  ADD COLUMN IF NOT EXISTS full_name_en text DEFAULT '',
  ADD COLUMN IF NOT EXISTS gender_km text DEFAULT 'ប្រុស',
  ADD COLUMN IF NOT EXISTS gender_en text DEFAULT 'M',
  ADD COLUMN IF NOT EXISTS major_km text DEFAULT '',
  ADD COLUMN IF NOT EXISTS major_en text DEFAULT '',
  ADD COLUMN IF NOT EXISTS generation_km text DEFAULT 'ជំនាន់ទី ១',
  ADD COLUMN IF NOT EXISTS generation_en text DEFAULT 'Gen 1',
  ADD COLUMN IF NOT EXISTS graduated_year_km text DEFAULT 'បរិញ្ញាបត្រ',
  ADD COLUMN IF NOT EXISTS graduated_year_en text DEFAULT 'Bachelor degree',
  ADD COLUMN IF NOT EXISTS address_km text DEFAULT '',
  ADD COLUMN IF NOT EXISTS address_en text DEFAULT '',
  ADD COLUMN IF NOT EXISTS ethnicity_km text DEFAULT 'ព្នង',
  ADD COLUMN IF NOT EXISTS ethnicity_en text DEFAULT 'Bunong',
  ADD COLUMN IF NOT EXISTS current_job_km text DEFAULT '',
  ADD COLUMN IF NOT EXISTS current_job_en text DEFAULT '',
  ADD COLUMN IF NOT EXISTS others_km text DEFAULT '',
  ADD COLUMN IF NOT EXISTS others_en text DEFAULT '';

ALTER TABLE public.bipa_doc_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bipa_students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read doc settings" ON public.bipa_doc_settings;
CREATE POLICY "Allow public read doc settings" ON public.bipa_doc_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all doc settings" ON public.bipa_doc_settings;
CREATE POLICY "Allow all doc settings" ON public.bipa_doc_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read students" ON public.bipa_students;
CREATE POLICY "Allow public read students" ON public.bipa_students FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all students" ON public.bipa_students;
CREATE POLICY "Allow all students" ON public.bipa_students FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.bipa_students (student_code, full_name, gender, dob, major, generation, graduated_year, address, ethnicity, religion, current_job, contact_number, others)
VALUES
  ('BIPA-001', 'Prak Neth', 'ប្រុស', '13-12-1980', 'សង្គមកិច្ច (Social work)', 'ជំនាន់ទី ១', 'អនុបណ្ឌិត (Master)', 'ប៊ូស្រា (Bousra)', 'ព្នង', 'កាតូលិក', 'នាយកប្រតិបត្តិ (Executive Director)', '099 987 451', ''),
  ('BIPA-002', 'Saly Por', 'ប្រុស', '', 'សេដ្ឋកិច្ច (Economic)', 'ជំនាន់ទី ១', 'បរិញ្ញាបត្រ (Bachelor)', 'ដាក់ដាំ (Dakdam)', 'ព្នង', 'កាតូលិក', 'មន្ត្រីរាជការ (Government)', '097 57 26 258', ''),
  ('BIPA-003', 'Sok Makra', 'ប្រុស', '', 'ភាសាវិទ្យា (Linguistic)', 'ជំនាន់ទី ១', 'អនុបណ្ឌិត (Master)', 'តាកែវ (Takeo)', 'ខ្មែរ', 'ប្រូតេស្តង់', 'អ្នកបកប្រែ (Translator)', '099 99 24 23', ''),
  ('BIPA-004', 'Kim Sonea', 'ប្រុស', '', 'ព័ត៌មានវិទ្យា (IT)', 'ជំនាន់ទី ២', 'បរិញ្ញាបត្រ (Bachelor)', 'សែនមនោរម្យ (Sen Monorom)', 'ព្នង', 'កាតូលិក', 'មន្ត្រីរាជការ (Government)', '', ''),
  ('BIPA-005', 'Rin Tuong', 'ប្រុស', '', 'គណនេយ្យ (Accounting)', 'ជំនាន់ទី ២', 'បរិញ្ញាបត្រ (Bachelor)', 'ក្រុងទេស (Krongtes)', 'ព្នង', 'ប្រពៃណី', 'អង្គការ (Organization)', '012 42 01 27 / 097 86 62 188', ''),
  ('BIPA-006', 'Prak Bunhong', 'ប្រុស', '', 'ទស្សនវិជ្ជា (Philosophy)', 'ជំនាន់ទី ២', 'បរិញ្ញាបត្រ (Bachelor)', 'ប៊ូស្រា (Bousra)', 'ព្នង', 'កាតូលិក', 'បូជាចារ្យ (Priest)', '', ''),
  ('BIPA-007', 'Kve Then', 'ប្រុស', '', 'អក្សរសាស្ត្រអង់គ្លេស (English)', 'ជំនាន់ទី ២', 'បរិញ្ញាបត្រ (Bachelor)', 'ប៊ូស្រា (Bousra)', 'ព្នង', 'កាតូលិក', 'សណ្ឋាគារ (Hotel)', '096 97 19 014', ''),
  ('BIPA-008', 'Prak Bunnhong', 'ប្រុស', '', 'កសិកម្ម (Agriculture)', 'ជំនាន់ទី ៣', 'បរិញ្ញាបត្រ (Bachelor)', 'ប៊ូស្រា (Bousra)', 'ព្នង', 'កាតូលិក', 'BIPA', '097 55 34 547', ''),
  ('BIPA-009', 'Srouch Bei', 'ប្រុស', '', 'ទីផ្សារ (Marketing)', 'ជំនាន់ទី ៣', 'បរិញ្ញាបត្រ (Bachelor)', 'អូររាំង (Orang)', 'ព្នង', 'ប្រពៃណី', 'ក្រុមហ៊ុនកាហ្វេ (Coffee Company)', '', ''),
  ('BIPA-010', 'Saroeun Loueng', 'ប្រុស', '', 'អក្សរសាស្ត្រអង់គ្លេស (English)', 'ជំនាន់ទី ៣', 'បរិញ្ញាបត្រ (Bachelor)', 'ដាក់ដាំ (Dakdam)', 'ព្នង', 'ប្រពៃណី', 'ទាហាន (Soldier)', '097 99 63 088', ''),
  ('BIPA-011', 'Ci Thien', 'ប្រុស', '', 'នីតិសាស្ត្រ (Law)', 'ជំនាន់ទី ៣', 'បរិញ្ញាបត្រ (Bachelor)', 'ប៊ូស្រា (Bousra)', 'ព្នង', 'ព្រះពុទ្ធ', 'នគរបាល (Policeman)', '', ''),
  ('BIPA-012', 'Rin Marynit', 'ស្រី', '', 'គណនេយ្យ (Accounting)', 'ជំនាន់ទី ៣', 'បរិញ្ញាបត្រ (Bachelor)', 'ក្រុងទេស (Krongtes)', 'ព្នង', 'ប្រពៃណី', 'ប្រធានហិរញ្ញវត្ថុ (Finance manager)', '097 43 79 010', '')
ON CONFLICT (student_code) DO NOTHING;