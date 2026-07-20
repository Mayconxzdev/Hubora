import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, CheckCircle2, ExternalLink, Film, Globe2, LibraryBig, Link2, Plus, Search, Server, ShieldCheck, Trash2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SEO } from '@/components/ui/SEO';
import { BUILTIN_PROVIDERS, inspectStremioProvider, listProviderConfigs, removeProviderConfig, resolveSafeStremioStreams, saveProviderConfig, searchStremioCatalog } from '@/services/providerProtocol';
import type { MediaAccess, MediaItem, ProviderConfig } from '@/types';
import { useStore } from '@/store/useStore';

interface FreeCatalogItem {
  id: string;
  source: string;
  mediaType: 'book' | 'movie';
  title: string;
  authors: string[];
  description?: string;
  image?: string;
  year?: string;
  access: Array<{ kind: string; label: string; url?: string; volumeId?: string; free: boolean }>;
}

export function Sources() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const autoSearchDone = useRef(false);
  const addToLibrary = useStore((state) => state.addToLibrary);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<FreeCatalogItem[]>([]);
  const [manifestUrl, setManifestUrl] = useState('');
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [providerItems, setProviderItems] = useState<Array<{ item: MediaItem; provider: ProviderConfig }>>([]);

  const refresh = () => void listProviderConfigs().then(setProviders);
  useEffect(refresh, []);

  const runSearch = async (value: string) => {
    const normalized = value.trim();
    if (normalized.length < 2) return;
    setLoading(true);
    try {
      const freePromise = fetch(`/api/free-catalog?q=${encodeURIComponent(normalized)}`).then(async (response) => {
        const data = await response.json() as { items?: FreeCatalogItem[]; error?: string };
        if (!response.ok) throw new Error(data.error || 'Falha ao consultar catálogos gratuitos.');
        return data.items || [];
      });
      const enabledProviders = providers.filter((provider) => provider.enabled && provider.capabilities.includes('search'));
      const providerPromise = Promise.allSettled(enabledProviders.map(async (provider) => (await searchStremioCatalog(provider, normalized)).map((item) => ({ item, provider }))));
      const [freeItems, providerSettled] = await Promise.all([freePromise, providerPromise]);
      setItems(freeItems);
      setProviderItems(providerSettled.flatMap((result) => result.status === 'fulfilled' ? result.value : []));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível pesquisar.');
    } finally { setLoading(false); }
  };

  const searchFree = (event: React.FormEvent) => {
    event.preventDefault();
    void runSearch(query);
  };

  useEffect(() => {
    const initial = searchParams.get('q')?.trim();
    if (!initial || autoSearchDone.current) return;
    autoSearchDone.current = true;
    setQuery(initial);
    void runSearch(initial);
  }, [searchParams]);

  const addProvider = async () => {
    try {
      const { config } = await inspectStremioProvider(manifestUrl.trim());
      await saveProviderConfig(config);
      setManifestUrl('');
      refresh();
      toast.success(`${config.name} adicionado.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Manifesto inválido.');
    }
  };

  const openAccess = (item: FreeCatalogItem, access: FreeCatalogItem['access'][number]) => {
    if (access.kind === 'google-books' && access.volumeId) {
      navigate(`/reader?kind=google-books&volumeId=${encodeURIComponent(access.volumeId)}&title=${encodeURIComponent(item.title)}&official=${encodeURIComponent(access.url || '')}`);
      return;
    }
    if (access.kind === 'embed' && access.url) {
      const destination = item.mediaType === 'movie' ? `/player?embed=${encodeURIComponent(access.url)}&title=${encodeURIComponent(item.title)}&official=${encodeURIComponent(access.url)}` : `/reader?kind=html&url=${encodeURIComponent(access.url)}&title=${encodeURIComponent(item.title)}&official=${encodeURIComponent(access.url)}`;
      navigate(destination);
      return;
    }
    if (['epub', 'pdf', 'html'].includes(access.kind) && access.url) {
      navigate(`/reader?kind=${encodeURIComponent(access.kind)}&url=${encodeURIComponent(access.url)}&title=${encodeURIComponent(item.title)}&official=${encodeURIComponent(access.url)}`);
      return;
    }
    if (access.url) window.open(access.url, '_blank', 'noopener,noreferrer');
  };

  const toMediaItem = (item: FreeCatalogItem): MediaItem => ({
    id: item.id,
    sourceId: item.id.split(':').slice(1).join(':') || item.id,
    source: item.source.toLowerCase().replace(/\s+/g, '-'),
    title: item.title,
    mediaType: item.mediaType,
    authors: item.authors,
    overview: item.description,
    posterPath: item.image,
    releaseDate: item.year,
    access: item.access.map((entry, index): MediaAccess => ({
      id: `${item.id}:${entry.kind}:${index}`,
      label: entry.label,
      kind: entry.kind === 'google-books' ? 'book-preview' : entry.kind as MediaAccess['kind'],
      url: entry.url,
      embedId: entry.volumeId,
      provider: item.source,
      free: entry.free,
    })),
    googleVolumeId: item.access.find((entry) => entry.volumeId)?.volumeId,
    embeddable: item.access.some((entry) => entry.kind === 'google-books' || entry.kind === 'embed'),
    publicDomain: item.mediaType === 'book' && item.access.some((entry) => entry.free && ['epub', 'pdf', 'html'].includes(entry.kind)),
  });

  const addFreeItem = (item: FreeCatalogItem) => {
    addToLibrary(toMediaItem(item), 'planning');
    toast.success('Adicionado à biblioteca.');
  };

  const openProviderItem = async (item: MediaItem, provider: ProviderConfig) => {
    try {
      const sourceId = String(item.sourceId || item.id);
      const type = item.mediaType === 'tv' ? 'series' : item.mediaType;
      const access = await resolveSafeStremioStreams(provider, type, sourceId);
      if (access.length) {
        const first = access[0];
        if (first.embedId) navigate(`/player?youtube=${encodeURIComponent(first.embedId)}&title=${encodeURIComponent(item.title)}`);
        else if (first.url && ['epub', 'pdf', 'html', 'book-preview'].includes(first.kind)) navigate(`/reader?kind=${encodeURIComponent(first.kind)}&url=${encodeURIComponent(first.url)}&title=${encodeURIComponent(item.title)}&official=${encodeURIComponent(item.providerUrl || first.url)}`);
        else if (first.url && ['video', 'hls', 'audio'].includes(first.kind)) navigate(`/player?kind=${first.kind}&url=${encodeURIComponent(first.url)}&title=${encodeURIComponent(item.title)}&official=${encodeURIComponent(item.providerUrl || '')}`);
        else if (first.url) window.open(first.url, '_blank', 'noopener,noreferrer');
        return;
      }
      navigate(`/details/${item.id}`, { state: { media: { ...item, access } } });
      toast.info('O provedor encontrou o título, mas não forneceu uma URL HTTPS direta compatível.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Falha ao consultar o provedor.'); }
  };

  const grouped = useMemo(() => {
    const groups = new Map<string, FreeCatalogItem[]>();
    for (const item of items) groups.set(item.source, [...(groups.get(item.source) || []), item]);
    return Array.from(groups.entries());
  }, [items]);

  return <div className="hub-page mx-auto max-w-[100rem]">
    <SEO title="Grátis agora" description="Livros, filmes e prévias que podem ser abertos legalmente dentro do Hubora." />
    <header className="hub-page-header items-start"><div><div className="hub-section-eyebrow"><Globe2 size={14}/> Fontes abertas</div><h1 className="hub-page-title">Grátis agora</h1><p className="hub-page-subtitle">Encontre livros, filmes de domínio público e prévias que podem ser lidos ou assistidos legalmente dentro do Hubora.</p></div><Button variant="outline" onClick={() => navigate('/personal-media')}><Server size={17}/> Minha mídia</Button></header>

    <section className="hub-panel p-5 sm:p-6">
      <div className="flex items-start gap-3"><div className="rounded-2xl bg-[var(--hub-brand-soft)] p-3 text-[var(--hub-brand)]"><BookOpen size={22}/></div><div><h2 className="text-xl font-black text-[var(--hub-text-strong)]">Ler ou assistir em fontes abertas</h2><p className="mt-1 text-sm text-[var(--hub-muted)]">A busca reúne Google Books, Open Library, Project Gutenberg e vídeos disponibilizados pelo Internet Archive. A origem controla disponibilidade, território e licença.</p></div></div>
      <form onSubmit={searchFree} className="mt-5 flex gap-2"><div className="relative flex-1"><Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--hub-subtle)]" size={18}/><Input className="pl-11" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Título, autor ou assunto..." /></div><Button type="submit" disabled={loading || query.trim().length < 2}>{loading ? 'Buscando...' : 'Buscar'}</Button></form>
    </section>

    {grouped.map(([source, sourceItems]) => <section key={source} className="hub-section"><div className="hub-section-heading"><div><div className="hub-section-eyebrow"><LibraryBig size={14}/> {source}</div><h2 className="hub-section-title">{sourceItems.length} resultado(s)</h2></div></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{sourceItems.map((item) => <article key={item.id} className="hub-panel flex min-h-48 overflow-hidden"><div className="w-28 shrink-0 bg-[var(--hub-surface-3)] sm:w-36">{item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" loading="lazy"/> : <div className="grid h-full place-items-center">{item.mediaType === 'movie' ? <Film size={30}/> : <BookOpen size={30}/>}</div>}</div><div className="min-w-0 flex-1 p-4"><p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-[var(--hub-brand)]">{item.year || source}</p><h3 className="mt-1 line-clamp-2 font-black text-[var(--hub-text-strong)]">{item.title}</h3><p className="mt-1 line-clamp-1 text-xs text-[var(--hub-subtle)]">{item.authors.join(', ') || 'Autor não informado'}</p><p className="mt-3 line-clamp-2 text-xs leading-relaxed text-[var(--hub-muted)]">{item.description || 'Sem descrição.'}</p><div className="mt-4 flex flex-wrap gap-2">{item.access.slice(0, 2).map((access, index) => <Button key={`${access.kind}-${index}`} size="sm" variant={index === 0 ? 'default' : 'outline'} onClick={() => openAccess(item, access)}>{access.kind === 'official-link' ? <ExternalLink size={15}/> : item.mediaType === 'movie' ? <Film size={15}/> : <BookOpen size={15}/>} {access.label}</Button>)}<Button size="sm" variant="ghost" onClick={() => addFreeItem(item)}><Plus size={15}/> Biblioteca</Button></div></div></article>)}</div></section>)}

    {providerItems.length > 0 && <section className="hub-section"><div className="hub-section-heading"><div><div className="hub-section-eyebrow"><Film size={14}/> Provedores adicionados</div><h2 className="hub-section-title">Resultados dos seus provedores</h2><p className="hub-section-description">Somente URLs HTTPS diretas, HLS ou YouTube são abertas dentro do Hubora.</p></div></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{providerItems.map(({ item, provider }) => <article key={`${provider.id}:${item.id}`} className="hub-panel flex overflow-hidden"><div className="w-28 shrink-0 bg-[var(--hub-surface-3)]">{item.posterPath ? <img src={item.posterPath} alt="" className="h-full w-full object-cover"/> : <div className="grid h-full place-items-center"><Film/></div>}</div><div className="min-w-0 flex-1 p-4"><p className="text-[0.68rem] font-black uppercase tracking-wider text-[var(--hub-brand)]">{provider.name}</p><h3 className="mt-1 line-clamp-2 font-black text-[var(--hub-text-strong)]">{item.title}</h3><p className="mt-2 line-clamp-2 text-xs text-[var(--hub-muted)]">{item.overview || 'Sem descrição.'}</p><div className="mt-4 flex flex-wrap gap-2"><Button size="sm" onClick={() => void openProviderItem(item, provider)}><Film size={15}/> Abrir fonte</Button><Button size="sm" variant="ghost" onClick={() => { addToLibrary(item, 'planning'); toast.success('Adicionado à biblioteca.'); }}><Plus size={15}/> Biblioteca</Button></div></div></article>)}</div></section>}

    <details className="hub-panel group p-5 sm:p-6">
      <summary className="flex cursor-pointer list-none items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--hub-surface-2)] text-[var(--hub-muted)]"><ShieldCheck size={21}/></span>
        <span className="min-w-0 flex-1"><strong className="block text-base text-[var(--hub-text-strong)]">Configurações avançadas de fontes</strong><small className="mt-1 block text-xs text-[var(--hub-muted)]">Servidores, catálogos incorporados e manifestos compatíveis.</small></span>
        <Plus size={18} className="transition-transform group-open:rotate-45"/>
      </summary>
      <div className="mt-6 border-t border-[var(--hub-border)] pt-6">
        <div className="flex items-start gap-3"><div className="rounded-xl bg-[var(--hub-brand-soft)] p-3 text-[var(--hub-brand)]"><Link2 size={20}/></div><div><h2 className="font-black text-[var(--hub-text-strong)]">Adicionar provedor confiável</h2><p className="mt-1 text-sm text-[var(--hub-muted)]">Aceita manifestos Hubora e compatíveis com Stremio, catálogos, capítulos, arquivos e streams diretos autorizados. Torrent, magnet e arquivo .torrent são recusados.</p></div></div>
        <div className="mt-4 flex gap-2"><Input value={manifestUrl} onChange={(event) => setManifestUrl(event.target.value)} placeholder="https://servidor/manifest.json"/><Button onClick={() => void addProvider()} disabled={!manifestUrl.trim()}>Adicionar</Button></div>
        {providers.length > 0 && <div className="mt-4 grid gap-2">{providers.map((provider) => <div key={provider.id} className="flex items-center justify-between rounded-xl border border-[var(--hub-border)] bg-[var(--hub-surface-2)] p-3"><div><strong className="text-sm text-[var(--hub-text-strong)]">{provider.name}</strong><p className="mt-1 text-xs text-[var(--hub-muted)]">{provider.capabilities.join(' • ')}</p></div><Button size="sm" variant="ghost" onClick={() => void removeProviderConfig(provider.id).then(refresh)}><Trash2 size={16}/> Remover</Button></div>)}</div>}
        <div className="mt-6"><p className="mb-3 text-xs font-black uppercase tracking-wider text-[var(--hub-subtle)]">Fontes de catálogo ativas</p><div className="grid gap-2 md:grid-cols-2">{BUILTIN_PROVIDERS.map((provider) => <div key={provider.id} className="flex items-start gap-3 rounded-xl border border-[var(--hub-border)] p-3"><CheckCircle2 className="mt-0.5 shrink-0 text-emerald-500" size={17}/><div><strong className="text-sm text-[var(--hub-text-strong)]">{provider.name}</strong><p className="mt-1 text-xs text-[var(--hub-muted)]">{provider.description}</p></div></div>)}</div></div>
      </div>
    </details>

    <section className="hub-section"><div className="grid gap-3 md:grid-cols-2"><article className="hub-panel p-5"><Film className="text-[var(--hub-brand)]"/><h3 className="mt-3 font-black text-[var(--hub-text-strong)]">Filmes, séries, doramas e animes</h3><p className="mt-2 text-sm leading-relaxed text-[var(--hub-muted)]">O Hubora reproduz URLs diretas autorizadas, HLS, vídeos oficiais e mídia dos seus próprios servidores. Serviços comerciais sem incorporação continuam abrindo a fonte oficial.</p></article><article className="hub-panel p-5"><Server className="text-[var(--hub-brand)]"/><h3 className="mt-3 font-black text-[var(--hub-text-strong)]">Jellyfin, Komga, Kavita e OPDS</h3><p className="mt-2 text-sm leading-relaxed text-[var(--hub-muted)]">Esses conectores ficam opcionais. O Netlify hospeda a interface; os arquivos continuam no servidor de origem.</p></article></div></section>
  </div>;
}
