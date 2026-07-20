import { MediaItem } from '@/types';

type ReadableCatalogType = 'book' | 'comic' | 'novel';
type MediaAccess = NonNullable<MediaItem['access']>[number];

type OpenLibraryEdition = {
  key?: string;
  ocaid?: string;
};

type OpenLibraryAvailability = 'full' | 'borrow' | 'restricted' | 'unknown';

function makeArchiveAccess(archiveId: string, availability: OpenLibraryAvailability): MediaAccess {
  const full = availability === 'full';
  const label = full
    ? 'Ler no Internet Archive'
    : availability === 'borrow'
      ? 'Ver empréstimo no Internet Archive'
      : availability === 'restricted'
        ? 'Ver prévia no Internet Archive'
        : 'Ver disponibilidade no Internet Archive';
  return {
    id: `archive-${archiveId}`,
    label,
    kind: 'embed',
    url: `https://archive.org/embed/${encodeURIComponent(archiveId)}`,
    provider: 'Internet Archive',
    free: full,
    legalNote: full
      ? 'Leitura aberta declarada pela origem.'
      : 'A origem pode limitar a leitura a prévia, empréstimo ou exigir autenticação.',
  };
}

export async function getOpenLibraryArchiveAccess(edition?: OpenLibraryEdition): Promise<MediaAccess | null> {
  if (!edition?.ocaid) return null;
  const editionId = edition.key?.replace('/books/', '');
  if (!editionId) return makeArchiveAccess(edition.ocaid, 'unknown');

  try {
    const key = `OLID:${editionId}`;
    const response = await fetch(`https://openlibrary.org/api/books?bibkeys=${encodeURIComponent(key)}&jscmd=data&format=json`);
    if (!response.ok) return makeArchiveAccess(edition.ocaid, 'unknown');
    const payload = await response.json();
    const rawAvailability = payload?.[key]?.ebooks?.[0]?.availability;
    const availability: OpenLibraryAvailability = rawAvailability === 'full'
      ? 'full'
      : rawAvailability === 'borrow'
        ? 'borrow'
        : rawAvailability === 'restricted'
          ? 'restricted'
          : 'unknown';
    return makeArchiveAccess(edition.ocaid, availability);
  } catch {
    return makeArchiveAccess(edition.ocaid, 'unknown');
  }
}

// Simple in-memory cache to avoid duplicate API calls
const cache = new Map<string, { data: MediaItem[], timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

const getFromCache = (key: string) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
};

const setCache = (key: string, data: MediaItem[]) => {
  cache.set(key, { data, timestamp: Date.now() });
};

// OpenLibrary adaptation
const adaptOpenLibrary = (item: any, type: ReadableCatalogType): MediaItem => {
  const workId = item.key?.replace('/works/', '') || String(item.cover_i || 'unknown');
  const officialUrl = item.key ? `https://openlibrary.org${item.key}` : 'https://openlibrary.org';
  const archiveId = Array.isArray(item.ia) ? item.ia[0] : undefined;
  const access = [] as NonNullable<MediaItem['access']>;
  if (archiveId) access.push(makeArchiveAccess(archiveId, item.public_scan_b ? 'full' : 'unknown'));
  access.push({ id: `openlibrary-${workId}`, label: 'Abrir Open Library', kind: 'official-link', url: officialUrl, provider: 'Open Library', free: Boolean(item.public_scan_b) });
  return {
    id: `${type === 'novel' ? 'ol-novel-' : 'ol-'}${workId}`,
    source: 'openlibrary',
    sourceId: workId,
    title: item.title,
    mediaType: type,
    posterPath: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-L.jpg` : undefined,
    authors: item.author_name,
    releaseDate: item.first_publish_year ? String(item.first_publish_year) : undefined,
    publisher: item.publisher?.[0],
    voteAverage: 0,
    overview: item.first_sentence?.[0] || 'Nenhuma descrição disponível (Open Library).',
    status: 'Published',
    providerUrl: officialUrl,
    externalIds: { openLibrary: workId },
    providerIdentities: [{ provider: 'openlibrary', providerId: workId, mediaType: type, verifiedAt: Date.now() }],
    access,
  };
};

export const fetchBooksFallback = async (query: string, type: ReadableCatalogType = 'book', offset = 0): Promise<MediaItem[]> => {
  try {
    const params = new URLSearchParams({ q: query, limit: '20', offset: String(Math.max(0, Math.min(1_000, offset))) });
    if (type === 'comic') params.set('subject', 'comic_books');
    const url = `https://openlibrary.org/search.json?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('OpenLibrary error');
    const data = await res.json();
    if (data.docs && data.docs.length > 0) {
      return data.docs.map((item: any) => adaptOpenLibrary(item, type));
    }
  } catch (e) {
    console.warn("OpenLibrary fallback failed:", e);
  }
  return [];
};

export const adaptGoogleBooksVolume = (item: any, type: ReadableCatalogType): MediaItem => {
  const accessInfo = item.accessInfo || {};
  const access = [] as NonNullable<MediaItem['access']>;
  if (accessInfo.embeddable) access.push({ id: `gbooks-viewer-${item.id}`, label: accessInfo.viewability === 'ALL_PAGES' ? 'Ler completo' : 'Abrir prévia', kind: 'book-preview', embedId: item.id, url: accessInfo.webReaderLink, provider: 'Google Books', free: Boolean(accessInfo.publicDomain || accessInfo.viewability === 'ALL_PAGES'), legalNote: 'Disponibilidade determinada pelo Google Books e pela região.' });
  if (accessInfo.epub?.isAvailable && accessInfo.epub?.downloadLink) access.push({ id: `gbooks-epub-${item.id}`, label: 'Ler EPUB', kind: 'epub', url: accessInfo.epub.downloadLink, provider: 'Google Books', free: Boolean(accessInfo.publicDomain) });
  if (accessInfo.pdf?.isAvailable && accessInfo.pdf?.downloadLink) access.push({ id: `gbooks-pdf-${item.id}`, label: 'Ler PDF', kind: 'pdf', url: accessInfo.pdf.downloadLink, provider: 'Google Books', free: Boolean(accessInfo.publicDomain) });
  if (!access.length && item.volumeInfo?.previewLink) access.push({ id: `gbooks-official-${item.id}`, label: 'Abrir Google Books', kind: 'official-link', url: item.volumeInfo.previewLink, provider: 'Google Books', free: false });
  const prefix = type === 'novel' ? 'gbooks-novel-' : 'gbooks-';
  const isbn = item.volumeInfo?.industryIdentifiers?.find((identifier: { type?: string; identifier?: string }) => identifier.type === 'ISBN_13')?.identifier
    || item.volumeInfo?.industryIdentifiers?.find((identifier: { identifier?: string }) => identifier.identifier)?.identifier;
  return {
    id: `${prefix}${item.id}`,
    source: 'googlebooks',
    sourceId: item.id,
    title: item.volumeInfo?.title || 'Sem título',
    originalTitle: item.volumeInfo?.title,
    posterPath: item.volumeInfo?.imageLinks?.thumbnail?.replace('http:', 'https:') || undefined,
    mediaType: type,
    releaseDate: item.volumeInfo?.publishedDate,
    authors: item.volumeInfo?.authors,
    genres: item.volumeInfo?.categories,
    pages: item.volumeInfo?.pageCount,
    publisher: item.volumeInfo?.publisher,
    voteAverage: item.volumeInfo?.averageRating ? item.volumeInfo.averageRating * 2 : 0,
    overview: item.volumeInfo?.description,
    status: 'Published',
    googleVolumeId: item.id,
    embeddable: Boolean(accessInfo.embeddable),
    publicDomain: Boolean(accessInfo.publicDomain),
    providerUrl: item.volumeInfo?.infoLink || item.volumeInfo?.previewLink || accessInfo.webReaderLink,
    externalIds: { googleBooks: item.id, ...(isbn ? { isbn } : {}) },
    access,
  };
};

export const fetchBooksWithFallback = async (url: string, type: ReadableCatalogType, fallbackQuery: string): Promise<MediaItem[]> => {
  const cacheKey = `${type}-${url}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Google Books failed with status ${res.status}`);
    const data = await res.json();
    
    if (data.items && data.items.length > 0) {
      const results = data.items.map((item: any) => adaptGoogleBooksVolume(item, type));
      setCache(cacheKey, results);
      return results;
    } else {
      throw new Error("Google Books returned empty items");
    }
  } catch (e: any) {
    console.warn(`Google Books error (${e.message}). Trying OpenLibrary fallback for ${fallbackQuery}`);
    const requestUrl = new URL(url, 'https://hubora.local');
    const fallbackOffset = Number.parseInt(requestUrl.searchParams.get('startIndex') || '0', 10) || 0;
    const fallbackResults = await fetchBooksFallback(fallbackQuery, type, fallbackOffset);
    if (fallbackResults.length > 0) {
       setCache(cacheKey, fallbackResults);
       return fallbackResults;
    }
  }
  return [];
};
