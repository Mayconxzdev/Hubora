import type { Config } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { fetchWithTimeout, json, safeError } from './_shared/http.js';

type Subscription = { user_id: string; entry_id: string; provider: string; provider_id: string; media_type: string; title: string; last_snapshot: Record<string, unknown>; preferences: Record<string, boolean> };
type PreferenceKey = 'new_episode' | 'new_season' | 'new_volume' | 'release' | 'availability' | 'price';
type Snapshot = { key: string; label: string; eventType: PreferenceKey; notificationKind: 'release' | 'availability' | 'price'; url?: string; payload: Record<string, unknown> };

const env = (name: string) => process.env[name]?.trim() || '';

async function tmdbSnapshot(row: Subscription): Promise<Snapshot | null> {
  const key = env('TMDB_API_KEY');
  const readToken = env('TMDB_API_READ_TOKEN');
  if (!key && !readToken) return null;
  const id = row.provider_id.replace(/\D/g, ''); if (!id) return null;
  const type = row.media_type === 'movie' ? 'movie' : 'tv';
  const query = new URLSearchParams({ language: 'pt-BR' });
  if (key && !readToken) query.set('api_key', key);
  const response = await fetchWithTimeout(`https://api.themoviedb.org/3/${type}/${id}?${query}`, readToken ? { headers: { Authorization: `Bearer ${readToken}`, Accept: 'application/json' } } : undefined);
  if (!response.ok) return null;
  const data = await response.json() as Record<string, any>;
  if (type === 'movie') {
    const date = data.release_date || '';
    return { key: `movie:${date}:${data.status || ''}`, label: date ? `Data de lançamento: ${date}` : `Status atualizado: ${data.status || 'sem data'}`, eventType: 'release', notificationKind: 'release', url: `/details/tmdb-movie-${id}`, payload: { releaseDate: date, status: data.status } };
  }
  const next = data.next_episode_to_air;
  const marker = next ? `${next.air_date}:S${next.season_number}E${next.episode_number}` : `${data.last_air_date || ''}:${data.number_of_seasons || 0}:${data.status || ''}`;
  const label = next ? `Próximo episódio em ${next.air_date}: T${next.season_number} E${next.episode_number}` : `Série atualizada: ${data.status || 'sem novo episódio informado'}`;
  return { key: `tv:${marker}`, label, eventType: next ? 'new_episode' : 'new_season', notificationKind: 'release', url: `/details/tmdb-tv-${id}`, payload: { nextEpisode: next, status: data.status, seasons: data.number_of_seasons } };
}

async function jikanSnapshot(row: Subscription): Promise<Snapshot | null> {
  const id = row.provider_id.replace(/\D/g, ''); if (!id) return null;
  const kind = row.media_type === 'manga' ? 'manga' : 'anime';
  const response = await fetchWithTimeout(`https://api.jikan.moe/v4/${kind}/${id}/full`, {}, 9_000);
  if (!response.ok) return null;
  const payload = (await response.json() as { data?: Record<string, any> }).data; if (!payload) return null;
  if (kind === 'anime') {
    const marker = `${payload.status || ''}:${payload.episodes || ''}:${payload.aired?.to || ''}`;
    return { key: `anime:${marker}`, eventType: 'new_episode', notificationKind: 'release', label: `Anime atualizado: ${payload.status || 'status desconhecido'}${payload.episodes ? ` • ${payload.episodes} episódios` : ''}`, url: `/details/mal-anime-${id}`, payload: { status: payload.status, episodes: payload.episodes, airedTo: payload.aired?.to } };
  }
  const marker = `${payload.status || ''}:${payload.chapters || ''}:${payload.volumes || ''}:${payload.published?.to || ''}`;
  return { key: `manga:${marker}`, eventType: 'new_volume', notificationKind: 'release', label: `Mangá atualizado: ${payload.status || 'status desconhecido'}${payload.chapters ? ` • ${payload.chapters} capítulos` : ''}${payload.volumes ? ` • ${payload.volumes} volumes` : ''}`, url: `/details/mal-manga-${id}`, payload: { status: payload.status, chapters: payload.chapters, volumes: payload.volumes, publishedTo: payload.published?.to } };
}


async function tvmazeSnapshot(row: Subscription): Promise<Snapshot | null> {
  const id = row.provider_id.replace(/\D/g, ''); if (!id) return null;
  const response = await fetchWithTimeout(`https://api.tvmaze.com/shows/${id}?embed=nextepisode`, { headers: { accept: 'application/json' } }, 9_000);
  if (!response.ok) return null;
  const data = await response.json() as Record<string, any>;
  const next = data._embedded?.nextepisode;
  const marker = next ? `${next.airdate || ''}:S${next.season || 0}E${next.number || 0}` : `${data.ended || ''}:${data.status || ''}:${data.updated || ''}`;
  const label = next ? `Próximo episódio em ${next.airdate}: T${next.season || 0} E${next.number || 0}` : `Série atualizada: ${data.status || 'sem novo episódio informado'}`;
  return { key: `tvmaze:${marker}`, label, eventType: next ? 'new_episode' : 'new_season', notificationKind: 'release', url: `/details/tvmaze-tv-${id}`, payload: { nextEpisode: next, status: data.status, ended: data.ended } };
}

async function googleSnapshot(row: Subscription): Promise<Snapshot | null> {
  const id = row.provider_id.replace(/^gbooks[-:]/, ''); if (!id) return null;
  const apiKey = env('GOOGLE_BOOKS_API_KEY');
  const response = await fetchWithTimeout(`https://www.googleapis.com/books/v1/volumes/${encodeURIComponent(id)}${apiKey ? `?key=${encodeURIComponent(apiKey)}` : ''}`);
  if (!response.ok) return null;
  const data = await response.json() as Record<string, any>;
  const access = data.accessInfo || {}; const info = data.volumeInfo || {};
  const marker = `${info.publishedDate || ''}:${access.viewability || ''}:${Boolean(access.publicDomain)}:${Boolean(access.embeddable)}`;
  const novel = row.media_type === 'novel';
  const subject = novel ? 'Esta novel' : 'Este livro';
  const possessive = novel ? 'desta novel' : 'deste livro';
  return { key: `${novel ? 'novel' : 'book'}:${marker}`, eventType: 'availability', notificationKind: 'availability', label: access.publicDomain ? `${subject} está disponível em domínio público.` : access.embeddable ? `A prévia incorporável ${possessive} está disponível.` : `Informações da obra atualizadas${info.publishedDate ? ` • ${info.publishedDate}` : ''}.`, url: `/details/${novel ? 'gbooks-novel-' : 'gbooks-'}${id}`, payload: { publishedDate: info.publishedDate, viewability: access.viewability, publicDomain: access.publicDomain, embeddable: access.embeddable } };
}

async function snapshot(row: Subscription): Promise<Snapshot | null> {
  const provider = row.provider.toLowerCase();
  if (provider.includes('tvmaze')) return tvmazeSnapshot(row);
  if (provider.includes('tmdb') || ['movie', 'tv'].includes(row.media_type)) return tmdbSnapshot(row);
  if (provider.includes('jikan') || provider.includes('mal') || ['anime', 'manga'].includes(row.media_type)) return jikanSnapshot(row);
  if (provider.includes('google') || provider.includes('gbooks')) return googleSnapshot(row);
  return null;
}

export default async () => {
  const url = env('SUPABASE_URL');
  const serviceKey = env('SUPABASE_SECRET_KEY') || env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return json({ ok: false, error: 'Supabase administrativo não configurado.' }, { status: 503 });
  const client = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const { data, error } = await client.from('release_subscriptions').select('*').lte('next_check_at', new Date().toISOString()).order('next_check_at').limit(12);
    if (error) throw error;
    let checked = 0; let notified = 0;
    for (const row of (data || []) as Subscription[]) {
      try {
        const current = await snapshot(row);
        const previousKey = String(row.last_snapshot?.key || '');
        if (current && previousKey && current.key !== previousKey && row.preferences?.[current.eventType] !== false) {
          const { error: notificationError } = await client.from('notifications').insert({ user_id: row.user_id, entry_id: row.entry_id, kind: current.notificationKind, title: row.title, body: current.label, url: current.url, payload: { ...current.payload, eventType: current.eventType } });
          if (notificationError) throw notificationError;
          notified += 1;
        }
        const delayHours = current ? 24 : 72;
        const { error: updateError } = await client.from('release_subscriptions').update({ last_checked_at: new Date().toISOString(), next_check_at: new Date(Date.now() + delayHours * 3_600_000).toISOString(), last_snapshot: current ? { key: current.key, ...current.payload } : row.last_snapshot, updated_at: new Date().toISOString() }).eq('user_id', row.user_id).eq('entry_id', row.entry_id);
        if (updateError) throw updateError;
        checked += 1;
      } catch (itemError) { console.warn('Falha ao atualizar assinatura', row.entry_id, itemError); }
    }
    return json({ ok: true, checked, notified });
  } catch (error) { return json({ ok: false, error: safeError(error) }, { status: 500 }); }
};

export const config: Config = { schedule: '15 10 * * *' };
