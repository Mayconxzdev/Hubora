import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, BarChart3, BookOpen, CalendarDays, Compass, Gamepad2, Library, Search, Settings, Server, Shield, Tv } from 'lucide-react';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog';

const ACTIONS = [
  { label: 'Buscar em todo o Hubora', path: '/discover', icon: Search, keywords: 'buscar pesquisar título vibe' },
  { label: 'Radar por print, cena, link ou vídeo', path: '/radar', icon: Activity, keywords: 'print imagem cena link vídeo identificar' },
  { label: 'Biblioteca', path: '/library', icon: Library, keywords: 'lista progresso backlog' },
  { label: 'Lançamentos', path: '/releases', icon: CalendarDays, keywords: 'episódio temporada capítulo volume estreia' },
  { label: 'Filmes', path: '/movies', icon: Tv, keywords: 'cinema filme' },
  { label: 'Séries', path: '/series', icon: Tv, keywords: 'episódio temporada série' },
  { label: 'Doramas', path: '/doramas', icon: Tv, keywords: 'dorama coreano japonês chinês' },
  { label: 'Animes', path: '/anime', icon: Compass, keywords: 'anime episódio' },
  { label: 'Mangás', path: '/manga', icon: BookOpen, keywords: 'manga capítulo volume' },
  { label: 'Quadrinhos', path: '/comics', icon: BookOpen, keywords: 'comic hq edição' },
  { label: 'Livros', path: '/books', icon: BookOpen, keywords: 'livro leitura epub pdf' },
  { label: 'Jogos', path: '/games', icon: Gamepad2, keywords: 'game jogar backlog' },
  { label: 'Fontes e Companion', path: '/providers', icon: Server, keywords: 'provedores autorizações cache companion stremio jellyfin livros jogos' },
  { label: 'Conteúdo gratuito', path: '/sources', icon: Server, keywords: 'google books gutenberg open library arquivos gratuitos' },
  { label: 'Minha mídia e servidores', path: '/personal-media', icon: Server, keywords: 'jellyfin komga kavita audiobookshelf opds' },
  { label: 'Insights pessoais', path: '/insights', icon: BarChart3, keywords: 'wrapped metas estatísticas conexões' },
  { label: 'Cofre Adulto', path: '/vault', icon: Shield, keywords: 'adulto 18 privado cofre' },
  { label: 'Configurações', path: '/settings', icon: Settings, keywords: 'tema privacidade conta backup' },
  { label: 'Descobrir', path: '/discover', icon: Compass, keywords: 'recomendação explorar escolha hoje' },
];

export function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setOpen((value) => !value); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return ACTIONS;
    return ACTIONS.filter((action) => `${action.label} ${action.keywords}`.toLowerCase().includes(normalized));
  }, [query]);
  const go = (path: string) => { navigate(path); setOpen(false); setQuery(''); };

  return <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-xl"><DialogHeader><div><DialogTitle>Ir para</DialogTitle><DialogDescription>Busque recursos sem adicionar botões à interface. Atalho: Ctrl + K.</DialogDescription></div></DialogHeader><DialogBody><input autoFocus className="hub-field" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Digite uma área ou ação..."/><div className="mt-3 max-h-[55vh] space-y-1 overflow-y-auto">{filtered.map((action) => <button key={`${action.path}-${action.label}`} className="hub-more-link w-full text-left" onClick={() => go(action.path)}><span className="hub-more-icon"><action.icon size={18}/></span><span className="font-bold text-[var(--hub-text-strong)]">{action.label}</span></button>)}{!filtered.length && <div className="hub-empty-state">Nenhuma ação encontrada.</div>}</div></DialogBody></DialogContent></Dialog>;
}
