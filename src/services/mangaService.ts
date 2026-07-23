/**
 * Integração com MangaDex. IDs do MyAnimeList/AniList nunca são enviados ao
 * endpoint de feed: primeiro resolvemos a obra pelo título e recebemos o UUID
 * próprio do MangaDex.
 */
import type { MediaItem } from '@/types';

export interface MangaChapter {
  id: string;
  chapter: string | null;
  title: string | null;
  language: string | null;
  pagesCount: number | null;
}

const MANGADEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function resolveMangaDexId(itemOrId: MediaItem | string): Promise<string | null> {
  if (typeof itemOrId === 'string') {
    const cleanId = itemOrId.replace(/^mangadex-/i, '');
    return MANGADEX_UUID.test(cleanId) ? cleanId : null;
  }

  const directCandidates = [
    itemOrId.source === 'mangadex' ? String(itemOrId.sourceId || '') : '',
    String(itemOrId.id).replace(/^mangadex-/i, ''),
  ].filter(Boolean);
  const direct = directCandidates.find((candidate) => MANGADEX_UUID.test(candidate));
  if (direct) return direct;

  const title = itemOrId.title.trim();
  if (!title) return null;
  try {
    const params = new URLSearchParams({ title, limit: '5', 'order[relevance]': 'desc' });
    const response = await fetch(`https://api.mangadex.org/manga?${params.toString()}`);
    if (!response.ok) return null;
    const payload = await response.json();
    const id = payload?.data?.[0]?.id;
    return typeof id === 'string' && MANGADEX_UUID.test(id) ? id : null;
  } catch (error) {
    console.warn('Erro ao resolver identidade MangaDex:', error);
    return null;
  }
}

export async function fetchMangaChapters(itemOrId: MediaItem | string): Promise<MangaChapter[]> {
  try {
    const mangaId = await resolveMangaDexId(itemOrId);
    if (!mangaId) return [];
    const params = new URLSearchParams({ limit: '100' });
    params.append('translatedLanguage[]', 'pt-br');
    params.append('translatedLanguage[]', 'en');
    params.set('order[chapter]', 'asc');
    const response = await fetch(`https://api.mangadex.org/manga/${mangaId}/feed?${params.toString()}`);
    if (!response.ok) return [];
    const payload = await response.json();
    if (!Array.isArray(payload.data)) return [];

    const entries: unknown[] = payload.data;
    return entries
      .filter((entry: unknown): entry is { id: string; attributes?: Record<string, unknown> } =>
        Boolean(entry && typeof entry === 'object' && typeof (entry as { id?: unknown }).id === 'string'),
      )
      .map((entry) => {
        const attributes = entry.attributes || {};
        return {
          id: entry.id,
          chapter: typeof attributes.chapter === 'string' && attributes.chapter.trim() ? attributes.chapter : null,
          title: typeof attributes.title === 'string' && attributes.title.trim() ? attributes.title : null,
          language: typeof attributes.translatedLanguage === 'string' && attributes.translatedLanguage.trim()
            ? attributes.translatedLanguage
            : null,
          pagesCount: typeof attributes.pages === 'number' && Number.isFinite(attributes.pages)
            ? attributes.pages
            : null,
        };
      });
  } catch (error) {
    console.warn('Erro ao buscar capítulos do MangaDex:', error);
    return [];
  }
}

export async function fetchChapterPages(chapterId: string): Promise<string[]> {
  try {
    const response = await fetch(`https://api.mangadex.org/at-home/server/${encodeURIComponent(chapterId)}`);
    if (!response.ok) return [];
    const payload = await response.json();
    if (!payload.chapter || !payload.baseUrl || !Array.isArray(payload.chapter.data)) return [];

    return payload.chapter.data.map(
      (filename: string) => `${payload.baseUrl}/data/${payload.chapter.hash}/${filename}`,
    );
  } catch (error) {
    console.warn('Erro ao buscar páginas do capítulo:', error);
    return [];
  }
}
