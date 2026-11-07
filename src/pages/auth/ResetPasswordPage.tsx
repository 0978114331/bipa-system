import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  GraduationCap,
  Lock,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';

const AUTH_BG_URL = 'https://i.ibb.co/KY0bJNW/b151bd61-2587-445b-b245-2ddaea928120.png';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const [adminLogoUrl, setAdminLogoUrl] = useState(
    'https://i.ibb.co/tphX7kd4/ce2e43f3-9d48-4d71-86a6-dd1ac3d77c49.png'
  );

  useEffect(() => {
    supabase
      .from('bipa_settings')
      .select('logo_url')
      .eq('id', '1')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.logo_url) setAdminLogoUrl(data.logo_url);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('ពាក្យសម្ងាត់ត្រូវមានយ៉ាងតិច ៦ តួអក្សរ។');
      return;
    }
    if (password !== confirmPassword) {
      setError('ពាក្យសម្ងាត់បញ្ជាក់មិនផ្ទៀងផ្ទាត់គ្នាទេ។');
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSuccess(true);
    setTimeout(() => {
      navigate('/dashboard');
    }, 1500);
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

      <div className="relative z-10 w-full max-w-[410px] my-auto">
        <div className="flex flex-col items-center mb-5 space-y-2 text-center">
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-white/95 p-1.5 shadow-[0_0_30px_rgba(59,130,246,0.6)] border-2 border-white/80">
            {adminLogoUrl ? (
              <img
                src={adminLogoUrl}
                alt="Logo"
                className="w-full h-full object-contain rounded-full"
              />
            ) : (
              <GraduationCap className="h-10 w-10 text-blue-700" />
            )}
          </div>
          <h1 className="bipa-auth-title text-lg sm:text-xl text-white tracking-wide drop-shadow">
            កំណត់ពាក្យសម្ងាត់ថ្មី
          </h1>
          <p className="text-xs font-medium text-blue-100/90">
            សូមបញ្ចូលពាក្យសម្ងាត់ថ្មីរបស់អ្នកនៅខាងក្រោម
          </p>
        </div>

        <Card className="bg-slate-950/45 backdrop-blur-xl border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,0.6)] rounded-3xl overflow-hidden text-white">
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

            {success ? (
              <Alert className="bg-emerald-950/80 border-emerald-500/50 text-emerald-200 rounded-2xl">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <AlertDescription className="text-xs font-bold">
                  បានផ្លាស់ប្តូរពាក្យសម្ងាត់ដោយជោគជ័យ! កំពុងបញ្ជូនទៅទំព័រគ្រប់គ្រង...
                </AlertDescription>
              </Alert>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-blue-100 text-xs font-semibold">
                    ពាក្យសម្ងាត់ថ្មី
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-300/80" />
                    <Input
                      id="password"
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{ fontSize: '13px' }}
                      className="pl-10 pr-10 h-11 rounded-xl bg-slate-900/65 border-white/20 text-white placeholder:text-slate-400"
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

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-blue-100 text-xs font-semibold">
                    បញ្ជាក់ពាក្យសម្ងាត់ថ្មី
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-300/80" />
                    <Input
                      id="confirmPassword"
                      type={showPass ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{ fontSize: '13px' }}
                      className="pl-10 h-11 rounded-xl bg-slate-900/65 border-white/20 text-white placeholder:text-slate-400"
                      disabled={loading}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white font-bold text-xs sm:text-sm h-11 rounded-xl shadow-lg border-0"
                  disabled={loading}
                >
                  {loading ? 'កំពុងរក្សាទុក...' : 'រក្សាទុកពាក្យសម្ងាត់ថ្មី'}
                </Button>
              </form>
            )}

            <div className="text-center pt-2 border-t border-white/15">
              <Link
                to="/signin"
                className="inline-flex items-center text-xs font-bold text-amber-300 hover:text-amber-200 hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                ត្រឡប់ទៅទំព័រចូលគណនី
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}