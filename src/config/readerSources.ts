const MAX_READER_BYTES = 80 * 1024 * 1024;
const ALLOWED_READER_HOSTS = new Set([
  'gutenberg.org',
  'www.gutenberg.org',
  'standardebooks.org',
  'www.standardebooks.org',
  'archive.org',
  'www.archive.org',
]);

function allowedHost(hostname: string) {
  return ALLOWED_READER_HOSTS.has(hostname) || /^ia\d{6}\.us\.archive\.org$/.test(hostname);
}

export function parseAllowedReaderSource(value: string | null): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    if (!allowedHost(url.hostname) || !/\.(?:epub|pdf)$/i.test(url.pathname)) return null;
    url.hash = '';
    return url;
  } catch {
    return null;
  }
}

export function readerProxyUrl(value: string | null): string | null {
  const source = parseAllowedReaderSource(value);
  return source ? `/api/reader-source?url=${encodeURIComponent(source.toString())}` : null;
}

export async function fetchAllowedReaderSource(value: string | null) {
  let source = parseAllowedReaderSource(value);
  if (!source) throw new Error('Fonte de leitura não permitida.');

  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const response: Response = await fetch(source.toString(), {
      redirect: 'manual',
      headers: { Accept: 'application/epub+zip, application/pdf;q=0.9' },
      signal: AbortSignal.timeout(20_000),
    });
    if (response.status >= 300 && response.status < 400) {
      const location: string | null = response.headers.get('location');
      source = location ? parseAllowedReaderSource(new URL(location, source).toString()) : null;
      if (!source) throw new Error('Redirecionamento de leitura não permitido.');
      continue;
    }
    if (!response.ok) throw new Error(`A fonte oficial respondeu com status ${response.status}.`);

    const length = Number(response.headers.get('content-length') || 0);
    if (length > MAX_READER_BYTES) throw new Error('A obra excede o limite seguro de 80 MB.');
    const body = await response.arrayBuffer();
    if (body.byteLength > MAX_READER_BYTES) throw new Error('A obra excede o limite seguro de 80 MB.');
    const contentType = source.pathname.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/epub+zip';
    return { body, contentType, source: source.toString() };
  }
  throw new Error('A fonte oficial excedeu o limite de redirecionamentos.');
}
