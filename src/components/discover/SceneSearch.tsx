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
  const { user, getLibraryItems } = useStore();

  useEffect(() => {
    if (initial && initial !== clues) setClues(initial);
  }, [initial]);

  const search = async () => {
    if (!clues.trim()) return;
    setLoading(true);
    setParams({ scene: clues.trim() });
    try {
      const combined = [clues, year, country].filter(Boolean).join(' ');
      const candidates = await api.searchMulti(combined, 1);
      const intent = parseDiscoveryIntent(combined);
      setResults(rankCandidates(candidates, intent, user, getLibraryItems()).slice(0, 12));
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
        <Input value={clues} onChange={(event) => setClues(event.target.value)} placeholder="Ex.: anime de basquete com protagonista de cabelo vermelho" className="h-14 rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <Input value={year} onChange={(event) => setYear(event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="Ano ou década aproximada" className="h-12 rounded-xl" />
          <Input value={country} onChange={(event) => setCountry(event.target.value)} placeholder="País ou idioma, se lembrar" className="h-12 rounded-xl" />
        </div>
        <Button onClick={search} disabled={loading || !clues.trim()} className="mt-4 rounded-xl gap-2 px-7 py-5">
          <Search size={18} /> {loading ? 'Cruzando pistas...' : 'Buscar candidatos'}
        </Button>
        <p className="mt-4 text-xs text-[var(--hub-subtle)] flex items-center gap-2"><SlidersHorizontal size={14} /> Esta busca não reconhece imagens nem inventa títulos; ela compara suas pistas com dados reais disponíveis.</p>
      </section>

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
    </div>
  );
}
