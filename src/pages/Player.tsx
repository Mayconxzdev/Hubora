import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ExternalLink, HardDrive, LoaderCircle, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SEO } from '@/components/ui/SEO';
import { createCompanionSession, getCompanionConfig, stopCompanionSession, updateCompanionProgress } from '@/services/companion';

function safeUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
      || /^10\./.test(url.hostname)
      || /^192\.168\./.test(url.hostname)
      || /^172\.(1[6-9]|2\d|3[01])\./.test(url.hostname);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) return null;
    return url.toString();
  } catch { return null; }
}

function safeEmbed(value: string | null) {
  const source = safeUrl(value);
  if (!source) return null;
  try {
    const url = new URL(source);
    const allowed = ['archive.org', 'www.youtube.com', 'www.youtube-nocookie.com'];
    return allowed.includes(url.hostname) ? url.toString() : null;
  } catch { return null; }
}

function DirectVideo({ source, hls, title }: { source: string; hls: boolean; title: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeSource, setActiveSource] = useState(source);
  const [loading, setLoading] = useState(hls);
  const [error, setError] = useState('');
  const [companionState, setCompanionState] = useState<'checking' | 'active' | 'fallback'>('checking');
  const [sessionId, setSessionId] = useState('');
  const lastProgress = useRef(0);

  useEffect(() => {
    const config = getCompanionConfig();
    let cancelled = false;
    let createdSession = '';
    if (!config.token) {
      setActiveSource(source);
      setCompanionState('fallback');
      return;
    }

    setLoading(true);
    setActiveSource('');
    setCompanionState('checking');
    void createCompanionSession({ sourceUrl: source, title, kind: hls ? 'hls' : 'video' })
      .then((session) => {
        createdSession = session.id;
        if (cancelled) {
          void stopCompanionSession(session.id, 0).catch(() => undefined);
          return;
        }
        setSessionId(session.id);
        setActiveSource(session.playbackUrl);
        setCompanionState('active');
      })
      .catch(() => {
        if (!cancelled) {
          setActiveSource(source);
          setCompanionState('fallback');
        }
      });

    return () => {
      cancelled = true;
      if (createdSession) void stopCompanionSession(createdSession, videoRef.current?.currentTime || 0).catch(() => undefined);
    };
  }, [hls, source, title]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !sessionId) return;
    const sync = () => {
      if (Math.abs(video.currentTime - lastProgress.current) < 12) return;
      lastProgress.current = video.currentTime;
      void updateCompanionProgress(sessionId, video.currentTime).catch(() => undefined);
    };
    video.addEventListener('timeupdate', sync);
    return () => video.removeEventListener('timeupdate', sync);
  }, [sessionId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeSource) return;
    setError('');
    let cancelled = false;
    let instance: { destroy: () => void } | null = null;

    if (!hls) {
      video.src = activeSource;
      setLoading(false);
      return;
    }

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = activeSource;
      setLoading(false);
    } else {
      void import('hls.js').then((module) => {
        if (cancelled) return;
        const Hls = module.default;
        if (!Hls.isSupported()) throw new Error('HLS não é compatível neste navegador.');
        const player = new Hls({ enableWorker: true, lowLatencyMode: false, maxBufferLength: 30, backBufferLength: 30 });
        instance = player;
        player.loadSource(activeSource);
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
  }, [activeSource, hls]);

  return <div className="relative overflow-hidden rounded-3xl border border-[var(--hub-border)] bg-black">
    {loading && <div className="absolute inset-0 z-10 grid place-items-center bg-black/70"><LoaderCircle className="animate-spin text-[var(--hub-brand)]" size={34}/></div>}
    {companionState === 'active' && <span className="absolute left-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/75 px-2.5 py-1 text-[.65rem] font-bold text-white backdrop-blur"><HardDrive size={13}/> Cache temporário • 10 min</span>}
    <video ref={videoRef} controls playsInline className="aspect-video w-full bg-black" />
    {error && <p className="border-t border-red-500/25 bg-red-500/10 p-4 text-sm text-red-300">{error}</p>}
    {companionState === 'fallback' && getCompanionConfig().token && <p className="border-t border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-200">O Companion não respondeu; esta reprodução está usando a origem diretamente e não será armazenada no cache temporário.</p>}
  </div>;
}

export function Player() {
  const [params] = useSearchParams();
  const source = safeUrl(params.get('url'));
  const embed = safeEmbed(params.get('embed'));
  const youtube = params.get('youtube');
  const title = params.get('title') || 'Reprodução';
  const kind = params.get('kind') || 'video';
  const official = safeUrl(params.get('official')) || source || embed;
  const player = useMemo(() => {
    if (youtube && /^[\w-]{6,20}$/.test(youtube)) return <iframe className="aspect-video w-full rounded-3xl border border-[var(--hub-border)] bg-black" src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtube)}?rel=0`} title={title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />;
    if (embed) return <iframe className="aspect-video w-full rounded-3xl border border-[var(--hub-border)] bg-black" src={embed} title={title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="no-referrer" sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation" />;
    if (source) return <DirectVideo source={source} hls={kind === 'hls' || /\.m3u8(?:$|\?)/i.test(source)} title={title} />;
    return <div className="hub-empty-state min-h-[50vh]">Nenhuma URL de reprodução segura foi fornecida.</div>;
  }, [youtube, embed, source, kind, title]);

  return <div className="hub-page mx-auto max-w-[100rem]">
    <SEO title={`Assistir — ${title}`} description="Player pessoal do Hubora." />
    <header className="hub-page-header items-start"><div><div className="hub-section-eyebrow"><PlayCircle size={14}/> Reprodução</div><h1 className="hub-page-title">{title}</h1><p className="hub-page-subtitle">Player para URLs HTTPS diretas, HLS, vídeos oficiais e servidores pessoais compatíveis.</p></div>{official && <Button variant="outline" onClick={() => window.open(official, '_blank', 'noopener,noreferrer')}><ExternalLink size={17}/> Abrir origem</Button>}</header>
    {player}
  </div>;
}
