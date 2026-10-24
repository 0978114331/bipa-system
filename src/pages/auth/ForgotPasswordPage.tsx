import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GraduationCap, Mail, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const { t, isKhmer } = useI18n();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.includes('@')) {
      setError(t('auth.emailInvalid'));
      return;
    }
    setLoading(true);
    const { error: resetError } = await resetPassword(email);
    setLoading(false);
    if (resetError) {
      setError(resetError);
    } else {
      setSuccess(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-gradient p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gold-gradient mb-3">
            <GraduationCap className="h-8 w-8 text-navy" />
          </div>
          <h1 className={cn('text-xl font-bold text-white', isKhmer && 'font-khmer')}>{t('auth.resetPassword')}</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('auth.resetPassword')}</CardTitle>
            <CardDescription>{t('auth.forgotPassword')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>{t('auth.checkEmail')}</AlertDescription>
              </Alert>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email">{t('auth.email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.edu"
                      className="pl-9"
                      disabled={loading}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-navy-gradient" disabled={loading}>
                  {loading ? t('auth.loading') : t('auth.sendResetLink')}
                </Button>
              </form>
            )}

            <div className="flex items-center justify-between">
              <Link to="/signin" className="text-xs text-muted-foreground hover:underline flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" /> {t('auth.signIn')}
              </Link>
              <Link to="/" className={cn('text-xs text-muted-foreground hover:underline', isKhmer && 'font-khmer')}>
                {t('auth.backToHome')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
