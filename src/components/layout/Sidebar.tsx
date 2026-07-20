import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Boxes,
  Cable,
  ChevronDown,
  Clapperboard,
  Compass,
  Drama,
  Gamepad2,
  Layers3,
  Library,
  LogIn,
  LogOut,
  Moon,
  PanelsTopLeft,
  Search,
  Settings,
  Sparkles,
  Sun,
  Tv,
  User,
  Zap,
  Home,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { authService } from '@/services/auth';
import { toast } from 'sonner';

interface SidebarProps {
  pinned: boolean;
  onPinnedChange: (pinned: boolean) => void;
}

const MAIN_NAV = [
  { icon: Home, label: 'Início', path: '/' },
  { icon: Compass, label: 'Descobrir', path: '/discover' },
  { icon: Library, label: 'Minha lista', path: '/library' },
] as const;

const CATEGORIES = [
  { icon: Clapperboard, label: 'Filmes', path: '/movies' },
  { icon: Tv, label: 'Séries', path: '/series' },
  { icon: Zap, label: 'Animes', path: '/anime' },
  { icon: Layers3, label: 'Mangás', path: '/manga' },
  { icon: Drama, label: 'Doramas', path: '/doramas' },
  { icon: BookOpen, label: 'Livros', path: '/books' },
  { icon: PanelsTopLeft, label: 'Quadrinhos', path: '/comics' },
  { icon: Gamepad2, label: 'Jogos', path: '/games' },
] as const;

const PAGE_LABELS: Array<[RegExp, string]> = [
  [/^\/$/, 'Início'],
  [/^\/discover/, 'Descobrir'],
  [/^\/library/, 'Minha lista'],
  [/^\/movies/, 'Filmes'],
  [/^\/series/, 'Séries'],
  [/^\/anime/, 'Animes'],
  [/^\/manga/, 'Mangás'],
  [/^\/doramas/, 'Doramas'],
  [/^\/books/, 'Livros'],
  [/^\/comics/, 'Quadrinhos'],
  [/^\/games/, 'Jogos'],
  [/^\/radar/, 'Radar'],
  [/^\/sources/, 'Conteúdo gratuito'],
  [/^\/providers/, 'Fontes e provedores'],
  [/^\/releases/, 'Lançamentos'],
  [/^\/diary/, 'Histórico'],
  [/^\/settings/, 'Configurações'],
  [/^\/profile/, 'Perfil'],
  [/^\/details/, 'Detalhes'],
];

function Brand({ showName = true }: { showName?: boolean }) {
  return (
    <Link to="/" className="hub-brand" aria-label="Hubora — início">
      <span className="hub-brand-mark"><Boxes size={20} strokeWidth={2.4} /></span>
      {showName && <span className="hub-brand-name">Hubora</span>}
    </Link>
  );
}

function isActivePath(current: string, path: string) {
  return path === '/' ? current === '/' : current.startsWith(path);
}

export function Sidebar({ pinned, onPinnedChange }: SidebarProps) {
  const location = useLocation();
  const [expanded, setExpanded] = useState(pinned);

  useEffect(() => setExpanded(pinned), [pinned]);

  return (
    <aside className={cn('hub-navigation-rail', expanded && 'is-expanded', pinned && 'is-pinned')}>
      <div className="hub-rail-brand-row">
        <Brand showName={expanded} />
      </div>

      <nav className="hub-rail-nav" aria-label="Navegação principal">
        {MAIN_NAV.map((item) => {
          const active = isActivePath(location.pathname, item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn('hub-rail-link', active && 'is-active', !expanded && 'is-compact')}
              aria-current={active ? 'page' : undefined}
              aria-label={item.label}
              title={!expanded ? item.label : undefined}
            >
              <span className="hub-rail-link-icon"><item.icon size={19} strokeWidth={active ? 2.5 : 2} /></span>
              {expanded && <span>{item.label}</span>}
            </Link>
          );
        })}

        <div className="hub-rail-divider" />
        <button
          className={cn('hub-rail-link w-full', !expanded && 'is-compact')}
          onClick={() => {
            const next = !expanded;
            setExpanded(next);
            onPinnedChange(next);
          }}
          aria-label={expanded ? 'Recolher menu' : 'Expandir menu'}
          title={!expanded ? 'Expandir menu' : undefined}
        >
          <span className="hub-rail-link-icon"><ChevronDown size={19} className={cn('transition-transform', expanded && 'rotate-180')} /></span>
          {expanded && <span>Recolher</span>}
        </button>
      </nav>

      <div className="mt-auto">
        <Link to="/settings" className={cn('hub-rail-link', isActivePath(location.pathname, '/settings') && 'is-active', !expanded && 'is-compact')} aria-label="Configurações" title={!expanded ? 'Configurações' : undefined}>
          <span className="hub-rail-link-icon"><Settings size={19} /></span>
          {expanded && <span>Configurações</span>}
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
  const [searchQuery, setSearchQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const pageLabel = useMemo(() => PAGE_LABELS.find(([matcher]) => matcher.test(location.pathname))?.[1] || 'Hubora', [location.pathname]);

  useEffect(() => {
    setCategoriesOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!profileRef.current?.contains(target)) setProfileOpen(false);
      if (!categoryRef.current?.contains(target)) setCategoriesOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileOpen(false);
        setCategoriesOpen(false);
      }
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
    };
  }, []);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    navigate(`/discover?q=${encodeURIComponent(query)}`);
    setSearchQuery('');
  };

  const logout = async () => {
    try {
      await authService.logout();
      toast.success('Sessão encerrada');
      navigate('/');
    } catch {
      toast.error('Não foi possível sair agora.');
    }
  };

  const avatar = (user?.name || user?.email || 'V').slice(0, 1).toUpperCase();

  return (
    <header className="hub-top-header">
      <div className="hub-top-header-inner">
        <div className="md:hidden"><Brand /></div>
        <div className="hidden min-w-24 md:block">
          <p className="truncate text-sm font-extrabold text-[var(--hub-text-strong)]">{pageLabel}</p>
        </div>

        <form onSubmit={submit} className="hub-global-search">
          <Search size={18} aria-hidden="true" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar filmes, animes, livros, jogos..."
            aria-label="Buscar em todo o Hubora"
          />
          <kbd className="hidden lg:inline-flex">/</kbd>
        </form>

        <div className="hub-header-actions">
          <div ref={categoryRef} className="relative hidden sm:block">
            <button className="hub-header-button" onClick={() => setCategoriesOpen((value) => !value)} aria-expanded={categoriesOpen}>
              <Sparkles size={17} /><span className="hidden xl:inline">Categorias</span><ChevronDown size={14} />
            </button>
            {categoriesOpen && (
              <div className="hub-category-menu">
                <p className="hub-menu-label">Explorar por tipo</p>
                <div className="hub-category-grid">
                  {CATEGORIES.map((item) => <Link key={item.path} to={item.path}><item.icon size={18} /><span>{item.label}</span></Link>)}
                </div>
                <Link className="hub-menu-wide-link" to="/providers"><Cable size={17} /> Fontes e provedores</Link>
                <Link className="hub-menu-wide-link" to="/sources"><BookOpen size={17} /> Ler e assistir grátis</Link>
              </div>
            )}
          </div>

          <button className="hub-icon-button" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'} title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <div ref={profileRef} className="relative">
            <button className="hub-avatar-button" onClick={() => setProfileOpen((value) => !value)} aria-expanded={profileOpen} aria-label="Abrir menu pessoal">{avatar}</button>
            {profileOpen && (
              <div className="hub-profile-menu">
                <div className="hub-profile-summary">
                  <span className="hub-avatar-button">{avatar}</span>
                  <div className="min-w-0"><strong>{user?.name || 'Hubora pessoal'}</strong><small>{user?.email || 'Dados salvos neste aparelho'}</small></div>
                </div>
                <div className="hub-menu-divider" />
                <Link to="/profile"><User size={17} /> Perfil</Link>
                <Link to="/providers"><Cable size={17} /> Fontes e provedores</Link>
                <Link to="/settings"><Settings size={17} /> Configurações</Link>
                <small className="hub-sync-label">{syncPending > 0 ? `${syncPending} alterações aguardando` : syncState === 'syncing' ? 'Sincronizando...' : 'Tudo salvo'}</small>
                <div className="hub-menu-divider" />
                {user ? <button onClick={() => void logout()}><LogOut size={17} /> Sair</button> : <Link to="/login"><LogIn size={17} /> Entrar para sincronizar</Link>}
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
    { icon: Library, label: 'Minha lista', path: '/library' },
    { icon: Search, label: 'Buscar', path: '/discover?focus=search' },
  ];

  return (
    <nav className="hub-mobile-nav" aria-label="Navegação móvel">
      {items.map((item) => {
        const active = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path.split('?')[0]);
        return <Link key={item.label} to={item.path} className={cn(active && 'is-active')}><item.icon size={20} /><span>{item.label}</span></Link>;
      })}
    </nav>
  );
}
