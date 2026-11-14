import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, LoaderCircle, Play, Tv } from 'lucide-react';
import { api } from '@/services/api';
import { useStore } from '@/store/useStore';
import { findLibraryEntry } from '@/services/identity';
import type { MediaItem } from '@/types';
import { verifiedAccessFor } from '@/services/mediaAccess';
import { toast } from 'sonner';
import { loadProviderConfigsWithVault } from '@/services/providerVaultSync';
import { prioritizeBrazilianPortuguese, resolveSafeStremioStreams } from '@/services/providerProtocol';
import { createPlaybackPath } from '@/services/playbackSession';

interface Episode {
  episode_number: number;
  name: string;
  air_date?: string;
  still_path?: string;
  runtime?: number;
  overview?: string;
}

interface Season {
  season_number: number;
  name: string;
  episode_count: number;
}

export function EpisodeList({ item, onRequestSources }: { item: MediaItem; onRequestSources?: () => void }) {
  const isAnime = item.mediaType === 'anime';
  const isTV = ['tv', 'series', 'drama'].includes(item.mediaType);

  const navigate = useNavigate();
  const library = useStore((state) => state.library);
  const user = useStore((state) => state.user);
  const ownerId = user?.uid || 'guest';
  const updateLibraryItem = useStore((state) => state.updateLibraryItem);
  const entry = findLibraryEntry(library, item);
  const currentEp = entry?.progress?.currentEpisode || 0;

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [playingEpisode, setPlayingEpisode] = useState<number | null>(null);

  const tmdbId = String(item.tmdbId || item.id).replace(/^(tmdb-tv-|tv-|series-)/, '');
  const malId = String(item.malId || item.sourceId || item.id).replace(/^(mal-anime-|anime-|jikan-anime-)/, '');
  const directAccess = verifiedAccessFor(item)[0];

  // Fetch seasons for TV
  useEffect(() => {
    if (!isTV || !tmdbId) return;
    let active = true;
    void (async () => {
      try {
        const res = await fetch(`/api/tmdb?path=${encodeURIComponent(`/tv/${tmdbId}`)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (active && data.seasons) {
          const valid = data.seasons.filter((s: Season) => s.season_number > 0);
          setSeasons(valid);
          if (valid.length > 0) setSelectedSeason(valid[0].season_number);
        }
      } catch { /* ignore */ }
    })();
    return () => { active = false; };
  }, [isTV, tmdbId]);

  // Fetch episodes
  useEffect(() => {
    let active = true;
    setLoading(true);
    setEpisodes([]);

    if (isTV && tmdbId) {
      void api.getTVEpisodes(tmdbId, selectedSeason).then((eps) => {
        if (active) { setEpisodes(eps); setLoading(false); }
      });
    } else if (isAnime && malId) {
      void (async () => {
        try {
          const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}/episodes?page=1`);
          if (!res.ok) { setLoading(false); return; }
          const data = await res.json();
          if (active) {
            setEpisodes((data.data || []).map((ep: any) => ({
              episode_number: ep.mal_id,
              name: ep.title || `Episódio ${ep.mal_id}`,
              air_date: ep.aired,
              runtime: ep.duration ? Math.round(ep.duration / 60) : undefined,
            })));
            setLoading(false);
          }
        } catch { if (active) setLoading(false); }
      })();
    } else {
      setLoading(false);
    }

    return () => { active = false; };
  }, [isTV, isAnime, tmdbId, malId, selectedSeason]);

  const markEpisode = (epNumber: number) => {
    if (!entry) {
      toast.info('Adicione à biblioteca primeiro para registrar progresso.');
      return;
    }
    updateLibraryItem(entry.id, {
      progress: { ...entry.progress, currentEpisode: epNumber },
      status: entry.status === 'planning' ? 'consuming' : entry.status,
    });
    toast.success(`Episódio ${epNumber} marcado como assistido!`);
  };

  const openEpisodeSource = async (epNumber: number) => {
    if (playingEpisode !== null) return;
    setPlayingEpisode(epNumber);
    const episodeTitle = `${item.title} — T${selectedSeason} E${epNumber}`;
    try {
      const baseId = item.externalIds?.imdb || String(item.sourceId || item.id);
      const episodeId = `${baseId}:${selectedSeason}:${epNumber}`;
      const providers = await loadProviderConfigsWithVault(ownerId);
      const activeProviders = providers.filter((provider) => provider.enabled && provider.capabilities.includes('stream'));
      const results = await Promise.allSettled(activeProviders.map((provider) => resolveSafeStremioStreams(provider, 'series', episodeId)));
      const episodeSources = prioritizeBrazilianPortuguese(results.flatMap((result) => result.status === 'fulfilled' ? result.value : []));
      const playable = episodeSources.find((source) => source.embedId || (source.url && ['video', 'hls', 'audio', 'embed'].includes(source.kind)));

      if (playable?.embedId) {
        navigate(`/player?youtube=${encodeURIComponent(playable.embedId)}&title=${encodeURIComponent(episodeTitle)}`);
        return;
      }
      if (playable?.url) {
        navigate(createPlaybackPath(playable, episodeTitle));
        return;
      }

      if (directAccess && ['video', 'hls', 'audio', 'embed'].includes(directAccess.kind)) {
        navigate(createPlaybackPath(directAccess, episodeTitle));
        return;
      }

      onRequestSources?.();
      toast.info('Nenhuma fonte direta compatível foi encontrada para este episódio. Confira os complementos configurados.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível consultar as fontes deste episódio.');
    } finally {
      setPlayingEpisode(null);
    }
  };

  if (!isAnime && !isTV) return null;

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[var(--hub-muted)]">
          <Tv size={16} className="text-[var(--hub-brand)]" />
          {isAnime ? 'Episódios' : `Episódios — Temporada ${selectedSeason}`}
        </h3>
        <ChevronDown size={18} className={`text-[var(--hub-subtle)] transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {!expanded && null}

      {expanded && (
        <>
          {/* Season selector for TV */}
          {isTV && seasons.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {seasons.map((s) => (
                <button
                  key={s.season_number}
                  onClick={() => setSelectedSeason(s.season_number)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedSeason === s.season_number
                      ? 'bg-[var(--hub-brand)] text-[var(--hub-brand-contrast)]'
                      : 'bg-[var(--hub-surface-2)] text-[var(--hub-muted)] border border-[var(--hub-border)] hover:border-[var(--hub-brand)]'
                  }`}
                >
                  T{s.season_number} ({s.episode_count} eps)
                </button>
              ))}
            </div>
          )}

          {loading && (
            <div className="text-sm text-[var(--hub-subtle)] animate-pulse py-4">Carregando episódios...</div>
          )}

          {!loading && episodes.length === 0 && (
            <p className="text-sm text-[var(--hub-subtle)] py-2">Nenhum episódio encontrado para esta temporada.</p>
          )}

          {!loading && episodes.length > 0 && (
            <div className="grid gap-1.5 max-h-[28rem] overflow-y-auto pr-1">
              {episodes.map((ep) => {
                const watched = ep.episode_number <= currentEp;
                const isNext = ep.episode_number === currentEp + 1;
                return (
                  <div
                    key={ep.episode_number}
                    className={`flex items-center rounded-xl border text-left transition-all ${
                      isNext
                        ? 'border-[var(--hub-brand)] bg-[var(--hub-brand-soft)]'
                        : watched
                        ? 'border-emerald-500/20 bg-emerald-500/5'
                        : 'border-[var(--hub-border)] bg-[var(--hub-surface-2)] hover:border-[var(--hub-brand)]'
                    }`}
                  >
                    <button
                      onClick={() => markEpisode(ep.episode_number)}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-l-xl px-4 py-2.5 focus-visible:outline-none"
                      aria-label={`Marcar episódio ${ep.episode_number} como assistido`}
                    >
                      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-black ${
                        watched ? 'bg-emerald-500/20 text-emerald-400' : isNext ? 'bg-[var(--hub-brand)] text-[var(--hub-brand-contrast)]' : 'bg-[var(--hub-surface-3)] text-[var(--hub-subtle)]'
                      }`}>
                        {watched ? <Check size={14} /> : ep.episode_number}
                      </span>
                      <span className="min-w-0 flex-1 text-left">
                        <strong className={`block truncate text-sm ${watched ? 'text-[var(--hub-muted)] line-through' : 'text-[var(--hub-text-strong)]'}`}>
                          {ep.name || `Episódio ${ep.episode_number}`}
                        </strong>
                        <small className="text-xs text-[var(--hub-subtle)]">
                          {ep.air_date ? new Date(ep.air_date).toLocaleDateString('pt-BR') : ''}{ep.runtime ? ` • ${ep.runtime} min` : ''}
                        </small>
                      </span>
                    </button>
                    <button
                      onClick={() => void openEpisodeSource(ep.episode_number)}
                      disabled={playingEpisode !== null}
                      className="mr-3 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--hub-brand)] text-[var(--hub-brand-contrast)] transition-transform hover:scale-110 focus-visible:outline-none disabled:cursor-wait disabled:opacity-60"
                      aria-label={playingEpisode === ep.episode_number ? `Buscando fonte do episódio ${ep.episode_number}` : `Buscar fonte do episódio ${ep.episode_number}`}
                    >
                      {playingEpisode === ep.episode_number ? <LoaderCircle aria-hidden="true" size={14} className="animate-spin"/> : <Play aria-hidden="true" size={14} />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

