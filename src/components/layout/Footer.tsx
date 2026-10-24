import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/contexts/I18nContext';
import { cn } from '@/lib/utils';
import { GraduationCap, Mail, Phone, MapPin } from 'lucide-react';

export function Footer() {
  const { t, isKhmer } = useI18n();
  const navigate = useNavigate();

  const links = [
    { label: t('nav.home'), path: '/' },
    { label: t('nav.about'), path: '/about' },
    { label: t('nav.residence'), path: '/residence-info' },
    { label: t('nav.announcements'), path: '/announcements' },
    { label: t('nav.contact'), path: '/contact' },
  ];

  return (
    <footer className="bg-navy-gradient text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gold-gradient">
                <GraduationCap className="h-6 w-6 text-navy" />
              </div>
              <div>
                <div className={cn('text-sm font-bold', isKhmer && 'font-khmer')}>{t('system.name')}</div>
                <div className={cn('text-xs text-white/60', isKhmer && 'font-khmer')}>{t('system.nameKm')}</div>
              </div>
            </div>
            <p className={cn('text-sm text-white/60 max-w-xs', isKhmer && 'font-khmer')}>
              {t('hero.description')}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3 text-gold">Quick Links</h3>
            <ul className="space-y-2">
              {links.map((link) => (
                <li key={link.path}>
                  <button
                    onClick={() => navigate(link.path)}
                    className={cn('text-sm text-white/60 hover:text-white transition-colors', isKhmer && 'font-khmer')}
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3 text-gold">Contact</h3>
            <ul className="space-y-2 text-sm text-white/60">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" /> Khouvchvea123@gmail.com
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4" /> +855 978114331
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Phnom Penh, Cambodia
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-6 text-center text-xs text-white/40">
          &copy; {new Date().getFullYear()} {t('system.nameFull')}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
