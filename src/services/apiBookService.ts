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

export const fetchBooksFallback = async (query: string, type: ReadableCatalogType = 'book', offset = 0, signal?: AbortSignal): Promise<MediaItem[]> => {
  try {
    const params = new URLSearchParams({ q: query, limit: '20', offset: String(Math.max(0, Math.min(1_000, offset))) });
    if (type === 'comic') params.set('subject', 'comic_books');
    const url = `https://openlibrary.org/search.json?${params.toString()}`;
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error('OpenLibrary error');
    const data = await res.json();
    if (data.docs && data.docs.length > 0) {
      return data.docs.map((item: any) => adaptOpenLibrary(item, type));
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return [];
    console.warn("OpenLibrary fallback failed:", e);
  }
  return [];
};

function normalizeCatalogTitle(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, ' ').trim().toLowerCase();
}

export const OFFICIAL_READABLE_CATALOG: MediaItem[] = [
  {
    id: 'official-comic-batman-o-cavaleiro-das-trevas',
    source: 'official-publisher',
    sourceId: 'panini-adcpo015',
    title: 'Batman: O Cavaleiro das Trevas',
    originalTitle: 'Batman: The Dark Knight Returns',
    mediaType: 'comic',
    authors: ['Frank Miller', 'Klaus Janson'],
    publisher: 'DC Comics / Panini Brasil',
    releaseDate: '1986',
    pages: 200,
    genres: ['Super-heróis', 'Graphic Novel'],
    overview: 'Edição brasileira da minissérie Batman: The Dark Knight Returns (1986), com metadados confirmados pela editora Panini Brasil.',
    status: 'Published',
    providerUrl: 'https://panini.com.br/batman-o-cavaleiro-das-trevas-dc-de-bolso',
    providerIdentities: [{ provider: 'panini-brasil', providerId: 'ADCPO015', mediaType: 'comic', verifiedAt: Date.now() }],
    access: [],
  },
  {
    id: 'official-comic-spider-man-blue',
    source: 'official-publisher',
    sourceId: 'marvel-collection-42793',
    title: 'Spider-Man: Blue',
    mediaType: 'comic',
    authors: ['Jeph Loeb', 'Tim Sale'],
    publisher: 'Marvel',
    releaseDate: '2002',
    pages: 160,
    genres: ['Super-heróis', 'Graphic Novel'],
    overview: 'Série limitada de seis edições escrita por Jeph Loeb e ilustrada por Tim Sale, conforme o catálogo oficial da Marvel.',
    status: 'Published',
    providerUrl: 'https://www.marvel.com/comics/collection/42793/',
    providerIdentities: [{ provider: 'marvel', providerId: '42793', mediaType: 'comic', verifiedAt: Date.now() }],
    access: [],
  },
  {
    id: 'official-novel-solo-leveling',
    source: 'official-publisher',
    sourceId: 'yenpress-solo-leveling-novel',
    title: 'Solo Leveling',
    mediaType: 'novel',
    authors: ['Chugong'],
    publisher: 'Yen Press / Yen On',
    releaseDate: '2021-02-16',
    pages: 322,
    genres: ['Ação', 'Fantasia', 'Drama'],
    overview: 'Série de novels de Chugong, identificada separadamente da adaptação em quadrinhos pelo catálogo oficial da Yen Press.',
    status: 'Published',
    providerUrl: 'https://yenpress.com/series/solo-leveling-novel',
    providerIdentities: [{ provider: 'yen-press', providerId: 'solo-leveling-novel', mediaType: 'novel', verifiedAt: Date.now() }],
    externalIds: { isbn: '9781975319274' },
    access: [],
  },
  {
    id: 'official-novel-overlord',
    source: 'official-publisher',
    sourceId: 'yenpress-overlord',
    title: 'Overlord',
    mediaType: 'novel',
    authors: ['Kugane Maruyama', 'so-bin'],
    publisher: 'Yen Press / Yen On',
    releaseDate: '2016-05-24',
    pages: 262,
    genres: ['Isekai', 'Fantasia', 'Ação'],
    overview: 'Light novel de Kugane Maruyama com arte de so-bin, mantida como domínio Novel conforme o catálogo oficial da Yen Press.',
    status: 'Published',
    providerUrl: 'https://yenpress.com/series/overlord',
    providerIdentities: [{ provider: 'yen-press', providerId: 'overlord', mediaType: 'novel', verifiedAt: Date.now() }],
    externalIds: { isbn: '9780316272247' },
    access: [],
  },
  {
    id: 'official-book-a-metamorfose',
    source: 'official-publisher',
    sourceId: 'dominiopublico-metamorfose',
    title: 'A Metamorfose',
    originalTitle: 'Die Verwandlung',
    mediaType: 'book',
    authors: ['Franz Kafka'],
    publisher: 'Domínio Público / MEC',
    releaseDate: '1915',
    pages: 104,
    genres: ['Ficção', 'Clássicos', 'Literatura'],
    overview: 'Numa manhã, ao despertar de sonhos intranquilos, Gregor Samsa deu por si na cama transformado num inseto monstruoso. Clássico imortal de Franz Kafka.',
    status: 'Published',
    providerUrl: 'https://www.dominiopublico.gov.br/download/texto/bk000424.pdf',
    providerIdentities: [{ provider: 'dominiopublico', providerId: 'bk000424', mediaType: 'book', verifiedAt: Date.now() }],
    access: [
      { id: 'pdf-metamorfose', label: 'Ler PDF Completo (Domínio Público / MEC)', kind: 'pdf', url: 'https://www.dominiopublico.gov.br/download/texto/bk000424.pdf', provider: 'Domínio Público / MEC', free: true },
      { id: 'epub-metamorfose', label: 'Ler EPUB (Project Gutenberg)', kind: 'epub', url: 'https://www.gutenberg.org/ebooks/5200.epub.images', provider: 'Project Gutenberg', free: true }
    ],
  },
  {
    id: 'official-book-dom-casmurro',
    source: 'official-publisher',
    sourceId: 'dominiopublico-dom-casmurro',
    title: 'Dom Casmurro',
    mediaType: 'book',
    authors: ['Machado de Assis'],
    publisher: 'Domínio Público / MEC',
    releaseDate: '1899',
    pages: 256,
    genres: ['Ficção', 'Clássicos', 'Literatura Brasileira'],
    overview: 'Dom Casmurro é uma das grandes obras-primas da literatura brasileira escrita por Machado de Assis e publicada em 1899.',
    status: 'Published',
    providerUrl: 'https://www.dominiopublico.gov.br/download/texto/bk000043.pdf',
    providerIdentities: [{ provider: 'dominiopublico', providerId: 'bk000043', mediaType: 'book', verifiedAt: Date.now() }],
    access: [
      { id: 'pdf-casmurro', label: 'Ler PDF Completo (Domínio Público / MEC)', kind: 'pdf', url: 'https://www.dominiopublico.gov.br/download/texto/bk000043.pdf', provider: 'Domínio Público / MEC', free: true },
      { id: 'epub-casmurro', label: 'Ler EPUB (Project Gutenberg)', kind: 'epub', url: 'https://www.gutenberg.org/ebooks/55752.epub.images', provider: 'Project Gutenberg', free: true }
    ],
  },
];

function findOfficialReadable(query: string, type: ReadableCatalogType) {
  const normalized = normalizeCatalogTitle(query);
  if (!normalized) return undefined;
  return OFFICIAL_READABLE_CATALOG.find(
    (item) => item.mediaType === type && (normalizeCatalogTitle(item.title).includes(normalized) || normalized.includes(normalizeCatalogTitle(item.title)))
  );
}

export function getOfficialReadableCatalogItem(id: string): MediaItem | null {
  const item = OFFICIAL_READABLE_CATALOG.find((candidate) => String(candidate.id) === id);
  if (!item) return null;
  return {
    ...item,
    authors: item.authors ? [...item.authors] : undefined,
    genres: item.genres ? [...item.genres] : undefined,
    providerIdentities: item.providerIdentities ? item.providerIdentities.map((identity) => ({ ...identity })) : undefined,
    externalIds: item.externalIds ? { ...item.externalIds } : undefined,
    access: item.access ? item.access.map((entry) => ({ ...entry })) : [],
  };
}

export const adaptGoogleBooksVolume = (item: any, type: ReadableCatalogType): MediaItem => {
  const accessInfo = item.accessInfo || {};
  const access = [] as NonNullable<MediaItem['access']>;
  const titleLower = (item.volumeInfo?.title || '').toLowerCase();

  if (titleLower.includes('metamorfose') || titleLower.includes('metamorphosis')) {
    access.push(
      { id: `pdf-metamorfose`, label: 'Ler PDF Completo (Domínio Público / MEC)', kind: 'pdf', url: 'https://www.dominiopublico.gov.br/download/texto/bk000424.pdf', provider: 'Domínio Público / MEC', free: true },
      { id: `epub-metamorfose`, label: 'Ler EPUB (Project Gutenberg)', kind: 'epub', url: 'https://www.gutenberg.org/ebooks/5200.epub.images', provider: 'Project Gutenberg', free: true }
    );
  } else if (titleLower.includes('casmurro')) {
    access.push(
      { id: `pdf-casmurro`, label: 'Ler PDF Completo (Domínio Público / MEC)', kind: 'pdf', url: 'https://www.dominiopublico.gov.br/download/texto/bk000043.pdf', provider: 'Domínio Público / MEC', free: true },
      { id: `epub-casmurro`, label: 'Ler EPUB (Project Gutenberg)', kind: 'epub', url: 'https://www.gutenberg.org/ebooks/55752.epub.images', provider: 'Project Gutenberg', free: true }
    );
  }

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

export const fetchBooksWithFallback = async (url: string, type: ReadableCatalogType, fallbackQuery: string, signal?: AbortSignal): Promise<MediaItem[]> => {
  const cacheKey = `${type}-${url}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;
  const officialItem = findOfficialReadable(fallbackQuery, type);
  if (officialItem) {
    const officialResults = [officialItem];
    setCache(cacheKey, officialResults);
    return officialResults;
  }

  try {
    const res = await fetch(url, { signal });
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
    if (e instanceof DOMException && e.name === 'AbortError') return [];
    console.warn(`Google Books error (${e.message}). Trying OpenLibrary fallback for ${fallbackQuery}`);
    const requestUrl = new URL(url, 'https://hubora.local');
    const fallbackOffset = Number.parseInt(requestUrl.searchParams.get('startIndex') || '0', 10) || 0;
    const fallbackResults = await fetchBooksFallback(fallbackQuery, type, fallbackOffset, signal);
    if (fallbackResults.length > 0) {
       setCache(cacheKey, fallbackResults);
       return fallbackResults;
    }
  }
  return [];
};
