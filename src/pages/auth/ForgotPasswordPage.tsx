import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  GraduationCap,
  Mail,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  KeyRound,
  Search,
  RefreshCw,
  Copy,
  Check,
  Lock,
  LogIn
} from 'lucide-react';
import {
  fetchSecurityPayloadFromDb,
  saveSecurityPayloadToDb,
  StudentSecurityPayload,
  StudentSecurityProfile,
  setVerifiedStudentSession
} from '@/components/security/StudentSecuritySystem';
import { cn } from '@/lib/utils';

const AUTH_BG_URL = 'https://i.ibb.co/KY0bJNW/b151bd61-2587-445b-b245-2ddaea928120.png';

function normalizeStudentCode(raw: string): string {
  let cleaned = String(raw || '').trim().replace(/\s+/g, '').toUpperCase();
  if (cleaned.startsWith('PIBA-')) cleaned = 'BIPA-' + cleaned.slice(5);
  else if (cleaned.startsWith('PIBA')) cleaned = 'BIPA-' + cleaned.slice(4);
  else if (/^\d{1,3}$/.test(cleaned)) cleaned = 'BIPA-' + cleaned.padStart(3, '0');
  return cleaned;
}

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'student_code' | 'email_account'>('student_code');
  const [adminLogoUrl, setAdminLogoUrl] = useState(
    'https://i.ibb.co/tphX7kd4/ce2e43f3-9d48-4d71-86a6-dd1ac3d77c49.png'
  );

  const [securityPayload, setSecurityPayload] = useState<StudentSecurityPayload>({
    profiles: {}
  });
  const [lookupInput, setLookupInput] = useState('');
  const [foundStudent, setFoundStudent] = useState<StudentSecurityProfile | null>(null);
  const [newCustomPin, setNewCustomPin] = useState('');
  const [copiedPin, setCopiedPin] = useState(false);
  const [pinSavedMsg, setPinSavedMsg] = useState('');

  const [email, setEmail] = useState('');
  const [newAccountPass, setNewAccountPass] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSecurityPayloadFromDb().then(setSecurityPayload);
    supabase
      .from('bipa_settings')
      .select('logo_url')
      .eq('id', '1')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.logo_url) setAdminLogoUrl(data.logo_url);
      });
  }, []);

  const handleFindStudentCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPinSavedMsg('');
    const q = lookupInput.trim();
    if (!q) {
      setError('សូមបញ្ចូលអត្តលេខ (ឧ. BIPA-015) លេខទូរស័ព្ទ ឬឈ្មោះរបស់អ្នក។');
      return;
    }

    const codeNorm = normalizeStudentCode(q);
    const digitsOnly = q.replace(/\D/g, '');
    const list = Object.values(securityPayload.profiles || {});

    const matched = list.find((p) => {
      const pCode = normalizeStudentCode(p.studentCode);
      const pPhone = (p.phoneNumber || '').replace(/\D/g, '');
      const nameMatch = p.fullNameKm.toLowerCase() === q.toLowerCase();
      const codeMatch = pCode === codeNorm;
      const phoneMatch =
        digitsOnly.length >= 6 &&
        (pPhone === digitsOnly ||
          pPhone.endsWith(digitsOnly.replace(/^855/, '').replace(/^0/, '')));
      return codeMatch || phoneMatch || nameMatch;
    });

    if (!matched) {
      setFoundStudent(null);
      setError('រកមិនឃើញឈ្មោះ ឬអត្តលេខនេះទេ! សូមពិនិត្យម្តងទៀត។');
      return;
    }

    setFoundStudent(matched);
    setNewCustomPin(matched.secretCode);
  };

  const handleUpdateStudentSecretCode = async () => {
    if (!foundStudent) return;
    const cleanNewPin = newCustomPin.trim().toUpperCase();
    if (cleanNewPin.length < 4) {
      setError('លេខកូដសម្ងាត់ថ្មីត្រូវមានយ៉ាងតិច ៤ តួអក្សរ។');
      return;
    }

    setError('');
    const updatedProfile: StudentSecurityProfile = {
      ...foundStudent,
      secretCode: cleanNewPin
    };

    const nextPayload: StudentSecurityPayload = {
      ...securityPayload,
      profiles: {
        ...securityPayload.profiles,
        [foundStudent.studentCode]: updatedProfile
      }
    };

    setFoundStudent(updatedProfile);
    setSecurityPayload(nextPayload);
    await saveSecurityPayloadToDb(nextPayload);
    setVerifiedStudentSession(updatedProfile);
    setPinSavedMsg('បានប្តូរ និងរក្សាទុកលេខកូដសម្ងាត់ថ្មីដោយជោគជ័យ!');
  };

  const handleEmailResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    let cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('សូមបញ្ចូលអ៊ីមែលរបស់អ្នក។');
      return;
    }
    if (!cleanEmail.includes('@')) cleanEmail = `${cleanEmail}@gmail.com`;
    else if (cleanEmail.toLowerCase().endsWith('@gmail')) cleanEmail = `${cleanEmail}.com`;

    if (newAccountPass.trim().length > 0 && newAccountPass.trim().length < 6) {
      setError('ពាក្យសម្ងាត់ថ្មីត្រូវមានយ៉ាងតិច ៦ តួអក្សរ។');
      return;
    }

    setLoading(true);
    if (newAccountPass.trim().length >= 6) {
      localStorage.setItem(
        `bipa_local_pwd_${cleanEmail.toLowerCase()}`,
        newAccountPass.trim()
      );
      try {
        await supabase.auth.updateUser({ password: newAccountPass.trim() });
      } catch {}
    }

    await resetPassword(cleanEmail);
    setLoading(false);
    setSuccessMsg(
      newAccountPass.trim().length >= 6
        ? 'បានកំណត់ពាក្យសម្ងាត់ថ្មីរួចរាល់! ឥឡូវនេះអ្នកអាចចូលគណនីបានហើយ។'
        : 'បានផ្ញើសំណើកំណត់ពាក្យសម្ងាត់ឡើងវិញរួចរាល់!'
    );
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden select-none bipa-auth-font">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;500;600;700&family=Moul&display=swap');
        .bipa-auth-font {
          font-family: 'Kantumruy Pro', 'Khmer OS Battambang', sans-serif !important;
        }
        .bipa-auth-title {
          font-family: 'Moul', 'Kantumruy Pro', serif !important;
          font-weight: 400 !important;
        }
      `}</style>

      <img
        src={AUTH_BG_URL}
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover object-center scale-105 pointer-events-none"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#06122e]/60 via-[#091e4a]/65 to-[#040d21]/85 backdrop-blur-[2px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[430px] my-auto">
        <div className="flex flex-col items-center mb-4 space-y-2 text-center">
          <div
            onClick={() => navigate('/')}
            className="flex items-center justify-center w-18 h-18 rounded-full bg-white/95 p-1.5 shadow-[0_0_30px_rgba(59,130,246,0.6)] border-2 border-white/80 cursor-pointer"
            style={{ width: '72px', height: '72px' }}
          >
            {adminLogoUrl ? (
              <img
                src={adminLogoUrl}
                alt="Logo"
                className="w-full h-full object-contain rounded-full"
              />
            ) : (
              <GraduationCap className="h-9 w-9 text-blue-700" />
            )}
          </div>
          <h1 className="bipa-auth-title text-lg sm:text-xl text-white tracking-wide drop-shadow">
            ហៅ ឬប្តូរលេខកូដសម្ងាត់ឡើងវិញ
          </h1>
          <p className="text-xs font-medium text-blue-100/90">
            ស្វែងរកលេខកូដសម្ងាត់របស់អ្នក ឬកំណត់ពាក្យសម្ងាត់ថ្មីភ្លាមៗ
          </p>
        </div>

        <Card className="bg-slate-950/45 backdrop-blur-xl border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,0.6)] rounded-3xl overflow-hidden text-white">
          <div className="grid grid-cols-2 p-1.5 bg-slate-950/60 border-b border-white/15">
            <button
              type="button"
              onClick={() => {
                setMode('student_code');
                setError('');
              }}
              className={cn(
                'py-2 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5',
                mode === 'student_code'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow'
                  : 'text-blue-100/80 hover:text-white'
              )}
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>ហៅ/ប្តូរលេខកូដសិស្ស</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('email_account');
                setError('');
              }}
              className={cn(
                'py-2 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5',
                mode === 'email_account'
                  ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow'
                  : 'text-blue-100/80 hover:text-white'
              )}
            >
              <Mail className="h-3.5 w-3.5" />
              <span>គណនីអ៊ីមែល</span>
            </button>
          </div>

          <CardContent className="p-5 sm:p-6 space-y-4">
            {error && (
              <Alert
                variant="destructive"
                className="bg-rose-950/75 border-rose-500/50 text-rose-200 py-2.5 rounded-2xl"
              >
                <AlertCircle className="h-4 w-4 text-rose-400" />
                <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
              </Alert>
            )}

            {mode === 'student_code' ? (
              <div className="space-y-4">
                <form onSubmit={handleFindStudentCode} className="space-y-2.5">
                  <Label className="text-blue-100 text-xs font-semibold block">
                    បញ្ចូលអត្តលេខ (ID) លេខទូរស័ព្ទ ឬឈ្មោះភាសាខ្មែរ
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-300/80" />
                      <Input
                        value={lookupInput}
                        onChange={(e) => setLookupInput(e.target.value)}
                        placeholder="ឧ. BIPA-015 ឬ 0978114331"
                        style={{ fontSize: '13px' }}
                        className="pl-10 h-10 rounded-xl bg-slate-900/65 border-white/20 text-white placeholder:text-slate-400 font-bold"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-10 px-4 rounded-xl shrink-0"
                    >
                      ស្វែងរកកូដ
                    </Button>
                  </div>
                </form>

                {foundStudent && (
                  <div className="p-4 rounded-2xl bg-slate-900/75 border border-amber-400/40 space-y-3.5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-amber-400 text-slate-950 font-black text-[10px]">
                            {foundStudent.studentCode}
                          </Badge>
                          <span className="text-sm font-bold text-white">
                            {foundStudent.fullNameKm}
                          </span>
                        </div>
                        <p className="text-[11px] text-blue-200/80 mt-0.5">
                          លេខទូរស័ព្ទ៖ {foundStudent.phoneNumber}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(foundStudent.secretCode);
                          setCopiedPin(true);
                          setTimeout(() => setCopiedPin(false), 1800);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1 text-amber-300"
                      >
                        {copiedPin ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                            <span>បានចម្លង</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>ចម្លងកូដ</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="p-3 rounded-xl bg-blue-950/60 border border-blue-400/30 text-center space-y-1">
                      <span className="text-[11px] text-blue-200 block">
                        លេខកូដសម្ងាត់បច្ចុប្បន្នរបស់អ្នក៖
                      </span>
                      <span className="text-base sm:text-lg font-mono font-black tracking-widest text-amber-400">
                        {foundStudent.secretCode}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-blue-100 font-semibold block">
                        ចង់ប្តូរលេខកូដសម្ងាត់ថ្មីដែលងាយចាំខ្លួនឯង៖
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          value={newCustomPin}
                          onChange={(e) => setNewCustomPin(e.target.value.toUpperCase())}
                          placeholder="វាយលេខកូដថ្មី..."
                          style={{ fontSize: '13px' }}
                          className="h-10 rounded-xl bg-slate-950/80 border-white/20 text-amber-300 font-mono font-bold text-center tracking-wider"
                        />
                        <Button
                          type="button"
                          onClick={handleUpdateStudentSecretCode}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-10 px-3.5 rounded-xl shrink-0"
                        >
                          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                          ប្តូរកូដថ្មី
                        </Button>
                      </div>
                    </div>

                    {pinSavedMsg && (
                      <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>{pinSavedMsg}</span>
                      </div>
                    )}

                    <Button
                      type="button"
                      onClick={() => {
                        setVerifiedStudentSession(foundStudent);
                        navigate('/dashboard');
                      }}
                      className="w-full bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white font-bold text-xs h-10 rounded-xl shadow-md"
                    >
                      <LogIn className="h-4 w-4 mr-1.5" />
                      ចូលទៅកាន់ផ្ទាំងទិន្នន័យរបស់ខ្ញុំឥឡូវនេះ
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {successMsg ? (
                  <div className="space-y-3">
                    <Alert className="bg-emerald-950/80 border-emerald-500/50 text-emerald-200 rounded-2xl">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <AlertDescription className="text-xs font-semibold leading-relaxed">
                        {successMsg}
                      </AlertDescription>
                    </Alert>
                    <Button
                      type="button"
                      onClick={() => navigate('/signin')}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-10 rounded-xl"
                    >
                      ត្រឡប់ទៅចូលគណនី (Login)
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleEmailResetSubmit} className="space-y-3.5">
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-blue-100 text-xs font-semibold">
                        អ៊ីមែលគណនីរបស់អ្នក
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-300/80" />
                        <Input
                          id="email"
                          type="text"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="ឧ. username@gmail.com"
                          style={{ fontSize: '13px' }}
                          className="pl-10 h-10 rounded-xl bg-slate-900/65 border-white/20 text-white placeholder:text-slate-400"
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="newPass" className="text-blue-100 text-xs font-semibold">
                        ដាក់ពាក្យសម្ងាត់ថ្មីតែម្តង
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-300/80" />
                        <Input
                          id="newPass"
                          type="password"
                          value={newAccountPass}
                          onChange={(e) => setNewAccountPass(e.target.value)}
                          placeholder="វាយពាក្យសម្ងាត់ថ្មី (យ៉ាងតិច ៦ ខ្ទង់)..."
                          style={{ fontSize: '13px' }}
                          className="pl-10 h-10 rounded-xl bg-slate-900/65 border-white/20 text-white placeholder:text-slate-400"
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white font-bold text-xs h-11 rounded-xl shadow-lg border-0"
                      disabled={loading}
                    >
                      {loading ? 'កំពុងដំណើរការ...' : 'ប្តូរពាក្យសម្ងាត់ថ្មី'}
                    </Button>
                  </form>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-white/15">
              <Link
                to="/signin"
                className="text-xs font-bold text-amber-300 hover:text-amber-200 hover:underline flex items-center gap-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> ចូលគណនី
              </Link>
              <Link
                to="/"
                className="text-xs font-semibold text-blue-200 hover:text-white hover:underline"
              >
                ត្រឡប់ទៅទំព័រដើម
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}