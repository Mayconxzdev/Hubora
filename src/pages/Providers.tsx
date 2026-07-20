import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Database,
  Download,
  ExternalLink,
  Filter,
  HardDrive,
  KeyRound,
  Link2,
  LoaderCircle,
  MonitorDown,
  Play,
  Search,
  Server,
  ShieldCheck,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SEO } from '@/components/ui/SEO';
import { MODE_LABELS, PROVIDER_CATALOG, PROVIDER_CATEGORIES } from '@/data/providerCatalog';
import {
  clearCompanionCache,
  detectCompanion,
  formatCompanionBytes,
  getCompanionCache,
  getCompanionConfig,
  pairCompanion,
  saveCompanionConfig,
} from '@/services/companion';
import type { CompanionHealth, ProviderCatalogEntry, ProviderCategory } from '@/types';

type CategoryFilter = 'all' | ProviderCategory;

const MODE_ICONS = {
  metadata: Database,
  'downloadable-file': Download,
  'embedded-player': Play,
  'personal-server': Server,
  'external-resolver': Link2,
  'external-page': ExternalLink,
  manifest: Link2,
  'game-launcher': MonitorDown,
} as const;

function providerAction(entry: ProviderCatalogEntry) {
  if (entry.mode === 'personal-server') return 'Conectar servidor';
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
  const [category, setCategory] = useState<CategoryFilter>(() => PROVIDER_CATEGORIES.some((item) => item.id === requestedCategory) ? requestedCategory as CategoryFilter : 'all');
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [health, setHealth] = useState<CompanionHealth | null>(null);
  const [cache, setCache] = useState<{ usedBytes: number; limitBytes: number; sessions: number } | null>(null);
  const [checking, setChecking] = useState(true);
  const [pairCode, setPairCode] = useState('');
  const [pairing, setPairing] = useState(false);
  const companionConfig = getCompanionConfig();
  const [endpoint, setEndpoint] = useState(companionConfig.endpoint);

  const refreshCompanion = async () => {
    setChecking(true);
    try {
      const next = await detectCompanion();
      setHealth(next);
      if (companionConfig.token && next.paired) {
        const nextCache = await getCompanionCache();
        setCache(nextCache);
        // Handshake silencioso para atualizar chaves de Debrid no Companion
        const { syncDebridKeysWithCompanion } = await import('@/services/companion');
        void syncDebridKeysWithCompanion();
      }
    } catch {
      setHealth(null);
      setCache(null);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => { void refreshCompanion(); }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    return PROVIDER_CATALOG.filter((entry) => {
      if (category !== 'all' && !entry.categories.includes(category)) return false;
      if (featuredOnly && !entry.featured) return false;
      if (!normalized) return true;
      return `${entry.name} ${entry.description} ${MODE_LABELS[entry.mode]} ${entry.categories.join(' ')}`.toLocaleLowerCase('pt-BR').includes(normalized);
    });
  }, [category, featuredOnly, query]);

  const categoryCounts = useMemo(() => Object.fromEntries(PROVIDER_CATEGORIES.map((item) => [item.id, item.id === 'all' ? PROVIDER_CATALOG.length : PROVIDER_CATALOG.filter((entry) => entry.categories.includes(item.id as ProviderCategory)).length])), []);

  const connect = (entry: ProviderCatalogEntry) => {
    if (entry.mode === 'personal-server') { navigate('/settings?section=integrations'); return; }
    if (entry.mode === 'manifest') { navigate('/sources#providers'); return; }
    if (entry.auth === 'api-key') { navigate('/settings?section=apis'); return; }
    if (entry.homepage.startsWith('/')) navigate(entry.homepage);
    else window.open(entry.homepage, '_blank', 'noopener,noreferrer');
  };

  const pair = async () => {
    if (!/^\d{6}$/.test(pairCode.trim())) { toast.error('Digite o código de seis dígitos exibido pelo Companion.'); return; }
    setPairing(true);
    try {
      await pairCompanion(pairCode, endpoint);
      setPairCode('');
      toast.success('Companion pareado. Cache progressivo ativado.');
      await refreshCompanion();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível parear.');
    } finally { setPairing(false); }
  };

  const clearCache = async () => {
    try {
      await clearCompanionCache();
      toast.success('Cache temporário removido.');
      await refreshCompanion();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível limpar o cache.'); }
  };

  const testEndpoint = async () => {
    saveCompanionConfig({ ...getCompanionConfig(), endpoint });
    await refreshCompanion();
  };

  return (
    <div className="hub-page hub-providers-page">
      <SEO title="Fontes e Companion" description="Central privada de provedores, autorizações e cache do Hubora." />

      <header className="hub-page-header items-start">
        <div>
          <div className="hub-section-eyebrow"><ShieldCheck size={14} /> Tudo em um lugar</div>
          <h1 className="hub-page-title">Fontes e Companion</h1>
          <p className="hub-page-subtitle">Veja o que cada serviço realmente oferece, conecte suas fontes e acompanhe a saúde sem misturar metadados com reprodução.</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/sources')}><Search size={17} /> Buscar conteúdo gratuito</Button>
      </header>

      <section className="hub-companion-card">
        <div className="hub-companion-main">
          <span className={`hub-companion-icon ${health?.ok ? 'is-online' : ''}`}><HardDrive size={26} /></span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2>Hubora Companion</h2>
              {checking ? <span className="hub-provider-status"><LoaderCircle size={13} className="animate-spin" /> Verificando</span> : health?.ok ? <span className="hub-provider-status is-ready"><Wifi size={13} /> Ativo</span> : <span className="hub-provider-status is-offline"><WifiOff size={13} /> Não encontrado</span>}
            </div>
            <p>Assista enquanto o conteúdo autorizado entra no cache, salve o progresso e limpe os temporários dez minutos depois de parar.</p>
          </div>
        </div>

        {health?.ok && !companionConfig.token ? (
          <div className="hub-companion-pair">
            <Input value={endpoint} onChange={(event) => setEndpoint(event.target.value)} placeholder="http://IP-DO-PC:49821" aria-label="Endereço do Companion" />
            <Input value={pairCode} onChange={(event) => setPairCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Código de 6 dígitos" inputMode="numeric" aria-label="Código de pareamento" />
            <Button onClick={() => void pair()} disabled={pairing}>{pairing ? 'Pareando...' : 'Parear'}</Button>
          </div>
        ) : health?.ok && companionConfig.token ? (
          <div className="hub-companion-stats">
            <div><span>Cache utilizado</span><strong>{formatCompanionBytes(cache?.usedBytes || health.cache.usedBytes)} / {formatCompanionBytes(cache?.limitBytes || health.cache.limitBytes)}</strong></div>
            <div><span>Limpeza automática</span><strong>10 minutos</strong></div>
            <div><span>Sessões</span><strong>{cache?.sessions ?? health.cache.sessions}</strong></div>
            <Button size="sm" variant="ghost" onClick={() => void clearCache()}><Trash2 size={15} /> Limpar agora</Button>
          </div>
        ) : (
          <div className="hub-companion-actions">
            <Input value={endpoint} onChange={(event) => setEndpoint(event.target.value)} placeholder="http://127.0.0.1:49821" aria-label="Endereço do Companion" />
            <Button onClick={() => window.open('/companion/Hubora-Companion-Windows.zip', '_blank')}><MonitorDown size={17} /> Baixar para Windows</Button>
            <Button variant="ghost" onClick={() => void testEndpoint()}><Activity size={17} /> Testar endereço</Button>
          </div>
        )}
      </section>

      <section className="hub-provider-summary" aria-label="Resumo das fontes">
        <div><strong>{PROVIDER_CATALOG.length}</strong><span>fontes mapeadas</span></div>
        <div><strong>{PROVIDER_CATALOG.filter((entry) => entry.free === true).length}</strong><span>gratuitas</span></div>
        <div><strong>{PROVIDER_CATALOG.filter((entry) => entry.mode === 'personal-server').length}</strong><span>servidores pessoais</span></div>
        <div><strong>{PROVIDER_CATALOG.filter((entry) => entry.capabilities.includes('reader')).length}</strong><span>com leitura</span></div>
        <div><strong>{PROVIDER_CATALOG.filter((entry) => entry.capabilities.includes('stream')).length}</strong><span>com reprodução</span></div>
      </section>

      <section className="hub-provider-controls">
        <div className="hub-provider-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar fonte, categoria ou capacidade..." /></div>
        <button className={featuredOnly ? 'is-active' : ''} onClick={() => setFeaturedOnly((value) => !value)}><Filter size={16} /> Prioritárias</button>
      </section>

      <nav className="hub-provider-categories scrollbar-hide" aria-label="Filtrar fontes por categoria">
        {PROVIDER_CATEGORIES.map((item) => <button key={item.id} className={category === item.id ? 'is-active' : ''} onClick={() => setCategory(item.id)}><span>{item.label}</span><small>{categoryCounts[item.id]}</small></button>)}
      </nav>

      <div className="hub-provider-result-heading">
        <div><span>Diretório universal</span><h2>{filtered.length} fonte{filtered.length === 1 ? '' : 's'}</h2></div>
        <p>Prioridade automática: sua mídia → acesso interno → gratuito → PT-BR → melhor saúde.</p>
      </div>

      <section className="hub-provider-grid">
        {filtered.map((entry) => {
          const Icon = MODE_ICONS[entry.mode];
          const ready = entry.auth === 'none';
          return <article key={entry.id} className="hub-provider-card">
            <div className="hub-provider-card-top">
              <span className="hub-provider-card-icon"><Icon size={21} /></span>
              <span className={`hub-provider-status ${ready ? 'is-ready' : ''}`}>{ready ? <CheckCircle2 size={13} /> : <KeyRound size={13} />}{ready ? 'Pronto' : entry.auth === 'account' ? 'Conta' : 'Configurar'}</span>
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
