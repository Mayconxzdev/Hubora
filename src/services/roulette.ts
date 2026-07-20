import type { MediaType, UserMediaEntry } from '@/types';

export interface RouletteCriteria {
  minutes?: number;
  mood?: 'light' | 'intense' | 'comfort' | 'surprise' | 'focused';
  mediaType?: MediaType | 'all';
  forgottenBoost?: boolean;
}

export interface RouletteResult {
  entry: UserMediaEntry;
  score: number;
  reasons: string[];
}

function estimatedMinutes(entry: UserMediaEntry): number {
  const media = entry.media;
  if (media.runtime) return media.runtime;
  if (entry.mediaType === 'tv' || entry.mediaType === 'anime') return 24;
  if (entry.mediaType === 'book') return Math.max(20, Math.min(180, ((media.pages || 250) - (entry.progress.currentPage || 0)) * 1.2));
  if (entry.mediaType === 'manga' || entry.mediaType === 'comic') return 25;
  if (entry.mediaType === 'game') return Math.max(30, Math.min(180, (entry.progress.hoursPlayed || 0) > 0 ? 60 : 90));
  return 100;
}

export function pickFromBacklog(entries: UserMediaEntry[], criteria: RouletteCriteria = {}): RouletteResult | null {
  const now = Date.now();
  const candidates = entries.filter((entry) => entry.status === 'planning' && (criteria.mediaType === 'all' || !criteria.mediaType || entry.mediaType === criteria.mediaType));
  if (!candidates.length) return null;

  const scored = candidates.map((entry) => {
    let score = 50;
    const reasons: string[] = [];
    const ageDays = Math.max(0, (now - entry.dateAdded) / 86_400_000);
    const estimate = estimatedMinutes(entry);

    if (criteria.minutes) {
      const difference = Math.abs(criteria.minutes - estimate);
      score += Math.max(-25, 30 - difference / 3);
      if (estimate <= criteria.minutes + 15) reasons.push(`cabe em cerca de ${Math.round(estimate)} min`);
    }

    if (criteria.forgottenBoost !== false) {
      score += Math.min(28, ageDays / 12);
      if (ageDays > 120) reasons.push('estava esquecido no backlog');
    }

    const moodText = `${entry.media.moods?.join(' ') || ''} ${entry.media.themes?.join(' ') || ''} ${entry.media.genres?.join(' ') || ''}`.toLowerCase();
    const patterns: Record<NonNullable<RouletteCriteria['mood']>, RegExp> = {
      light: /comedy|comédia|family|família|light|leve|adventure|aventura/,
      comfort: /slice of life|comfort|aconchegante|family|romance|comedy|comédia/,
      intense: /thriller|terror|horror|action|ação|war|guerra|crime/,
      focused: /mystery|mistério|drama|strategy|estratégia|history|história/,
      surprise: /.*/,
    };
    if (criteria.mood && patterns[criteria.mood].test(moodText)) {
      score += criteria.mood === 'surprise' ? Math.random() * 25 : 20;
      reasons.push(`combina com o humor “${criteria.mood}”`);
    }

    if (entry.priority === 'must') { score += 20; reasons.push('marcado como prioridade máxima'); }
    else if (entry.priority === 'high') score += 10;
    if (entry.isFavorite) score += 5;
    score += Math.random() * 7;
    return { entry, score, reasons };
  }).sort((a, b) => b.score - a.score);

  const result = scored[0];
  if (!result.reasons.length) result.reasons.push('equilibra novidade, prioridade e tempo disponível');
  return result;
}
