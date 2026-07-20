import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, ExternalLink, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SEO } from '@/components/ui/SEO';
import { EpubReader } from '@/components/reader/EpubReader';
import { mangaDexApi } from '@/services/api';

function MangaViewer({ chapterId, mangaId }: { chapterId: string, mangaId: string }) {
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [chapters, setChapters] = useState<any[]>([]);
  const [currentChId, setCurrentChId] = useState(chapterId);
  const [currentChIndex, setCurrentChIndex] = useState(-1);

  useEffect(() => {
    let active = true;
    setLoading(true);
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
    if (mangaId) {
      mangaDexApi.getChapters(mangaId).then(setChapters);
    }
  }, [mangaId]);

  useEffect(() => {
    if (chapters.length > 0) {
      const idx = chapters.findIndex((c) => c.id === currentChId);
      setCurrentChIndex(idx);
    }
  }, [chapters, currentChId]);

  const handleNext = () => {
    if (currentChIndex !== -1 && currentChIndex < chapters.length - 1) {
      setCurrentChId(chapters[currentChIndex + 1].id);
    }
  };

  const handlePrev = () => {
    if (currentChIndex > 0) {
      setCurrentChId(chapters[currentChIndex - 1].id);
    }
  };

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
    <div className="flex flex-col gap-6 bg-zinc-950 p-4 rounded-3xl border border-zinc-800">
      <div className="flex justify-between items-center px-4 py-2 bg-zinc-900 rounded-xl border border-white/5">
        <Button variant="outline" size="sm" onClick={handlePrev} disabled={currentChIndex <= 0} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
          Capítulo Anterior
        </Button>
        <span className="text-xs font-bold text-zinc-400">
          Capítulo {chapters[currentChIndex]?.chapter || ''} de {chapters.length}
        </span>
        <Button variant="outline" size="sm" onClick={handleNext} disabled={currentChIndex === -1 || currentChIndex >= chapters.length - 1} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
          Próximo Capítulo
        </Button>
      </div>

      <div className="flex flex-col items-center gap-2 bg-black py-4 rounded-2xl overflow-hidden max-h-[85vh] overflow-y-auto">
        {pages.map((url, i) => (
          <img 
            key={i} 
            src={url} 
            alt={`Página ${i + 1}`} 
            className="w-full max-w-[700px] h-auto object-contain select-none"
            loading="lazy" 
          />
        ))}
      </div>

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

function safeSource(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') return null;
    return url.toString();
  } catch { return null; }
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
  const source = safeSource(params.get('url'));
  const volumeId = params.get('volumeId');
  const title = params.get('title') || 'Leitura';
  const officialUrl = safeSource(params.get('official')) || source;
  const storageKey = useMemo(() => `hubora-reader:${volumeId || source || title}`.slice(0, 500), [volumeId, source, title]);
  const content = useMemo(() => {
    if (kind === 'manga' && params.get('chapterId')) {
      return <MangaViewer chapterId={params.get('chapterId')!} mangaId={params.get('mangaId') || ''} />;
    }
    if (kind === 'google-books' && volumeId) return <GoogleBookViewer volumeId={volumeId} />;
    if (kind === 'epub' && source) return <EpubReader source={source} storageKey={storageKey} />;
    if ((kind === 'pdf' || kind === 'html') && source) return <iframe src={source} title={title} className="h-[72vh] w-full rounded-3xl border border-[var(--hub-border)] bg-white" referrerPolicy="no-referrer" sandbox="allow-same-origin allow-scripts allow-forms allow-popups" />;
    return <div className="hub-empty-state min-h-[55vh]">A fonte não forneceu um formato incorporável seguro.</div>;
  }, [kind, source, volumeId, title, storageKey]);

  return <div className="hub-page mx-auto max-w-[100rem]">
    <SEO title={`Ler — ${title}`} description="Leitor pessoal do Hubora." />
    <header className="hub-page-header items-start"><div><div className="hub-section-eyebrow"><BookOpen size={14}/> Leitura</div><h1 className="hub-page-title">{title}</h1><p className="hub-page-subtitle">Leitor para Google Books, EPUB, PDF e páginas autorizadas pela fonte. O progresso do EPUB é preservado localmente.</p></div>{officialUrl && <Button variant="outline" onClick={() => window.open(officialUrl, '_blank', 'noopener,noreferrer')}><ExternalLink size={17}/> Abrir origem</Button>}</header>
    {content}
  </div>;
}
