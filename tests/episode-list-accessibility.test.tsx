import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EpisodeList } from '@/components/details/EpisodeList';
import type { MediaItem } from '@/types';

const mocks = vi.hoisted(() => ({
  getTVEpisodes: vi.fn(),
  updateLibraryItem: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  api: { getTVEpisodes: mocks.getTVEpisodes },
}));

vi.mock('@/store/useStore', () => ({
  useStore: (selector: (state: unknown) => unknown) => selector({
    library: {},
    updateLibraryItem: mocks.updateLibraryItem,
  }),
}));

vi.mock('sonner', () => ({
  toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

const series: MediaItem = {
  id: 'tmdb-tv-1396',
  tmdbId: 1396,
  title: 'Breaking Bad',
  mediaType: 'tv',
};

describe('lista de episódios acessível', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        seasons: [{ season_number: 1, name: 'Temporada 1', episode_count: 1 }],
      }),
    }));
    mocks.getTVEpisodes.mockResolvedValue([
      { episode_number: 1, name: 'Piloto', runtime: 58 },
    ]);
  });

  it('mantém marcar progresso e consultar fontes como controles irmãos', async () => {
    const { container } = render(
      <MemoryRouter>
        <EpisodeList item={series} />
      </MemoryRouter>,
    );

    await screen.findByText('Piloto');
    expect(container.querySelector('button button')).toBeNull();
    expect(screen.getByRole('button', { name: /marcar episódio 1 como assistido/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /ver fontes para o episódio 1/i })).toBeTruthy();
  });
});
