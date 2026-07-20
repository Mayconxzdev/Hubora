import type { MediaItem, MediaType, UserMediaEntry, UserProfile } from '@/types';
import { normalizeText } from '@/services/identity';

export type SearchMode = 'quick' | 'clue' | 'vibe';

export interface DiscoveryIntent {
  raw: string;
  mode: SearchMode;
  queryTerms: string[];
  mediaTypes: MediaType[];
  positiveTags: string[];
  negativeTags: string[];
  preferredLength?: 'short' | 'medium' | 'long';
  preferredPace?: 'slow' | 'medium' | 'fast';
  year?: number;
  explanation: string;
}

export interface RankedRecommendation {
  item: MediaItem;
  score: number;
  reasons: string[];
}

const MEDIA_TERMS: Record<MediaType, string[]> = {
  movie: ['filme', 'movie', 'cinema'],
  tv: ['serie', 'série', 'series', 'show', 'dorama', 'kdrama'],
  anime: ['anime'],
  manga: ['manga', 'mangá'],
  comic: ['quadrinho', 'quadrinhos', 'hq', 'comic', 'comics'],
  book: ['livro', 'romance literario', 'literatura', 'book'],
  game: ['jogo', 'game', 'videogame'],
};

const TAG_SYNONYMS: Record<string, string[]> = {
  acao: ['acao', 'ação', 'luta', 'porradaria', 'combate', 'adrenalina'],
  aventura: ['aventura', 'jornada', 'exploracao', 'exploração'],
  misterio: ['misterio', 'mistério', 'investigacao', 'investigação', 'detetive', 'enigma'],
  suspense: ['suspense', 'tenso', 'tensão', 'thriller'],
  terror: ['terror', 'horror', 'assustador', 'medo'],
  psicologico: ['psicologico', 'psicológico', 'mente', 'mind game'],
  romance: ['romance', 'romantico', 'romântico', 'amor'],
  comedia: ['comedia', 'comédia', 'engracado', 'engraçado', 'humor'],
  drama: ['drama', 'emocional', 'emocionante'],
  fantasia: ['fantasia', 'magia', 'magico', 'mágico', 'medieval'],
  ficcao_cientifica: ['ficcao cientifica', 'ficção científica', 'sci fi', 'scifi', 'futurista', 'espaco', 'espaço', 'cyberpunk'],
  familia: ['familia', 'família'],
  esporte: ['esporte', 'esportes', 'futebol', 'basquete'],
  aconchegante: ['aconchegante', 'conforto', 'cozy', 'relaxante', 'leve', 'cafe', 'café'],
  sombrio: ['sombrio', 'dark', 'pesado', 'distopico', 'distópico'],
  sobrevivencia: ['sobrevivencia', 'sobrevivência', 'apocalipse', 'zumbi'],
  historia_real: ['historia real', 'história real', 'biografia', 'baseado em fatos'],
};

const NEGATION_TERMS = ['sem ', 'nao quero ', 'não quero ', 'evitar ', 'odeio ', 'menos '];
const CLUE_MARKERS = ['naquela cena', 'cena em que', 'nao lembro', 'não lembro', 'qual era', 'tinha um', 'onde o personagem', 'acho que era'];
const VIBE_MARKERS = ['quero algo', 'me recomende', 'parecido com', 'vibe', 'clima', 'para hoje', 'para o fim de semana', 'algo curto', 'algo longo'];

export function classifySearch(input: string): SearchMode {
  const normalized = normalizeText(input);
  if (CLUE_MARKERS.some((marker) => normalized.includes(normalizeText(marker)))) return 'clue';
  if (VIBE_MARKERS.some((marker) => normalized.includes(normalizeText(marker)))) return 'vibe';
  if (input.trim().split(/\s+/).length >= 7) return 'vibe';
  return 'quick';
}

export function parseDiscoveryIntent(input: string): DiscoveryIntent {
  const raw = input.trim();
  const normalized = normalizeText(raw);
  const mode = classifySearch(raw);
  const mediaTypes = (Object.entries(MEDIA_TERMS) as [MediaType, string[]][])
    .filter(([, terms]) => terms.some((term) => normalized.includes(normalizeText(term))))
    .map(([type]) => type);

  const positiveTags: string[] = [];
  const negativeTags: string[] = [];
  for (const [tag, terms] of Object.entries(TAG_SYNONYMS)) {
    const matchingTerm = terms.find((term) => normalized.includes(normalizeText(term)));
    if (!matchingTerm) continue;
    const normalizedTerm = normalizeText(matchingTerm);
    const isNegative = NEGATION_TERMS.some((prefix) => normalized.includes(`${normalizeText(prefix)} ${normalizedTerm}`));
    (isNegative ? negativeTags : positiveTags).push(tag);
  }

  const preferredLength = /curto|rapido|rápido|rapidinho|poucos episodios|poucos episódios/.test(normalized)
    ? 'short'
    : /longo|epico|épico|maratona|fim de semana/.test(normalized)
      ? 'long'
      : undefined;

  const preferredPace = /ritmo lento|calmo|contemplativo/.test(normalized)
    ? 'slow'
    : /ritmo rapido|ritmo rápido|agitado|adrenalina/.test(normalized)
      ? 'fast'
      : undefined;

  const yearMatch = raw.match(/\b(19|20)\d{2}\b/);
  const queryTerms = [...positiveTags, ...mediaTypes]
    .map((term) => term.replace(/_/g, ' '));

  if (!queryTerms.length) {
    queryTerms.push(...normalized.split(' ').filter((term) => term.length > 3).slice(0, 5));
  }

  const explanationParts = [
    positiveTags.length ? `temas: ${positiveTags.map(humanizeTag).join(', ')}` : '',
    negativeTags.length ? `evitando: ${negativeTags.map(humanizeTag).join(', ')}` : '',
    mediaTypes.length ? `formatos: ${mediaTypes.join(', ')}` : '',
    preferredLength ? `duração ${preferredLength === 'short' ? 'curta' : preferredLength === 'long' ? 'longa' : 'média'}` : '',
  ].filter(Boolean);

  return {
    raw,
    mode,
    queryTerms: [...new Set(queryTerms)],
    mediaTypes,
    positiveTags,
    negativeTags,
    preferredLength,
    preferredPace,
    year: yearMatch ? Number(yearMatch[0]) : undefined,
    explanation: explanationParts.length ? explanationParts.join(' · ') : 'busca ampla por título e metadados',
  };
}

function itemText(item: MediaItem): string {
  return normalizeText([
    item.title,
    item.originalTitle,
    item.overview,
    ...(item.genres || []),
    ...(item.moods || []),
    ...(item.themes || []),
    ...(item.countries || []),
  ].filter(Boolean).join(' '));
}

function isShort(item: MediaItem): boolean {
  if (item.mediaType === 'movie') return Boolean(item.runtime && item.runtime <= 105);
  if (item.mediaType === 'book') return Boolean(item.pages && item.pages <= 300);
  if (item.mediaType === 'tv' || item.mediaType === 'anime') return Boolean(item.episodesCount && item.episodesCount <= 13);
  return false;
}

function isLong(item: MediaItem): boolean {
  if (item.mediaType === 'movie') return Boolean(item.runtime && item.runtime >= 150);
  if (item.mediaType === 'book') return Boolean(item.pages && item.pages >= 500);
  if (item.mediaType === 'tv' || item.mediaType === 'anime') return Boolean(item.episodesCount && item.episodesCount >= 40);
  return false;
}

export function rankCandidates(
  candidates: MediaItem[],
  intent: DiscoveryIntent,
  profile?: UserProfile | null,
  library: UserMediaEntry[] = [],
): RankedRecommendation[] {
  const completedTitles = new Set(library.filter((entry) => entry.status === 'completed').map((entry) => normalizeText(entry.title)));
  const favoriteGenres = (profile?.preferences.favoriteGenres || []).map(normalizeText);
  const dislikedGenres = (profile?.preferences.dislikedGenres || []).map(normalizeText);

  return candidates
    .filter((item) => !intent.mediaTypes.length || intent.mediaTypes.includes(item.mediaType))
    .map((item) => {
      const text = itemText(item);
      const reasons: string[] = [];
      let score = Math.min(25, Math.max(0, Number(item.voteAverage || 0) * 2));
      score += Math.min(12, Math.log10(Math.max(1, Number(item.popularity || 1))) * 4);

      const matches = intent.positiveTags.filter((tag) => TAG_SYNONYMS[tag]?.some((term) => text.includes(normalizeText(term))));
      score += matches.length * 14;
      if (matches.length) reasons.push(`combina com ${matches.map(humanizeTag).join(', ')}`);

      const exclusions = intent.negativeTags.filter((tag) => TAG_SYNONYMS[tag]?.some((term) => text.includes(normalizeText(term))));
      score -= exclusions.length * 40;

      const genreMatches = favoriteGenres.filter((genre) => text.includes(genre));
      score += genreMatches.length * 8;
      if (genreMatches.length) reasons.push(`segue seus gêneros favoritos`);

      const dislikedMatches = dislikedGenres.filter((genre) => text.includes(genre));
      score -= dislikedMatches.length * 25;

      if (intent.preferredLength === 'short' && isShort(item)) {
        score += 14;
        reasons.push('cabe bem em uma sessão curta');
      }
      if (intent.preferredLength === 'long' && isLong(item)) {
        score += 14;
        reasons.push('é uma experiência longa para mergulhar');
      }
      if (intent.year && item.releaseDate?.startsWith(String(intent.year))) score += 16;
      if (completedTitles.has(normalizeText(item.title))) score -= 35;
      if (!reasons.length && item.voteAverage) reasons.push(`tem boa avaliação no catálogo (${item.voteAverage.toFixed(1)})`);
      if (!reasons.length) reasons.push('é uma opção relevante para os filtros informados');

      return { item, score, reasons };
    })
    .filter((result) => result.score > -20)
    .sort((a, b) => b.score - a.score || Number(b.item.popularity || 0) - Number(a.item.popularity || 0));
}

export function rankQuickPick(candidates: MediaItem[], mode: string, library: UserMediaEntry[]): RankedRecommendation[] {
  const neutral = parseDiscoveryIntent(mode === 'short_today' ? 'algo curto para hoje' : mode === 'long_weekend' ? 'algo longo para o fim de semana' : 'algo popular e bem avaliado');
  const ranked = rankCandidates(candidates, neutral, null, library);
  if (mode === 'hype') return ranked.sort((a, b) => Number(b.item.hypeScore || b.item.popularity || 0) - Number(a.item.hypeScore || a.item.popularity || 0));
  return ranked;
}

export function explainHype(item: MediaItem): string {
  const facts: string[] = [];
  if (item.releaseDate) facts.push(`a data informada no catálogo é ${item.releaseDate}`);
  if (item.voteAverage) facts.push(`a avaliação média é ${item.voteAverage.toFixed(1)}`);
  if (item.popularity) facts.push(`o índice de popularidade do provedor é ${Math.round(item.popularity)}`);
  if (item.genres?.length) facts.push(`ele aparece em ${item.genres.slice(0, 3).join(', ')}`);
  return facts.length
    ? `O destaque é calculado com dados verificáveis do catálogo: ${facts.join('; ')}. O Hubora não presume viralização em redes sociais sem uma fonte específica.`
    : 'O catálogo não trouxe métricas suficientes para justificar um hype forte. O Hubora evita inventar tendências e mostra apenas o que consegue verificar.';
}

export function humanizeTag(tag: string): string {
  return tag.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
