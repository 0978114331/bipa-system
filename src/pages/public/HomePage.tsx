import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {Users, QrCode, DollarSign, Package, FileText, CalendarClock, Building2, Megaphone, ArrowRight, GraduationCap, ShieldCheck,Network, Activity,} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TranslationKey } from '@/types';

export function HomePage() {
  const { user } = useAuth();
  const { t, isKhmer } = useI18n();
  const navigate = useNavigate();

  const features: { key: TranslationKey; descKey: TranslationKey; icon: typeof Users; color: string }[] = [
    { key: 'feature.studentInfo', descKey: 'feature.studentInfoDesc', icon: Users, color: 'text-blue-600' },
    { key: 'feature.qrAttendance', descKey: 'feature.qrAttendanceDesc', icon: QrCode, color: 'text-green-600' },
    { key: 'feature.payments', descKey: 'feature.paymentsDesc', icon: DollarSign, color: 'text-amber-600' },
    { key: 'feature.rice', descKey: 'feature.riceDesc', icon: Package, color: 'text-orange-600' },
    { key: 'feature.leave', descKey: 'feature.leaveDesc', icon: FileText, color: 'text-purple-600' },
    { key: 'feature.duty', descKey: 'feature.dutyDesc', icon: CalendarClock, color: 'text-cyan-600' },
    { key: 'feature.facilities', descKey: 'feature.facilitiesDesc', icon: Building2, color: 'text-slate-600' },
    { key: 'feature.announcements', descKey: 'feature.announcementsDesc', icon: Megaphone, color: 'text-rose-600' },
  ];

  const handleFeatureClick = (featureKey: TranslationKey) => {
    if (!user) {
      navigate('/signin', { state: { from: '/dashboard' } });
      return;
    }
    if (user) {
      navigate('/dashboard');
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-navy-gradient text-white">
        {/* Network pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Decorative circles */}
        <div className="absolute top-20 right-20 w-64 h-64 rounded-full bg-gold/10 blur-3xl" />
        <div className="absolute bottom-10 left-10 w-48 h-48 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-6 animate-fade-in-up">
              <Badge className="bg-gold/20 text-gold border-gold/30 hover:bg-gold/20">
                <ShieldCheck className="h-3 w-3 mr-1" />
                {t('system.nameFull')}
              </Badge>

              <h1 className={cn('text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight', isKhmer && 'font-khmer')}>
                {isKhmer ? t('hero.titleKm') : t('hero.title')}
              </h1>

              {!isKhmer && (
                <p className={cn('text-lg text-white/60 font-khmer')}>
                  {t('hero.titleKm')}
                </p>
              )}

              <p className={cn('text-base text-white/70 max-w-xl', isKhmer && 'font-khmer')}>
                {t('hero.description')}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  size="lg"
                  onClick={() => navigate('/about')}
                  className="bg-gold-gradient text-navy hover:opacity-90 font-semibold"
                >
                  {t('hero.learnMore')}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                {!user ? (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate('/signin')}
                    className="border-white/30 text-white hover:bg-white/10 hover:text-white"
                  >
                    {t('hero.signIn')}
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate('/dashboard')}
                    className="border-white/30 text-white hover:bg-white/10 hover:text-white"
                  >
                    {t('nav.dashboard')}
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-6 pt-4">
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <Network className="h-4 w-4 text-gold" />
                  <span>QR Attendance</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <Activity className="h-4 w-4 text-gold" />
                  <span>Real-time Tracking</span>
                </div>
              </div>
            </div>

            {/* Right visual */}
            <div className="hidden lg:flex justify-center">
              <div className="relative">
                <div className="w-80 h-80 rounded-2xl bg-white/5 backdrop-blur border border-white/10 flex items-center justify-center">
                  <GraduationCap className="h-32 w-32 text-gold/60" />
                </div>
                <div className="absolute -top-4 -right-4 w-24 h-24 rounded-xl bg-gold-gradient flex items-center justify-center shadow-lg">
                  <QrCode className="h-12 w-12 text-navy" />
                </div>
                <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center">
                  <Users className="h-10 w-10 text-gold" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-10">
          <h2 className={cn('text-2xl font-bold text-foreground', isKhmer && 'font-khmer')}>
            {t('system.nameFull')}
          </h2>
          <p className="text-muted-foreground mt-2">Comprehensive residence management features</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature) => (
            <Card
              key={feature.key}
              className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer group"
              onClick={() => handleFeatureClick(feature.key)}
            >
              <CardHeader className="pb-3">
                <div className={cn('w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-2 group-hover:bg-primary/10 transition-colors', feature.color)}>
                  <feature.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">{t(feature.key)}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className={cn('text-sm', isKhmer && 'font-khmer')}>
                  {t(feature.descKey)}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-muted/50 border-y">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-navy">8</div>
              <div className="text-sm text-muted-foreground mt-1">Core Features</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-navy">2</div>
              <div className="text-sm text-muted-foreground mt-1">Residences</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-navy">5</div>
              <div className="text-sm text-muted-foreground mt-1">Role Types</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-navy">24/7</div>
              <div className="text-sm text-muted-foreground mt-1">Availability</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="rounded-2xl bg-navy-gradient p-8 lg:p-12 text-center text-white">
            <h2 className={cn('text-2xl font-bold mb-3', isKhmer && 'font-khmer')}>
              {t('auth.createAccountDesc')}
            </h2>
            <p className="text-white/60 mb-6 max-w-xl mx-auto">
              {t('hero.description')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" onClick={() => navigate('/signup')} className="bg-gold-gradient text-navy font-semibold">
                {t('nav.createAccount')}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/signin')} className="border-white/30 text-white hover:bg-white/10 hover:text-white">
                {t('nav.signIn')}
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
