import { useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, LoaderCircle, Minus, Plus } from 'lucide-react';
import { unzipSync, strFromU8 } from 'fflate';
import { Button } from '@/components/ui/Button';

interface EpubChapter {
  id: string;
  title: string;
  html: string;
}

interface EpubBookData {
  title: string;
  chapters: EpubChapter[];
  objectUrls: string[];
}

const MAX_EPUB_BYTES = 80 * 1024 * 1024;

function normalizePath(path: string) {
  const output: string[] = [];
  for (const part of path.replace(/\\/g, '/').split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') output.pop();
    else output.push(part);
  }
  return output.join('/');
}

function resolvePath(baseFile: string, target: string) {
  if (/^(?:[a-z]+:|#|data:|blob:)/i.test(target)) return target;
  const base = baseFile.includes('/') ? baseFile.slice(0, baseFile.lastIndexOf('/') + 1) : '';
  return normalizePath(`${base}${target.split('#')[0].split('?')[0]}`);
}

function xmlElement(document: Document, localName: string) {
  return document.getElementsByTagNameNS('*', localName)[0] || document.getElementsByTagName(localName)[0];
}

function mimeFromPath(path: string, declared?: string) {
  if (declared) return declared;
  const extension = path.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    css: 'text/css', woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf', mp3: 'audio/mpeg', mp4: 'video/mp4',
  };
  return map[extension || ''] || 'application/octet-stream';
}

function sanitizeDocument(document: Document, chapterPath: string, resourceUrls: Map<string, string>) {
  document.querySelectorAll('script, object, embed, iframe, form, input, button, textarea, select, meta[http-equiv]').forEach((node) => node.remove());
  document.querySelectorAll<HTMLElement>('*').forEach((element) => {
    for (const attribute of Array.from(element.attributes)) {
      if (/^on/i.test(attribute.name)) element.removeAttribute(attribute.name);
    }
  });

  const rewrite = (element: Element, attributeName: string) => {
    const value = element.getAttribute(attributeName);
    if (!value || value.startsWith('#') || /^(?:data:|blob:)/i.test(value)) return;
    if (/^https?:/i.test(value)) {
      if (element.tagName.toLowerCase() === 'a') {
        element.setAttribute('target', '_blank');
        element.setAttribute('rel', 'noopener noreferrer');
      } else {
        element.removeAttribute(attributeName);
      }
      return;
    }
    const path = resolvePath(chapterPath, value);
    const objectUrl = resourceUrls.get(path);
    if (objectUrl) element.setAttribute(attributeName, objectUrl);
    else if (element.tagName.toLowerCase() === 'a') element.setAttribute('href', '#');
    else element.removeAttribute(attributeName);
  };

  document.querySelectorAll('[src]').forEach((element) => rewrite(element, 'src'));
  document.querySelectorAll('[poster]').forEach((element) => rewrite(element, 'poster'));
  document.querySelectorAll('link[href]').forEach((element) => rewrite(element, 'href'));
  document.querySelectorAll('a[href]').forEach((element) => rewrite(element, 'href'));
  return document;
}

async function readEpub(source: string): Promise<EpubBookData> {
  const response = await fetch(source, { credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (!response.ok) throw new Error(`Não foi possível baixar o EPUB (${response.status}).`);
  const declaredSize = Number(response.headers.get('content-length') || 0);
  if (declaredSize > MAX_EPUB_BYTES) throw new Error('O EPUB excede o limite seguro de 80 MB do leitor online.');
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > MAX_EPUB_BYTES) throw new Error('O EPUB excede o limite seguro de 80 MB do leitor online.');

  const archive = unzipSync(new Uint8Array(buffer));
  const file = (path: string) => archive[normalizePath(path)];
  const containerBytes = file('META-INF/container.xml');
  if (!containerBytes) throw new Error('EPUB inválido: META-INF/container.xml não foi encontrado.');

  const parser = new DOMParser();
  const container = parser.parseFromString(strFromU8(containerBytes), 'application/xml');
  const rootfile = xmlElement(container, 'rootfile');
  const opfPath = rootfile?.getAttribute('full-path');
  if (!opfPath) throw new Error('EPUB inválido: pacote principal não identificado.');
  const opfBytes = file(opfPath);
  if (!opfBytes) throw new Error('EPUB inválido: pacote OPF ausente.');

  const opf = parser.parseFromString(strFromU8(opfBytes), 'application/xml');
  if (opf.querySelector('parsererror')) throw new Error('EPUB inválido: pacote OPF não pôde ser interpretado.');
  const metadataTitle = Array.from(opf.getElementsByTagNameNS('*', 'title'))[0]?.textContent?.trim() || 'Livro EPUB';

  const manifest = new Map<string, { path: string; type: string; properties: string }>();
  Array.from(opf.getElementsByTagNameNS('*', 'item')).forEach((item) => {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    if (!id || !href) return;
    manifest.set(id, {
      path: resolvePath(opfPath, href),
      type: item.getAttribute('media-type') || '',
      properties: item.getAttribute('properties') || '',
    });
  });

  const objectUrls: string[] = [];
  const resourceUrls = new Map<string, string>();
  for (const resource of manifest.values()) {
    if (/html|xhtml|xml|css/i.test(resource.type)) continue;
    const bytes = file(resource.path);
    if (!bytes) continue;
    const resourceBuffer = Uint8Array.from(bytes).buffer;
    const objectUrl = URL.createObjectURL(new Blob([resourceBuffer], { type: mimeFromPath(resource.path, resource.type) }));
    objectUrls.push(objectUrl);
    resourceUrls.set(resource.path, objectUrl);
  }

  for (const resource of manifest.values()) {
    if (!/css/i.test(resource.type) && !/\.css$/i.test(resource.path)) continue;
    const bytes = file(resource.path);
    if (!bytes) continue;
    const css = strFromU8(bytes).replace(/url\((['"]?)([^)'"\s]+)\1\)/gi, (_match, _quote, value: string) => {
      const path = resolvePath(resource.path, value);
      const objectUrl = resourceUrls.get(path);
      return objectUrl ? `url("${objectUrl}")` : 'none';
    });
    const objectUrl = URL.createObjectURL(new Blob([css], { type: 'text/css' }));
    objectUrls.push(objectUrl);
    resourceUrls.set(resource.path, objectUrl);
  }

  const chapters: EpubChapter[] = [];
  const spineRefs = Array.from(opf.getElementsByTagNameNS('*', 'itemref'));
  for (const [index, reference] of spineRefs.entries()) {
    const idref = reference.getAttribute('idref');
    const resource = idref ? manifest.get(idref) : undefined;
    if (!resource) continue;
    const bytes = file(resource.path);
    if (!bytes) continue;
    const chapterDocument = parser.parseFromString(strFromU8(bytes), 'application/xhtml+xml');
    const parsed = chapterDocument.querySelector('parsererror')
      ? parser.parseFromString(strFromU8(bytes), 'text/html')
      : chapterDocument;
    sanitizeDocument(parsed, resource.path, resourceUrls);
    const chapterTitle = parsed.querySelector('title')?.textContent?.trim()
      || parsed.querySelector('h1, h2, h3')?.textContent?.trim()
      || `Capítulo ${index + 1}`;
    const body = parsed.body?.innerHTML || parsed.documentElement?.innerHTML || '';
    chapters.push({ id: idref || String(index), title: chapterTitle.slice(0, 120), html: body });
  }

  if (!chapters.length) throw new Error('O EPUB não possui capítulos legíveis no navegador.');
  return { title: metadataTitle, chapters, objectUrls };
}

function chapterDocument(html: string, fontSize: number, dark: boolean) {
  const background = dark ? '#111111' : '#fffefb';
  const text = dark ? '#f7f1e6' : '#191817';
  const muted = dark ? '#c7beaf' : '#605a50';
  const link = '#b97716';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    :root{color-scheme:${dark ? 'dark' : 'light'}}*{box-sizing:border-box}html{background:${background}}body{max-width:52rem;margin:0 auto;padding:clamp(1.4rem,4vw,4rem);background:${background};color:${text};font-family:Georgia,'Times New Roman',serif;font-size:${fontSize}px;line-height:1.75;overflow-wrap:anywhere}img,svg,video{max-width:100%;height:auto}table{max-width:100%;border-collapse:collapse}pre{white-space:pre-wrap}a{color:${link}}blockquote{border-left:3px solid ${link};margin-left:0;padding-left:1rem;color:${muted}}h1,h2,h3,h4{line-height:1.2;color:${text}}p{margin:0 0 1em}</style></head><body>${html}</body></html>`;
}

export function EpubReader({ source, storageKey }: { source: string; storageKey: string }) {
  const [book, setBook] = useState<EpubBookData | null>(null);
  const [error, setError] = useState('');
  const [chapterIndex, setChapterIndex] = useState(() => Number(localStorage.getItem(`${storageKey}:chapter`) || 0));
  const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem(`${storageKey}:font`) || 18));
  const [dark, setDark] = useState(() => localStorage.getItem(`${storageKey}:theme`) === 'dark');

  useEffect(() => {
    let cancelled = false;
    let loaded: EpubBookData | null = null;
    setError('');
    setBook(null);
    void readEpub(source).then((data) => {
      loaded = data;
      if (cancelled) {
        data.objectUrls.forEach((url) => URL.revokeObjectURL(url));
        return;
      }
      setBook(data);
      setChapterIndex((current) => Math.min(Math.max(0, current), data.chapters.length - 1));
    }).catch((reason) => !cancelled && setError(reason instanceof Error ? reason.message : 'Não foi possível abrir o EPUB.'));
    return () => {
      cancelled = true;
      loaded?.objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [source]);

  useEffect(() => { localStorage.setItem(`${storageKey}:chapter`, String(chapterIndex)); }, [chapterIndex, storageKey]);
  useEffect(() => { localStorage.setItem(`${storageKey}:font`, String(fontSize)); }, [fontSize, storageKey]);
  useEffect(() => { localStorage.setItem(`${storageKey}:theme`, dark ? 'dark' : 'light'); }, [dark, storageKey]);

  const chapter = book?.chapters[chapterIndex];
  const srcDoc = useMemo(() => chapter ? chapterDocument(chapter.html, fontSize, dark) : '', [chapter, fontSize, dark]);

  if (error) return <div className="hub-empty-state min-h-[55vh]"><BookOpen size={34}/><p className="max-w-xl">{error}</p><small>Algumas origens bloqueiam CORS; nesses casos, abra a fonte oficial.</small></div>;
  if (!book || !chapter) return <div className="grid min-h-[55vh] place-items-center rounded-3xl border border-[var(--hub-border)] bg-[var(--hub-surface-1)]"><LoaderCircle className="animate-spin text-[var(--hub-brand)]" size={34}/></div>;

  return <section className="overflow-hidden rounded-3xl border border-[var(--hub-border)] bg-[var(--hub-surface-1)]">
    <div className="flex flex-wrap items-center gap-2 border-b border-[var(--hub-border)] p-3 sm:p-4">
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-[var(--hub-text-strong)]">{book.title}</p><p className="truncate text-xs text-[var(--hub-subtle)]">{chapter.title} • {chapterIndex + 1}/{book.chapters.length}</p></div>
      <select aria-label="Escolher capítulo" value={chapterIndex} onChange={(event) => setChapterIndex(Number(event.target.value))} className="max-w-56 rounded-xl border border-[var(--hub-border)] bg-[var(--hub-surface-2)] px-3 py-2 text-sm text-[var(--hub-text-strong)]">
        {book.chapters.map((entry, index) => <option key={entry.id} value={index}>{index + 1}. {entry.title}</option>)}
      </select>
      <Button size="sm" variant="ghost" aria-label="Diminuir fonte" onClick={() => setFontSize((value) => Math.max(14, value - 1))}><Minus size={16}/></Button>
      <span className="min-w-12 text-center text-xs font-bold text-[var(--hub-muted)]">{fontSize}px</span>
      <Button size="sm" variant="ghost" aria-label="Aumentar fonte" onClick={() => setFontSize((value) => Math.min(30, value + 1))}><Plus size={16}/></Button>
      <Button size="sm" variant="outline" onClick={() => setDark((value) => !value)}>{dark ? 'Claro' : 'Escuro'}</Button>
    </div>
    <iframe title={`${book.title} — ${chapter.title}`} srcDoc={srcDoc} sandbox="allow-same-origin" className="h-[72vh] w-full bg-white" />
    <div className="flex items-center justify-between gap-3 border-t border-[var(--hub-border)] p-3 sm:p-4">
      <Button variant="outline" disabled={chapterIndex === 0} onClick={() => setChapterIndex((value) => Math.max(0, value - 1))}><ChevronLeft size={17}/> Anterior</Button>
      <span className="text-xs font-bold text-[var(--hub-subtle)]">Progresso salvo neste aparelho</span>
      <Button disabled={chapterIndex >= book.chapters.length - 1} onClick={() => setChapterIndex((value) => Math.min(book.chapters.length - 1, value + 1))}>Próximo <ChevronRight size={17}/></Button>
    </div>
  </section>;
}
