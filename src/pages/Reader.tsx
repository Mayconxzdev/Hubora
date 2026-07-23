import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, ExternalLink, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SEO } from '@/components/ui/SEO';
import { EpubReader } from '@/components/reader/EpubReader';
import { PdfReader } from '@/components/reader/PdfReader';
import { mangaDexApi } from '@/services/api';
import { useStore } from '@/store/useStore';
import { toast } from 'sonner';
import { readerProxyUrl } from '@/config/readerSources';

function MangaViewer({ chapterId, mangaId }: { chapterId?: string, mangaId?: string }) {
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [chapters, setChapters] = useState<any[]>([]);
  const [currentChId, setCurrentChId] = useState(chapterId || '');
  const [currentChIndex, setCurrentChIndex] = useState(-1);
  const [viewMode, setViewMode] = useState<'scroll' | 'page'>('scroll');
  const [currentPage, setCurrentPage] = useState(0);

  const library = useStore((state) => state.library);
  const updateLibraryItem = useStore((state) => state.updateLibraryItem);

  // Sync progress to library when chapter changes
  const syncProgress = (chapterNum: number | string) => {
    if (!mangaId) return;
    const keys = Object.keys(library);
    const key = keys.find((k) => {
      const item = library[k];
      return String(item.sourceId || item.id).includes(mangaId) || String(item.id).includes(mangaId);
    });
    if (key) {
      const entry = library[key];
      const num = typeof chapterNum === 'string' ? parseFloat(chapterNum) || 0 : chapterNum;
      updateLibraryItem(entry.id, {
        progress: { ...entry.progress, currentChapter: num },
        status: entry.status === 'planning' ? 'consuming' : entry.status,
      });
    }
  };

  useEffect(() => {
    if (mangaId) {
      mangaDexApi.getChapters(mangaId).then((chs) => {
        setChapters(chs);
        if (!currentChId && chs.length > 0) {
          setCurrentChId(chs[0].id);
        }
      });
    }
  }, [mangaId]);

  useEffect(() => {
    if (!currentChId) return;
    let active = true;
    setLoading(true);
    setCurrentPage(0);
    mangaDexApi.getChapterPages(currentChId).then((urls) => {
      if (active) {
        setPages(urls);
        setLoading(false);
      }
    }).catch(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [currentChId]);

  useEffect(() => {
    if (chapters.length > 0) {
      const idx = chapters.findIndex((c) => c.id === currentChId);
      setCurrentChIndex(idx);
    }
  }, [chapters, currentChId]);

  const handleNext = () => {
    if (currentChIndex !== -1 && currentChIndex < chapters.length - 1) {
      const nextCh = chapters[currentChIndex + 1];
      setCurrentChId(nextCh.id);
      syncProgress(nextCh.chapter || currentChIndex + 2);
      toast.success(`Capítulo ${nextCh.chapter || currentChIndex + 2} — progresso salvo!`);
    }
  };

  const handlePrev = () => {
    if (currentChIndex > 0) {
      setCurrentChId(chapters[currentChIndex - 1].id);
    }
  };

  // Keyboard navigation for page mode
  useEffect(() => {
    if (viewMode !== 'page') return;
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'ArrowRight' || e.code === 'ArrowDown') { e.preventDefault(); setCurrentPage((p) => Math.min(pages.length - 1, p + 1)); }
      else if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') { e.preventDefault(); setCurrentPage((p) => Math.max(0, p - 1)); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [viewMode, pages.length]);

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center bg-zinc-950 rounded-3xl border border-zinc-800">
        <div className="text-center">
          <LoaderCircle className="animate-spin text-[var(--hub-brand)] mx-auto mb-4" size={40} />
          <p className="text-sm text-zinc-400 font-bold">Carregando páginas do MangaDex...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 bg-zinc-950 p-4 rounded-3xl border border-zinc-800">
      <div className="flex justify-between items-center px-4 py-2 bg-zinc-900 rounded-xl border border-white/5">
        <Button variant="outline" size="sm" onClick={handlePrev} disabled={currentChIndex <= 0} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
          Capítulo Anterior
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-zinc-400">
            Capítulo {chapters[currentChIndex]?.chapter || ''} de {chapters.length}
          </span>
          <div className="flex rounded-lg border border-zinc-700 overflow-hidden">
            <button onClick={() => setViewMode('scroll')} className={`px-2.5 py-1 text-[10px] font-bold ${viewMode === 'scroll' ? 'bg-[var(--hub-brand)] text-black' : 'text-zinc-400'}`}>Scroll</button>
            <button onClick={() => { setViewMode('page'); setCurrentPage(0); }} className={`px-2.5 py-1 text-[10px] font-bold ${viewMode === 'page' ? 'bg-[var(--hub-brand)] text-black' : 'text-zinc-400'}`}>Página</button>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleNext} disabled={currentChIndex === -1 || currentChIndex >= chapters.length - 1} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
          Próximo Capítulo
        </Button>
      </div>

      {viewMode === 'scroll' ? (
        <div className="flex flex-col items-center gap-2 bg-black py-4 rounded-2xl overflow-hidden max-h-[85vh] overflow-y-auto">
          {pages.map((url, i) => (
            <img key={i} src={url} alt={`Página ${i + 1}`} className="w-full max-w-[700px] h-auto object-contain select-none" loading="lazy" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center bg-black rounded-2xl overflow-hidden">
          <div className="grid place-items-center min-h-[70vh] w-full">
            {pages[currentPage] && <img src={pages[currentPage]} alt={`Página ${currentPage + 1}`} className="max-h-[70vh] max-w-full object-contain select-none" />}
          </div>
          <div className="flex items-center justify-between w-full px-4 py-3 bg-zinc-900 border-t border-white/5">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(0, p - 1))} disabled={currentPage === 0} className="border-zinc-700 text-zinc-300">← Anterior</Button>
            <span className="text-xs font-bold text-zinc-400">{currentPage + 1} / {pages.length}</span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(pages.length - 1, p + 1))} disabled={currentPage >= pages.length - 1} className="border-zinc-700 text-zinc-300">Próxima →</Button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center px-4 py-2 bg-zinc-900 rounded-xl border border-white/5">
        <Button variant="outline" size="sm" onClick={handlePrev} disabled={currentChIndex <= 0} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
          Anterior
        </Button>
        <span className="text-xs font-bold text-zinc-400">Fim do Capítulo</span>
        <Button variant="outline" size="sm" onClick={handleNext} disabled={currentChIndex === -1 || currentChIndex >= chapters.length - 1} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
          Próximo
        </Button>
      </div>
    </div>
  );
}

interface GoogleBooksApi {
  books: {
    load: (options?: Record<string, unknown>) => void;
    setOnLoadCallback: (callback: () => void) => void;
    DefaultViewer: new (element: HTMLElement) => { load: (id: string, failure?: () => void, success?: () => void) => void };
  };
}

declare global { interface Window { google?: GoogleBooksApi } }

const HTML_EMBED_HOSTS = new Set(['archive.org', 'www.archive.org']);

export function safeReaderSource(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    return url.toString();
  } catch { return null; }
}

export function safeHtmlEmbedSource(value: string | null): string | null {
  const source = safeReaderSource(value);
  if (!source) return null;
  const url = new URL(source);
  return HTML_EMBED_HOSTS.has(url.hostname) && url.pathname.startsWith('/embed/') ? url.toString() : null;
}

function GoogleBookViewer({ volumeId }: { volumeId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  useEffect(() => {
    let cancelled = false;
    const initialize = () => {
      if (cancelled || !containerRef.current || !window.google?.books) return;
      const viewer = new window.google.books.DefaultViewer(containerRef.current);
      viewer.load(volumeId, () => !cancelled && setState('unavailable'), () => !cancelled && setState('ready'));
    };
    const load = () => {
      if (window.google?.books) {
        window.google.books.load({ language: 'pt-BR' });
        window.google.books.setOnLoadCallback(initialize);
        return;
      }
      const existing = document.querySelector<HTMLScriptElement>('script[data-hubora-google-books]');
      if (existing) {
        existing.addEventListener('load', load, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://www.google.com/books/jsapi.js';
      script.async = true;
      script.dataset.huboraGoogleBooks = '1';
      script.onload = load;
      script.onerror = () => setState('unavailable');
      document.head.appendChild(script);
    };
    load();
    return () => { cancelled = true; };
  }, [volumeId]);

  return (
    <div className="relative min-h-[72vh] overflow-hidden rounded-3xl border border-[var(--hub-border)] bg-white">
      {state === 'loading' && <div className="absolute inset-0 z-10 grid place-items-center bg-[var(--hub-surface-1)]"><LoaderCircle className="animate-spin text-[var(--hub-brand)]" size={34}/></div>}
      {state === 'unavailable' && <div className="absolute inset-0 z-10 grid place-items-center bg-[var(--hub-surface-1)] p-8 text-center"><div><BookOpen className="mx-auto text-[var(--hub-brand)]" size={42}/><h2 className="mt-4 text-xl font-black text-[var(--hub-text-strong)]">Prévia não incorporável</h2><p className="mt-2 text-sm text-[var(--hub-muted)]">Este volume não permite leitura incorporada na sua região. Use o botão para abrir a fonte oficial.</p></div></div>}
      <div ref={containerRef} className="h-[72vh] w-full" aria-label="Leitor do Google Books" />
    </div>
  );
}

export function Reader() {
  const [params] = useSearchParams();
  const kind = params.get('kind') || 'html';
  const source = safeReaderSource(params.get('url'));
  const htmlEmbedSource = safeHtmlEmbedSource(params.get('url'));
  const volumeId = params.get('volumeId');
  const mangaId = params.get('mangaId');
  const chapterId = params.get('chapterId');
  const title = params.get('title') || 'Leitura';
  const officialUrl = safeReaderSource(params.get('official')) || source;
  const readableSource = readerProxyUrl(source);
  const storageKey = useMemo(() => `hubora-reader:${volumeId || source || title}`.slice(0, 500), [volumeId, source, title]);
  const content = useMemo(() => {
    if (kind === 'manga' && (mangaId || chapterId)) {
      return <MangaViewer chapterId={chapterId || undefined} mangaId={mangaId || undefined} />;
    }
    if (kind === 'google-books' && volumeId) return <GoogleBookViewer volumeId={volumeId} />;
    if (kind === 'epub' && readableSource) return <EpubReader source={readableSource} storageKey={storageKey} />;
    if (kind === 'pdf' && readableSource) return <PdfReader source={readableSource} title={title} officialUrl={officialUrl || undefined} />;
    if (kind === 'html' && htmlEmbedSource) return <iframe src={htmlEmbedSource} title={title} className="h-[72vh] w-full rounded-3xl border border-[var(--hub-border)] bg-white" referrerPolicy="no-referrer" sandbox="allow-same-origin allow-scripts allow-forms allow-popups" />;

    return (
      <div className="hub-panel p-10 text-center rounded-3xl min-h-[50vh] flex flex-col items-center justify-center gap-4">
        <BookOpen className="text-purple-400 mx-auto" size={48} />
        <h3 className="text-xl font-bold text-white">Leitor Multimídia Hubora</h3>
        <p className="text-sm text-[var(--hub-muted)] max-w-lg">
          Esta obra está disponível no acervo oficial da origem ou em bibliotecas digitais abertas para consulta direta.
        </p>
        {officialUrl && (
          <a
            href={officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hub-btn-primary px-6 py-3 rounded-xl inline-flex items-center gap-2"
          >
            <ExternalLink size={18} />
            Abrir Origem Oficial
          </a>
        )}
      </div>
    );
  }, [kind, source, readableSource, volumeId, title, storageKey, mangaId, chapterId, officialUrl]);

  return <div className="hub-page mx-auto max-w-[100rem]">
    <SEO title={`Ler — ${title}`} description="Leitor pessoal do Hubora." />
    <header className="hub-page-header items-start"><div><div className="hub-section-eyebrow"><BookOpen size={14}/> Leitura</div><h1 className="hub-page-title">{title}</h1><p className="hub-page-subtitle">Leitor para Google Books, MangaDex, EPUB, PDF e acervos abertos. Seu progresso é salvo localmente.</p></div>{officialUrl && <Button variant="outline" onClick={() => window.open(officialUrl, '_blank', 'noopener,noreferrer')}><ExternalLink size={17}/> Abrir origem</Button>}</header>
    {content}
  </div>;
}
