import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Home, Info, Building2, Megaphone, Phone, LogIn, UserPlus,
  LogOut, LayoutDashboard, User, Menu, Sun, Moon, Languages,
  GraduationCap, ChevronDown, Shield, QrCode, Eye, UserCheck, FileText, LayoutGrid, X
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
  const [showScanner, setShowScanner] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const systemLogoUrl = "https://i.ibb.co/tphX7kd4/ce2e43f3-9d48-4d71-86a6-dd1ac3d77c49.png";
  const systemNameEn = "BIPA";
  const systemNameKm = "BIPA";
  const systemSubNameEn = "Student Residence Management System";
  const systemSubNameKm = "ប្រព័ន្ធគ្រប់គ្រងមណ្ឌលនិស្សិត";

  const mainNavItems = [
    { key: 'nav.home', path: '/', icon: Home, labelKm: 'ផ្ទះ', labelEn: 'Home' },
    { key: 'nav.attendance', path: '/attendance', icon: UserCheck, labelKm: 'វត្តមាន', labelEn: 'Attendance' },
    { key: 'nav.leave', path: '/leave', icon: FileText, labelKm: 'សុំច្បាប់', labelEn: 'Leave' },
    { key: 'nav.about', path: '/about', icon: Info, labelKm: 'អំពីយើង', labelEn: 'About' },
  ];

  const extraNavItems: { key: TranslationKey; path: string; icon: typeof Home }[] = [
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

  useEffect(() => {
    let stream: MediaStream | null = null;
    let scanInterval: any = null;

    const startCamera = async () => {
      if (!showScanner) return;
      try {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        if (videoRef.current && stream) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();

          if ('BarcodeDetector' in window) {
            const BarcodeDetectorClass = (window as any).BarcodeDetector;
            const detector = new BarcodeDetectorClass({ formats: ['qr_code'] });
            scanInterval = setInterval(async () => {
              if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                try {
                  const barcodes = await detector.detect(videoRef.current);
                  if (barcodes.length > 0) {
                    const code = barcodes[0].rawValue;
                    const saved = localStorage.getItem('bipa_attendance_records');
                    const list = saved ? JSON.parse(saved) : [];
                    const newEntry = {
                      id: Date.now(),
                      name: profile?.display_name || code || 'សិស្សស្កែន QR',
                      gender: 'ប្រុស',
                      time: new Date().toLocaleTimeString('en-US', { hour12: false }),
                      status: 'វត្តមាន',
                      date: new Date().toDateString()
                    };
                    localStorage.setItem('bipa_attendance_records', JSON.stringify([newEntry, ...list]));
                    window.dispatchEvent(new Event('attendance-updated'));
                    setShowScanner(false);
                    navigate('/attendance');
                  }
                } catch {}
              }
            }, 400);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    if (showScanner) {
      startCamera();
    }

    return () => {
      if (scanInterval) clearInterval(scanInterval);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [showScanner, navigate, profile]);

  const renderRole = (role?: string) => {
    if (!role) return 'STUDENT';
    return role.replace(/_/g, ' ').toUpperCase();
  };

  return (
    <>
      {showScanner && (
        <div className="fixed inset-0 z-[100] bg-[#09090b] flex flex-col items-center justify-center font-khmer p-4">
          <style>{`
            @keyframes scanLine {
              0% { top: 8%; }
              50% { top: 92%; }
              100% { top: 8%; }
            }
            .animate-scan {
              animation: scanLine 2.5s ease-in-out infinite;
            }
          `}</style>
          
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-2xl overflow-hidden mb-8 bg-black shadow-2xl">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover"
            />
            
            <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-white rounded-tl-2xl z-10 pointer-events-none" />
            <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-white rounded-tr-2xl z-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-white rounded-bl-2xl z-10 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-white rounded-br-2xl z-10 pointer-events-none" />

            <div className="absolute left-3 right-3 h-0.5 bg-green-400 shadow-[0_0_12px_#4ade80] animate-scan z-20 pointer-events-none" />
          </div>

          <p className="text-slate-500 text-xs mb-8">ដាក់កូដ QR ឱ្យចំកណ្តាល</p>

          <Button 
            onClick={() => setShowScanner(false)} 
            className="bg-[#1e1e24] hover:bg-[#2a2a32] text-white rounded-xl px-6 py-5 border border-white/10 shadow-lg text-xs"
          >
            <X className="h-4 w-4 mr-2" />
            បិទកាមេរ៉ា
          </Button>
        </div>
      )}

      <header className="sticky top-0 z-50 bg-[#0f172a] text-white shadow-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden shrink-0 bg-white">
                {systemLogoUrl ? (
                  <img src={systemLogoUrl} alt="Logo" className="w-full h-full object-contain p-0.5" />
                ) : (
                  <div className="flex items-center justify-center w-full h-full bg-gold-gradient">
                    <GraduationCap className="h-6 w-6 text-navy" />
                  </div>
                )}
              </div>
              <div className="text-left flex flex-col justify-center">
                <div className={cn('text-base sm:text-xl font-bold leading-tight tracking-wide', isKhmer && 'font-khmer')}>
                  {lang === 'km' ? systemNameKm : systemNameEn}
                </div>
                <div className={cn('text-[10px] sm:text-xs text-white/70 leading-tight mt-0.5 hidden sm:block', isKhmer && 'font-khmer')}>
                  {lang === 'km' ? systemSubNameKm : systemSubNameEn}
                </div>
              </div>
            </button>

            <div className="hidden md:flex items-center bg-[#1e293b] rounded-full px-2 py-1.5 shadow-inner border border-slate-700/50">
              {mainNavItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-all duration-300',
                    isActive(item.path) ? 'bg-[#3b82f6] text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className={cn(isKhmer && 'font-khmer')}>{lang === 'km' ? item.labelKm : item.labelEn}</span>
                </button>
              ))}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all duration-300">
                    <LayoutGrid className="h-4 w-4" />
                    <span className={cn(isKhmer && 'font-khmer')}>{lang === 'km' ? 'ម៉ឺនុយ' : 'Menu'}</span>
                    <ChevronDown className="h-3 w-3 opacity-70" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-[#1e293b] border-slate-700 text-white">
                  {extraNavItems.map((item) => (
                    <DropdownMenuItem key={item.path} onClick={() => navigate(item.path)} className="hover:bg-slate-800 cursor-pointer">
                      <item.icon className="h-4 w-4 mr-3 text-slate-400" />
                      {t(item.key)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center md:mr-2 md:border-r border-slate-700 md:pr-4">
                <Button 
                  onClick={() => setShowScanner(true)} 
                  className="bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.4)] w-10 h-10 sm:w-11 sm:h-11 border-0 p-0 flex items-center justify-center transition-transform hover:scale-105"
                >
                  <QrCode className="h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
              </div>

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="hidden md:flex text-white hover:bg-slate-800 gap-2 px-2 h-11 rounded-xl">
                      <Avatar className="h-8 w-8 border border-slate-600">
                        <AvatarImage src={profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-[#eab308] text-[#0f172a] text-xs font-bold">
                          {profile?.display_name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col items-start justify-center">
                        <span className="text-sm font-medium max-w-[100px] truncate leading-none">{profile?.display_name}</span>
                        <span className="text-[10px] text-slate-400 mt-1 uppercase leading-none">{renderRole(profile?.role)}</span>
                      </div>
                      <ChevronDown className="h-4 w-4 opacity-50 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-[#1e293b] border-slate-700 text-white">
                    <DropdownMenuLabel>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium">{profile?.display_name}</span>
                        <span className="text-xs text-slate-400">{profile?.email}</span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-slate-700" />
                    <DropdownMenuItem onClick={() => navigate('/dashboard')} className="hover:bg-slate-800 cursor-pointer"><LayoutDashboard className="h-4 w-4 mr-3 text-slate-400" />{t('nav.dashboard')}</DropdownMenuItem>
                    
                    {isAdminRoute ? (
                      <DropdownMenuItem onClick={() => navigate('/')} className="hover:bg-slate-800 cursor-pointer"><Eye className="h-4 w-4 mr-3 text-slate-400" />View Site</DropdownMenuItem>
                    ) : (
                      isAdmin && <DropdownMenuItem onClick={() => navigate('/admin')} className="hover:bg-slate-800 cursor-pointer"><Shield className="h-4 w-4 mr-3 text-slate-400" />{t('dashboard.adminDashboard')}</DropdownMenuItem>
                    )}

                    <DropdownMenuItem onClick={() => navigate('/profile')} className="hover:bg-slate-800 cursor-pointer"><User className="h-4 w-4 mr-3 text-slate-400" />{t('nav.profile')}</DropdownMenuItem>
                    
                    <DropdownMenuSeparator className="bg-slate-700" />
                    <div className="px-2 py-2 flex items-center justify-between">
                      <Button variant="ghost" size="sm" onClick={() => setLang(lang === 'en' ? 'km' : 'en')} className="text-slate-300 hover:text-white hover:bg-slate-800">
                        <Languages className="h-4 w-4 mr-2" />
                        {lang === 'en' ? 'KH' : 'EN'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={toggleTheme} className="text-slate-300 hover:text-white hover:bg-slate-800">
                        {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                      </Button>
                    </div>
                    <DropdownMenuSeparator className="bg-slate-700" />

                    <DropdownMenuItem onClick={handleSignOut} className="text-red-400 hover:bg-slate-800 hover:text-red-300 cursor-pointer"><LogOut className="h-4 w-4 mr-3" />{t('nav.signOut')}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="hidden md:flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => navigate('/signin')} className="text-white hover:bg-white/10"><LogIn className="h-4 w-4 mr-2" />{t('nav.signIn')}</Button>
                  <Button size="sm" onClick={() => navigate('/signup')} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold"><UserPlus className="h-4 w-4 mr-2" />{t('nav.createAccount')}</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#0f172a] border-t border-slate-200 dark:border-slate-800 flex items-center justify-around h-16 pb-safe px-1 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
        <button onClick={() => navigate('/')} className={cn("flex flex-col items-center justify-center w-full gap-1 transition-colors", isActive('/') ? "text-[#3b82f6]" : "text-slate-500 dark:text-slate-400")}>
          <Home className="h-[22px] w-[22px]" />
          <span className={cn("text-[10px] font-medium", isKhmer && 'font-khmer')}>{lang === 'km' ? 'ផ្ទះ' : 'Home'}</span>
        </button>

        <button onClick={() => navigate('/attendance')} className={cn("flex flex-col items-center justify-center w-full gap-1 transition-colors", isActive('/attendance') ? "text-[#3b82f6]" : "text-slate-500 dark:text-slate-400")}>
          <div className={cn("p-1.5 rounded-full transition-colors", isActive('/attendance') ? "bg-blue-50 dark:bg-blue-950/60" : "")}>
            <UserCheck className="h-[20px] w-[20px]" />
          </div>
          <span className={cn("text-[10px] font-bold", isKhmer && 'font-khmer')}>{lang === 'km' ? 'វត្តមាន' : 'Attendance'}</span>
        </button>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center shrink-0 -mt-7 mx-1">
              <div className="bg-[#1e293b] text-white h-[52px] w-[52px] flex items-center justify-center rounded-full shadow-lg border-[4px] border-white dark:border-[#0f172a] transition-transform active:scale-95">
                <Menu className="h-6 w-6" />
              </div>
              <span className={cn("text-[10px] font-medium mt-1 text-slate-600 dark:text-slate-300", isKhmer && 'font-khmer')}>{lang === 'km' ? 'ម៉ឺនុយ' : 'Menu'}</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto bg-white dark:bg-[#0f172a] p-0 border-t border-slate-200 dark:border-slate-800">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <SheetDescription className="sr-only">Mobile navigation links</SheetDescription>
            <div className="p-5 flex flex-col gap-4">
              {user && (
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                  <Avatar className="h-10 w-10 border border-slate-200 dark:border-slate-600">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-[#3b82f6] text-white font-bold">
                      {profile?.display_name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-800 dark:text-white">{profile?.display_name}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{profile?.email}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-2">
                <Button variant="outline" size="sm" onClick={() => setLang(lang === 'en' ? 'km' : 'en')} className="flex items-center justify-center gap-2 h-10 border-slate-200 dark:border-slate-700 bg-transparent text-slate-700 dark:text-slate-200">
                  <Languages className="h-4 w-4" />
                  {lang === 'en' ? 'ប្តូរជាខ្មែរ' : 'English'}
                </Button>
                <Button variant="outline" size="sm" onClick={toggleTheme} className="flex items-center justify-center gap-2 h-10 border-slate-200 dark:border-slate-700 bg-transparent text-slate-700 dark:text-slate-200">
                  {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                </Button>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-1">Menu</div>
                
                {user && (
                  <>
                    <Button variant="ghost" onClick={() => { navigate('/dashboard'); setMobileOpen(false); }} className="w-full justify-start h-12 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
                      <LayoutDashboard className="h-5 w-5 mr-3 text-[#3b82f6]" /> {t('nav.dashboard')}
                    </Button>
                    {isAdminRoute ? (
                      <Button variant="ghost" onClick={() => { navigate('/'); setMobileOpen(false); }} className="w-full justify-start h-12 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <Eye className="h-5 w-5 mr-3 text-emerald-500" /> View Site
                      </Button>
                    ) : (
                      isAdmin && <Button variant="ghost" onClick={() => { navigate('/admin'); setMobileOpen(false); }} className="w-full justify-start h-12 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <Shield className="h-5 w-5 mr-3 text-[#eab308]" /> {t('dashboard.adminDashboard')}
                      </Button>
                    )}
                  </>
                )}

                {extraNavItems.map((item) => (
                  <Button key={item.path} variant="ghost" onClick={() => { navigate(item.path); setMobileOpen(false); }} className="w-full justify-start h-12 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <item.icon className="h-5 w-5 mr-3 text-slate-400" /> {t(item.key)}
                  </Button>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                {user ? (
                  <Button variant="ghost" onClick={() => { handleSignOut(); setMobileOpen(false); }} className="w-full justify-start h-12 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
                    <LogOut className="h-5 w-5 mr-3" /> {t('nav.signOut')}
                  </Button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" onClick={() => { navigate('/signin'); setMobileOpen(false); }} className="w-full h-11 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200">
                      <LogIn className="h-4 w-4 mr-2" /> {t('nav.signIn')}
                    </Button>
                    <Button onClick={() => { navigate('/signup'); setMobileOpen(false); }} className="w-full h-11 bg-[#3b82f6] hover:bg-[#2563eb] text-white">
                      <UserPlus className="h-4 w-4 mr-2" /> {t('nav.createAccount')}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <button onClick={() => navigate('/leave')} className={cn("flex flex-col items-center justify-center w-full gap-1 transition-colors", isActive('/leave') ? "text-[#3b82f6]" : "text-slate-500 dark:text-slate-400")}>
          <FileText className="h-[22px] w-[22px]" />
          <span className={cn("text-[10px] font-medium", isKhmer && 'font-khmer')}>{lang === 'km' ? 'សុំច្បាប់' : 'Leave'}</span>
        </button>

        <button onClick={() => navigate('/about')} className={cn("flex flex-col items-center justify-center w-full gap-1 transition-colors", isActive('/about') ? "text-[#3b82f6]" : "text-slate-500 dark:text-slate-400")}>
          <Info className="h-[22px] w-[22px]" />
          <span className={cn("text-[10px] font-medium", isKhmer && 'font-khmer')}>{lang === 'km' ? 'អំពីយើង' : 'About'}</span>
        </button>
      </div>
    </>
  );
}