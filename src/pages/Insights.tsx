import { useMemo } from 'react';
import { BarChart3, CalendarCheck2, Network, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/Button';
import { SEO } from '@/components/ui/SEO';

export function Insights() {
  const navigate = useNavigate();
  const libraryById = useStore((state) => state.library);
  const library = useMemo(() => Object.values(libraryById), [libraryById]);
  const completed = library.filter((item) => item.status === 'completed').length;
  const consuming = library.filter((item) => item.status === 'consuming').length;
  const favorites = library.filter((item) => item.isFavorite).length;
  const byType = Object.entries(library.reduce<Record<string, number>>((acc, item) => { acc[item.mediaType] = (acc[item.mediaType] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]);

  return <div className="hub-page">
    <SEO title="Insights" description="Estatísticas, retrospectivas, metas e conexões pessoais." />
    <header className="hub-page-header items-start"><div><div className="hub-section-eyebrow"><BarChart3 size={14}/> Uso pessoal</div><h1 className="hub-page-title">Insights</h1><p className="hub-page-subtitle">Recursos ocasionais ficam juntos aqui, sem competir com descoberta, progresso e Radar.</p></div></header>
    <section className="grid gap-3 sm:grid-cols-3"><div className="hub-panel p-5"><p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--hub-subtle)]">Em andamento</p><p className="mt-2 text-4xl font-black text-[var(--hub-text-strong)]">{consuming}</p></div><div className="hub-panel p-5"><p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--hub-subtle)]">Concluídos</p><p className="mt-2 text-4xl font-black text-[var(--hub-text-strong)]">{completed}</p></div><div className="hub-panel p-5"><p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--hub-subtle)]">Favoritos</p><p className="mt-2 text-4xl font-black text-[var(--hub-text-strong)]">{favorites}</p></div></section>
    {byType.length > 0 && <section className="hub-section"><div className="hub-section-heading"><div><div className="hub-section-eyebrow"><BarChart3 size={14}/> Distribuição</div><h2 className="hub-section-title">Sua biblioteca por mídia</h2></div></div><div className="hub-panel p-5"><div className="space-y-3">{byType.map(([type, count]) => <div key={type}><div className="mb-1 flex justify-between text-sm"><span className="font-bold text-[var(--hub-text-strong)]">{type}</span><span className="text-[var(--hub-muted)]">{count}</span></div><div className="h-2 overflow-hidden rounded-full bg-[var(--hub-surface-3)]"><div className="h-full rounded-full bg-[var(--hub-brand)]" style={{ width: `${Math.max(5, count / Math.max(...byType.map((item) => item[1])) * 100)}%` }}/></div></div>)}</div></div></section>}
    <section className="hub-section"><div className="grid gap-3 md:grid-cols-3"><article className="hub-panel p-5"><Sparkles className="text-[var(--hub-brand)]"/><h2 className="mt-3 text-lg font-black text-[var(--hub-text-strong)]">Wrapped</h2><p className="mt-2 text-sm text-[var(--hub-muted)]">Retrospectiva privada, sem conteúdo do Cofre na imagem compartilhável.</p><Button className="mt-5" variant="outline" onClick={() => navigate('/wrapped')}>Abrir Wrapped</Button></article><article className="hub-panel p-5"><CalendarCheck2 className="text-[var(--hub-brand)]"/><h2 className="mt-3 text-lg font-black text-[var(--hub-text-strong)]">Metas opcionais</h2><p className="mt-2 text-sm text-[var(--hub-muted)]">Objetivos pessoais sem XP, ranking ou punição por dias de descanso.</p><Button className="mt-5" variant="outline" onClick={() => navigate('/goals')}>Abrir metas</Button></article><article className="hub-panel p-5"><Network className="text-[var(--hub-brand)]"/><h2 className="mt-3 text-lg font-black text-[var(--hub-text-strong)]">Conexões</h2><p className="mt-2 text-sm text-[var(--hub-muted)]">Mapa secundário de gêneros, criadores e relações encontradas.</p><Button className="mt-5" variant="outline" onClick={() => navigate('/connections')}>Abrir grafo</Button></article></div></section>
  </div>;
}
