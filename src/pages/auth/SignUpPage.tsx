import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GraduationCap, Mail, Lock, User as UserIcon, AlertCircle, ArrowLeft } from 'lucide-react';

export function SignUpPage() {
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const systemName = "ប្រព័ន្ធគ្រប់គ្រងមណ្ឌលនិស្សិត"; 
  const adminLogoUrl = "https://i.ibb.co/tphX7kd4/ce2e43f3-9d48-4d71-86a6-dd1ac3d77c49.png";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('ពាក្យសម្ងាត់បញ្ជាក់មិនផ្ទៀងផ្ទាត់ទេ។');
      return;
    }

    if (password.length < 6) {
      setError('ពាក្យសម្ងាត់ត្រូវមានយ៉ាងតិច ៦ តួអក្សរ។');
      return;
    }

    setLoading(true);
    const { error: signUpError } = await signUp(email, password, fullName);
    setLoading(false);

    if (signUpError) {
      setError(signUpError);
    } else {
      navigate('/dashboard'); 
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-3 md:p-4 font-khmer">
      <style>{`
        @keyframes breathingZoom {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.12); }
        }
        .animate-zoom-breathing {
          animation: breathingZoom 3s ease-in-out infinite;
        }
      `}</style>

      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-5 space-y-2">
          <div className="animate-zoom-breathing flex items-center justify-center w-16 h-16 rounded-2xl bg-transparent cursor-pointer">
            {adminLogoUrl ? (
              <img src={adminLogoUrl} alt="System Logo" className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(234,179,8,0.3)]" />
            ) : (
              <GraduationCap className="h-9 w-9 text-[#0f172a]" />
            )}
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-wide">
              {systemName}
            </h1>
            <p className="text-xs text-slate-400">បង្កើតគណនីរបស់អ្នកដើម្បីប្រើប្រាស់មុខងារ</p>
          </div>
        </div>

        <Card className="bg-[#1e293b] border-slate-700 shadow-2xl rounded-xl overflow-hidden">
          <CardContent className="p-5 md:p-6">
            {error && (
              <Alert variant="destructive" className="mb-4 bg-red-950/50 border-red-900 text-red-400 py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-slate-300 text-xs">ឈ្មោះពេញ</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e: any) => setFullName(e.target.value)}
                    placeholder="នាមត្រកូល និងនាមខ្លួន"
                    className="pl-9 h-10 bg-[#0f172a] border-slate-700 text-white focus-visible:ring-[#3b82f6] text-sm"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-300 text-xs">អ៊ីមែល</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e: any) => setEmail(e.target.value)}
                    placeholder="you@example.edu"
                    className="pl-9 h-10 bg-[#0f172a] border-slate-700 text-white focus-visible:ring-[#3b82f6] text-sm"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-slate-300 text-xs">ពាក្យសម្ងាត់</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e: any) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9 h-10 bg-[#0f172a] border-slate-700 text-white focus-visible:ring-[#3b82f6] text-sm"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-slate-300 text-xs">បញ្ជាក់ពាក្យសម្ងាត់</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e: any) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9 h-10 bg-[#0f172a] border-slate-700 text-white focus-visible:ring-[#3b82f6] text-sm"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button 
                  type="submit" 
                  className="flex-1 bg-[#3b82f6] hover:bg-[#2563eb] text-white h-11 text-sm font-semibold rounded-lg shadow-lg shadow-blue-500/30" 
                  disabled={loading}
                >
                  {loading ? 'រង់ចាំ...' : 'បង្កើតគណនី'}
                </Button>
                
                <span className="text-xs text-slate-400 font-medium">ឬ</span>
                
                <Button 
                  variant="outline" 
                  type="button" 
                  className="flex-1 bg-[#0f172a] border-slate-600 text-white hover:bg-slate-800 hover:text-white h-11 text-sm rounded-lg" 
                  onClick={signInWithGoogle}
                  disabled={loading}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Google
                </Button>
              </div>
            </form>
          </CardContent>

          <div className="bg-[#0f172a]/50 px-5 py-3 border-t border-slate-800 text-center">
            <p className="text-[13px] text-slate-400">
              មានគណនីរួចហើយ?{' '}
              <Link to="/signin" className="text-[#eab308] hover:text-yellow-400 font-semibold hover:underline ml-1">
                ចូលគណនី
              </Link>
            </p>
          </div>
        </Card>

        <div className="mt-6 flex justify-center">
          <Link to="/" className="flex items-center text-sm text-slate-400 hover:text-slate-200 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            ត្រឡប់ទៅទំព័រដើម
          </Link>
        </div>
      </div>
    </div>
  );
}