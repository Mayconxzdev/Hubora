import { useEffect, useMemo, useRef } from 'react';
import cytoscape from 'cytoscape';
import { Network } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { SEO } from '@/components/ui/SEO';

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

  useEffect(() => {
    if (!containerRef.current) return;
    const cy = cytoscape({ container: containerRef.current, elements, layout: { name: 'cose', animate: false, fit: true, padding: 28 }, style: [
      { selector: 'node', style: { 'background-color': '#d99a28', label: 'data(label)', color: '#fffdf8', 'font-size': '9px', 'text-wrap': 'wrap', 'text-max-width': '80px', 'text-valign': 'bottom', 'text-margin-y': '8px', width: '28px', height: '28px' } },
      { selector: 'node[kind = "genre"]', style: { 'background-color': '#69502b', width: '20px', height: '20px' } },
      { selector: 'node[kind = "creator"]', style: { 'background-color': '#7a746a', width: '22px', height: '22px' } },
      { selector: 'edge', style: { width: '1px', 'line-color': '#4d4538', opacity: 0.65, 'curve-style': 'bezier' } },
      { selector: ':selected', style: { 'border-width': '3px', 'border-color': '#fffdf8' } },
    ] as any });
    return () => cy.destroy();
  }, [elements]);

  return <div className="hub-page"><SEO title="Grafo de conexões" description="Explore relações entre suas obras, gêneros e criadores."/><header className="hub-page-header items-start"><div><div className="hub-section-eyebrow"><Network size={14}/> Descoberta por relações</div><h1 className="hub-page-title">Grafo de conexões</h1><p className="hub-page-subtitle">Um mapa visual gerado com a sua biblioteca. Toque em um nó, aproxime e descubra caminhos entre obras, gêneros, autores, estúdios e desenvolvedores.</p></div></header><div className="hub-panel overflow-hidden p-2"><div ref={containerRef} className="h-[68vh] min-h-[34rem] w-full rounded-3xl bg-[#050505]" /></div></div>;
}
