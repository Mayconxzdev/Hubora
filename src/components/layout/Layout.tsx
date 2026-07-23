import * as React from 'react';
import { MobileNav, Sidebar, TopHeader } from './Sidebar';
import { Footer } from './Footer';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

const NAV_STORAGE_KEY = 'hubora:navigation-pinned';

export function Layout({ children }: LayoutProps) {
  const [navPinned, setNavPinned] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(NAV_STORAGE_KEY) === 'true';
  });

  React.useEffect(() => {
    window.localStorage.setItem(NAV_STORAGE_KEY, String(navPinned));
  }, [navPinned]);

  return (
    <div className={cn('hub-shell bg-background text-foreground', navPinned && 'hub-nav-is-pinned')}>
      <a className="hub-skip-link" href="#hub-main-content">Pular para o conteúdo</a>
      <Sidebar pinned={navPinned} onPinnedChange={setNavPinned} />
      <TopHeader />
      <main id="hub-main-content" tabIndex={-1} className="hub-main min-h-[calc(100vh-var(--hub-header-height))]">
        <div className="hub-content">{children}</div>
        <Footer />
      </main>
      <MobileNav />
    </div>
  );
}
