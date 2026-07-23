import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Film, ImagePlus, Link2, Search, ShieldCheck, Sparkles, UploadCloud } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { analyzeImage, recognizeTexts, resolveSharedLink, searchAnimeFrame, searchCatalogFromText, searchSceneDescription, type RadarCandidate } from '@/services/radarSearch';
import { useStore } from '@/store/useStore';
import { classifyAdult, getAdultMode } from '@/services/adultPolicy';
import { isVaultUnlocked } from '@/services/vault';
import { Button } from '@/components/ui/Button';
import { SEO } from '@/components/ui/SEO';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { drainSharedItems } from '@/services/shareInbox';
import { featureRepository } from '@/services/featureRepository';

type Mode = 'image' | 'scene' | 'link' | 'video';

const MODES: Array<{ id: Mode; label: string; icon: typeof ImagePlus; description: string }> = [
  { id: 'image', label: 'Print ou imagem', icon: ImagePlus, description: 'OCR local + comparação opcional com cenas de anime.' },
  { id: 'scene', label: 'Descrever cena', icon: Sparkles, description: 'Procura por pistas, temas, objetos, atmosfera e mídia.' },
  { id: 'link', label: 'Colar link', icon: Link2, description: 'Reconhece provedores e guarda a origem para confirmar.' },
  { id: 'video', label: 'Vídeo curto', icon: Film, description: 'Extrai quadros localmente e cruza OCR, capas e cenas de anime.' },
];

export function Radar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useStore((state) => state.user);
  const addToLibrary = useStore((state) => state.addToLibrary);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>('image');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [text, setText] = useState('');
  const remoteRadarAvailable = import.meta.env.VITE_ENABLE_REMOTE_RADAR !== 'false';
  const [allowRemoteAnimeSearch, setAllowRemoteAnimeSearch] = useState(false);
  const [phase, setPhase] = useState('');
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [lastError, setLastError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [analysisSummary, setAnalysisSummary] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [results, setResults] = useState<RadarCandidate[]>([]);

  useEffect(() => {
    const shared = searchParams.get('url') || searchParams.get('text') || searchParams.get('title');
    if (shared) { setMode('link'); setText(shared); }

    if (searchParams.get('shared') === '1') {
      void drainSharedItems().then(async (items) => {
        if (!items.length) return;
        for (const item of items) await featureRepository.inbox.put(item);
        const latest = items[0];
        if (latest.imageBlob) {
          const sharedFile = new File([latest.imageBlob], latest.title || 'hubora-shared-image', { type: latest.imageBlob.type || 'image/jpeg' });
          pickFile(sharedFile);
          setMode('image');
          toast.success('Imagem recebida pelo menu Compartilhar.');
        } else {
          const sharedValue = latest.url || latest.text || latest.title || '';
          setText(sharedValue);
          setMode(latest.url ? 'link' : 'scene');
          toast.success('Conteúdo recebido pelo menu Compartilhar.');
        }
        await featureRepository.inbox.markProcessed(latest.id);
      }).catch(() => toast.error('Não foi possível importar o conteúdo compartilhado.'));
    }
  }, [searchParams]);

  const adultAllowed = getAdultMode(user) === 'vault' && Boolean(user?.preferences.adultVaultEnabled) && isVaultUnlocked();
  const visibleResults = useMemo(() => results.filter((candidate) => !candidate.item || classifyAdult(candidate.item) === 'safe' || adultAllowed), [results, adultAllowed]);

  const pickFile = (selected: File | undefined) => {
    if (!selected) return;
    if (!selected.type.startsWith('image/')) { toast.error('Escolha uma imagem.'); return; }
    if (selected.size > 10 * 1024 * 1024) { toast.error('A imagem deve ter até 10 MB.'); return; }
    if (preview) URL.revokeObjectURL(preview);
    setFile(selected); setPreview(URL.createObjectURL(selected)); setResults([]); setExtractedText('');
  };


  const pickVideo = (selected: File | undefined) => {
    if (!selected) return;
    if (!selected.type.startsWith('video/')) { toast.error('Escolha um vídeo.'); return; }
    if (selected.size > 80 * 1024 * 1024) { toast.error('O vídeo deve ter até 80 MB.'); return; }
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(selected); setVideoPreview(URL.createObjectURL(selected)); setResults([]); setExtractedText('');
  };

  const extractFrames = async (selected: File): Promise<File[]> => {
    const url = URL.createObjectURL(selected);
    try {
      const video = document.createElement('video');
      video.preload = 'metadata'; video.muted = true; video.playsInline = true; video.src = url;
      await new Promise<void>((resolve, reject) => { video.onloadedmetadata = () => resolve(); video.onerror = () => reject(new Error('Não foi possível ler o vídeo.')); });
      if (!Number.isFinite(video.duration) || video.duration <= 0) throw new Error('Duração de vídeo inválida.');
      if (video.duration > 90) toast.info('O Hubora analisará amostras do vídeo; para maior precisão, envie um trecho de até 30 segundos.');
      const points = [0.18, 0.5, 0.82].map((ratio) => Math.min(Math.max(video.duration * ratio, 0.05), Math.max(video.duration - 0.05, 0.05)));
      const frames: File[] = [];
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('Canvas indisponível neste navegador.');
      for (let index = 0; index < points.length; index += 1) {
        video.currentTime = points[index];
        await new Promise<void>((resolve, reject) => { video.onseeked = () => resolve(); video.onerror = () => reject(new Error('Falha ao extrair quadro.')); });
        const scale = Math.min(1, 1280 / Math.max(video.videoWidth, 1));
        canvas.width = Math.max(1, Math.round(video.videoWidth * scale)); canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.84));
        if (blob) frames.push(new File([blob], `hubora-frame-${index + 1}.jpg`, { type: 'image/jpeg' }));
      }
      return frames;
    } finally { URL.revokeObjectURL(url); }
  };

  const analyzeVideo = async (selected: File) => {
    setPhase('Extraindo quadros no aparelho'); setProgress(0.08);
    const frames = await extractFrames(selected);
    if (!frames.length) throw new Error('Nenhum quadro pôde ser extraído.');
    const merged = new Map<string, RadarCandidate>();
    const texts: string[] = [];
    const videoWarnings = new Set<string>();
    let recognizedTexts: string[] = [];
    try {
      const ocr = await recognizeTexts(frames, (index, value) => {
        setPhase(`Quadro ${index + 1}/${frames.length}: lendo textos`);
        setProgress(0.12 + ((index + value) / frames.length) * 0.62);
      });
      recognizedTexts = ocr.texts;
      ocr.warnings.forEach((warning) => videoWarnings.add(`OCR: ${warning}`));
    } catch (error) {
      videoWarnings.add(`OCR indisponível: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
    }
    for (let index = 0; index < frames.length; index += 1) {
      const frameText = recognizedTexts[index]?.trim() || '';
      if (frameText) texts.push(frameText);
      setPhase(`Quadro ${index + 1}/${frames.length}: cruzando catálogos`);
      setProgress(0.76 + ((index + 0.5) / frames.length) * 0.18);
      const frameCandidates = frameText ? await searchCatalogFromText(frameText) : [];
      if (index === 1 && remoteRadarAvailable && allowRemoteAnimeSearch) {
        try { frameCandidates.push(...await searchAnimeFrame(frames[index])); }
        catch (error) { videoWarnings.add(`Busca remota de anime indisponível: ${error instanceof Error ? error.message : 'erro desconhecido'}`); }
      }
      for (const candidate of frameCandidates) {
        const key = String(candidate.item?.id || candidate.externalUrl || candidate.title.toLowerCase());
        const previous = merged.get(key);
        if (!previous || candidate.confidence > previous.confidence) merged.set(key, { ...candidate, reason: `${candidate.reason} Evidência encontrada em ${index + 1} de ${frames.length} quadros analisados.` });
      }
    }
    setExtractedText(Array.from(new Set(texts)).join(' • '));
    setResults(Array.from(merged.values()).sort((a, b) => b.confidence - a.confidence).slice(0, 8));
    setWarnings(Array.from(videoWarnings));
    setAnalysisSummary(`${frames.length} quadros analisados no aparelho.`);
  };

  const run = async () => {
    setLoading(true); setHasRun(false); setLastError(''); setWarnings([]); setAnalysisSummary(''); setResults([]); setProgress(0);
    try {
      if (mode === 'image') {
        if (!file) throw new Error('Adicione um print ou imagem.');
        const response = await analyzeImage(file, { allowRemoteAnimeSearch: remoteRadarAvailable && allowRemoteAnimeSearch, onProgress: (nextPhase, value) => { setPhase(nextPhase); setProgress(value); } });
        setExtractedText(response.extractedText); setResults(response.candidates);
        setWarnings(response.warnings);
        setAnalysisSummary(response.extractedText ? 'OCR local concluído.' : 'OCR local concluído sem texto legível.');
        response.warnings.forEach((warning) => toast.warning(warning));
      } else if (mode === 'video') {
        if (!videoFile) throw new Error('Adicione um vídeo curto.');
        await analyzeVideo(videoFile);
      } else if (mode === 'scene') {
        if (text.trim().length < 8) throw new Error('Descreva a cena com mais detalhes.');
        setPhase('Cruzando pistas com os catálogos'); setProgress(0.45);
        setResults(await searchSceneDescription(text.trim()));
        setAnalysisSummary('Descrição comparada com os catálogos disponíveis.');
      } else {
        if (!text.trim()) throw new Error('Cole um link.');
        setResults(await resolveSharedLink(text.trim()));
        setAnalysisSummary('Link analisado com segurança.');
      }
      setProgress(1);
      setHasRun(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível pesquisar.';
      setLastError(message);
      toast.error(message);
    } finally { setLoading(false); }
  };

  const openCandidate = (candidate: RadarCandidate) => {
    if (candidate.item) navigate(`/details/${candidate.item.id}`, { state: { media: candidate.item } });
    else if (candidate.externalUrl) window.open(candidate.externalUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="hub-page">
      <SEO title="Radar" description="Encontre uma obra por print, vídeo, descrição ou link compartilhado." />
      <header className="hub-page-header items-start">
        <div><div className="hub-section-eyebrow"><Activity size={14}/> Identificação multimodal</div><h1 className="hub-page-title">Radar 360°</h1><p className="hub-page-subtitle">Envie a pista que você tem. O Hubora explica o que coincidiu e nunca finge certeza quando o resultado é apenas provável.</p></div>
        <div className="hub-chip"><ShieldCheck size={15}/> OCR local por padrão</div>
      </header>

      <section className="hub-panel p-3 sm:p-4">
        <div className="grid gap-2 md:grid-cols-4">{MODES.map(({ id, label, icon: Icon, description }) => <button key={id} aria-pressed={mode === id} onClick={() => { setMode(id); setResults([]); setHasRun(false); setLastError(''); }} className={cn('rounded-2xl border p-4 text-left transition', mode === id ? 'border-[var(--hub-brand)] bg-[var(--hub-brand-soft)]' : 'border-[var(--hub-border)] bg-[var(--hub-surface-2)] hover:border-[var(--hub-border-strong)]')}><div className="flex items-center gap-2 font-black text-[var(--hub-text-strong)]"><Icon size={18}/>{label}</div><p className="mt-2 text-xs leading-relaxed text-[var(--hub-muted)]">{description}</p></button>)}</div>
      </section>

      <section className="hub-panel p-5 sm:p-6">
        {mode === 'image' ? <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div role="button" tabIndex={0} aria-label="Escolher print ou imagem" className="flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--hub-border-strong)] bg-[var(--hub-surface-2)] p-6 text-center focus-visible:outline-none" onClick={() => inputRef.current?.click()} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); inputRef.current?.click(); } }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); pickFile(event.dataTransfer.files[0]); }}>
            {preview ? <img src={preview} alt="Prévia do print" className="max-h-96 w-full rounded-2xl object-contain"/> : <><UploadCloud size={42} className="text-[var(--hub-brand)]"/><h2 className="mt-4 text-xl font-black text-[var(--hub-text-strong)]">Arraste o print aqui</h2><p className="mt-2 max-w-md text-sm text-[var(--hub-muted)]">TikTok, Instagram, televisão, capa, pôster ou foto da sua coleção.</p></>}
            <input ref={inputRef} hidden type="file" accept="image/*" onChange={(event) => pickFile(event.target.files?.[0])}/>
          </div>
          <aside className="space-y-4"><div><h3 className="font-black text-[var(--hub-text-strong)]">Privacidade</h3><p className="mt-1 text-xs leading-relaxed text-[var(--hub-muted)]">O texto é lido no aparelho. A imagem só é enviada ao trace.moe quando a busca remota de anime está ativa.</p></div><label className="flex items-start gap-3 rounded-2xl border border-[var(--hub-border)] p-4"><input type="checkbox" disabled={!remoteRadarAvailable} checked={remoteRadarAvailable && allowRemoteAnimeSearch} onChange={(event) => setAllowRemoteAnimeSearch(event.target.checked)} className="mt-1"/><span><strong className="block text-sm text-[var(--hub-text-strong)]">Consultar cenas de anime</strong><small className="mt-1 block text-xs text-[var(--hub-muted)]">{remoteRadarAvailable ? 'Pode retornar anime, episódio e momento aproximado.' : 'Desativado para preservar o free tier.'}</small></span></label><Button className="w-full" disabled={!file || loading} onClick={() => void run()}><Search size={17}/>{loading ? phase || 'Analisando' : 'Identificar obra'}</Button>{loading && <div className="h-2 overflow-hidden rounded-full bg-[var(--hub-surface-3)]"><div className="h-full bg-[var(--hub-brand)] transition-all" style={{ width: `${Math.round(progress * 100)}%` }}/></div>}</aside>
        </div> : mode === 'video' ? <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]"><div role="button" tabIndex={0} aria-label="Escolher vídeo curto" className="flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--hub-border-strong)] bg-[var(--hub-surface-2)] p-6 text-center focus-visible:outline-none" onClick={() => videoInputRef.current?.click()} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); videoInputRef.current?.click(); } }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); pickVideo(event.dataTransfer.files[0]); }}>{videoPreview ? <video src={videoPreview} controls className="max-h-96 w-full rounded-2xl bg-black"/> : <><Film size={42} className="text-[var(--hub-brand)]"/><h2 className="mt-4 text-xl font-black text-[var(--hub-text-strong)]">Adicione um vídeo curto</h2><p className="mt-2 max-w-md text-sm text-[var(--hub-muted)]">O Hubora extrai três quadros no seu aparelho. Trechos curtos e nítidos produzem resultados melhores.</p></>}<input ref={videoInputRef} hidden type="file" accept="video/*" onChange={(event) => pickVideo(event.target.files?.[0])}/></div><aside className="space-y-4"><p className="text-xs leading-relaxed text-[var(--hub-muted)]">O arquivo não é enviado ao Netlify. Apenas um quadro central pode ser consultado no trace.moe quando você autorizar a busca de anime.</p><label className="flex items-start gap-3 rounded-2xl border border-[var(--hub-border)] p-4"><input type="checkbox" disabled={!remoteRadarAvailable} checked={remoteRadarAvailable && allowRemoteAnimeSearch} onChange={(event) => setAllowRemoteAnimeSearch(event.target.checked)} className="mt-1"/><span><strong className="block text-sm text-[var(--hub-text-strong)]">Consultar anime no quadro central</strong><small className="mt-1 block text-xs text-[var(--hub-muted)]">Opcional e externo.</small></span></label><Button className="w-full" disabled={!videoFile || loading} onClick={() => void run()}><Search size={17}/>{loading ? phase || 'Analisando vídeo' : 'Analisar vídeo'}</Button>{loading && <div className="h-2 overflow-hidden rounded-full bg-[var(--hub-surface-3)]"><div className="h-full bg-[var(--hub-brand)] transition-all" style={{ width: `${Math.round(progress * 100)}%` }}/></div>}</aside></div> : <div className="mx-auto max-w-3xl"><textarea aria-label={mode === 'scene' ? 'Descrição da cena' : 'Link para identificar'} className="hub-field min-h-44 resize-y text-base" value={text} onChange={(event) => setText(event.target.value)} placeholder={mode === 'scene' ? 'Ex.: homem de terno correndo em um corredor vermelho, parecia um thriller dos anos 2000...' : 'Cole o link do TikTok, YouTube, Steam, TMDB, IMDb, Open Library ou outro site.'}/><Button className="mt-3" disabled={loading || !text.trim()} onClick={() => void run()}><Search size={17}/>{loading ? 'Pesquisando...' : mode === 'scene' ? 'Buscar pela descrição' : 'Resolver link'}</Button></div>}
      </section>

      {lastError && <div role="alert" className="hub-panel border-red-500/25 bg-red-500/8 p-4 text-sm text-red-300">{lastError}</div>}
      {analysisSummary && <div role="status" aria-label="Resumo da análise" className="hub-panel p-4 text-sm text-[var(--hub-muted)]"><strong className="text-[var(--hub-text-strong)]">Análise concluída:</strong> {analysisSummary}</div>}
      {warnings.length > 0 && <div role="status" aria-label="Avisos da análise" className="hub-panel border-amber-500/25 bg-amber-500/8 p-4 text-sm text-amber-200"><strong className="block text-[var(--hub-text-strong)]">A análise terminou com limitações</strong><ul className="mt-2 list-disc space-y-1 pl-5">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}
      {(hasRun || extractedText || visibleResults.length > 0) && <section className="hub-section"><div className="hub-section-heading"><div><div className="hub-section-eyebrow"><Sparkles size={14}/> Candidatos explicados</div><h2 className="hub-section-title">Resultados prováveis</h2><p className="hub-section-description">Confirme visualmente antes de adicionar à biblioteca.</p></div></div>{extractedText && <details className="hub-panel mb-4 p-4"><summary className="cursor-pointer font-bold text-[var(--hub-text-strong)]">Texto encontrado na imagem</summary><p className="mt-3 text-sm leading-relaxed text-[var(--hub-muted)]">{extractedText}</p></details>}<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{visibleResults.map((candidate, index) => <article key={`${candidate.title}-${index}`} className="hub-panel overflow-hidden"><div className="aspect-video bg-[var(--hub-surface-3)]">{candidate.previewUrl || candidate.item?.backdropPath || candidate.item?.posterPath ? <img src={candidate.previewUrl || candidate.item?.backdropPath || candidate.item?.posterPath} alt="" className="h-full w-full object-cover"/> : <div className="grid h-full place-items-center"><Search size={28}/></div>}</div><div className="p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="line-clamp-2 font-black text-[var(--hub-text-strong)]">{candidate.title}</h3><p className="mt-1 text-xs text-[var(--hub-subtle)]">{candidate.subtitle}</p></div><span className="rounded-full bg-[var(--hub-brand-soft)] px-2 py-1 text-xs font-black text-[var(--hub-brand)]">{Math.round(candidate.confidence * 100)}%</span></div><p className="mt-3 text-xs leading-relaxed text-[var(--hub-muted)]">{candidate.reason}</p><div className="mt-4 flex gap-2"><Button size="sm" onClick={() => openCandidate(candidate)}>Abrir</Button>{candidate.item && <Button size="sm" variant="outline" onClick={() => { addToLibrary(candidate.item!, 'planning'); toast.success('Adicionado à biblioteca'); }}>Adicionar</Button>}</div></div></article>)}{!visibleResults.length && <div className="hub-empty-state md:col-span-2 xl:col-span-3">Nenhum candidato seguro foi encontrado. Acrescente outra pista ou ative o Cofre Adulto quando aplicável.</div>}</div></section>}
    </div>
  );
}
