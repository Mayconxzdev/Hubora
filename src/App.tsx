import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { get, set, del } from 'idb-keyval';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'sonner';
import { Layout } from '@/components/layout/Layout';
import { useEffect, Suspense, lazy, useState, type ReactNode } from 'react';
import { authService } from '@/services/auth';
import { useStore } from '@/store/useStore';
import { cloudService } from '@/services/cloud';
import { localRepository } from '@/services/localRepository';
import { AnimatePresence, MotionConfig } from 'motion/react';
import { PageTransition } from '@/components/layout/PageTransition';
import { ScrollToTop } from '@/components/layout/ScrollToTop';
import { ScrollToTopButton } from '@/components/ui/ScrollToTopButton';
import { requestPersistentStorage } from '@/lib/db';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { verifyUserAllowed } from '@/services/accessPolicy';
import { isSupabaseConfigured } from '@/lib/supabase';
import { notificationService } from '@/services/notifications';

import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import type { AuthUser } from '@/types';

// Lazy loading pages
const Home = lazy(() => import('@/pages/Home').then(m => ({ default: m.Home })));
const Discover = lazy(() => import('@/pages/Discover').then(m => ({ default: m.Discover })));
const Radar = lazy(() => import('@/pages/Radar').then(m => ({ default: m.Radar })));
const Details = lazy(() => import('@/pages/Details').then(m => ({ default: m.Details })));
const Library = lazy(() => import('@/pages/Library').then(m => ({ default: m.Library })));
const Diary = lazy(() => import('@/pages/Diary').then(m => ({ default: m.Diary }))); 
const Guide = lazy(() => import('@/pages/Guide').then(m => ({ default: m.Guide })));
const Releases = lazy(() => import('@/pages/Releases').then(m => ({ default: m.Releases })));
const Profile = lazy(() => import('@/pages/Profile').then(m => ({ default: m.Profile })));
const Settings = lazy(() => import('@/pages/Settings').then(m => ({ default: m.Settings })));
const Login = lazy(() => import('@/pages/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('@/pages/Register').then(m => ({ default: m.Register })));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const Movies = lazy(() => import('@/pages/Movies').then(m => ({ default: m.Movies })));
const Series = lazy(() => import('@/pages/Series').then(m => ({ default: m.Series })));
const Anime = lazy(() => import('@/pages/Anime').then(m => ({ default: m.Anime })));
const Manga = lazy(() => import('@/pages/Manga').then(m => ({ default: m.Manga })));
const Comics = lazy(() => import('@/pages/Comics').then(m => ({ default: m.Comics })));
const Books = lazy(() => import('@/pages/Books').then(m => ({ default: m.Books })));
const Novels = lazy(() => import('@/pages/Novels').then(m => ({ default: m.Novels })));
const Games = lazy(() => import('@/pages/Games').then(m => ({ default: m.Games })));
const Doramas = lazy(() => import('@/pages/Doramas').then(m => ({ default: m.Doramas })));
const Privacy = lazy(() => import('@/pages/Privacy').then(m => ({ default: m.Privacy })));
const Terms = lazy(() => import('@/pages/Terms').then(m => ({ default: m.Terms })));
const Wrapped = lazy(() => import('@/pages/Wrapped').then(m => ({ default: m.Wrapped })));
const Goals = lazy(() => import('@/pages/Goals').then(m => ({ default: m.Goals })));
const Connections = lazy(() => import('@/pages/Connections').then(m => ({ default: m.Connections })));
const AdultVault = lazy(() => import('@/pages/AdultVault').then(m => ({ default: m.AdultVault })));
const Sources = lazy(() => import('@/pages/Sources').then(m => ({ default: m.Sources })));
const Providers = lazy(() => import('@/pages/Providers').then(m => ({ default: m.Providers })));
const Reader = lazy(() => import('@/pages/Reader').then(m => ({ default: m.Reader })));
const Player = lazy(() => import('@/pages/Player').then(m => ({ default: m.Player })));
const Insights = lazy(() => import('@/pages/Insights').then(m => ({ default: m.Insights })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      refetchOnWindowFocus: false,
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: {
    getItem: async (key) => {
      const value = await get(key);
      return value as string | null;
    },
    setItem: async (key, value) => {
      await set(key, value);
    },
    removeItem: async (key) => {
      await del(key);
    },
  },
});

function LoadingFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-[color-mix(in_srgb,var(--hub-brand)_28%,transparent)] border-t-[var(--hub-brand)] rounded-full animate-spin" />
    </div>
  );
}

function AuthGate({ children, user, ready, accessApproved }: { children: ReactNode; user: AuthUser | null; ready: boolean; accessApproved: boolean }) {
  const location = useLocation();
  const requireAuth = import.meta.env.VITE_REQUIRE_AUTH !== 'false' && isSupabaseConfigured;
  const isGuestMode = typeof window !== 'undefined' && localStorage.getItem('hubora_guest_mode') === 'true';
  const publicPaths = ['/login', '/register', '/forgot-password', '/privacy', '/terms'];
  const isPublic = publicPaths.some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`));

  if (isPublic) return <>{children}</>;
  if (!ready) return <LoadingFallback />;
  if (!requireAuth || isGuestMode) return <>{children}</>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!accessApproved) return <Navigate to="/login?denied=1" replace />;
  return <>{children}</>;
}

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AnimatePresence mode="wait">
        <Routes location={location}>
          <Route path="/" element={<PageTransition><Home /></PageTransition>} />
          <Route path="/discover" element={<PageTransition><Discover /></PageTransition>} />
          <Route path="/radar" element={<PageTransition><Radar /></PageTransition>} />
          <Route path="/details/:id" element={<PageTransition><Details /></PageTransition>} />
          <Route path="/library" element={<PageTransition><Library /></PageTransition>} />
          <Route path="/diary" element={<PageTransition><Diary /></PageTransition>} />
          <Route path="/guide" element={<PageTransition><Guide /></PageTransition>} />
          <Route path="/releases" element={<PageTransition><Releases /></PageTransition>} />
          <Route path="/profile" element={<PageTransition><Profile /></PageTransition>} />
          <Route path="/settings" element={<PageTransition><Settings /></PageTransition>} />
          <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
          <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
          <Route path="/forgot-password" element={<PageTransition><ForgotPassword /></PageTransition>} />
          <Route path="/movies" element={<PageTransition><Movies /></PageTransition>} />
          <Route path="/series" element={<PageTransition><Series /></PageTransition>} />
          <Route path="/anime" element={<PageTransition><Anime /></PageTransition>} />
          <Route path="/manga" element={<PageTransition><Manga /></PageTransition>} />
          <Route path="/comics" element={<PageTransition><Comics /></PageTransition>} />
          <Route path="/books" element={<PageTransition><Books /></PageTransition>} />
          <Route path="/novels" element={<PageTransition><Novels /></PageTransition>} />
          <Route path="/games" element={<PageTransition><Games /></PageTransition>} />
          <Route path="/doramas" element={<PageTransition><Doramas /></PageTransition>} />
          <Route path="/privacy" element={<PageTransition><Privacy /></PageTransition>} />
          <Route path="/terms" element={<PageTransition><Terms /></PageTransition>} />
          <Route path="/wrapped" element={<PageTransition><Wrapped /></PageTransition>} />
          <Route path="/goals" element={<PageTransition><Goals /></PageTransition>} />
          <Route path="/connections" element={<PageTransition><Connections /></PageTransition>} />
          <Route path="/personal-media" element={<Navigate to="/sources" replace />} />
          <Route path="/vault" element={<PageTransition><AdultVault /></PageTransition>} />
          <Route path="/sources" element={<PageTransition><Sources /></PageTransition>} />
          <Route path="/providers" element={<PageTransition><Providers /></PageTransition>} />
          <Route path="/reader" element={<PageTransition><Reader /></PageTransition>} />
          <Route path="/player" element={<PageTransition><Player /></PageTransition>} />
          <Route path="/insights" element={<PageTransition><Insights /></PageTransition>} />
          <Route path="/community" element={<Navigate to="/" replace />} />
          <Route path="/duo" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
}

function AppChrome({ children }: { children: ReactNode }) {
  const location = useLocation();
  const authOnly = ['/login', '/register', '/forgot-password'].some((path) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`),
  );

  if (authOnly) {
    return <main className="min-h-screen p-3 sm:p-6">{children}</main>;
  }

  return (
    <>
      <ScrollToTopButton />
      <CommandPalette />
      <Layout>{children}</Layout>
    </>
  );
}

export default function App() {
  const { setUser, mergeRemoteLibrary, mergeRemoteCustomLists, initializeLocalData, syncNow, user, guestTheme, initialized, library } = useStore();
  const [authResolved, setAuthResolved] = useState(false);
  const [sessionUser, setSessionUser] = useState<AuthUser | null>(null);
  const [accessApproved, setAccessApproved] = useState(!isSupabaseConfigured || import.meta.env.VITE_REQUIRE_AUTH === 'false');
  const theme = user ? (user.preferences?.theme || 'dark') : guestTheme;

  useEffect(() => {
    if (!user || !notificationService.configured) return;
    const timer = window.setTimeout(() => {
      for (const entry of Object.values(library)) {
        if (entry.isTrackedRelease) void notificationService.syncSubscription({ userId: user.uid, entryId: entry.id, item: entry.media, enabled: true, preferences: entry.releasePreferences }).catch(() => undefined);
      }
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [user?.uid, library]);

  useEffect(() => {
    const isLight = theme === 'light';
    document.documentElement.classList.toggle('light', isLight);
    document.documentElement.dataset.theme = isLight ? 'light' : 'dark';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isLight ? '#ffffff' : '#000000');
  }, [theme]);

  useEffect(() => {
    void initializeLocalData();
    void requestPersistentStorage();
  }, [initializeLocalData]);

  useEffect(() => {
    let active = true;
    let sequence = 0;
    const unsubscribe = authService.onAuthStateChange((authUser) => {
      const request = ++sequence;
      setAuthResolved(false);
      setSessionUser(authUser);
      void (async () => {
        const approved = authUser ? await verifyUserAllowed(authUser) : false;
        if (!active || request !== sequence) return;
        setAccessApproved(approved);
        await setUser(approved ? authUser : null);
        if (active && request === sequence) setAuthResolved(true);
      })().catch(async (error) => {
        console.warn('Falha ao validar a sessão privada:', error);
        if (!active || request !== sequence) return;
        setAccessApproved(false);
        await setUser(null);
        if (active && request === sequence) setAuthResolved(true);
      });
    });
    return () => { active = false; unsubscribe(); };
  }, [setUser]);

  useEffect(() => {
    if (!initialized) return;
    void import('@/services/automaticBackup').then(({ ensureAutomaticBackup }) => ensureAutomaticBackup(user)).catch((error) => console.warn('Backup automático local falhou:', error));
  }, [initialized, user?.uid]);

  useEffect(() => {
    const handleOnline = () => void syncNow();
    window.addEventListener('online', handleOnline);
    window.addEventListener('focus', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleOnline);
    };
  }, [syncNow]);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribeLibrary = cloudService.subscribeToLibrary(user.uid, ({ items, deletions }) => {
      mergeRemoteLibrary(Object.fromEntries(items.map((entry) => [entry.id, entry])), deletions);
    });
    const unsubscribeLists = cloudService.subscribeToCustomLists(user.uid, ({ items, deletions }) => {
      mergeRemoteCustomLists(items, deletions);
    });
    const unsubscribeEvents = cloudService.subscribeToConsumptionEvents(user.uid, (events) => {
      void localRepository.importRemoteConsumptionEvents(events);
    });

    return () => {
      unsubscribeLibrary();
      unsubscribeLists();
      unsubscribeEvents();
    };
  }, [user?.uid, mergeRemoteLibrary, mergeRemoteCustomLists]);

  return (
    <HelmetProvider>
      <PersistQueryClientProvider 
        client={queryClient}
        persistOptions={{ 
          persister,
          dehydrateOptions: {
            shouldDehydrateQuery: (query) => {
              const queryKeyStr = JSON.stringify(query.queryKey).toLowerCase();
              return !queryKeyStr.includes('private-session');
            }
          }
        }}
      >
        <MotionConfig reducedMotion="user">
        <Router>
          <ScrollToTop />
          <AuthGate user={sessionUser} ready={authResolved} accessApproved={accessApproved}>
            <AppChrome>
              <ErrorBoundary>
                <AnimatedRoutes />
              </ErrorBoundary>
            </AppChrome>
          </AuthGate>
        </Router>
        </MotionConfig>
        <Toaster theme={theme === 'light' ? 'light' : 'dark'} position="bottom-right" />
      </PersistQueryClientProvider>
    </HelmetProvider>
  );
}
