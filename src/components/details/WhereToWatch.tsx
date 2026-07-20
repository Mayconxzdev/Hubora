import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ExternalLink, Gamepad2, MonitorPlay, Play, Search, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { MediaAccess, MediaItem } from '@/types';
import { listProviderConfigs, resolveSafeStremioStreams, getUniversalVideoStreams } from '@/services/providerProtocol';
import { mangaDexApi } from '@/services/api';
import { toast } from 'sonner';

export function WhereToWatch({ item }: { item: MediaItem }) {
  const navigate = useNavigate();
  const readable = ['book', 'novel', 'comic', 'manga'].includes(item.mediaType);
  const video = ['movie', 'tv', 'anime'].includes(item.mediaType);
  const title = readable ? 'Ler ou obter' : item.mediaType === 'game' ? 'Jogar ou obter' : 'Assistir';

  const [dynamicStreams, setDynamicStreams] = useState<MediaAccess[]>([]);
  const [loadingStreams, setLoadingStreams] = useState(false);

  const [mangaChapters, setMangaChapters] = useState<any[]>([]);
  const [mangaId, setMangaId] = useState<string | null>(null);
  const [loadingManga, setLoadingManga] = useState(false);

  // Busca de streams de vídeo dinâmicas dos add-ons Stremio
  useEffect(() => {
    let active = true;
    if (!video) return;

    const loadStreams = async () => {
      setLoadingStreams(true);
      const streamsList: MediaAccess[] = [];

      // 1. Resolvedores universais (PlayIMDb/Vidsrc)
      const imdbId = item.externalIds?.imdb;
      if (imdbId) {
        streamsList.push(...getUniversalVideoStreams(imdbId, item.title, item.mediaType));
      }

      // 2. Add-ons Stremio do usuário
      try {
        const providers = await listProviderConfigs();
        const activeProviders = providers.filter((p) => p.enabled && p.capabilities.includes('stream'));

        const stremioType = item.mediaType === 'anime' ? 'series' : item.mediaType === 'tv' ? 'series' : 'movie';
        const stremioId = imdbId || item.sourceId;

        const promises = activeProviders.map(async (provider) => {
          try {
            const streams = await resolveSafeStremioStreams(provider, stremioType, String(stremioId));
            if (active && streams.length > 0) {
              streamsList.push(...streams);
            }
          } catch (e) {
            console.warn(`Erro no provedor ${provider.name}:`, e);
          }
        });
        await Promise.all(promises);
      } catch (err) {
        console.warn('Erro ao listar provedores:', err);
      }

      if (active) {
        setDynamicStreams(streamsList);
        setLoadingStreams(false);
      }
    };

    void loadStreams();
    return () => { active = false; };
  }, [item, video]);

  // Busca de capítulos do mangá no MangaDex
  useEffect(() => {
    let active = true;
    if (item.mediaType !== 'manga') return;

    const loadManga = async () => {
      setLoadingManga(true);
      try {
        const idDex = await mangaDexApi.searchManga(item.title);
        if (!active || !idDex) {
          setLoadingManga(false);
          return;
        }
        setMangaId(idDex);
        const chs = await mangaDexApi.getChapters(idDex);
        if (active) {
          setMangaChapters(chs);
        }
      } catch (err) {
        console.warn('Erro no MangaDex:', err);
      } finally {
        if (active) setLoadingManga(false);
      }
    };

    void loadManga();
    return () => { active = false; };
  }, [item]);

  const openAccess = (access: MediaAccess) => {
    const official = access.url || item.providerUrl || '';
    if (access.kind === 'book-preview' && access.embedId) {
      navigate(`/reader?kind=google-books&volumeId=${encodeURIComponent(access.embedId)}&title=${encodeURIComponent(item.title)}&official=${encodeURIComponent(official)}`);
      return;
    }
    if (access.kind === 'embed' && access.url) {
      if (readable) navigate(`/reader?kind=html&url=${encodeURIComponent(access.url)}&title=${encodeURIComponent(item.title)}&official=${encodeURIComponent(official)}`);
      else navigate(`/player?embed=${encodeURIComponent(access.url)}&title=${encodeURIComponent(item.title)}&official=${encodeURIComponent(official)}`);
      return;
    }
    if (['epub', 'pdf', 'html'].includes(access.kind) && access.url) {
      navigate(`/reader?kind=${access.kind}&url=${encodeURIComponent(access.url)}&title=${encodeURIComponent(item.title)}&official=${encodeURIComponent(official)}`);
      return;
    }
    if (['video', 'hls', 'audio'].includes(access.kind) && access.url) {
      navigate(`/player?kind=${access.kind}&url=${encodeURIComponent(access.url)}&title=${encodeURIComponent(item.title)}&official=${encodeURIComponent(official)}`);
      return;
    }
    if (access.embedId && access.provider.toLowerCase().includes('youtube')) {
      navigate(`/player?youtube=${encodeURIComponent(access.embedId)}&title=${encodeURIComponent(item.title)}&official=${encodeURIComponent(official)}`);
      return;
    }
    if (access.url) {
      if (/^(steam:|com\.epicgames\.launcher:|goggalaxy:|xbox:|shortcut:|file:|([a-zA-Z]:\\))/i.test(access.url)) {
        toast.error('Este acesso exige um aplicativo local e não pode ser aberto pelo Hubora na web.');
      } else {
        window.open(access.url, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const access = item.access || [];
  const googlePreview: MediaAccess[] = readable && item.googleVolumeId && item.embeddable && !access.some((entry) => entry.kind === 'book-preview') ? [{ id: `google-${item.googleVolumeId}`, label: item.publicDomain ? 'Ler completo' : 'Abrir prévia', kind: 'book-preview', embedId: item.googleVolumeId, url: item.providerUrl, provider: 'Google Books', free: Boolean(item.publicDomain) }] : [];
  const direct = [...googlePreview, ...access, ...dynamicStreams];

  return (
    <div className="flex flex-col gap-4">
      <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[var(--hub-muted)]">
        <MonitorPlay size={16} className="text-[var(--hub-brand)]" />
        {title}
      </h3>

      {loadingStreams && (
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--hub-brand)] animate-pulse">
          <LoaderCircle size={14} className="animate-spin" /> Buscando streams adicionais em segundo plano...
        </div>
      )}

      {direct.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {direct.map((entry) => (
            <button
              key={entry.id}
              onClick={() => openAccess(entry)}
              className="flex min-h-14 items-center gap-3 rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-surface-2)] px-4 py-3 text-left transition hover:border-[var(--hub-brand)] hover:bg-[var(--hub-brand-soft)]"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--hub-surface-3)] text-[var(--hub-brand)]">
                {entry.kind === 'official-link' ? <ExternalLink size={18} /> : readable ? <BookOpen size={18} /> : <Play size={18} />}
              </span>
              <span className="min-w-0">
                <strong className="block truncate text-sm text-[var(--hub-text-strong)]">{entry.label}</strong>
                <small className="block truncate text-xs text-[var(--hub-subtle)]">
                  {entry.provider}{entry.free ? ' • gratuito' : ''} {entry.quality ? `[${entry.quality}]` : ''}
                </small>
              </span>
            </button>
          ))}
        </div>
      )}

      {item.mediaType === 'manga' && (
        <div className="mt-4 border-t border-[var(--hub-border)] pt-4">
          <h4 className="text-xs font-black uppercase tracking-widest text-[var(--hub-muted)] mb-3 flex items-center gap-2">
            <BookOpen size={14} /> Capítulos Disponíveis (MangaDex)
          </h4>
          {loadingManga ? (
            <div className="flex items-center gap-2 text-xs text-slate-500 animate-pulse">
              <LoaderCircle size={14} className="animate-spin" /> Buscando capítulos...
            </div>
          ) : mangaChapters.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
              {mangaChapters.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => navigate(`/reader?kind=manga&chapterId=${ch.id}&mangaId=${mangaId}&title=${encodeURIComponent(`${item.title} - ${ch.title}`)}`)}
                  className="px-3 py-2 text-left rounded-xl border border-white/5 bg-slate-900/60 hover:bg-slate-900 hover:border-[var(--hub-brand)] text-xs text-slate-300 font-bold transition truncate"
                >
                  Vol. {ch.volume || '0'} Cap. {ch.chapter}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Nenhum capítulo encontrado no MangaDex.</p>
          )}
        </div>
      )}

      {item.watchProviders?.length ? (
        <div>
          <div className="flex flex-wrap gap-2">
            {item.watchProviders.map((provider) => (
              <a
                key={provider.providerId}
                href={provider.url || `https://www.justwatch.com/br/busca?q=${encodeURIComponent(item.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hub-chip min-h-11"
              >
                <ExternalLink size={15} />
                {provider.providerName}
              </a>
            ))}
          </div>
          <p className="mt-2 text-[0.68rem] text-[var(--hub-subtle)]">
            Disponibilidade no Brasil fornecida pelo JustWatch via TMDB. Pode mudar conforme assinatura e região.
          </p>
        </div>
      ) : (
        !loadingStreams && direct.length === 0 && (
          <div className="hub-empty-state py-6">
            Nenhuma fonte incorporável foi encontrada. O Hubora pode abrir a origem oficial ou buscar em fontes adicionais.
          </div>
        )
      )}

      {item.externalIds && (
        <div className="flex flex-wrap gap-1.5" aria-label="Identificadores universais">
          {Object.entries(item.externalIds)
            .filter((entry) => entry[1])
            .map(([provider, id]) => (
              <span
                key={provider}
                className="rounded-md border border-[var(--hub-border)] bg-[var(--hub-surface-2)] px-2 py-1 text-[.62rem] text-[var(--hub-subtle)]"
              >
                <strong className="uppercase text-[var(--hub-muted)]">{provider}</strong> {id}
              </span>
            ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t border-[var(--hub-border)] pt-4">
        <Button size="sm" onClick={() => navigate(`/sources?q=${encodeURIComponent(item.title)}`)}>
          <Search size={15} /> Consultar fontes conectadas
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            navigate(
              `/providers?category=${
                item.mediaType === 'tv'
                  ? 'series'
                  : item.mediaType === 'movie'
                  ? 'movies'
                  : item.mediaType === 'comic'
                  ? 'comics'
                  : item.mediaType === 'book'
                  ? 'books'
                  : item.mediaType === 'novel'
                  ? 'novels'
                  : item.mediaType === 'game'
                  ? 'games'
                  : item.mediaType
              }`
            )
          }
        >
          <MonitorPlay size={15} /> Ver diretório
        </Button>
        {video && (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              window.open(
                `https://www.justwatch.com/br/busca?q=${encodeURIComponent(item.title)}`,
                '_blank',
                'noopener,noreferrer'
              )
            }
          >
            <Search size={15} /> Onde assistir
          </Button>
        )}
        {readable && (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              window.open(
                `https://books.google.com/books?q=${encodeURIComponent(item.title)}`,
                '_blank',
                'noopener,noreferrer'
              )
            }
          >
            <BookOpen size={15} /> Google Books
          </Button>
        )}
        {item.mediaType === 'game' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              window.open(
                `https://store.steampowered.com/search/?term=${encodeURIComponent(item.title)}`,
                '_blank',
                'noopener,noreferrer'
              )
            }
          >
            <Gamepad2 size={15} /> Steam
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            window.open(
              `https://www.google.com/search?q=${encodeURIComponent(
                `${item.title} ${
                  readable ? 'ler legalmente' : item.mediaType === 'game' ? 'jogo' : 'onde assistir'
                }`
              )}`,
              '_blank',
              'noopener,noreferrer'
            )
          }
        >
          <Search size={15} /> Pesquisa oficial
        </Button>
      </div>
    </div>
  );
}
