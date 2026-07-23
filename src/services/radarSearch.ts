import type { MediaItem } from '@/types';
import { api } from '@/services/api';

export interface RadarCandidate {
  item?: MediaItem;
  title: string;
  subtitle?: string;
  confidence: number;
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

export async function recognizeTexts(files: File[], onProgress?: (fileIndex: number, value: number) => void): Promise<RadarOcrBatchResult> {
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
          rejectAfter<never>(45_000, `A leitura da imagem ${index + 1} excedeu o tempo seguro.`),
        ]);
        texts.push(result.data.text.replace(/\s+/g, ' ').trim());
      } catch (error) {
        texts.push('');
        warnings.push(`Imagem ${index + 1}: ${error instanceof Error ? error.message : 'OCR indisponível'}`);
      }
    }
    return { texts, warnings };
  } finally {
    await session.worker.terminate();
  }
}

export async function recognizeText(file: File, onProgress?: (value: number) => void): Promise<string> {
  const response = await recognizeTexts([file], (_index, value) => onProgress?.(value));
  if (response.warnings.length > 0) throw new Error(response.warnings[0].replace(/^Imagem 1:\s*/, ''));
  return response.texts[0] || '';
}

export async function searchCatalogFromText(text: string): Promise<RadarCandidate[]> {
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
      const found = await api.searchMulti(query.slice(0, 90));
      for (const item of found.slice(0, 4)) if (!results.some((existing) => existing.mediaType === item.mediaType && String(existing.id) === String(item.id))) results.push(item);
    } catch {
      // OCR is opportunistic; other signals can still succeed.
    }
  }

  return results.slice(0, 6).map((item, index) => ({
    item,
    title: item.title,
    subtitle: `${item.mediaType}${item.releaseDate ? ` • ${item.releaseDate.slice(0, 4)}` : ''}`,
    confidence: Math.max(0.38, 0.76 - index * 0.07),
    reason: 'Texto encontrado no print coincide com título, sinopse ou metadados do catálogo.',
    source: 'ocr' as const,
  }));
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
    .sort((a, b) => b.confidence - a.confidence)
    .filter((candidate, index, list) => index === list.findIndex((item) => item.title.toLowerCase() === candidate.title.toLowerCase()))
    .slice(0, 8);

  return { extractedText, candidates: deduped, warnings };
}

export async function searchSceneDescription(description: string): Promise<RadarCandidate[]> {
  const results = await api.searchMulti(description);
  return results.slice(0, 8).map((item, index) => ({
    item,
    title: item.title,
    subtitle: `${item.mediaType}${item.releaseDate ? ` • ${item.releaseDate.slice(0, 4)}` : ''}`,
    confidence: Math.max(0.3, 0.68 - index * 0.05),
    reason: 'Compatibilidade entre sua descrição, gêneros, temas e sinopse disponíveis.',
    source: 'catalog',
  }));
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
        if (game) return [{ item: { ...game, providerUrl: url }, title: game.title, subtitle: appId ? `Steam App ${appId}` : 'Steam', confidence: 0.9, reason: 'O título foi extraído do link da Steam e confirmado no catálogo de jogos.', source: 'link', externalUrl: url }];
      }
    }

    const recognized = /youtube\.com|youtu\.be|tiktok\.com|instagram\.com/.test(host);
    return [{
      title: recognized ? `Link reconhecido: ${host}` : `Link recebido de ${host}`,
      subtitle: parsed.pathname,
      confidence: recognized ? 0.72 : 0.5,
      reason: recognized ? 'A plataforma foi reconhecida, mas o link não expõe um identificador de catálogo suficiente. Use o print ou descreva a cena para completar a busca.' : 'O link foi preservado para confirmação manual.',
      source: 'link',
      externalUrl: url,
    }];
  } catch {
    return [];
  }
}
