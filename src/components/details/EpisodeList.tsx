import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, Play, Tv } from 'lucide-react';
import { api } from '@/services/api';
import { useStore } from '@/store/useStore';
import { findLibraryEntry } from '@/services/identity';
import type { MediaItem } from '@/types';
import { accessDestination, verifiedAccessFor } from '@/services/mediaAccess';
import { toast } from 'sonner';

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
  const updateLibraryItem = useStore((state) => state.updateLibraryItem);
  const entry = findLibraryEntry(library, item);
  const currentEp = entry?.progress?.currentEpisode || 0;

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

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

  const openEpisodeSource = (_epNumber: number) => {
    if (!directAccess) {
      onRequestSources?.();
      toast.info('Nenhuma fonte verificada foi vinculada a este episódio. Confira a aba Fontes.');
      return;
    }

    const destination = accessDestination(directAccess, item);
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
                      onClick={() => openEpisodeSource(ep.episode_number)}
                      className="mr-3 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--hub-brand)] text-[var(--hub-brand-contrast)] transition-transform hover:scale-110 focus-visible:outline-none"
                      aria-label={directAccess ? `Abrir fonte do episódio ${ep.episode_number}` : `Ver fontes para o episódio ${ep.episode_number}`}
                    >
                      <Play aria-hidden="true" size={14} />
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
