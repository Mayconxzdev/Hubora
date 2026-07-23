import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Clapperboard,
  Tv,
  Sparkles,
  Flame,
  BookOpen,
  Layers,
  Book,
  FileText,
  Gamepad2,
  Bookmark,
  Calendar,
  ShieldCheck,
  Server,
  Cable,
  Settings,
  User,
  Compass,
  Radio,
  TrendingUp,
  Award,
  Users,
  Moon,
  Sun,
  LogOut,
  LogIn,
  Boxes,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { authService } from '@/services/auth';
import { toast } from 'sonner';
import { Notifications } from '@/components/ui/Notifications';
import { GlobalSearch } from '@/components/ui/GlobalSearch';

interface SidebarProps {
  pinned: boolean;
  onPinnedChange: (pinned: boolean) => void;
}

type NavItem = {
  icon: React.ElementType;
  label: string;
  path: string;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'BIBLIOTECA',
    items: [
      { icon: Home, label: 'Início', path: '/' },
      { icon: Clapperboard, label: 'Filmes', path: '/movies' },
      { icon: Tv, label: 'Séries', path: '/series' },
      { icon: Sparkles, label: 'Doramas', path: '/doramas' },
      { icon: Flame, label: 'Animes', path: '/anime' },
      { icon: BookOpen, label: 'Mangás', path: '/manga' },
      { icon: Layers, label: 'Quadrinhos', path: '/comics' },
      { icon: Book, label: 'Livros', path: '/books' },
      { icon: FileText, label: 'Novels', path: '/novels' },
      { icon: Gamepad2, label: 'Jogos', path: '/games' },
    ],
  },
  {
    title: 'MINHA COLEÇÃO',
    items: [
      { icon: Bookmark, label: 'Minha lista', path: '/library' },
      { icon: Calendar, label: 'Diário', path: '/diary' },
      { icon: ShieldCheck, label: 'Cofre Pessoal', path: '/vault' },
      { icon: Server, label: 'Mídia Pessoal', path: '/sources' },
    ],
  },
  {
    title: 'EXPLORAR',
    items: [
      { icon: Compass, label: 'Descobrir', path: '/discover' },
      { icon: Radio, label: 'Radar', path: '/radar' },
      { icon: Calendar, label: 'Guia', path: '/guide' },
      { icon: TrendingUp, label: 'Lançamentos', path: '/releases' },
    ],
  },
  {
    title: 'MINHA JORNADA',
    items: [
      { icon: Award, label: 'Insights', path: '/insights' },
      { icon: Users, label: 'Conexões', path: '/connections' },
    ],
  },
  {
    title: 'SISTEMA',
    items: [
      { icon: Cable, label: 'Provedores', path: '/providers' },
      { icon: Settings, label: 'Configurações', path: '/settings' },
    ],
  },
];

const PAGE_LABELS: Array<[RegExp, string]> = [
  [/^\/$/, 'Início'],
  [/^\/discover/, 'Descobrir'],
  [/^\/library/, 'Minha Biblioteca'],
  [/^\/movies/, 'Filmes'],
  [/^\/series/, 'Séries'],
  [/^\/anime/, 'Animes'],
  [/^\/manga/, 'Mangás'],
  [/^\/doramas/, 'Doramas'],
  [/^\/books/, 'Livros'],
  [/^\/novels/, 'Novels'],
  [/^\/comics/, 'Quadrinhos'],
  [/^\/games/, 'Jogos'],
  [/^\/radar/, 'Radar'],
  [/^\/sources/, 'Conteúdo Gratuito & Mídia Pessoal'],
  [/^\/providers/, 'Fontes e Provedores'],
  [/^\/releases/, 'Lançamentos'],
  [/^\/diary/, 'Diário'],
  [/^\/settings/, 'Configurações'],
  [/^\/profile/, 'Perfil'],
  [/^\/details/, 'Detalhes'],
  [/^\/vault/, 'Cofre Pessoal'],
];

function Brand({ showName = true }: { showName?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 px-2 py-1.5" aria-label="Hubora — início">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--hub-brand)] text-white shadow-lg shadow-[var(--hub-brand-soft)]">
        <Boxes size={20} strokeWidth={2.4} />
      </span>
      {showName && <span className="text-lg font-black tracking-tight text-white">Hubora</span>}
    </Link>
  );
}

function isActivePath(current: string, path: string) {
  return path === '/' ? current === '/' : current.startsWith(path);
}

export function Sidebar({ pinned, onPinnedChange }: SidebarProps) {
  const location = useLocation();
  const { user } = useStore();
  const [expanded, setExpanded] = useState(pinned);

  useEffect(() => setExpanded(pinned), [pinned]);

  const avatar = (user?.name || user?.email || 'H').slice(0, 1).toUpperCase();

  return (
    <aside className={cn('hub-navigation-rail overflow-y-auto scrollbar-hide', expanded && 'is-expanded', pinned && 'is-pinned')}>
      <div className="hub-rail-brand-row flex items-center justify-between">
        <Brand showName={expanded} />
        <button
          onClick={() => {
            const next = !expanded;
            setExpanded(next);
            onPinnedChange(next);
          }}
          className="hidden md:flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--hub-border)] bg-[var(--hub-surface-2)] text-[var(--hub-muted)] hover:text-white transition-colors"
          aria-label={expanded ? 'Recolher menu' : 'Expandir menu'}
          title={expanded ? 'Recolher menu' : 'Expandir menu'}
        >
          <ChevronRight size={14} className={cn('transition-transform duration-200', expanded && 'rotate-180')} />
        </button>
      </div>

      <nav className="hub-rail-nav space-y-6 pt-2" aria-label="Navegação principal">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="space-y-1">
            {expanded && (
              <div className="px-3 pb-1 text-[0.65rem] font-black uppercase tracking-wider text-[var(--hub-muted)] opacity-70">
                {group.title}
              </div>
            )}
            {group.items.map((item) => {
              const active = isActivePath(location.pathname, item.path);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150',
                    active
                      ? 'bg-[var(--hub-brand-soft)] text-white border border-[rgba(109,74,255,0.4)] shadow-sm'
                      : 'text-[var(--hub-muted)] hover:bg-[var(--hub-surface-2)] hover:text-white',
                    !expanded && 'justify-center px-0'
                  )}
                  aria-current={active ? 'page' : undefined}
                  aria-label={item.label}
                  title={!expanded ? item.label : undefined}
                >
                  <span className={cn('flex-shrink-0', active && 'text-[var(--hub-brand)]')}>
                    <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                  </span>
                  {expanded && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User Profile Widget at Bottom of Sidebar */}
      <div className="mt-auto pt-4 border-t border-[var(--hub-border)]">
        <Link
          to="/profile"
          className={cn(
            'flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--hub-surface-2)] transition-colors',
            !expanded && 'justify-center'
          )}
          title="Ver perfil"
        >
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--hub-brand)] text-xs font-black text-white">
            {avatar}
          </div>
          {expanded && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-white">{user?.name || 'Usuário Hubora'}</div>
              <div className="truncate text-[0.7rem] text-[var(--hub-muted)]">{user?.email || 'Minha Central'}</div>
            </div>
          )}
        </Link>
      </div>
    </aside>
  );
}

export function TopHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, guestTheme, toggleTheme, syncState, syncPending } = useStore();
  const theme = user ? user.preferences?.theme || 'dark' : guestTheme;
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const pageLabel = useMemo(
    () => PAGE_LABELS.find(([matcher]) => matcher.test(location.pathname))?.[1] || 'Hubora',
    [location.pathname]
  );

  useEffect(() => {
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  const logout = async () => {
    try {
      await authService.logout();
      toast.success('Sessão encerrada com sucesso');
      navigate('/');
    } catch {
      toast.error('Não foi possível sair agora.');
    }
  };

  const avatar = (user?.name || user?.email || 'H').slice(0, 1).toUpperCase();

  return (
    <header className="hub-top-header">
      <div className="hub-top-header-inner gap-4">
        <div className="md:hidden">
          <Brand />
        </div>
        <div className="hidden min-w-28 md:block">
          <p className="truncate text-sm font-extrabold text-white">{pageLabel}</p>
        </div>

        {/* Global Search Component */}
        <div className="flex-1 max-w-2xl">
          <GlobalSearch />
        </div>

        {/* Top Header Controls */}
        <div className="hub-header-actions flex items-center gap-2">
          <Notifications />

          <button
            className="hub-icon-button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
            title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <div ref={profileRef} className="relative">
            <button
              className="hub-avatar-button"
              onClick={() => setProfileOpen((value) => !value)}
              aria-expanded={profileOpen}
              aria-label="Abrir menu pessoal"
            >
              {avatar}
            </button>
            {profileOpen && (
              <div className="hub-profile-menu">
                <div className="hub-profile-summary">
                  <span className="hub-avatar-button">{avatar}</span>
                  <div className="min-w-0">
                    <strong>{user?.name || 'Hubora Pessoal'}</strong>
                    <small>{user?.email || 'Dados salvos localmente'}</small>
                  </div>
                </div>
                <div className="hub-menu-divider" />
                <Link to="/profile">
                  <User size={17} /> Perfil
                </Link>
                <Link to="/providers">
                  <Cable size={17} /> Fontes e Provedores
                </Link>
                <Link to="/settings">
                  <Settings size={17} /> Configurações
                </Link>
                <small className="hub-sync-label">
                  {syncPending > 0
                    ? `${syncPending} alterações aguardando`
                    : syncState === 'syncing'
                    ? 'Sincronizando...'
                    : 'Tudo salvo'}
                </small>
                <div className="hub-menu-divider" />
                {user ? (
                  <button onClick={() => void logout()}>
                    <LogOut size={17} /> Sair
                  </button>
                ) : (
                  <Link to="/login">
                    <LogIn size={17} /> Entrar para sincronizar
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export function MobileNav() {
  const location = useLocation();
  const items = [
    { icon: Home, label: 'Início', path: '/' },
    { icon: Compass, label: 'Descobrir', path: '/discover' },
    { icon: Bookmark, label: 'Biblioteca', path: '/library' },
    { icon: Clapperboard, label: 'Filmes', path: '/movies' },
    { icon: Gamepad2, label: 'Jogos', path: '/games' },
  ];

  return (
    <nav className="hub-mobile-nav" aria-label="Navegação móvel">
      {items.map((item) => {
        const active = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
        return (
          <Link key={item.label} to={item.path} className={cn(active && 'is-active')}>
            <item.icon size={20} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
