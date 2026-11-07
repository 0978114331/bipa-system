import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  GraduationCap,
  Mail,
  Lock,
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound
} from 'lucide-react';

const AUTH_BG_URL = 'https://i.ibb.co/KY0bJNW/b151bd61-2587-445b-b245-2ddaea928120.png';

function formatEmailAuto(raw: string): string {
  const clean = raw.trim();
  if (!clean) return '';
  if (!clean.includes('@')) {
    return `${clean}@gmail.com`;
  }
  if (clean.toLowerCase().endsWith('@gmail')) {
    return `${clean}.com`;
  }
  return clean;
}

export function SignInPage() {
  const { signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [systemName, setSystemName] = useState('ប្រព័ន្ធគ្រប់គ្រងមណ្ឌលនិស្សិត');
  const [adminLogoUrl, setAdminLogoUrl] = useState(
    'https://i.ibb.co/tphX7kd4/ce2e43f3-9d48-4d71-86a6-dd1ac3d77c49.png'
  );

  useEffect(() => {
    supabase
      .from('bipa_settings')
      .select('*')
      .eq('id', '1')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.logo_url) setAdminLogoUrl(data.logo_url);
        if (data?.name_km) setSystemName(data.name_km);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('សូមបញ្ចូលអ៊ីមែល និងពាក្យសម្ងាត់របស់អ្នក។');
      return;
    }

    const finalEmail = formatEmailAuto(email);
    setLoading(true);
    const { error: signInError } = await signIn(finalEmail, password);
    setLoading(false);

    if (signInError) {
      const localResetPass = localStorage.getItem(
        `bipa_local_pwd_${finalEmail.toLowerCase()}`
      );
      if (localResetPass && localResetPass === password) {
        navigate(from);
        return;
      }
      setError('អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវទេ។ បើភ្លេច សូមចុច "ភ្លេចពាក្យសម្ងាត់?"');
    } else {
      navigate(from);
    }
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
        @keyframes breathingFloat {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-5px) scale(1.06); }
        }
        .animate-float-logo {
          animation: breathingFloat 3.5s ease-in-out infinite;
        }
      `}</style>

      <img
        src={AUTH_BG_URL}
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover object-center scale-105 pointer-events-none"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#06122e]/60 via-[#091e4a]/65 to-[#040d21]/85 backdrop-blur-[2px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[410px] my-auto">
        <div className="flex flex-col items-center mb-5 space-y-2.5 text-center">
          <div
            onClick={() => navigate('/')}
            className="animate-float-logo flex items-center justify-center w-20 h-20 rounded-full bg-white/95 p-1.5 shadow-[0_0_30px_rgba(59,130,246,0.6)] border-2 border-white/80 cursor-pointer"
          >
            {adminLogoUrl ? (
              <img
                src={adminLogoUrl}
                alt="System Logo"
                className="w-full h-full object-contain rounded-full"
              />
            ) : (
              <GraduationCap className="h-10 w-10 text-blue-700" />
            )}
          </div>
          <div className="space-y-1">
            <h1 className="bipa-auth-title text-lg sm:text-xl text-white tracking-wide drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]">
              {systemName}
            </h1>
            <p className="text-xs sm:text-[13px] font-medium text-blue-100/90 drop-shadow">
              ចូលប្រើប្រាស់គណនីរបស់អ្នកដើម្បីបន្ត
            </p>
          </div>
        </div>

        <Card className="bg-slate-950/45 backdrop-blur-xl border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,0.6)] rounded-3xl overflow-hidden text-white">
          <CardContent className="p-5 sm:p-6">
            {error && (
              <Alert
                className="mb-4 bg-rose-950/70 backdrop-blur-md border-rose-500/50 text-rose-200 py-2.5 rounded-2xl"
                variant="destructive"
              >
                <AlertCircle className="h-4 w-4 text-rose-400" />
                <AlertDescription className="text-xs font-semibold leading-relaxed">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-blue-100 text-xs font-semibold" htmlFor="email">
                  អ៊ីមែល (Email)
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-300/80" />
                  <Input
                    id="email"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="បញ្ចូលអ៊ីមែល (ឧ. name@gmail.com)"
                    style={{ fontSize: '13px' }}
                    className="pl-10 h-11 rounded-xl bg-slate-900/60 border-white/20 text-white placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:border-sky-400 font-medium"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-blue-100 text-xs font-semibold" htmlFor="password">
                    ពាក្យសម្ងាត់
                  </Label>
                  <Link
                    className="text-[11px] font-bold text-amber-300 hover:text-amber-200 hover:underline flex items-center gap-1"
                    to="/forgot-password"
                  >
                    <KeyRound className="h-3 w-3" />
                    <span>ភ្លេចពាក្យសម្ងាត់ ឬលេខកូដ?</span>
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-300/80" />
                  <Input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{ fontSize: '13px' }}
                    className="pl-10 pr-10 h-11 rounded-xl bg-slate-900/60 border-white/20 text-white placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:border-sky-400 font-medium"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-white p-1"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <Button
                  className="flex-1 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white h-11 text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-blue-500/35 border-0 transition-all active:scale-95"
                  disabled={loading}
                  type="submit"
                >
                  {loading ? 'កំពុងចូល...' : 'ចូលគណនី'}
                </Button>

                <span className="text-xs text-blue-200/80 font-semibold">ឬ</span>

                <Button
                  className="flex-1 bg-white/10 hover:bg-white/20 border border-white/25 text-white h-11 text-xs sm:text-sm font-bold rounded-xl backdrop-blur-md transition-all active:scale-95"
                  disabled={loading}
                  onClick={signInWithGoogle}
                  type="button"
                  variant="outline"
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Google
                </Button>
              </div>
            </form>
          </CardContent>

          <div className="bg-slate-950/50 px-5 py-3.5 border-t border-white/15 text-center">
            <p className="text-xs text-blue-100/90 font-medium">
              មិនទាន់មានគណនីមែនទេ?{' '}
              <Link
                className="text-amber-400 hover:text-amber-300 font-bold hover:underline ml-1"
                to="/signup"
              >
                បង្កើតគណនីថ្មី
              </Link>
            </p>
          </div>
        </Card>

        <div className="mt-5 flex justify-center">
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 rounded-full bg-slate-950/40 hover:bg-slate-950/65 border border-white/15 backdrop-blur-md text-xs font-bold text-blue-100 hover:text-white transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            ត្រឡប់ទៅទំព័រដើម
          </Link>
        </div>
      </div>
    </div>
  );
}