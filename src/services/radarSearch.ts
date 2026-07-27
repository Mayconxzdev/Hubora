import type { MediaItem } from '@/types';
import { api } from '@/services/api';

export interface RadarCandidate {
  item?: MediaItem;
  title: string;
  subtitle?: string;
  /** Only set when the number is derived from an upstream score or explicit ID/text evidence. */
  confidence?: number;
  reason: string;
  source: 'trace.moe' | 'ocr' | 'catalog' | 'link' | 'barcode';
  externalUrl?: string;
  previewUrl?: string;
}

export interface RadarImageResult {
  extractedText: string;
  candidates: RadarCandidate[];
  warnings: string[];
}

export interface RadarOcrBatchResult {
  texts: string[];
  warnings: string[];
}

function rejectAfter<T>(milliseconds: number, message: string): Promise<T> {
  return new Promise((_, reject) => {
    window.setTimeout(() => reject(new Error(message)), milliseconds);
  });
}

async function createOcrSession(onProgress?: (fileIndex: number, value: number) => void) {
  const { createWorker } = await import('tesseract.js');
  let currentFileIndex = 0;
  let rejectWorkerError: (error: Error) => void = () => undefined;
  const workerError = new Promise<never>((_, reject) => { rejectWorkerError = reject; });
  const workerPromise = createWorker(['por', 'eng'], 1, {
    logger: (message) => {
      if (message.status === 'recognizing text' && typeof message.progress === 'number') onProgress?.(currentFileIndex, message.progress);
    },
    errorHandler: (error) => rejectWorkerError(error instanceof Error ? error : new Error(String(error))),
  });
  try {
    const worker = await Promise.race([
      workerPromise,
      workerError,
      rejectAfter<never>(45_000, 'O mecanismo de OCR demorou demais para iniciar.'),
    ]);
    return {
      worker,
      workerError,
      setCurrentFileIndex: (index: number) => { currentFileIndex = index; },
    };
  } catch (error) {
    void workerPromise.then((lateWorker) => lateWorker.terminate()).catch(() => undefined);
    throw error;
  }
}

export async function recognizeTexts(files: File[], onProgress?: (fileIndex: number, value: number) => void, perImageTimeoutMs = 45_000): Promise<RadarOcrBatchResult> {
  const session = await createOcrSession(onProgress);
  const texts: string[] = [];
  const warnings: string[] = [];
  try {
    for (let index = 0; index < files.length; index += 1) {
      session.setCurrentFileIndex(index);
      try {
        const result = await Promise.race([
          session.worker.recognize(files[index], { rotateAuto: true }),
          session.workerError,
          rejectAfter<never>(perImageTimeoutMs, `A leitura da imagem ${index + 1} excedeu o tempo seguro.`),
        ]);
        texts.push(result.data.text.replace(/\s+/g, ' ').trim());
      } catch (error) {
        texts.push('');
        warnings.push(`Imagem ${index + 1}: ${error instanceof Error ? error.message : 'OCR indisponível'}`);
      }
    }
    return { texts, warnings };
  } finally {
    // `terminate()` asks the browser worker to stop immediately, but its
    // promise can remain pending when a WASM recognition task is wedged. The
    // analysis already recorded the timeout above; waiting here would turn an
    // honest warning into a permanently blocked Radar screen.
    void session.worker.terminate().catch(() => undefined);
  }
}

const RADAR_STOP_WORDS = new Set([
  'a', 'o', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'no', 'na', 'nos', 'nas', 'para', 'por', 'com', 'sem', 'que', 'se', 'ao', 'aos', 'uma', 'the', 'and', 'with', 'from', 'this', 'that', 'into', 'about',
]);

function normalizeRadarText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function meaningfulTerms(value: string) {
  return Array.from(new Set(normalizeRadarText(value).match(/[a-z0-9]{3,}/g) || []))
    .filter((term) => !RADAR_STOP_WORDS.has(term));
}

function textEvidence(item: MediaItem, clue: string) {
  const clueTerms = meaningfulTerms(clue);
  const title = normalizeRadarText(`${item.title} ${item.originalTitle || ''}`);
  const corpus = normalizeRadarText(`${item.title} ${item.originalTitle || ''} ${item.overview || ''} ${(item.genres || []).join(' ')}`);
  const titleExact = title.includes(normalizeRadarText(clue).trim());
  const matched = clueTerms.filter((term) => corpus.includes(term));
  if (!titleExact && matched.length === 0) return null;
  const confidence = titleExact ? 0.99 : Math.min(0.85, Math.max(0.35, matched.length / Math.max(clueTerms.length, 1)));
  return { confidence, matched, titleExact };
}

export async function recognizeText(file: File, onProgress?: (value: number) => void): Promise<string> {
  const response = await recognizeTexts([file], (_index, value) => onProgress?.(value));
  if (response.warnings.length > 0) throw new Error(response.warnings[0].replace(/^Imagem 1:\s*/, ''));
  return response.texts[0] || '';
}

export async function searchCatalogFromText(text: string, signal?: AbortSignal): Promise<RadarCandidate[]> {
  const cleaned = text
    .replace(/[@#][\w.-]+/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\b(tiktok|instagram|youtube|netflix|prime video)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length < 3) return [];

  const queries = [cleaned, ...cleaned.split(/[.!?–—|]/).map((part) => part.trim()).filter((part) => part.length >= 4)].slice(0, 3);
  const results: MediaItem[] = [];
  for (const query of queries) {
    try {
      const found = await api.searchMulti(query.slice(0, 90), 1, { signal });
      for (const item of found.slice(0, 4)) if (!results.some((existing) => existing.mediaType === item.mediaType && String(existing.id) === String(item.id))) results.push(item);
    } catch {
      // OCR is opportunistic; other signals can still succeed.
    }
  }

  return results.slice(0, 6).flatMap((item) => {
    const evidence = textEvidence(item, cleaned);
    if (!evidence) return [];
    return [{
      item,
      title: item.title,
      subtitle: `${item.mediaType}${item.releaseDate ? ` • ${item.releaseDate.slice(0, 4)}` : ''}`,
      confidence: evidence.confidence,
      reason: evidence.titleExact
        ? 'O texto encontrado no print coincide exatamente com o título catalogado.'
        : `Texto encontrado no print coincide com: ${evidence.matched.join(', ')}. Confirme visualmente antes de adicionar.`,
      source: 'ocr' as const,
    }];
  });
}

export async function searchAnimeFrame(file: File): Promise<RadarCandidate[]> {
  const body = new FormData();
  body.append('image', file);
  const response = await fetch('https://api.trace.moe/search?anilistInfo', { method: 'POST', body });
  if (!response.ok) throw new Error(`trace.moe respondeu ${response.status}`);
  const data = await response.json() as { result?: Array<Record<string, any>> };
  return (data.result || []).slice(0, 5).map((result) => {
    const info = result.anilist || {};
    const title = info.title?.english || info.title?.romaji || info.title?.native || result.filename || 'Anime provável';
    const similarity = Number(result.similarity || 0);
    const episode = result.episode ? `Episódio ${result.episode}` : undefined;
    const time = Number.isFinite(result.from) ? new Date(Number(result.from) * 1000).toISOString().slice(11, 19) : undefined;
    return {
      title,
      subtitle: [episode, time].filter(Boolean).join(' • '),
      confidence: similarity,
      reason: 'Correspondência visual em frames de anime indexados pelo trace.moe.',
      source: 'trace.moe' as const,
      previewUrl: result.image || result.video,
      externalUrl: info.siteUrl,
    };
  });
}

export async function analyzeImage(file: File, options: { allowRemoteAnimeSearch: boolean; onProgress?: (phase: string, value: number) => void }): Promise<RadarImageResult> {
  const warnings: string[] = [];
  const candidates: RadarCandidate[] = [];
  let extractedText = '';

  try {
    options.onProgress?.('Lendo textos da imagem', 0.05);
    extractedText = await recognizeText(file, (progress) => options.onProgress?.('Lendo textos da imagem', Math.min(0.65, progress * 0.65)));
    candidates.push(...await searchCatalogFromText(extractedText));
  } catch (error) {
    warnings.push(`OCR indisponível: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
  }

  if (options.allowRemoteAnimeSearch) {
    try {
      options.onProgress?.('Comparando com cenas de anime', 0.72);
      const animeCandidates = await searchAnimeFrame(file);
      candidates.push(...animeCandidates);
    } catch (error) {
      warnings.push(`Busca remota de anime indisponível: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
    }
  }

  options.onProgress?.('Organizando candidatos', 0.96);
  const deduped = candidates
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
    .filter((candidate, index, list) => index === list.findIndex((item) => item.title.toLowerCase() === candidate.title.toLowerCase()))
    .slice(0, 8);

  return { extractedText, candidates: deduped, warnings };
}

export async function searchSceneDescription(description: string): Promise<RadarCandidate[]> {
  const results = await api.searchMulti(description);
  return results.slice(0, 8).flatMap((item) => {
    const evidence = textEvidence(item, description);
    if (!evidence) return [];
    return [{
      item,
      title: item.title,
      subtitle: `${item.mediaType}${item.releaseDate ? ` • ${item.releaseDate.slice(0, 4)}` : ''}`,
      confidence: evidence.confidence,
      reason: evidence.titleExact
        ? 'A descrição contém o título catalogado. Confirme visualmente a obra antes de adicionar.'
        : `Pista textual encontrada nos metadados: ${evidence.matched.join(', ')}. O Radar não faz identificação semântica de cenas.`,
      source: 'catalog' as const,
    }];
  });
}

export async function resolveSharedLink(url: string): Promise<RadarCandidate[]> {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    const parts = parsed.pathname.split('/').filter(Boolean);
    let detailsId: string | null = null;
    let provider = host;

    if (/themoviedb\.org$/.test(host)) {
      const kind = parts[0] === 'movie' ? 'movie' : parts[0] === 'tv' ? 'tv' : null;
      const numeric = parts[1]?.match(/^\d+/)?.[0];
      if (kind && numeric) { detailsId = `tmdb-${kind}-${numeric}`; provider = 'TMDB'; }
    } else if (/anilist\.co$/.test(host)) {
      const numeric = parts.find((part) => /^\d+$/.test(part));
      if (numeric) { detailsId = `anilist-${numeric}`; provider = 'AniList'; }
    } else if (/myanimelist\.net$/.test(host)) {
      const kind = parts[0] === 'anime' ? 'anime' : parts[0] === 'manga' ? 'manga' : null;
      const numeric = parts.find((part) => /^\d+$/.test(part));
      if (kind && numeric) { detailsId = `mal-${kind}-${numeric}`; provider = 'MyAnimeList'; }
    } else if (/openlibrary\.org$/.test(host)) {
      const workIndex = parts.findIndex((part) => part === 'works');
      const work = workIndex >= 0 ? parts[workIndex + 1] : undefined;
      if (work) { detailsId = `ol-${work}`; provider = 'Open Library'; }
    } else if (/books\.google\.|play\.google\./.test(host)) {
      const volumeId = parsed.searchParams.get('id');
      if (volumeId) { detailsId = `gbooks-${volumeId}`; provider = 'Google Books'; }
    }

    if (detailsId) {
      try {
        const item = await api.getDetails(detailsId);
        if (item) return [{ item, title: item.title, subtitle: `${provider}${item.releaseDate ? ` • ${item.releaseDate.slice(0, 4)}` : ''}`, confidence: 0.99, reason: 'O endereço contém o identificador oficial da obra e foi resolvido diretamente no catálogo.', source: 'link', externalUrl: url }];
      } catch {
        // Keep a useful recognized-link fallback below.
      }
    }

    if (/store\.steampowered\.com$/.test(host)) {
      const appIndex = parts.findIndex((part) => part === 'app');
      const appId = appIndex >= 0 ? parts[appIndex + 1] : undefined;
      const titleFromPath = appIndex >= 0 ? parts[appIndex + 2]?.replace(/_/g, ' ') : undefined;
      if (titleFromPath) {
        const matches = await api.searchMulti(`${titleFromPath} jogo`);
        const game = matches.find((item) => item.mediaType === 'game');
        if (game) return [{ item: { ...game, providerUrl: url }, title: game.title, subtitle: appId ? `Steam App ${appId}` : 'Steam', reason: 'O título foi extraído do link da Steam e encontrado no catálogo de jogos. Confirme a edição antes de adicionar.', source: 'link', externalUrl: url }];
      }
    }

    const recognized = /youtube\.com|youtu\.be|tiktok\.com|instagram\.com/.test(host);
    return [{
      title: recognized ? `Link reconhecido: ${host}` : `Link recebido de ${host}`,
      subtitle: parsed.pathname,
      confidence: undefined,
      reason: recognized ? 'A plataforma foi reconhecida, mas o link não expõe um identificador de catálogo suficiente. Use o print ou descreva a cena para completar a busca.' : 'O link foi preservado para confirmação manual.',
      source: 'link',
      externalUrl: url,
    }];
  } catch {
    return [];
  }
}
