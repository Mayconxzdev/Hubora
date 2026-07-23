import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ExternalLink, LoaderCircle, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SEO } from '@/components/ui/SEO';
import { STREAM_EMBED_HOSTS } from '@/config/streamHosts';

export function safePlaybackUrl(value: string | null) {
  if (!value) return null;
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
    const url = new URL(value, origin);
    const sameOrigin = Boolean(origin && url.origin === origin);
    if (url.protocol !== 'https:' && !sameOrigin) return null;
    return url.toString();
  } catch { return null; }
}

export function safeEmbed(value: string | null) {
  const source = safePlaybackUrl(value);
  if (!source) return null;
  try {
    const url = new URL(source);
    return (STREAM_EMBED_HOSTS as readonly string[]).includes(url.hostname) ? url.toString() : null;
  } catch { return null; }
}

function DirectVideo({ source, hls }: { source: string; hls: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(hls);
  const [error, setError] = useState('');
  const [speed, setSpeed] = useState(1);
  const storageKey = `hubora-player:${source}`.slice(0, 500);

  // Resume from saved position
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleLoaded = () => {
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
        if (saved.time && saved.time > 5 && saved.time < video.duration - 10) {
          video.currentTime = saved.time;
        }
      } catch { /* ignore */ }
    };
    video.addEventListener('loadedmetadata', handleLoaded, { once: true });
    return () => video.removeEventListener('loadedmetadata', handleLoaded);
  }, [storageKey]);

  // Save position every 5s and on pause
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const save = () => {
      if (video.currentTime > 0) {
        localStorage.setItem(storageKey, JSON.stringify({ time: video.currentTime, duration: video.duration, at: Date.now() }));
      }
    };
    const interval = setInterval(save, 5000);
    video.addEventListener('pause', save);
    return () => { clearInterval(interval); video.removeEventListener('pause', save); save(); };
  }, [storageKey]);

  // Keyboard shortcuts
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (video.paused) void video.play();
        else video.pause();
      }
      else if (e.code === 'ArrowRight') { video.currentTime = Math.min(video.duration, video.currentTime + 10); }
      else if (e.code === 'ArrowLeft') { video.currentTime = Math.max(0, video.currentTime - 10); }
      else if (e.code === 'KeyF') {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void video.requestFullscreen?.();
      }
      else if (e.code === 'KeyM') { video.muted = !video.muted; }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const changeSpeed = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (videoRef.current) videoRef.current.playbackRate = newSpeed;
  };

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch { /* not supported */ }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setError('');
    let cancelled = false;
    let instance: { destroy: () => void } | null = null;

    if (!hls) {
      video.src = source;
      setLoading(false);
      return;
    }

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = source;
      setLoading(false);
    } else {
      void import('hls.js').then((module) => {
        if (cancelled) return;
        const Hls = module.default;
        if (!Hls.isSupported()) throw new Error('HLS não é compatível neste navegador.');
        const player = new Hls({ enableWorker: true, lowLatencyMode: false, maxBufferLength: 30, backBufferLength: 30 });
        instance = player;
        player.loadSource(source);
        player.attachMedia(video);
        player.on(Hls.Events.MANIFEST_PARSED, () => !cancelled && setLoading(false));
        player.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal || cancelled) return;
          setLoading(false);
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) setError('A origem bloqueou ou interrompeu o stream HLS. Tente abrir o servidor de origem.');
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) setError('O navegador não conseguiu decodificar este stream. O formato ou codec pode não ser compatível.');
          else setError('O stream HLS não pôde ser reproduzido neste navegador.');
        });
      }).catch((reason) => {
        if (!cancelled) { setLoading(false); setError(reason instanceof Error ? reason.message : 'Não foi possível iniciar o player HLS.'); }
      });
    }

    return () => {
      cancelled = true;
      instance?.destroy();
      video.removeAttribute('src');
      video.load();
    };
  }, [hls, source]);

  return <div className="relative overflow-hidden rounded-3xl border border-[var(--hub-border)] bg-black">
    {loading && <div className="absolute inset-0 z-10 grid place-items-center bg-black/70"><LoaderCircle className="animate-spin text-[var(--hub-brand)]" size={34}/></div>}
    <video ref={videoRef} controls playsInline className="aspect-video w-full bg-black" />
    {error && <p className="border-t border-red-500/25 bg-red-500/10 p-4 text-sm text-red-300">{error}</p>}
    {/* Controls: Speed + PiP */}
    <div className="flex items-center gap-2 border-t border-[var(--hub-border)] bg-[var(--hub-surface-1)] px-4 py-2.5">
      <span className="text-xs font-bold text-[var(--hub-subtle)]">Velocidade:</span>
      {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
        <button key={s} onClick={() => changeSpeed(s)} className={`px-2 py-1 rounded-md text-xs font-bold transition-all ${speed === s ? 'bg-[var(--hub-brand)] text-[var(--hub-brand-contrast)]' : 'bg-[var(--hub-surface-2)] text-[var(--hub-muted)] hover:text-white'}`}>{s}x</button>
      ))}
      <button onClick={() => void togglePiP()} className="ml-auto px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--hub-surface-2)] text-[var(--hub-muted)] border border-[var(--hub-border)] hover:text-white transition-all">PiP</button>
    </div>
    <p className="px-4 pb-3 pt-1 text-[0.65rem] text-[var(--hub-subtle)]">Atalhos: Espaço (play/pause) • ←/→ (±10s) • F (tela cheia) • M (mudo)</p>
  </div>;
}

export function Player() {
  const [params] = useSearchParams();
  const source = safePlaybackUrl(params.get('url'));
  const embed = safeEmbed(params.get('embed'));
  const youtube = params.get('youtube');
  const title = params.get('title') || 'Reprodução';
  const kind = params.get('kind') || 'video';
  const official = safePlaybackUrl(params.get('official')) || source || embed;
  const player = useMemo(() => {
    if (youtube && /^[\w-]{6,20}$/.test(youtube)) return <iframe className="aspect-video w-full rounded-3xl border border-[var(--hub-border)] bg-black" src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtube)}?rel=0`} title={title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />;
    if (embed) return <iframe className="aspect-video w-full rounded-3xl border border-[var(--hub-border)] bg-black" src={embed} title={title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="no-referrer" sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation" />;
    if (source) return <DirectVideo source={source} hls={kind === 'hls' || /\.m3u8(?:$|\?)/i.test(source)} />;
    return <div className="hub-empty-state min-h-[50vh]">Nenhuma URL de reprodução segura foi fornecida.</div>;
  }, [youtube, embed, source, kind, title]);

  return <div className="hub-page mx-auto max-w-[100rem]">
    <SEO title={`Assistir — ${title}`} description="Player pessoal do Hubora." />
    <header className="hub-page-header items-start"><div><div className="hub-section-eyebrow"><PlayCircle size={14}/> Reprodução</div><h1 className="hub-page-title">{title}</h1><p className="hub-page-subtitle">Player para URLs HTTPS diretas, HLS, vídeos oficiais e servidores pessoais compatíveis.</p></div>{official && <Button variant="outline" onClick={() => window.open(official, '_blank', 'noopener,noreferrer')}><ExternalLink size={17}/> Abrir origem</Button>}</header>
    {player}
  </div>;
}
