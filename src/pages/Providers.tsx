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
  RefreshCw,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { SEO } from '@/components/ui/SEO';
import { MODE_LABELS, PROVIDER_CATALOG, PROVIDER_CATEGORIES } from '@/data/providerCatalog';
import type { ProviderCatalogEntry, ProviderCategory } from '@/types';

type CategoryFilter = 'all' | ProviderCategory;

interface ProviderHealthSnapshot {
  tmdb?: string;
  jikan?: string;
  googleBooks?: string;
  openLibrary?: string;
  cheapshark?: string;
  steam?: string;
  anilist?: string;
  supabase?: string;
  igdb?: string;
  rawg?: string;
  checkedAt?: string;
  cached?: string;
}

interface DeploymentConfigSnapshot {
  ready: boolean;
  missingRequired: string[];
  missingRecommended: string[];
  checkedAt?: string;
  note?: string;
}

const HEALTH_KEYS: Partial<Record<string, keyof ProviderHealthSnapshot>> = {
  tmdb: 'tmdb',
  jikan: 'jikan',
  'google-books': 'googleBooks',
  'open-library': 'openLibrary',
  cheapshark: 'cheapshark',
  steam: 'steam',
  anilist: 'anilist',
  igdb: 'igdb',
  rawg: 'rawg',
};

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
  const [health, setHealth] = useState<ProviderHealthSnapshot | null>(null);
  const [deploymentConfig, setDeploymentConfig] = useState<DeploymentConfigSnapshot | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState('');

  const verifyHealth = async () => {
    setHealthLoading(true);
    setHealthError('');
    try {
      const [healthResponse, configResponse] = await Promise.all([
        fetch('/api/health/full'),
        fetch('/api/health/config'),
      ]);
      if (!healthResponse.ok || !configResponse.ok) throw new Error('health unavailable');
      const [healthPayload, configPayload] = await Promise.all([
        healthResponse.json() as Promise<ProviderHealthSnapshot>,
        configResponse.json() as Promise<DeploymentConfigSnapshot>,
      ]);
      setHealth(healthPayload);
      setDeploymentConfig(configPayload);
    } catch {
      setHealthError('Não foi possível verificar as integrações agora. O diretório continua disponível.');
    } finally {
      setHealthLoading(false);
    }
  };

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
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void verifyHealth()} disabled={healthLoading}><RefreshCw size={17} className={healthLoading ? 'animate-spin' : ''}/> {healthLoading ? 'Verificando...' : 'Verificar integrações ativas'}</Button><Button variant="outline" onClick={() => navigate('/sources')}><Search size={17} /> Buscar conteúdo gratuito</Button></div>
      </header>

      {health && <div role="status" aria-label="Última verificação de provedores" className="hub-panel p-4 text-sm text-[var(--hub-muted)]"><strong className="text-[var(--hub-text-strong)]">Verificação concluída.</strong> {health.checkedAt ? `Última verificação: ${new Date(health.checkedAt).toLocaleString('pt-BR')}.` : ''} {health.cached === 'sim' ? 'Resultado recente reutilizado.' : 'Consultas executadas agora.'}</div>}
      {deploymentConfig && (
        <div role={deploymentConfig.ready ? 'status' : 'alert'} className={`hub-panel p-4 text-sm ${deploymentConfig.ready ? 'border-emerald-500/25 bg-emerald-500/8 text-emerald-200' : 'border-amber-500/25 bg-amber-500/8 text-amber-200'}`}>
          <strong className="block text-[var(--hub-text-strong)]">{deploymentConfig.ready ? 'Variáveis essenciais configuradas.' : 'Configuração de produção incompleta.'}</strong>
          {deploymentConfig.missingRequired.length > 0 && <span className="mt-1 block">Faltam: {deploymentConfig.missingRequired.join(', ')}.</span>}
          {deploymentConfig.missingRecommended.length > 0 && <span className="mt-1 block">Recomendadas: {deploymentConfig.missingRecommended.join(', ')}.</span>}
          {deploymentConfig.note && <span className="mt-1 block text-xs opacity-80">{deploymentConfig.note}</span>}
        </div>
      )}
      {healthError && <div role="alert" className="hub-panel border-red-500/25 bg-red-500/8 p-4 text-sm text-red-300">{healthError}</div>}

      <section className="hub-provider-controls">
        <div className="hub-provider-search"><Search size={18} /><input aria-label="Buscar provedores" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar fonte, categoria ou capacidade..." /></div>
        <button aria-pressed={featuredOnly} className={featuredOnly ? 'is-active' : ''} onClick={() => setFeaturedOnly((value) => !value)}><Filter size={16} /> Prioritárias</button>
      </section>

      <nav className="hub-provider-categories scrollbar-hide" aria-label="Filtrar fontes por categoria">
        {PROVIDER_CATEGORIES.map((item) => <button key={item.id} aria-pressed={category === item.id} className={category === item.id ? 'is-active' : ''} onClick={() => setCategory(item.id)}><span>{item.label}</span><small>{categoryCounts[item.id]}</small></button>)}
      </nav>

      <div className="hub-provider-result-heading">
        <div><span>Diretório inicial</span><h2>{filtered.length} fonte{filtered.length === 1 ? '' : 's'} mapeada{filtered.length === 1 ? '' : 's'}</h2></div>
        <p>Mapeada não significa verificada. Saúde e evidência real serão exibidas por capacidade.</p>
      </div>

      <section className="hub-provider-grid">
        {filtered.map((entry) => {
          const Icon = MODE_ICONS[entry.mode];
          const noLogin = entry.auth === 'none';
          const healthKey = HEALTH_KEYS[entry.id];
          const observedHealth = healthKey && health ? health[healthKey] : undefined;
          return <article key={entry.id} className="hub-provider-card">
            <div className="hub-provider-card-top">
              <span className="hub-provider-card-icon"><Icon size={21} /></span>
              <span className="hub-provider-status"><KeyRound size={13} />{noLogin ? 'Sem login' : entry.auth === 'account' ? 'Exige conta' : 'Configuração'}</span>
            </div>
            <div><span className="hub-provider-mode">{MODE_LABELS[entry.mode]}</span><h3>{entry.name}</h3><p>{entry.description}</p></div>
            <p className="text-xs text-[var(--hub-subtle)]">{observedHealth ? `Verificado: ${observedHealth}.` : health ? 'Não verificado nesta instalação; cadastro de diretório.' : 'Ainda não verificado nesta sessão.'}</p>
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
