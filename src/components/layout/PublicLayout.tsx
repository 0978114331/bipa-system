import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';

export function PublicLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const hideFooter = location.pathname === '/attendance' || location.pathname === '/leave';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0b1120]">
      <Header />
      <main className="flex-1">{children}</main>
      {!hideFooter && <Footer />}
    </div>
  );
}