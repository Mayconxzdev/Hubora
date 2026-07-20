import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Database,
  Download,
  ExternalLink,
  Filter,
  KeyRound,
  Link2,
  Play,
  Search,
  Server,
  ShieldCheck,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { SEO } from '@/components/ui/SEO';
import { MODE_LABELS, PROVIDER_CATALOG, PROVIDER_CATEGORIES } from '@/data/providerCatalog';
import type { ProviderCatalogEntry, ProviderCategory } from '@/types';

type CategoryFilter = 'all' | ProviderCategory;

const MODE_ICONS = {
  metadata: Database,
  'downloadable-file': Download,
  'embedded-player': Play,
  'personal-server': Server,
  'external-resolver': Link2,
  'external-page': ExternalLink,
  manifest: Link2,
} as const;

function providerAction(entry: ProviderCatalogEntry) {
  if (entry.mode === 'personal-server') return 'Configurar servidor';
  if (entry.mode === 'manifest') return 'Adicionar manifesto';
  if (entry.auth === 'api-key') return 'Configurar chave';
  if (entry.mode === 'external-page' || entry.mode === 'downloadable-file') return 'Abrir fonte';
  return 'Ver detalhes';
}

export function Providers() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedCategory = searchParams.get('category');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>(() =>
    PROVIDER_CATEGORIES.some((item) => item.id === requestedCategory)
      ? requestedCategory as CategoryFilter
      : 'all',
  );
  const [featuredOnly, setFeaturedOnly] = useState(false);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    return PROVIDER_CATALOG.filter((entry) => {
      if (category !== 'all' && !entry.categories.includes(category)) return false;
      if (featuredOnly && !entry.featured) return false;
      if (!normalized) return true;
      return `${entry.name} ${entry.description} ${MODE_LABELS[entry.mode]} ${entry.categories.join(' ')}`
        .toLocaleLowerCase('pt-BR')
        .includes(normalized);
    });
  }, [category, featuredOnly, query]);

  const categoryCounts = useMemo(() => Object.fromEntries(PROVIDER_CATEGORIES.map((item) => [
    item.id,
    item.id === 'all'
      ? PROVIDER_CATALOG.length
      : PROVIDER_CATALOG.filter((entry) => entry.categories.includes(item.id as ProviderCategory)).length,
  ])), []);

  const connect = (entry: ProviderCatalogEntry) => {
    if (entry.mode === 'personal-server') { navigate('/settings?section=integrations'); return; }
    if (entry.mode === 'manifest') { navigate('/sources#providers'); return; }
    if (entry.auth === 'api-key') { navigate('/settings?section=apis'); return; }
    if (entry.homepage.startsWith('/')) navigate(entry.homepage);
    else window.open(entry.homepage, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="hub-page hub-providers-page">
      <SEO title="Fontes e provedores" description="Diretório privado de fontes, capacidades e requisitos do Hubora." />

      <header className="hub-page-header items-start">
        <div>
          <div className="hub-section-eyebrow"><ShieldCheck size={14} /> Origem e capacidade</div>
          <h1 className="hub-page-title">Fontes e provedores</h1>
          <p className="hub-page-subtitle">Consulte o que está apenas mapeado, o que exige configuração e como cada fonte pode ser acessada. Presença neste diretório não comprova integração.</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/sources')}><Search size={17} /> Buscar conteúdo gratuito</Button>
      </header>

      <section className="hub-provider-controls">
        <div className="hub-provider-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar fonte, categoria ou capacidade..." /></div>
        <button className={featuredOnly ? 'is-active' : ''} onClick={() => setFeaturedOnly((value) => !value)}><Filter size={16} /> Prioritárias</button>
      </section>

      <nav className="hub-provider-categories scrollbar-hide" aria-label="Filtrar fontes por categoria">
        {PROVIDER_CATEGORIES.map((item) => <button key={item.id} className={category === item.id ? 'is-active' : ''} onClick={() => setCategory(item.id)}><span>{item.label}</span><small>{categoryCounts[item.id]}</small></button>)}
      </nav>

      <div className="hub-provider-result-heading">
        <div><span>Diretório inicial</span><h2>{filtered.length} fonte{filtered.length === 1 ? '' : 's'} mapeada{filtered.length === 1 ? '' : 's'}</h2></div>
        <p>Mapeada não significa verificada. Saúde e evidência real serão exibidas por capacidade.</p>
      </div>

      <section className="hub-provider-grid">
        {filtered.map((entry) => {
          const Icon = MODE_ICONS[entry.mode];
          const noLogin = entry.auth === 'none';
          return <article key={entry.id} className="hub-provider-card">
            <div className="hub-provider-card-top">
              <span className="hub-provider-card-icon"><Icon size={21} /></span>
              <span className="hub-provider-status"><KeyRound size={13} />{noLogin ? 'Sem login' : entry.auth === 'account' ? 'Exige conta' : 'Configuração'}</span>
            </div>
            <div><span className="hub-provider-mode">{MODE_LABELS[entry.mode]}</span><h3>{entry.name}</h3><p>{entry.description}</p></div>
            <div className="hub-provider-tags">{entry.categories.slice(0, 4).map((item) => <span key={item}>{PROVIDER_CATEGORIES.find((categoryItem) => categoryItem.id === item)?.label}</span>)}</div>
            <div className="hub-provider-card-footer">
              <span>{entry.free === true ? 'Grátis' : entry.free === 'partial' ? 'Grátis parcial' : 'Pago'}</span>
              <button onClick={() => connect(entry)}>{providerAction(entry)} <ArrowUpRight size={14} /></button>
            </div>
          </article>;
        })}
      </section>
    </div>
  );
}
