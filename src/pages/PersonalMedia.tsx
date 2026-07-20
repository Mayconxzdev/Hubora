import { useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, ExternalLink, Film, LibraryBig, LoaderCircle, Plus, RefreshCw, Server, Trash2 } from 'lucide-react';
import { featureRepository } from '@/services/featureRepository';
import { browsePersonalMedia, testIntegration, type PersonalMediaItem } from '@/services/personalMedia';
import type { IntegrationConfig } from '@/types';
import { Button } from '@/components/ui/Button';
import { SEO } from '@/components/ui/SEO';
import { useStore } from '@/store/useStore';
import { toast } from 'sonner';

const KINDS: Array<{ id: IntegrationConfig['kind']; label: string; description: string; icon: typeof Server; tokenHint: string }> = [
  { id: 'jellyfin', label: 'Jellyfin', description: 'Filmes e séries do seu próprio servidor.', icon: Film, tokenHint: 'Token de acesso Jellyfin' },
  { id: 'komga', label: 'Komga', description: 'Mangás e quadrinhos da sua coleção.', icon: BookOpenCheck, tokenHint: 'API key Komga' },
  { id: 'kavita', label: 'Kavita', description: 'Livros, mangás e quadrinhos pessoais.', icon: BookOpenCheck, tokenHint: 'Auth key Kavita' },
  { id: 'opds', label: 'Catálogo OPDS', description: 'Catálogos legais, públicos ou do seu servidor.', icon: BookOpenCheck, tokenHint: 'Token opcional' },
];

const LEGAL_CATALOGS = [
  { name: 'Standard Ebooks', description: 'Ebooks de domínio público, gratuitos e cuidadosamente formatados.', url: 'https://standardebooks.org/ebooks' },
  { name: 'Project Gutenberg', description: 'Grande acervo de ebooks gratuitos; confirme a situação de direitos na sua região.', url: 'https://www.gutenberg.org/ebooks/' },
  { name: 'SciELO Livros', description: 'Livros acadêmicos e científicos com acesso aberto.', url: 'https://books.scielo.org/' },
  { name: 'Internet Archive', description: 'Use somente coleções identificadas como domínio público ou autorizadas.', url: 'https://archive.org/details/feature_films' },
];

export function PersonalMedia() {
  const addToLibrary = useStore((state) => state.addToLibrary);
  const [items, setItems] = useState<IntegrationConfig[]>([]);
  const [kind, setKind] = useState<IntegrationConfig['kind']>('jellyfin');
  const [baseUrl, setBaseUrl] = useState('');
  const [token, setToken] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [catalog, setCatalog] = useState<PersonalMediaItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [query, setQuery] = useState('');
  const selectedKind = KINDS.find((item) => item.id === kind)!;
  const selected = items.find((item) => item.id === selectedId);
  const filteredCatalog = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    if (!normalized) return catalog;
    return catalog.filter((item) => `${item.title} ${item.subtitle || ''} ${item.description || ''}`.toLocaleLowerCase('pt-BR').includes(normalized));
  }, [catalog, query]);

  const load = () => void featureRepository.integrations.list().then((next) => {
    setItems(next);
    setSelectedId((current) => current && next.some((item) => item.id === current) ? current : next[0]?.id || '');
  });
  useEffect(load, []);

  const save = async () => {
    try {
      const now = Date.now();
      const config: IntegrationConfig = {
        id: `${kind}:${crypto.randomUUID()}`, kind, name: selectedKind.label, baseUrl: baseUrl.trim(),
        token: token.trim() || undefined, enabled: true, createdAt: now, updatedAt: now,
      };
      const result = await testIntegration(config);
      if (!result.ok) { toast.error(`Não foi possível conectar: ${result.detail}`); return; }
      await featureRepository.integrations.put(config);
      setBaseUrl(''); setToken(''); load(); toast.success(`${result.detail}. Credencial protegida neste aparelho.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Configuração inválida.');
    }
  };

  const browse = async (config = selected) => {
    if (!config) return;
    setLoadingCatalog(true);
    setCatalog([]);
    try {
      const result = await browsePersonalMedia(config);
      setCatalog(result);
      toast.success(`${result.length} item(ns) carregado(s) de ${config.name}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível carregar o servidor.');
    } finally {
      setLoadingCatalog(false);
    }
  };

  return <div className="hub-page">
    <SEO title="Minha mídia" description="Conecte legalmente seus servidores pessoais e catálogos livres."/>
    <header className="hub-page-header items-start"><div><div className="hub-section-eyebrow"><Server size={14}/> Seus arquivos, seu controle</div><h1 className="hub-page-title">Minha mídia</h1><p className="hub-page-subtitle">Navegue na coleção do Jellyfin, Komga, Kavita ou OPDS e adicione itens à biblioteca do Hubora sem duplicar os arquivos.</p></div></header>

    <section className="hub-panel p-5 sm:p-6">
      <div className="grid gap-3 lg:grid-cols-[12rem_1fr_1fr_auto]">
        <select className="hub-field" value={kind} onChange={(event) => setKind(event.target.value as IntegrationConfig['kind'])}>{KINDS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
        <input className="hub-field" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://seu-servidor"/>
        <input className="hub-field" type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder={selectedKind.tokenHint}/>
        <Button onClick={() => void save()} disabled={!baseUrl.trim()}><Plus size={17}/> Conectar</Button>
      </div>
      <p className="mt-3 text-xs text-[var(--hub-subtle)]">As credenciais são criptografadas por uma chave não exportável guardada neste aparelho e nunca entram na biblioteca sincronizada. No app publicado, o servidor precisa usar HTTPS e aceitar CORS do domínio do Hubora.</p>
    </section>

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((config) => {
        const meta = KINDS.find((item) => item.id === config.kind)!;
        const Icon = meta.icon;
        const active = selectedId === config.id;
        return <article key={config.id} className={`hub-panel p-5 ${active ? 'ring-1 ring-[var(--hub-brand)]' : ''}`}><div className="flex items-start justify-between"><button className="flex min-w-0 items-center gap-3 text-left" onClick={() => setSelectedId(config.id)}><span className="hub-more-icon"><Icon size={20}/></span><div className="min-w-0"><h2 className="truncate font-black text-[var(--hub-text-strong)]">{config.name}</h2><p className="text-xs text-[var(--hub-muted)]">{meta.description}</p></div></button><button className="hub-icon-button" title="Remover integração" onClick={() => void featureRepository.integrations.delete(config.id).then(() => { setCatalog([]); load(); })}><Trash2 size={16}/></button></div><p className="mt-4 truncate text-xs text-[var(--hub-subtle)]">{config.baseUrl}</p><div className="mt-4 flex flex-wrap gap-2"><Button size="sm" onClick={() => { setSelectedId(config.id); void browse(config); }}><RefreshCw size={15}/> Navegar</Button><a className="hub-chip" href={config.baseUrl} target="_blank" rel="noreferrer">Abrir servidor <ExternalLink size={15}/></a></div></article>;
      })}
      {!items.length && <div className="hub-empty-state md:col-span-2 xl:col-span-3">Nenhum servidor conectado. A biblioteca local e os catálogos públicos continuam funcionando normalmente.</div>}
    </div>

    {selected && <section className="hub-section">
      <div className="hub-section-heading"><div><div className="hub-section-eyebrow"><LibraryBig size={14}/> Catálogo pessoal</div><h2 className="hub-section-title">{selected.name}</h2><p className="hub-section-description">Itens vêm diretamente do seu servidor e permanecem armazenados lá.</p></div><div className="flex gap-2"><input className="hub-field h-11 w-56" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filtrar catálogo"/><Button variant="outline" onClick={() => void browse()} disabled={loadingCatalog}>{loadingCatalog ? <LoaderCircle className="animate-spin" size={17}/> : <RefreshCw size={17}/>} Atualizar</Button></div></div>
      {loadingCatalog ? <div className="hub-empty-state"><LoaderCircle className="animate-spin" size={30}/> Carregando catálogo...</div> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">{filteredCatalog.map((item) => <article key={`${item.source}:${item.id}`} className="hub-panel overflow-hidden"><div className="aspect-[2/3] bg-[var(--hub-surface-3)]">{item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy"/> : <div className="grid h-full place-items-center"><LibraryBig size={28}/></div>}</div><div className="p-3"><h3 className="line-clamp-2 text-sm font-black text-[var(--hub-text-strong)]">{item.title}</h3><p className="mt-1 line-clamp-2 text-xs text-[var(--hub-muted)]">{item.subtitle || item.mediaType}</p>{typeof item.progress === 'number' && item.progress > 0 && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--hub-surface-3)]"><div className="h-full bg-[var(--hub-brand)]" style={{ width: `${Math.min(100, item.progress)}%` }}/></div>}<div className="mt-3 flex gap-2"><button className="hub-icon-button" title="Adicionar ao Hubora" onClick={() => { addToLibrary(item.media, item.progress && item.progress > 0 ? 'consuming' : 'planning'); toast.success('Adicionado à biblioteca.'); }}><Plus size={15}/></button><a className="hub-icon-button" title="Abrir no servidor" href={item.openUrl} target="_blank" rel="noreferrer"><ExternalLink size={15}/></a></div></div></article>)}{!filteredCatalog.length && <div className="hub-empty-state col-span-full">Nenhum item carregado. Use “Atualizar” para consultar o servidor.</div>}</div>}
    </section>}

    <section className="mt-10">
      <div className="mb-4"><div className="hub-section-eyebrow"><LibraryBig size={14}/> Conteúdo livre e legítimo</div><h2 className="text-2xl font-black text-[var(--hub-text-strong)]">Catálogos gratuitos</h2><p className="mt-1 text-sm text-[var(--hub-muted)]">O Hubora abre a fonte oficial; a situação de direitos pode variar por país e por obra.</p></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{LEGAL_CATALOGS.map((catalogItem) => <article key={catalogItem.name} className="hub-panel p-5"><h3 className="font-black text-[var(--hub-text-strong)]">{catalogItem.name}</h3><p className="mt-2 text-sm leading-relaxed text-[var(--hub-muted)]">{catalogItem.description}</p><a className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--hub-brand)]" href={catalogItem.url} target="_blank" rel="noreferrer">Abrir catálogo <ExternalLink size={15}/></a></article>)}</div>
    </section>
  </div>;
}
