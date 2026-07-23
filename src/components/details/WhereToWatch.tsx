import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ExternalLink, Gamepad2, MonitorPlay, Play, Search, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { MediaAccess, MediaItem } from '@/types';
import { listProviderConfigs, resolveSafeStremioStreams } from '@/services/providerProtocol';
import { fetchMangaChapters, resolveMangaDexId, type MangaChapter } from '@/services/mangaService';
import { toast } from 'sonner';
import { accessDestination, verifiedAccessFor } from '@/services/mediaAccess';

export function WhereToWatch({ item }: { item: MediaItem }) {
  const navigate = useNavigate();
  const readable = ['book', 'novel', 'comic', 'manga'].includes(item.mediaType);
  const video = ['movie', 'tv', 'series', 'drama', 'anime'].includes(item.mediaType);
  const title = readable ? 'Ler ou obter' : item.mediaType === 'game' ? 'Jogar ou obter' : 'Assistir';

  const [dynamicStreams, setDynamicStreams] = useState<MediaAccess[]>([]);
  const [loadingStreams, setLoadingStreams] = useState(false);

  const [mangaChapters, setMangaChapters] = useState<MangaChapter[]>([]);
  const [mangaId, setMangaId] = useState<string | null>(null);
  const [loadingManga, setLoadingManga] = useState(false);

  // Busca de streams de vídeo dinâmicas dos add-ons Stremio
  useEffect(() => {
    let active = true;
    if (!video) return;

    const loadStreams = async () => {
      setLoadingStreams(true);
      const streamsList: MediaAccess[] = [];

      const imdbId = item.externalIds?.imdb;

      // Somente add-ons instalados e habilitados explicitamente pelo usuário.
      try {
        const providers = await listProviderConfigs();
        const activeProviders = providers.filter((p) => p.enabled && p.capabilities.includes('stream'));

        const stremioType = item.mediaType === 'movie' ? 'movie' : 'series';
        const stremioId = imdbId || item.sourceId;
        if (!stremioId) {
          if (active) setLoadingStreams(false);
          return;
        }

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
        const [idDex, chapters] = await Promise.all([
          resolveMangaDexId(item),
          fetchMangaChapters(item),
        ]);
        if (!active) return;
        setMangaId(idDex);
        setMangaChapters(chapters);
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
    const destination = accessDestination(access, item);
    if (destination.kind === 'internal') {
      navigate(destination.path);
      return;
    }
    if (destination.kind === 'external') {
      window.open(destination.url, '_blank', 'noopener,noreferrer');
      return;
    }
    toast.error(destination.reason);
  };

  const direct = Array.from(
    new Map([...verifiedAccessFor(item), ...dynamicStreams].filter((entry) => entry.health !== 'offline').map((entry) => [entry.id, entry])).values(),
  );

  return (
    <div className="flex flex-col gap-4">
      <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[var(--hub-muted)]">
        <MonitorPlay size={16} className="text-[var(--hub-brand)]" />
        {title}
      </h3>

      {loadingStreams && (
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--hub-brand)] animate-pulse">
          <LoaderCircle size={14} className="animate-spin" /> Consultando os provedores configurados...
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
                  onClick={() => navigate(`/reader?kind=manga&chapterId=${ch.id}&mangaId=${mangaId}&title=${encodeURIComponent([item.title, ch.title].filter(Boolean).join(' - '))}`)}
                  className="px-3 py-2 text-left rounded-xl border border-white/5 bg-slate-900/60 hover:bg-slate-900 hover:border-[var(--hub-brand)] text-xs text-slate-300 font-bold transition truncate"
                >
                  {ch.chapter ? `Capítulo ${ch.chapter}` : ch.title || 'Capítulo sem numeração informada'}
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
          <Button size="sm" variant="outline" onClick={() => window.open(`https://www.justwatch.com/br/busca?q=${encodeURIComponent(item.title)}`, '_blank', 'noopener,noreferrer')}>
            <Search size={15} /> Onde assistir
          </Button>
        )}
        {/* Anime: Crunchyroll + AniList */}
        {item.mediaType === 'anime' && (
          <>
            <Button size="sm" variant="outline" onClick={() => window.open(`https://www.crunchyroll.com/pt-br/search?q=${encodeURIComponent(item.title)}`, '_blank', 'noopener,noreferrer')}>
              <MonitorPlay size={15} /> Crunchyroll
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.open(`https://anilist.co/search/anime?search=${encodeURIComponent(item.title)}`, '_blank', 'noopener,noreferrer')}>
              <ExternalLink size={15} /> AniList
            </Button>
          </>
        )}
        {/* Doramas: Viki + Kocowa */}
        {item.mediaType === 'drama' && (
          <>
            <Button size="sm" variant="outline" onClick={() => window.open(`https://www.viki.com/search?q=${encodeURIComponent(item.title)}`, '_blank', 'noopener,noreferrer')}>
              <MonitorPlay size={15} /> Viki
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.open(`https://www.kocowa.com/search?q=${encodeURIComponent(item.title)}`, '_blank', 'noopener,noreferrer')}>
              <MonitorPlay size={15} /> Kocowa
            </Button>
          </>
        )}
        {/* Mangá: MangaDex + MANGA Plus + WEBTOON */}
        {item.mediaType === 'manga' && (
          <>
            <Button size="sm" variant="outline" onClick={() => window.open(`https://mangadex.org/search?q=${encodeURIComponent(item.title)}`, '_blank', 'noopener,noreferrer')}>
              <BookOpen size={15} /> MangaDex
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.open(`https://mangaplus.shueisha.co.jp/search_result?search=${encodeURIComponent(item.title)}`, '_blank', 'noopener,noreferrer')}>
              <BookOpen size={15} /> MANGA Plus
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.open(`https://www.webtoons.com/en/search?keyword=${encodeURIComponent(item.title)}`, '_blank', 'noopener,noreferrer')}>
              <BookOpen size={15} /> WEBTOON
            </Button>
          </>
        )}
        {/* Livros: Google Books + Biblioteca Mundial + Standard Ebooks */}
        {(item.mediaType === 'book' || item.mediaType === 'novel') && (
          <>
            <Button size="sm" variant="outline" onClick={() => window.open(`https://books.google.com/books?q=${encodeURIComponent(item.title)}`, '_blank', 'noopener,noreferrer')}>
              <BookOpen size={15} /> Google Books
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.open(`https://www.bibliotecamundial.org/pt/search/?q=${encodeURIComponent(item.title)}`, '_blank', 'noopener,noreferrer')}>
              <BookOpen size={15} /> Biblioteca Mundial
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.open(`https://standardebooks.org/ebooks?query=${encodeURIComponent(item.title)}`, '_blank', 'noopener,noreferrer')}>
              <BookOpen size={15} /> Standard Ebooks
            </Button>
          </>
        )}
        {/* Novels: Royal Road + Wattpad + NovelUpdates */}
        {item.mediaType === 'novel' && (
          <>
            <Button size="sm" variant="outline" onClick={() => window.open(`https://www.royalroad.com/fictions/search?title=${encodeURIComponent(item.title)}`, '_blank', 'noopener,noreferrer')}>
              <ExternalLink size={15} /> Royal Road
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.open(`https://www.wattpad.com/search/${encodeURIComponent(item.title)}`, '_blank', 'noopener,noreferrer')}>
              <ExternalLink size={15} /> Wattpad
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.open(`https://www.novelupdates.com/?s=${encodeURIComponent(item.title)}`, '_blank', 'noopener,noreferrer')}>
              <ExternalLink size={15} /> NovelUpdates
            </Button>
          </>
        )}
        {/* Comics: GlobalComix + Digital Comic Museum + Comic Book Plus */}
        {item.mediaType === 'comic' && (
          <>
            <Button size="sm" variant="outline" onClick={() => window.open(`https://globalcomix.com/en/search/comics?q=${encodeURIComponent(item.title)}`, '_blank', 'noopener,noreferrer')}>
              <BookOpen size={15} /> GlobalComix
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.open(`https://digitalcomicmuseum.com/index.php?search=${encodeURIComponent(item.title)}`, '_blank', 'noopener,noreferrer')}>
              <BookOpen size={15} /> Digital Comic Museum
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.open(`https://comicbookplus.com/?cid=1&search=${encodeURIComponent(item.title)}`, '_blank', 'noopener,noreferrer')}>
              <BookOpen size={15} /> Comic Book Plus
            </Button>
          </>
        )}
        {/* Games: Steam + itch.io + FreeToGame */}
        {item.mediaType === 'game' && (
          <>
            <Button size="sm" variant="outline" onClick={() => window.open(`https://store.steampowered.com/search/?term=${encodeURIComponent(item.title)}`, '_blank', 'noopener,noreferrer')}>
              <Gamepad2 size={15} /> Steam
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.open(`https://itch.io/search?q=${encodeURIComponent(item.title)}`, '_blank', 'noopener,noreferrer')}>
              <Gamepad2 size={15} /> itch.io
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.open(`https://www.freetogame.com/games?search=${encodeURIComponent(item.title)}`, '_blank', 'noopener,noreferrer')}>
              <Gamepad2 size={15} /> FreeToGame
            </Button>
          </>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            window.open(
              `https://www.google.com/search?q=${encodeURIComponent(
                `${item.title} ${
                  readable ? 'leitura oficial' : item.mediaType === 'game' ? 'loja oficial' : 'onde assistir oficial'
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
