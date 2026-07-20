import { MediaItem } from '@/types';

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
const adaptOpenLibrary = (item: any, type: 'book' | 'comic'): MediaItem => {
  return {
    id: `ol-${item.key?.replace('/works/', '') || item.cover_i}`,
    title: item.title,
    mediaType: type,
    posterPath: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-L.jpg` : undefined,
    authors: item.author_name,
    releaseDate: item.first_publish_year ? String(item.first_publish_year) : undefined,
    publisher: item.publisher?.[0],
    voteAverage: 0,
    overview: item.first_sentence?.[0] || 'Nenhuma descrição disponível (Open Library).',
    status: 'Published'
  };
};

export const fetchBooksFallback = async (query: string, isComic: boolean = false): Promise<MediaItem[]> => {
  try {
    let url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=15`;
    if (isComic) {
      url = `https://openlibrary.org/search.json?subject=comic_books&q=${encodeURIComponent(query)}&limit=15`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error('OpenLibrary error');
    const data = await res.json();
    if (data.docs && data.docs.length > 0) {
      return data.docs.map((item: any) => adaptOpenLibrary(item, isComic ? 'comic' : 'book'));
    }
  } catch (e) {
    console.warn("OpenLibrary fallback failed:", e);
  }
  return [];
};

export const fetchBooksWithFallback = async (url: string, type: 'book' | 'comic', fallbackQuery: string): Promise<MediaItem[]> => {
  const cacheKey = `${type}-${url}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Google Books failed with status ${res.status}`);
    const data = await res.json();
    
    if (data.items && data.items.length > 0) {
      const results = data.items.map((item: any) => {
        const accessInfo = item.accessInfo || {};
        const access = [] as NonNullable<MediaItem['access']>;
        if (accessInfo.embeddable) access.push({ id: `gbooks-viewer-${item.id}`, label: accessInfo.viewability === 'ALL_PAGES' ? 'Ler completo' : 'Abrir prévia', kind: 'book-preview', embedId: item.id, url: accessInfo.webReaderLink, provider: 'Google Books', free: Boolean(accessInfo.publicDomain || accessInfo.viewability === 'ALL_PAGES'), legalNote: 'Disponibilidade determinada pelo Google Books e pela região.' });
        if (accessInfo.epub?.isAvailable && accessInfo.epub?.downloadLink) access.push({ id: `gbooks-epub-${item.id}`, label: 'Ler EPUB', kind: 'epub', url: accessInfo.epub.downloadLink, provider: 'Google Books', free: Boolean(accessInfo.publicDomain) });
        if (accessInfo.pdf?.isAvailable && accessInfo.pdf?.downloadLink) access.push({ id: `gbooks-pdf-${item.id}`, label: 'Ler PDF', kind: 'pdf', url: accessInfo.pdf.downloadLink, provider: 'Google Books', free: Boolean(accessInfo.publicDomain) });
        if (!access.length && item.volumeInfo?.previewLink) access.push({ id: `gbooks-official-${item.id}`, label: 'Abrir Google Books', kind: 'official-link', url: item.volumeInfo.previewLink, provider: 'Google Books', free: false });
        return {
          id: `gbooks-${item.id}`,
          title: item.volumeInfo?.title || 'Unknown',
          posterPath: item.volumeInfo?.imageLinks?.thumbnail?.replace('http:', 'https:') || undefined,
          mediaType: type,
          releaseDate: item.volumeInfo?.publishedDate,
          authors: item.volumeInfo?.authors,
          pages: item.volumeInfo?.pageCount,
          publisher: item.volumeInfo?.publisher,
          voteAverage: item.volumeInfo?.averageRating ? item.volumeInfo.averageRating * 2 : 0,
          overview: item.volumeInfo?.description,
          status: 'Published',
          googleVolumeId: item.id,
          embeddable: Boolean(accessInfo.embeddable),
          publicDomain: Boolean(accessInfo.publicDomain),
          providerUrl: item.volumeInfo?.infoLink || item.volumeInfo?.previewLink,
          access,
        };
      });
      setCache(cacheKey, results);
      return results;
    } else {
      throw new Error("Google Books returned empty items");
    }
  } catch (e: any) {
    console.warn(`Google Books error (${e.message}). Triying fallback OpenLibrary for ${fallbackQuery}`);
    const fallbackResults = await fetchBooksFallback(fallbackQuery, type === 'comic');
    if (fallbackResults.length > 0) {
       setCache(cacheKey, fallbackResults);
       return fallbackResults;
    }
  }
  return [];
};
