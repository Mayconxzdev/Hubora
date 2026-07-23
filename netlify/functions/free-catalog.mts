import type { Config } from '@netlify/functions';
import { fetchWithTimeout, json, safeError } from './_shared/http.js';

type Item = {
  id: string;
  source: string;
  mediaType: 'book' | 'movie';
  title: string;
  authors: string[];
  description?: string;
  image?: string;
  year?: string;
  access: Array<{ kind: string; label: string; url?: string; volumeId?: string; free: boolean }>;
};

function stripHtml(value?: string) {
  return value?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function xmlText(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}

function xmlAttr(tag: string, attr: string) {
  return tag.match(new RegExp(`${attr}=["']([^"']+)["']`, 'i'))?.[1];
}

async function googleBooks(query: string): Promise<Item[]> {
  const key = process.env.GOOGLE_BOOKS_API_KEY ? `&key=${encodeURIComponent(process.env.GOOGLE_BOOKS_API_KEY)}` : '';
  const response = await fetchWithTimeout(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&filter=free-ebooks&maxResults=20&printType=books${key}`);
  if (!response.ok) return [];
  const data = await response.json() as { items?: Array<Record<string, any>> };
  return (data.items || []).map((record) => {
    const info = record.volumeInfo || {};
    const accessInfo = record.accessInfo || {};
    const access: Item['access'] = [];
    if (accessInfo.embeddable) access.push({ kind: 'google-books', label: accessInfo.viewability === 'ALL_PAGES' ? 'Ler completo' : 'Abrir prévia', volumeId: record.id, url: accessInfo.webReaderLink, free: Boolean(accessInfo.publicDomain || accessInfo.viewability === 'ALL_PAGES') });
    if (accessInfo.epub?.isAvailable && accessInfo.epub?.downloadLink) access.push({ kind: 'epub', label: 'EPUB', url: accessInfo.epub.downloadLink, free: true });
    if (accessInfo.pdf?.isAvailable && accessInfo.pdf?.downloadLink) access.push({ kind: 'pdf', label: 'PDF', url: accessInfo.pdf.downloadLink, free: true });
    if (!access.length && info.previewLink) access.push({ kind: 'official-link', label: 'Abrir Google Books', url: info.previewLink, free: false });
    return { id: `google:${record.id}`, source: 'Google Books', mediaType: 'book', title: info.title || 'Sem título', authors: info.authors || [], description: stripHtml(info.description), image: info.imageLinks?.thumbnail?.replace('http:', 'https:'), year: info.publishedDate, access };
  });
}

async function openLibrary(query: string): Promise<Item[]> {
  const response = await fetchWithTimeout(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=20&fields=key,title,author_name,first_publish_year,cover_i,edition_key,public_scan_b,ia`);
  if (!response.ok) return [];
  const data = await response.json() as { docs?: Array<Record<string, any>> };
  return (data.docs || []).map((doc) => {
    const ia = Array.isArray(doc.ia) ? doc.ia[0] : undefined;
    const access: Item['access'] = [];
    if (ia && doc.public_scan_b) access.push({ kind: 'embed', label: 'Ler no Internet Archive', url: `https://archive.org/embed/${encodeURIComponent(ia)}`, free: true });
    access.push({ kind: 'official-link', label: 'Abrir Open Library', url: `https://openlibrary.org${doc.key}`, free: Boolean(doc.public_scan_b) });
    return { id: `ol:${doc.key}`, source: 'Open Library', mediaType: 'book', title: doc.title || 'Sem título', authors: doc.author_name || [], image: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : undefined, year: doc.first_publish_year ? String(doc.first_publish_year) : undefined, access };
  });
}

async function gutenberg(query: string): Promise<Item[]> {
  const response = await fetchWithTimeout(`https://www.gutenberg.org/ebooks/search.opds/?query=${encodeURIComponent(query)}`, { headers: { 'user-agent': 'Hubora (personal media organizer)' } }, 9_000);
  if (!response.ok) return [];
  const xml = await response.text();
  return Array.from(xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)).slice(0, 20).map((match) => {
    const block = match[1];
    const idRaw = xmlText(block, 'id') || crypto.randomUUID();
    const title = xmlText(block, 'title') || 'Sem título';
    const authorBlock = block.match(/<author>([\s\S]*?)<\/author>/i)?.[1] || '';
    const author = xmlText(authorBlock, 'name');
    const links = Array.from(block.matchAll(/<link\b[^>]*>/gi)).map((entry) => entry[0]);
    const acquisition = links.find((tag) => /acquisition/i.test(xmlAttr(tag, 'rel') || '') && /(epub|html|pdf|text)/i.test(xmlAttr(tag, 'type') || '')) || links.find((tag) => /acquisition/i.test(xmlAttr(tag, 'rel') || ''));
    const image = links.find((tag) => /image/i.test(xmlAttr(tag, 'rel') || ''));
    const href = acquisition ? xmlAttr(acquisition, 'href') : undefined;
    const mime = acquisition ? xmlAttr(acquisition, 'type') || '' : '';
    const canonicalId = idRaw.match(/ebooks\/(\d+)/)?.[1];
    const landing = canonicalId ? `https://www.gutenberg.org/ebooks/${canonicalId}` : idRaw;
    const kind = /epub/i.test(mime) ? 'epub' : /pdf/i.test(mime) ? 'pdf' : /html/i.test(mime) ? 'html' : 'official-link';
    return { id: `gutenberg:${canonicalId || idRaw}`, source: 'Project Gutenberg', mediaType: 'book', title, authors: author ? [author] : [], description: stripHtml(xmlText(block, 'summary') || xmlText(block, 'content')), image: image ? xmlAttr(image, 'href') : undefined, access: [{ kind, label: kind === 'official-link' ? 'Abrir Project Gutenberg' : 'Ler agora', url: href || landing, free: true }, { kind: 'official-link', label: 'Página oficial', url: landing, free: true }] };
  });
}


function archiveQuery(value: string) {
  return value.replace(/[^\p{L}\p{N}\s'-]/gu, ' ').trim().split(/\s+/).filter(Boolean).slice(0, 8).map((term) => `title:${JSON.stringify(term)}`).join(' AND ');
}

async function internetArchiveMovies(query: string): Promise<Item[]> {
  const terms = archiveQuery(query);
  if (!terms) return [];
  const search = `mediatype:movies AND (collection:feature_films OR collection:opensource_movies OR collection:prelinger) AND (${terms})`;
  const params = new URLSearchParams({
    q: search,
    rows: '16',
    page: '1',
    output: 'json',
    sort: 'downloads desc',
  });
  for (const field of ['identifier', 'title', 'creator', 'date', 'description', 'licenseurl', 'rights', 'collection', 'downloads']) {
    params.append('fl[]', field);
  }
  const response = await fetchWithTimeout(`https://archive.org/advancedsearch.php?${params.toString()}`, { headers: { 'user-agent': 'Hubora (personal media organizer)' } }, 10_000);
  if (!response.ok) return [];
  const data = await response.json() as { response?: { docs?: Array<Record<string, any>> } };
  return (data.response?.docs || []).flatMap((doc) => {
    const identifier = String(doc.identifier || '').trim();
    if (!identifier) return [];
    const creator = Array.isArray(doc.creator) ? doc.creator.map(String) : doc.creator ? [String(doc.creator)] : [];
    const year = Array.isArray(doc.date) ? String(doc.date[0] || '') : String(doc.date || '');
    const page = `https://archive.org/details/${encodeURIComponent(identifier)}`;
    const licenseText = [doc.licenseurl, doc.rights]
      .flatMap((value) => Array.isArray(value) ? value : value ? [value] : [])
      .map(String)
      .join(' ')
      .toLowerCase();
    const hasOpenLicense = /creativecommons\.org|public domain|cc0|no known copyright restrictions/.test(licenseText);
    const access: Item['access'] = hasOpenLicense
      ? [
          { kind: 'embed', label: 'Assistir no Hubora', url: `https://archive.org/embed/${encodeURIComponent(identifier)}`, free: true },
          { kind: 'official-link', label: 'Abrir item e licença', url: page, free: true },
        ]
      : [
          { kind: 'official-link', label: 'Verificar acesso e licença na origem', url: page, free: false },
        ];
    return [{
      id: `archive:${identifier}`,
      source: 'Internet Archive',
      mediaType: 'movie' as const,
      title: Array.isArray(doc.title) ? String(doc.title[0] || 'Sem título') : String(doc.title || 'Sem título'),
      authors: creator,
      description: stripHtml(Array.isArray(doc.description) ? String(doc.description[0] || '') : String(doc.description || doc.rights || '')),
      image: `https://archive.org/services/img/${encodeURIComponent(identifier)}`,
      year: year || undefined,
      access,
    }];
  });
}

export default async (request: Request) => {
  if (request.method !== 'GET') return json({ error: 'Método não permitido.' }, { status: 405 });
  const query = new URL(request.url).searchParams.get('q')?.trim();
  if (!query || query.length < 2 || query.length > 120) return json({ error: 'Informe uma busca entre 2 e 120 caracteres.' }, { status: 400 });
  try {
    const settled = await Promise.allSettled([googleBooks(query), openLibrary(query), gutenberg(query), internetArchiveMovies(query)]);
    const items = settled.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
    return json({ items, sources: { googleBooks: settled[0].status, openLibrary: settled[1].status, gutenberg: settled[2].status, internetArchive: settled[3].status } }, { headers: { 'cache-control': 'public, max-age=900, stale-while-revalidate=3600' } });
  } catch (error) {
    return json({ error: safeError(error) }, { status: 502 });
  }
};

export const config: Config = { path: '/api/free-catalog' };
