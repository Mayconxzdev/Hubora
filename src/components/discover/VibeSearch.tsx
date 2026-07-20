import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { api } from '@/services/api';
import { parseDiscoveryIntent, rankCandidates, type RankedRecommendation } from '@/services/discovery';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MediaCard } from '@/components/ui/MediaCard';

export function VibeSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = searchParams.get('vibe') || '';
  const [text, setText] = useState(initial);
  const [results, setResults] = useState<RankedRecommendation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, getLibraryItems } = useStore();

  useEffect(() => {
    if (initial && initial !== text) setText(initial);
  }, [initial]);

  const intent = useMemo(() => parseDiscoveryIntent(text), [text]);

  const handleSearch = async () => {
    if (!text.trim()) return;
    setIsSearching(true);
    setError(null);
    setSearchParams({ vibe: text.trim() });

    try {
      const terms = intent.queryTerms.length ? intent.queryTerms.slice(0, 4) : [text.trim()];
      const responses = await Promise.all(terms.map((term) => api.searchMulti(term, 1).catch(() => [])));
      const candidates = Array.from(new Map(responses.flat().map((item) => [String(item.id), item])).values());
      const ranked = rankCandidates(candidates, intent, user, getLibraryItems()).slice(0, 12);
      setResults(ranked);
      if (!ranked.length) setError('Nenhuma obra combinou com os filtros. Tente remover uma restrição ou usar termos mais amplos.');
    } catch (searchError) {
      console.warn('Falha na busca por preferências:', searchError);
      setError('Os catálogos externos não responderam agora. Seus dados locais continuam seguros.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <section className="hub-panel p-5 sm:p-7">
        <div className="flex items-start gap-4 mb-6">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--hub-brand-soft)] border border-[color-mix(in_srgb,var(--hub-brand)_30%,var(--hub-border))]">
            <Sparkles className="text-[var(--hub-brand)]" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-[-0.035em] text-[var(--hub-text-strong)]">Descoberta explicável</h2>
            <p className="text-[var(--hub-muted)] mt-1">Descreva o clima, duração, formato e o que deseja evitar. O Hubora transforma isso em filtros auditáveis, sem IA.</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <Input
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && void handleSearch()}
            placeholder="Ex.: algo sombrio, curto, com mistério e sem romance"
            className="h-14 flex-1 bg-slate-900 border-white/10 rounded-2xl"
          />
          <Button onClick={handleSearch} disabled={isSearching || !text.trim()} className="h-14 px-7 rounded-2xl gap-2">
            <Search size={18} /> {isSearching ? 'Cruzando catálogos...' : 'Encontrar obras'}
          </Button>
        </div>

        {text.trim() && (
          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--hub-surface-2)] px-3 py-2 text-[var(--hub-muted)] border border-[var(--hub-border)]"><Filter size={14} /> {intent.explanation}</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-2 text-emerald-300 border border-emerald-500/20"><ShieldCheck size={14} /> sem envio do texto para modelos</span>
          </div>
        )}
      </section>

      {error && <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-amber-300">{error}</div>}

      {results.length > 0 && (
        <section className="space-y-5">
          <div>
            <h3 className="text-2xl font-extrabold tracking-[-0.035em] text-[var(--hub-text-strong)]">Melhores combinações</h3>
            <p className="text-[var(--hub-muted)]">Ordenadas por metadados, preferências, nota, popularidade e restrições.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {results.map(({ item, score, reasons }) => (
              <div key={`${item.mediaType}-${item.id}`} className="space-y-3">
                <MediaCard item={item} />
                <div className="rounded-xl border border-[var(--hub-border)] bg-[var(--hub-surface-2)] p-3">
                  <div className="text-xs font-black text-[var(--hub-brand)]">Compatibilidade {Math.max(0, Math.min(100, Math.round(score)))}%</div>
                  <p className="text-xs text-[var(--hub-muted)] mt-1 leading-relaxed">{reasons.slice(0, 2).join(' e ')}.</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
