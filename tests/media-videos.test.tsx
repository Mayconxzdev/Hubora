import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TrailerModal } from '@/components/ui/TrailerModal';
import { normalizeJikanVideo, normalizeTmdbVideos } from '@/services/mediaVideos';

describe('coleção real de vídeos nos detalhes', () => {
  it('preserva o referer de origem exigido pelo player incorporado', () => {
    const server = readFileSync(resolve(process.cwd(), 'server.ts'), 'utf8');
    const netlify = readFileSync(resolve(process.cwd(), 'netlify.toml'), 'utf8');
    expect(server).toContain("referrerPolicy: { policy: 'strict-origin-when-cross-origin' }");
    expect(netlify).toContain('Referrer-Policy = "strict-origin-when-cross-origin"');
  });

  it('mantém teasers e trailers oficiais, remove duplicados e prioriza pt-BR', () => {
    const videos = normalizeTmdbVideos([
      { id: 'en', key: 'english01', name: 'Official Trailer', site: 'YouTube', type: 'Trailer', official: true, iso_639_1: 'en' },
      { id: 'pt', key: 'portugu01', name: 'Trailer Oficial', site: 'YouTube', type: 'Trailer', official: true, iso_639_1: 'pt' },
      { id: 'teaser', key: 'teaser001', name: 'Teaser', site: 'YouTube', type: 'Teaser', official: true, iso_639_1: 'pt' },
      { id: 'duplicate', key: 'portugu01', name: 'Duplicado', site: 'YouTube', type: 'Trailer' },
      { id: 'vimeo', key: 'ignored01', name: 'Não incorporável', site: 'Vimeo', type: 'Trailer' },
    ]);

    expect(videos.map((video) => video.id)).toEqual(['pt', 'teaser', 'en']);
    expect(videos[0]).toMatchObject({ kind: 'trailer', language: 'pt', official: true, embedUrl: 'https://www.youtube-nocookie.com/embed/portugu01' });
  });

  it('normaliza o trailer declarado pelo Jikan sem aceitar URL arbitrária', () => {
    expect(normalizeJikanVideo({ youtube_id: 'anime123', embed_url: 'https://www.youtube.com/embed/anime123' })).toMatchObject({
      id: 'jikan-anime123', kind: 'trailer', provider: 'Jikan / MyAnimeList', key: 'anime123',
    });
    expect(normalizeJikanVideo({ embed_url: 'https://evil.example/video' })).toBeNull();
  });

  it('troca entre vídeos reais sem sair da página', () => {
    const videos = normalizeTmdbVideos([
      { id: 'trailer', key: 'trailer01', name: 'Trailer Oficial', site: 'YouTube', type: 'Trailer', official: true, iso_639_1: 'pt' },
      { id: 'teaser', key: 'teaser001', name: 'Teaser', site: 'YouTube', type: 'Teaser', official: true, iso_639_1: 'pt' },
    ]);
    render(<TrailerModal isOpen onClose={() => undefined} videos={videos} />);

    expect(screen.getByTitle('Trailer Oficial').getAttribute('src')).toContain('trailer01');
    fireEvent.click(screen.getByRole('button', { name: /Teaser/i }));
    expect(screen.getByTitle('Teaser').getAttribute('src')).toContain('teaser001');
  });
});
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
