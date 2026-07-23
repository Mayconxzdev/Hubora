import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Clapperboard, Search, SlidersHorizontal } from 'lucide-react';
import { api } from '@/services/api';
import { parseDiscoveryIntent, rankCandidates, type RankedRecommendation } from '@/services/discovery';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MediaCard } from '@/components/ui/MediaCard';

export function SceneSearch() {
  const [params, setParams] = useSearchParams();
  const initial = params.get('scene') || '';
  const [clues, setClues] = useState(initial);
  const [year, setYear] = useState('');
  const [country, setCountry] = useState('');
  const [results, setResults] = useState<RankedRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState('');
  const { user, getLibraryItems } = useStore();

  useEffect(() => {
    if (initial && initial !== clues) setClues(initial);
  }, [initial]);

  const search = async () => {
    if (!clues.trim()) return;
    setLoading(true);
    setHasSearched(false);
    setError('');
    setParams({ scene: clues.trim() });
    try {
      if (!navigator.onLine) throw new Error('offline');
      const combined = [clues, year, country].filter(Boolean).join(' ');
      const candidates = await api.searchMulti(clues.trim(), 1);
      const intent = parseDiscoveryIntent(combined);
      const yearFiltered = year
        ? candidates.filter((item) => !item.releaseDate || item.releaseDate.startsWith(year))
        : candidates;
      setResults(rankCandidates(yearFiltered, intent, user, getLibraryItems()).slice(0, 12));
      setHasSearched(true);
    } catch {
      setResults([]);
      setError('Não foi possível comparar as pistas com os catálogos agora. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <section className="hub-panel p-5 sm:p-7">
        <div className="flex gap-4 items-start mb-6">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--hub-brand-soft)] border border-[color-mix(in_srgb,var(--hub-brand)_30%,var(--hub-border))]"><Clapperboard className="text-[var(--hub-brand)]" /></div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-[-0.035em] text-[var(--hub-text-strong)]">Busca por pistas</h2>
            <p className="text-[var(--hub-muted)]">Cruze detalhes lembrados com os metadados dos catálogos. Quanto mais fatos concretos, melhor.</p>
          </div>
        </div>
        <label className="block"><span className="mb-2 block text-sm font-bold text-[var(--hub-text-strong)]">O que você lembra?</span><Input value={clues} onChange={(event) => setClues(event.target.value)} placeholder="Ex.: anime de basquete com protagonista de cabelo vermelho" className="h-14 rounded-2xl" /></label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <label><span className="mb-2 block text-xs font-bold text-[var(--hub-muted)]">Ano aproximado (opcional)</span><Input inputMode="numeric" value={year} onChange={(event) => setYear(event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="Ex.: 2014" className="h-12 rounded-xl" /></label>
          <label><span className="mb-2 block text-xs font-bold text-[var(--hub-muted)]">País ou idioma (opcional)</span><Input value={country} onChange={(event) => setCountry(event.target.value)} placeholder="Ex.: Coreia do Sul" className="h-12 rounded-xl" /></label>
        </div>
        <Button onClick={search} disabled={loading || !clues.trim()} className="mt-4 rounded-xl gap-2 px-7 py-5">
          <Search size={18} /> {loading ? 'Cruzando pistas...' : 'Buscar candidatos'}
        </Button>
        <p className="mt-4 text-xs text-[var(--hub-subtle)] flex items-center gap-2"><SlidersHorizontal size={14} /> Esta busca não reconhece imagens nem inventa títulos; ela compara suas pistas com dados reais disponíveis.</p>
      </section>

      {error && <div role="alert" className="hub-panel border-red-500/25 bg-red-500/8 p-4 text-sm text-red-300">{error}</div>}

      {results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {results.map(({ item, reasons }) => (
            <div key={`${item.mediaType}-${item.id}`} className="space-y-2">
              <MediaCard item={item} />
              <p className="text-xs text-[var(--hub-muted)] rounded-xl bg-slate-900/60 border border-white/5 p-3">Possível correspondência: {reasons.slice(0, 2).join(', ')}.</p>
            </div>
          ))}
        </div>
      )}
      {hasSearched && results.length === 0 && !error && <div className="hub-empty-state"><div><Search className="mx-auto mb-3 text-[var(--hub-brand)]" size={28}/><p className="font-bold text-[var(--hub-text-strong)]">Nenhum candidato correspondeu às pistas</p><p className="mt-1 text-sm">Remova uma pista muito específica ou tente o título em outro idioma.</p></div></div>}
    </div>
  );
}
