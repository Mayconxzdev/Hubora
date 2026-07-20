import { describe, expect, it } from 'vitest';
import { classifySearch, parseDiscoveryIntent, rankCandidates } from '@/services/discovery';
import type { MediaItem } from '@/types';

const candidates: MediaItem[] = [
  { id: '1', title: 'Dark Mystery', mediaType: 'tv', genres: ['Mistério', 'Thriller'], voteAverage: 9, popularity: 80, episodesCount: 8 },
  { id: '2', title: 'Long Romance', mediaType: 'tv', genres: ['Romance'], voteAverage: 8, popularity: 90, episodesCount: 60 },
];

describe('descoberta determinística', () => {
  it('roteia busca por clima sem modelo de linguagem', () => {
    expect(classifySearch('quero algo sombrio e curto')).toBe('vibe');
  });

  it('interpreta preferências e exclusões explícitas', () => {
    const intent = parseDiscoveryIntent('mistério curto sem romance');
    expect(intent.positiveTags).toContain('misterio');
    expect(intent.negativeTags).toContain('romance');
    expect(intent.preferredLength).toBe('short');
  });

  it('explica e favorece o candidato compatível', () => {
    const ranked = rankCandidates(candidates, parseDiscoveryIntent('mistério curto sem romance'));
    expect(ranked[0].item.id).toBe('1');
    expect(ranked[0].reasons.length).toBeGreaterThan(0);
  });
});
