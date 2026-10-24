import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Home, Info, Building2, Megaphone, Phone, LogIn, UserPlus,
  LogOut, LayoutDashboard, User, Menu, Sun, Moon, Languages,
  GraduationCap, ChevronDown, Shield, Camera, QrCode, Eye
} from 'lucide-react';
import { TranslationKey } from '@/types';
import { cn } from '@/lib/utils';

export function Header() {
  const { user, profile, signOut, hasRole } = useAuth();
  const { t, lang, setLang, isKhmer } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: { key: TranslationKey; path: string; icon: typeof Home }[] = [
    { key: 'nav.home', path: '/', icon: Home },
    { key: 'nav.about', path: '/about', icon: Info },
    { key: 'nav.residence', path: '/residence-info', icon: Building2 },
    { key: 'nav.announcements', path: '/announcements', icon: Megaphone },
    { key: 'nav.contact', path: '/contact', icon: Phone },
  ];

  const isActive = (path: string) => location.pathname === path;
  const isAdmin = hasRole('super_admin', 'residence_admin', 'finance_admin', 'duty_manager');
  const isAdminRoute = location.pathname.startsWith('/admin');

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-navy-gradient text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          <button onClick={() => navigate('/')} className="flex items-center gap-2 shrink-0">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gold-gradient">
              <GraduationCap className="h-6 w-6 text-navy" />
            </div>
            <div className="hidden sm:block text-left">
              <div className={cn('text-sm font-bold leading-tight', isKhmer && 'font-khmer')}>{t('system.name')}</div>
              <div className={cn('text-xs text-white/60 leading-tight', isKhmer && 'font-khmer')}>{t('system.nameKm')}</div>
            </div>
          </button>

          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive(item.path) ? 'bg-gold/15 text-gold' : 'text-navy-foreground/80 hover:bg-white/10 hover:text-white'
                )}
              >
                <item.icon className="h-4 w-4" />
                {t(item.key)}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            
            {user && (
              <div className="hidden sm:flex items-center mr-2 border-r border-white/20 pr-4">
                <Button 
                  size="icon" 
                  onClick={() => navigate(isAdmin ? '/admin/attendance' : '/dashboard/scan')} 
                  className="bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-xl shadow-lg shadow-blue-500/30 w-9 h-9 sm:w-10 sm:h-10 border-0"
                >
                  <QrCode className="h-5 w-5" />
                </Button>
              </div>
            )}

            <Button variant="ghost" size="sm" onClick={() => setLang(lang === 'en' ? 'km' : 'en')} className="text-white hover:bg-white/10 gap-1">
              <Languages className="h-4 w-4" />
              <span className="text-xs font-semibold">{lang === 'en' ? 'ខ្មែរ' : 'EN'}</span>
            </Button>

            <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-white hover:bg-white/10">
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-white hover:bg-white/10 gap-2 px-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-gold text-navy text-xs">
                        {profile?.display_name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-sm font-medium max-w-[100px] truncate">{profile?.display_name}</span>
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">{profile?.display_name}</span>
                      <span className="text-xs text-muted-foreground">{profile?.email}</span>
                      <Badge variant="secondary" className="mt-1 w-fit text-xs">
                        {profile?.role ? t(`role.${profile.role.replace(/_([a-z])/g, (_, c) => c.toUpperCase())}` as TranslationKey) : 'Student'}
                      </Badge>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/dashboard')}><LayoutDashboard className="h-4 w-4 mr-2" />{t('nav.dashboard')}</DropdownMenuItem>
                  
                  {isAdminRoute ? (
                    <DropdownMenuItem onClick={() => navigate('/')}><Eye className="h-4 w-4 mr-2" />View Site</DropdownMenuItem>
                  ) : (
                    isAdmin && <DropdownMenuItem onClick={() => navigate('/admin')}><Shield className="h-4 w-4 mr-2" />{t('dashboard.adminDashboard')}</DropdownMenuItem>
                  )}

                  <DropdownMenuItem onClick={() => navigate('/profile')}><User className="h-4 w-4 mr-2" />{t('nav.profile')}</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive"><LogOut className="h-4 w-4 mr-2" />{t('nav.signOut')}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigate('/signin')} className="text-white hover:bg-white/10"><LogIn className="h-4 w-4 mr-1" />{t('nav.signIn')}</Button>
                <Button size="sm" onClick={() => navigate('/signup')} className="bg-gold-gradient text-navy font-semibold"><UserPlus className="h-4 w-4 mr-1" />{t('nav.createAccount')}</Button>
              </div>
            )}

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden text-white hover:bg-white/10"><Menu className="h-5 w-5" /></Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px]">
                <nav className="flex flex-col gap-2 mt-8">
                  {user && (
                    <>
                      {isAdminRoute ? (
                        <Button onClick={() => { navigate('/'); setMobileOpen(false); }} className="w-full bg-navy-gradient text-white justify-start"><Eye className="h-4 w-4 mr-2" /> View Site</Button>
                      ) : (
                        isAdmin && <Button onClick={() => { navigate('/admin'); setMobileOpen(false); }} className="w-full bg-navy-gradient text-white justify-start"><Shield className="h-4 w-4 mr-2" /> {t('dashboard.adminDashboard')}</Button>
                      )}
                      <Button onClick={() => { navigate(isAdmin ? '/admin/attendance' : '/dashboard/scan'); setMobileOpen(false); }} className="w-full bg-gold-gradient text-navy font-bold justify-start"><Camera className="h-4 w-4 mr-2" /> {t('qr.scan')}</Button>
                      <div className="h-px bg-border my-2" />
                    </>
                  )}
                  {navItems.map((item) => (
                    <Button key={item.path} variant="ghost" onClick={() => { navigate(item.path); setMobileOpen(false); }} className="justify-start w-full">
                      <item.icon className="h-4 w-4 mr-2" />{t(item.key)}
                    </Button>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}