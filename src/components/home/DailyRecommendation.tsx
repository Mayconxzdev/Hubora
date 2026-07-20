import { useState } from 'react';
import { ArrowRight, RefreshCw, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { parseDiscoveryIntent, rankCandidates, type RankedRecommendation } from '@/services/discovery';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/Button';
import { MediaCard } from '@/components/ui/MediaCard';

export function DailyRecommendation() {
  const navigate = useNavigate();
  const { getLibraryItems, user } = useStore();
  const [recommendation, setRecommendation] = useState<RankedRecommendation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateRecommendation = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const library = getLibraryItems();
      const favoriteGenres = user?.preferences.favoriteGenres || [];
      const favorites = library.filter((entry) => entry.isFavorite || (entry.rating || 0) >= 8);
      const seed = [
        favoriteGenres.slice(0, 3).join(' '),
        favorites.slice(0, 2).flatMap((entry) => entry.media.genres || []).slice(0, 3).join(' '),
      ].filter(Boolean).join(' ') || 'aventura misterio drama';
      const candidates = await api.searchMulti(seed, 1);
      const intent = parseDiscoveryIntent(`algo bem avaliado parecido com ${seed}`);
      const ranked = rankCandidates(candidates, intent, user, library)
        .filter(({ item }) => !library.some((entry) => String(entry.mediaId) === String(item.id) && entry.status === 'completed'));
      if (!ranked.length) throw new Error('Sem candidatos suficientes');
      const dayOffset = Math.floor(Date.now() / 86_400_000) % Math.min(5, ranked.length);
      setRecommendation(ranked[dayOffset]);
    } catch (recommendationError) {
      console.warn('Recomendação local indisponível:', recommendationError);
      setError('Os catálogos não responderam agora. Sua biblioteca continua disponível offline.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!recommendation) {
    return (
      <section className="relative overflow-hidden rounded-[1.65rem] border border-[color-mix(in_srgb,var(--hub-brand)_28%,var(--hub-border))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--hub-brand)_13%,var(--hub-surface-1)),var(--hub-surface-1)_58%,color-mix(in_srgb,var(--hub-accent)_8%,var(--hub-surface-1)))] p-6 shadow-[var(--hub-shadow-sm)] sm:p-8">
        <div className="absolute right-[-4rem] top-[-5rem] h-56 w-56 rounded-full bg-[var(--hub-brand)] opacity-10 blur-3xl" />
        <div className="relative flex flex-col items-start gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <span className="hub-chip" data-active="true"><Sparkles size={14} /> Curadoria explicável</span>
            <h2 className="mt-4 text-2xl font-black tracking-[-0.045em] text-[var(--hub-text-strong)] sm:text-4xl">Uma recomendação que mostra o motivo.</h2>
            <p className="mt-3 leading-relaxed text-[var(--hub-muted)]">O Hubora cruza seus gêneros, avaliações e histórico. Nenhuma caixa-preta: você entende por que o título foi escolhido.</p>
            {error && <p className="mt-3 text-sm font-semibold text-amber-500">{error}</p>}
          </div>
          <Button size="lg" onClick={generateRecommendation} disabled={isLoading} className="shrink-0">
            <Sparkles size={18} /> {isLoading ? 'Calculando...' : 'Encontrar minha sugestão'}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-[1.65rem] border border-[color-mix(in_srgb,var(--hub-brand)_28%,var(--hub-border))] bg-[var(--hub-surface-1)] p-5 shadow-[var(--hub-shadow-md)] sm:p-7">
      <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_80%_20%,rgba(217,154,40,0.16),transparent_58%)]" />
      <div className="relative grid gap-7 md:grid-cols-[12rem_minmax(0,1fr)] lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-center">
        <MediaCard item={recommendation.item} />
        <div>
          <span className="hub-chip" data-active="true"><Sparkles size={14} /> Afinidade {Math.max(0, Math.min(100, Math.round(recommendation.score)))}%</span>
          <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] text-[var(--hub-text-strong)] sm:text-5xl">{recommendation.item.title}</h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--hub-muted)] sm:text-lg">Escolhida porque {recommendation.reasons.slice(0, 3).join(', ')}.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" onClick={() => navigate(`/details/${recommendation.item.id}`)}>Ver detalhes <ArrowRight size={18} /></Button>
            <Button size="lg" variant="outline" onClick={generateRecommendation} disabled={isLoading}><RefreshCw size={17} /> Outra sugestão</Button>
          </div>
        </div>
      </div>
    </section>
  );
}
