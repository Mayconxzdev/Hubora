import { useEffect, useMemo, useState } from 'react';
import { Download, Share2, Sparkles } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { localRepository } from '@/services/localRepository';
import { calculateWrapped, wrappedSvg } from '@/services/wrapped';
import type { ConsumptionEvent } from '@/types';
import { Button } from '@/components/ui/Button';
import { SEO } from '@/components/ui/SEO';
import { toast } from 'sonner';

export function Wrapped() {
  const { user, getLibraryItems } = useStore();
  const [events, setEvents] = useState<ConsumptionEvent[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const entries = getLibraryItems();
  useEffect(() => { void localRepository.getConsumptionEvents(100_000).then(setEvents); }, []);
  const privateStats = useMemo(() => calculateWrapped(entries, events, year, { includeAdultPrivate: true }), [entries, events, year]);
  const shareableStats = useMemo(() => calculateWrapped(entries, events, year), [entries, events, year]);
  const svg = useMemo(() => wrappedSvg(shareableStats, user?.name || 'Minha jornada'), [shareableStats, user?.name]);
  const preview = useMemo(() => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, [svg]);

  const download = () => {
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `hubora-wrapped-${year}.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const share = async () => {
    const file = new File([svg], `hubora-wrapped-${year}.svg`, { type: 'image/svg+xml' });
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ title: `Meu Hubora Wrapped ${year}`, files: [file] });
    else { download(); toast.info('Seu navegador não compartilha arquivos diretamente; a imagem foi baixada.'); }
  };

  return (
    <div className="hub-page">
      <SEO title="Hubora Wrapped" description="Sua retrospectiva multimídia gerada localmente." />
      <header className="hub-page-header items-start">
        <div><div className="hub-section-eyebrow"><Sparkles size={14} /> Retrospectiva privada</div><h1 className="hub-page-title">Hubora Wrapped</h1><p className="hub-page-subtitle">Horas, hábitos, gêneros e memórias calculados no seu aparelho. As estatísticas privadas podem considerar o Cofre. A imagem compartilhável sempre remove títulos e eventos adultos.</p></div>
        <div className="flex gap-2"><select className="hub-field h-11 w-auto" value={year} onChange={(event) => setYear(Number(event.target.value))}>{[0,1,2,3].map((offset) => { const value = new Date().getFullYear() - offset; return <option key={value} value={value}>{value}</option>; })}</select><Button variant="outline" onClick={download}><Download size={17} /> Baixar</Button><Button onClick={() => void share()}><Share2 size={17} /> Compartilhar</Button></div>
      </header>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="hub-panel overflow-hidden p-3"><img src={preview} alt={`Retrospectiva Hubora ${year}`} className="mx-auto w-full max-w-2xl rounded-3xl" /></div>
        <aside className="space-y-3">
          {[['Obras concluídas', privateStats.completed], ['Horas registradas', Math.round(privateStats.totalMinutes / 60)], ['Maior sequência', `${privateStats.longestStreak} dias`], ['Gênero mais presente', privateStats.favoriteGenre], ['Mídia mais consumida', privateStats.favoriteMediaType]].map(([label, value]) => <div key={String(label)} className="hub-panel p-5"><p className="text-xs font-bold uppercase tracking-widest text-[var(--hub-subtle)]">{label}</p><p className="mt-2 text-3xl font-black text-[var(--hub-text-strong)]">{value}</p></div>)}
        </aside>
      </div>
    </div>
  );
}
