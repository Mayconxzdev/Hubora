import { useEffect, useMemo, useRef, useState } from 'react';
import { Network } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { SEO } from '@/components/ui/SEO';
import { Button } from '@/components/ui/Button';

export function Connections() {
  const containerRef = useRef<HTMLDivElement>(null);
  const libraryById = useStore((state) => state.library);
  const entries = useMemo(() => Object.values(libraryById), [libraryById]);
  const elements = useMemo(() => {
    const nodes: any[] = [];
    const edges: any[] = [];
    const seen = new Set<string>();
    for (const entry of entries.slice(0, 120)) {
      nodes.push({ data: { id: entry.id, label: entry.title, kind: entry.mediaType } });
      for (const genre of (entry.media.genres || []).slice(0, 2)) {
        const genreId = `genre:${genre}`;
        if (!seen.has(genreId)) { nodes.push({ data: { id: genreId, label: genre, kind: 'genre' } }); seen.add(genreId); }
        edges.push({ data: { id: `${entry.id}:${genreId}`, source: entry.id, target: genreId } });
      }
      for (const creator of [...(entry.media.authors || []), ...(entry.media.developers || []), ...(entry.media.publishers || [])].slice(0, 2)) {
        const creatorId = `creator:${creator}`;
        if (!seen.has(creatorId)) { nodes.push({ data: { id: creatorId, label: creator, kind: 'creator' } }); seen.add(creatorId); }
        edges.push({ data: { id: `${entry.id}:${creatorId}`, source: entry.id, target: creatorId } });
      }
    }
    return [...nodes, ...edges];
  }, [entries]);

  const [graphError, setGraphError] = useState('');

  useEffect(() => {
    if (!containerRef.current || elements.length === 0) return;
    let cancelled = false;
    let cy: { destroy: () => void } | null = null;

    void import('cytoscape').then((module) => {
      if (cancelled || !containerRef.current) return;
      const cytoscape = module.default;
      cy = cytoscape({ container: containerRef.current, elements, layout: { name: 'cose', animate: false, fit: true, padding: 28 }, style: [
        { selector: 'node', style: { 'background-color': '#8473ff', label: 'data(label)', color: '#f7f7f8', 'font-size': '9px', 'text-wrap': 'wrap', 'text-max-width': '80px', 'text-valign': 'bottom', 'text-margin-y': '8px', width: '28px', height: '28px' } },
        { selector: 'node[kind = "genre"]', style: { 'background-color': '#4b3f80', width: '20px', height: '20px' } },
        { selector: 'node[kind = "creator"]', style: { 'background-color': '#8a8a93', width: '22px', height: '22px' } },
        { selector: 'edge', style: { width: '1px', 'line-color': '#3b3b43', opacity: 0.72, 'curve-style': 'bezier' } },
        { selector: ':selected', style: { 'border-width': '3px', 'border-color': '#ffffff' } },
      ] as any });
    }).catch(() => {
      if (!cancelled) setGraphError('Não foi possível carregar o grafo de conexões.');
    });

    return () => { cancelled = true; cy?.destroy(); };
  }, [elements]);

  const relationCount = elements.filter((element) => Boolean(element.data.source)).length;

  return <div className="hub-page"><SEO title="Grafo de conexões" description="Explore relações entre suas obras, gêneros e criadores."/><header className="hub-page-header items-start"><div><div className="hub-section-eyebrow"><Network size={14}/> Descoberta por relações</div><h1 className="hub-page-title">Grafo de conexões</h1><p className="hub-page-subtitle">Um mapa visual gerado com a sua biblioteca. Toque em um nó, aproxime e descubra caminhos entre obras, gêneros, autores, estúdios e desenvolvedores.</p></div></header>{entries.length === 0 ? <section className="hub-empty-state min-h-72"><Network size={34} aria-hidden="true"/><h2 className="text-xl font-black text-[var(--hub-text-strong)]">Sua rede começa na biblioteca</h2><p>Adicione obras à biblioteca para visualizar conexões entre títulos, gêneros e criadores.</p><Link to="/discover"><Button>Descobrir uma obra</Button></Link></section> : <section className="hub-panel overflow-hidden p-2"><p className="px-3 py-2 text-xs font-bold text-[var(--hub-subtle)]">{entries.length} obra(s) e {relationCount} relação(ões) neste mapa.</p>{graphError ? <p className="p-6 text-sm text-red-300">{graphError}</p> : <div ref={containerRef} role="img" aria-label={`Grafo com ${entries.length} obras e ${relationCount} relações`} data-node-count={elements.length - relationCount} data-edge-count={relationCount} className="h-[68vh] min-h-[34rem] w-full rounded-2xl bg-[#050505]" />}</section>}</div>;
}
