import { useMemo, useState } from 'react';
import { Clock3, Dices, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { pickFromBacklog, type RouletteCriteria } from '@/services/roulette';
import { Button } from '@/components/ui/Button';

const MOODS: Array<{ id: NonNullable<RouletteCriteria['mood']>; label: string }> = [
  { id: 'light', label: 'Leve' },
  { id: 'comfort', label: 'Confortável' },
  { id: 'intense', label: 'Intenso' },
  { id: 'focused', label: 'Quero focar' },
  { id: 'surprise', label: 'Surpreenda' },
];

export function BacklogRoulette() {
  const navigate = useNavigate();
  const libraryById = useStore((state) => state.library);
  const entries = useMemo(() => Object.values(libraryById), [libraryById]);
  const [minutes, setMinutes] = useState(60);
  const [mood, setMood] = useState<NonNullable<RouletteCriteria['mood']>>('surprise');
  const [seed, setSeed] = useState(0);
  const result = useMemo(() => pickFromBacklog(entries, { minutes, mood, forgottenBoost: true }), [entries, minutes, mood, seed]);

  return (
    <section className="hub-panel overflow-hidden p-5 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <div className="hub-section-eyebrow"><Dices size={14} /> Backlog Roulette</div>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--hub-text-strong)]">Pare de escolher. Comece.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--hub-muted)]">O Hubora considera seu tempo, humor, prioridades e títulos esquecidos para escolher uma única obra.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[25, 45, 60, 90, 120].map((value) => <button key={value} className={`hub-chip ${minutes === value ? 'border-[var(--hub-brand)] bg-[var(--hub-brand-soft)] text-[var(--hub-text-strong)]' : ''}`} onClick={() => setMinutes(value)}><Clock3 size={14} /> {value} min</button>)}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {MOODS.map((item) => <button key={item.id} className={`hub-chip ${mood === item.id ? 'border-[var(--hub-brand)] bg-[var(--hub-brand-soft)] text-[var(--hub-text-strong)]' : ''}`} onClick={() => setMood(item.id)}>{item.label}</button>)}
          </div>
        </div>

        <div className="w-full rounded-3xl border border-[var(--hub-border)] bg-[var(--hub-surface-2)] p-4 lg:w-[26rem]">
          {result ? (
            <div className="flex gap-4">
              <div className="h-32 w-24 shrink-0 overflow-hidden rounded-2xl bg-[var(--hub-surface-3)]">
                {result.entry.posterUrl ? <img src={result.entry.posterUrl} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Sparkles /></div>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[0.7rem] font-black uppercase tracking-[0.16em] text-[var(--hub-brand)]">Sua escolha</p>
                <h3 className="mt-1 line-clamp-2 text-lg font-black text-[var(--hub-text-strong)]">{result.entry.title}</h3>
                <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[var(--hub-muted)]">{result.reasons.join(' • ')}</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => navigate(`/details/${result.entry.mediaId}`, { state: { media: result.entry.media } })}>Abrir</Button>
                  <Button size="sm" variant="outline" onClick={() => setSeed((value) => value + 1)}><Dices size={15} /> Girar</Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-[var(--hub-muted)]">Adicione títulos em “Planejo consumir” para usar a roleta.</div>
          )}
        </div>
      </div>
    </section>
  );
}
