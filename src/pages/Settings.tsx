import { useState, useRef, useEffect } from 'react';
import { Settings as SettingsIcon, Moon, Globe, Shield, Download, Upload, Trash2, Database, Wifi, RefreshCw, LockKeyhole } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { Language } from '@/lib/translations';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/Button';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import Papa from 'papaparse';
import { createHuboraBackup, parseHuboraBackup } from '@/services/backup';
import { localRepository } from '@/services/localRepository';
import { hasVaultPin, removeVaultPin, setVaultPin } from '@/services/vault';
import { featureRepository } from '@/services/featureRepository';
import { createAutomaticBackup, listAutomaticBackups, readAutomaticBackup } from '@/services/automaticBackup';
import type { LocalBackupSnapshot } from '@/lib/db';
import { getCompanionConfig, saveDebridKeys } from '@/services/companion';
import type { HuboraBackup } from '@/services/backup';

export function Settings() {
  const { user, updateUser, library, customLists, setLibrary, replaceCustomLists, syncState, syncPending, lastSyncedAt, syncNow, guestTheme, toggleTheme } = useStore();
  const queryClient = useQueryClient();
  const { t, language } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [fullHealth, setFullHealth] = useState<any>(null);
  const [isTestingConnect, setIsTestingConnect] = useState(false);
  const [vaultPin, setVaultPinValue] = useState('');
  const [vaultPinConfigured, setVaultPinConfigured] = useState(hasVaultPin());
  const [birthYear, setBirthYear] = useState(String(user?.preferences.birthYear || ''));
  const [adultConfirmed, setAdultConfirmed] = useState(Boolean(user?.preferences.adultConfirmed));
  const [automaticBackups, setAutomaticBackups] = useState<LocalBackupSnapshot[]>([]);
  const [serviceWorkerActive, setServiceWorkerActive] = useState(false);

  const csvInputRef = useRef<HTMLInputElement>(null);
  const [isImportingCSV, setIsImportingCSV] = useState(false);
  
  const compConfig = getCompanionConfig();
  const [realDebridKey, setRealDebridKey] = useState(compConfig.realDebridApiKey || '');
  const [torBoxKey, setTorBoxKey] = useState(compConfig.torBoxApiKey || '');

  const handleSaveDebridKeys = async () => {
    try {
      await saveDebridKeys(realDebridKey, torBoxKey);
      toast.success('Chaves de Debrid salvas e sincronizadas!');
    } catch (err) {
      toast.error('Erro ao sincronizar chaves com o Companion.');
    }
  };
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, currentTitle: '' });
  const { addToLibrary: addStoreMedia } = useStore();

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const csv = Papa.parse<Record<string, string>>(text, {
          header: true,
          skipEmptyLines: 'greedy',
          transformHeader: (header) => header.trim().replace(/^['"]|['"]$/g, ''),
        });
        const parsed = csv.data.filter((row) => Object.values(row).some((value) => String(value || '').trim()));
        if (csv.errors.length) console.warn('Linhas CSV com aviso:', csv.errors.slice(0, 10));
        if (parsed.length === 0) {
          toast.error("Nenhum registro encontrado no arquivo CSV.");
          return;
        }

        setIsImportingCSV(true);
        setImportProgress({ current: 0, total: parsed.length, currentTitle: '' });

        let importedCount = 0;
        for (let i = 0; i < parsed.length; i++) {
          const row = parsed[i];
          const titleKey = Object.keys(row).find(k => 
            ['title', 'name', 'show name', 'show', 'movie', 'nome', 'titulo', 'título'].includes(k.toLowerCase())
          );
          if (!titleKey) continue;
          
          const title = row[titleKey];
          if (!title) continue;

          const yearKey = Object.keys(row).find(k => k.toLowerCase() === 'year' || k.toLowerCase() === 'ano');
          const year = yearKey ? row[yearKey] : '';

          setImportProgress({ current: i + 1, total: parsed.length, currentTitle: title });

          try {
            const results = await api.searchMulti(title);
            if (results && results.length > 0) {
              let match = results[0];
              if (year) {
                const found = results.find((r: any) => r.releaseDate && r.releaseDate.startsWith(year));
                if (found) match = found;
              }
              addStoreMedia(match, 'completed');
              importedCount++;
            }
          } catch (err) {
            console.warn(`Erro ao buscar: ${title}`, err);
          }

          await new Promise(resolve => setTimeout(resolve, 200));
        }

        toast.success(`Importação concluída! ${importedCount} mídias adicionadas.`);
      } catch (err) {
        toast.error("Erro ao ler ou processar o arquivo CSV.");
      } finally {
        setIsImportingCSV(false);
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    Promise.all([
      fetch('/api/health').then(r => r.json()).catch(() => ({})),
      fetch('/api/games/status').then(r => r.json()).catch(() => ({}))
    ]).then(([health, games]) => {
      setSystemStatus({ ...health, games });
    });
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    void navigator.serviceWorker.getRegistration().then((registration) => {
      setServiceWorkerActive(Boolean(registration?.active || navigator.serviceWorker.controller));
    }).catch(() => setServiceWorkerActive(false));
  }, []);

  const refreshAutomaticBackups = () => {
    void listAutomaticBackups(user?.uid || 'local').then(setAutomaticBackups).catch(() => setAutomaticBackups([]));
  };

  useEffect(refreshAutomaticBackups, [user?.uid]);

  const testConnections = async () => {
    setIsTestingConnect(true);
    try {
      const res = await fetch('/api/health/full');
      const data = await res.json();
      setFullHealth(data);
      toast.success("Teste de conexões concluído!");
    } catch (e) {
      toast.error("Falha ao testar conexões com o backend.");
    } finally {
      setIsTestingConnect(false);
    }
  };

  if (!user) {
    return (
      <div className="hub-page hub-settings-page mx-auto w-full max-w-4xl">
        <Helmet>
          <title>{t('settings.title')} | Hubora</title>
        </Helmet>
        <header className="hub-page-header"><div><div className="hub-section-eyebrow"><SettingsIcon size={14}/> Este aparelho</div><h1 className="hub-page-title">Configurações</h1><p className="hub-page-subtitle">Ajustes locais funcionam sem conta. O login serve apenas para sincronizar com outros aparelhos.</p></div></header>

        <section className="hub-panel p-5 sm:p-6">
          <div className="flex items-center gap-4"><span className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--hub-surface-2)]"><Moon size={22}/></span><div className="min-w-0 flex-1"><h2 className="font-black text-[var(--hub-text-strong)]">Aparência</h2><p className="mt-1 text-sm text-[var(--hub-muted)]">{guestTheme === 'dark' ? 'Preto real com superfícies neutras.' : 'Branco real com superfícies neutras.'}</p></div><Button variant="outline" onClick={toggleTheme}>Usar tema {guestTheme === 'dark' ? 'claro' : 'escuro'}</Button></div>
        </section>

        <section className="hub-panel p-5 sm:p-6">
          <div className="flex items-center gap-4"><span className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--hub-surface-2)]"><Database size={22}/></span><div className="min-w-0 flex-1"><h2 className="font-black text-[var(--hub-text-strong)]">Dados locais ativos</h2><p className="mt-1 text-sm text-[var(--hub-muted)]">{Object.keys(library).length} item(ns) salvos neste navegador. Biblioteca, progresso e preferências continuam disponíveis offline.</p></div></div>
        </section>

        <section className="hub-panel p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center"><span className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--hub-brand-soft)] text-[var(--hub-brand)]"><RefreshCw size={22}/></span><div className="min-w-0 flex-1"><h2 className="font-black text-[var(--hub-text-strong)]">Sincronizar PC e Android</h2><p className="mt-1 text-sm text-[var(--hub-muted)]">Entre somente quando quiser manter o mesmo progresso em mais de um aparelho.</p></div><Link to="/login"><Button>Entrar para sincronizar</Button></Link></div>
        </section>
      </div>
    );
  }

  const setAdultMode = (mode: 'off' | 'mature' | 'vault') => {
    if (!user) return;
    const year = Number(birthYear);
    const validAdult = adultConfirmed && Number.isInteger(year) && year >= 1900 && new Date().getFullYear() - year >= 18;
    if (mode !== 'off' && !validAdult) {
      toast.error('Informe o ano de nascimento e confirme que você tem 18 anos ou mais.');
      return;
    }
    updateUser({
      preferences: {
        ...user.preferences,
        adultContent: mode !== 'off',
        adultMode: mode,
        adultVaultEnabled: mode === 'vault',
        birthYear: validAdult ? year : user.preferences.birthYear,
        adultConfirmed: mode === 'off' ? user.preferences.adultConfirmed : true,
      },
    });
    toast.success(mode === 'off' ? 'Conteúdo adulto desativado.' : mode === 'mature' ? 'Modo Maduro ativado.' : 'Cofre Adulto ativado neste aparelho.');
  };

  const saveAdultPin = async () => {
    try {
      await setVaultPin(vaultPin);
      setVaultPinValue('');
      setVaultPinConfigured(true);
      toast.success('PIN do Cofre salvo somente neste aparelho.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o PIN.');
    }
  };

  const clearAdultPin = () => {
    removeVaultPin();
    setVaultPinConfigured(false);
    toast.success('PIN removido deste aparelho.');
  };

  const setTheme = (theme: 'dark' | 'light') => {
    if (!user) return;
    updateUser({
      preferences: {
        ...user.preferences,
        theme,
      }
    });
    toast.success(t('settings.saved'));
  };

  const setLanguage = (lang: 'pt-BR' | 'en') => {
    if (!user) return;
    updateUser({
      preferences: {
        ...user.preferences,
        language: lang,
      }
    });
    toast.success(t('settings.saved'));
  };

  const isDark = user?.preferences?.theme === 'dark';
  const adultMode = user?.preferences?.adultMode || (user?.preferences?.adultContent ? 'mature' : 'off');

  const handleExport = async () => {
    const consumptionEvents = await localRepository.getConsumptionEvents(100_000);
    const goals = await featureRepository.goals.list();
    const data = createHuboraBackup({
      user,
      library: Object.values(library),
      customLists: Object.values(customLists),
      consumptionEvents,
      goals,
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hubora_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup completo exportado com sucesso!');
  };

  const restoreBackup = async (backup: HuboraBackup) => {
    await setLibrary(Object.fromEntries(backup.library.map((entry) => [entry.id, entry])));
    await replaceCustomLists(backup.customLists);
    await localRepository.replaceConsumptionEvents(backup.consumptionEvents, true);
    await Promise.all(backup.goals.map((goal) => featureRepository.goals.put(goal)));
    if (backup.user && user) updateUser({ ...backup.user, uid: user.uid });
    await syncNow();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backup = parseHuboraBackup(JSON.parse(event.target?.result as string));
        await restoreBackup(backup);
        toast.success('Backup validado e restaurado com sucesso!');
      } catch (err) {
        console.warn('Backup rejeitado:', err);
        toast.error('Arquivo inválido ou incompatível com o formato de backup do Hubora.');
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleClearCache = () => {
    if (window.confirm("Isso apagará apenas o cache de requisições. Seus itens salvos serão mantidos. Continuar?")) {
      const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith('hubora_franchise_') || k.startsWith('hubora_trivia_'));
      keysToRemove.forEach(k => localStorage.removeItem(k));
      queryClient.clear();
      toast.success('Cache dos catálogos de mídia limpo.');
    }
  };

  const handleReset = () => {
    if (window.confirm("ATENÇÃO: Isso apagará TODOS os seus itens salvos localmente. Esta ação não pode ser desfeita. Continuar?")) {
      setLibrary({});
      toast.success('Meus dados foram resetados.');
    }
  };

  return (
    <div className="hub-page hub-settings-page mx-auto w-full max-w-4xl">
      <Helmet>
        <title>{t('settings.title')} | Hubora</title>
        <meta name="description" content="Configure suas preferências de idioma, aparência e conteúdo no Hubora." />
      </Helmet>
      
      <div className="hub-page-header justify-start">
        <div className="p-3 bg-purple-500/20 rounded-2xl border border-purple-500/30">
          <SettingsIcon className="text-purple-400" size={28} />
        </div>
        <div>
          <h1 className="hub-page-title text-[clamp(2rem,4vw,3.6rem)]">{t('settings.title')}</h1>
          <p className="text-slate-400">{t('settings.subtitle')}</p>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white border-b border-white/10 pb-2">Preferências Interativas</h2>
        
        <div className="hub-panel flex flex-col items-start justify-between gap-4 p-5 sm:p-6 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-800 rounded-xl">
              <Moon size={24} className="text-purple-400" />
            </div>
            <div>
              <h3 className="font-bold text-white">{t('settings.appearance')}</h3>
              <p className="text-sm text-slate-400">{t('settings.theme')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button 
              onClick={() => setTheme('dark')}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-colors ${isDark ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white'}`}
            >
              {t('settings.theme.dark')}
            </button>
            <button 
              onClick={() => setTheme('light')}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-colors ${!isDark ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white'}`}
            >
              {t('settings.theme.light')}
            </button>
          </div>
        </div>

        <div className="hub-panel flex flex-col items-start justify-between gap-4 p-5 sm:p-6 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-800 rounded-xl">
              <Globe size={24} className="text-cyan-400" />
            </div>
            <div>
              <h3 className="font-bold text-white">{t('settings.language')}</h3>
              <p className="text-sm text-slate-400">Preferência de idioma para buscas e menus</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button 
              onClick={() => setLanguage('pt-BR')}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-colors ${language === 'pt-BR' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white'}`}
            >
              Português
            </button>
            <button 
              onClick={() => setLanguage('en')}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-colors ${language === 'en' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white'}`}
            >
              English
            </button>
          </div>
        </div>

        <div className="hub-panel space-y-5 p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-[var(--hub-surface-3)] p-3"><Shield size={24} className="text-[var(--hub-brand)]" /></div>
            <div>
              <h3 className="font-bold text-[var(--hub-text-strong)]">Conteúdo +18</h3>
              <p className="text-sm leading-relaxed text-[var(--hub-muted)]">Desativado esconde todo conteúdo adulto. Maduro libera obras convencionais classificadas para maiores. Cofre também permite títulos explicitamente adultos, sempre privados por padrão.</p>
            </div>
          </div>
          <div className="grid gap-3 rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-surface-2)] p-4 sm:grid-cols-[12rem_1fr]">
            <label className="text-sm font-bold text-[var(--hub-text-strong)]">Ano de nascimento<input className="hub-field mt-2" inputMode="numeric" value={birthYear} onChange={(event) => setBirthYear(event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="Ex.: 1998"/></label>
            <label className="flex items-start gap-3 self-end rounded-xl p-3 text-sm text-[var(--hub-muted)]"><input className="mt-1" type="checkbox" checked={adultConfirmed} onChange={(event) => setAdultConfirmed(event.target.checked)}/><span>Confirmo que tenho 18 anos ou mais e desejo controlar manualmente a exibição de conteúdo adulto nesta conta.</span></label>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            {[
              { id: 'off', label: 'Desativado', description: 'Nenhum conteúdo adulto em busca ou recomendação.' },
              { id: 'mature', label: 'Modo Maduro', description: 'Classificação 18+, violência, sexo e temas intensos.' },
              { id: 'vault', label: 'Cofre Adulto', description: 'Área privada, ativada por conta e por aparelho.' },
            ].map((option) => (
              <button key={option.id} onClick={() => setAdultMode(option.id as 'off' | 'mature' | 'vault')} className={`rounded-2xl border p-4 text-left transition ${adultMode === option.id ? 'border-[var(--hub-brand)] bg-[var(--hub-brand-soft)]' : 'border-[var(--hub-border)] bg-[var(--hub-surface-2)]'}`}>
                <strong className="block text-sm text-[var(--hub-text-strong)]">{option.label}</strong>
                <small className="mt-1 block text-xs leading-relaxed text-[var(--hub-muted)]">{option.description}</small>
              </button>
            ))}
          </div>
          {adultMode === 'vault' && (
            <div className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-surface-2)] p-4">
              <div className="flex items-start gap-3"><LockKeyhole size={20} className="mt-0.5 text-[var(--hub-brand)]"/><div><strong className="text-sm text-[var(--hub-text-strong)]">Proteção por PIN neste aparelho</strong><p className="mt-1 text-xs text-[var(--hub-muted)]">A biblioteca pode sincronizar, mas o Cofre precisa ser ativado novamente em cada aparelho. Prints adultos nunca sincronizam.</p></div></div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input className="hub-field" type="password" inputMode="numeric" value={vaultPin} onChange={(event) => setVaultPinValue(event.target.value.replace(/\D/g, '').slice(0, 8))} placeholder={vaultPinConfigured ? 'Digite um novo PIN para substituir' : 'PIN de 4 a 8 números'} />
                <Button onClick={() => void saveAdultPin()} disabled={vaultPin.length < 4}>{vaultPinConfigured ? 'Trocar PIN' : 'Salvar PIN'}</Button>
                {vaultPinConfigured && <Button variant="outline" onClick={clearAdultPin}>Remover PIN</Button>}
              </div>
              <label className="mt-4 flex items-center gap-3 text-sm text-[var(--hub-muted)]"><input type="checkbox" checked={user.preferences.adultVaultPinMode === 'always'} onChange={(event) => updateUser({ preferences: { ...user.preferences, adultVaultPinMode: event.target.checked ? 'always' : 'session' } })}/> Pedir PIN sempre que abrir, não apenas uma vez por sessão.</label>
            </div>
          )}
        </div>

        <h2 className="text-xl font-bold text-white border-b border-white/10 pb-2 mt-12">Meus Gostos Pessoais</h2>
        <p className="text-sm text-slate-400 mb-6">Essas preferências alimentam recomendações locais, transparentes e explicáveis.</p>

        <div className="hub-panel space-y-6 p-5 sm:p-6">
          <div>
             <label className="mb-2 block text-xs font-black uppercase tracking-widest text-[var(--hub-subtle)]">Gêneros Favoritos</label>
             <input 
               type="text" 
               defaultValue={user?.preferences?.favoriteGenres?.join(', ') || ''}
               placeholder="Ex: Cyberpunk, Suspense, Fantasia Sombria"
               onBlur={(e) => {
                 const val = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                 updateUser({ preferences: { ...user.preferences, favoriteGenres: val } });
               }}
               className="hub-field"
             />
          </div>

          <div>
             <label className="mb-2 block text-xs font-black uppercase tracking-widest text-[var(--hub-subtle)]">Gêneros que desejo evitar</label>
             <input 
               type="text" 
               defaultValue={user?.preferences?.dislikedGenres?.join(', ') || ''}
               placeholder="Ex: Romance Clichê, Terror com Gore, Musical"
               onBlur={(e) => {
                 const val = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                 updateUser({ preferences: { ...user.preferences, dislikedGenres: val } });
               }}
               className="hub-field"
             />
          </div>
        </div>

        <h2 className="text-xl font-bold text-white border-b border-white/10 pb-2 mt-12">Meus Dados & Permissões</h2>

        <div className="hub-panel space-y-4 p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-slate-800 rounded-xl">
              <Database size={24} className="text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white">Importar / Exportar Backup</h3>
              <p className="text-sm text-slate-400 mb-4">Mantenha uma cópia segura dos seus favoritos e watchlist no seu PC.</p>
              
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => void handleExport()} variant="outline" className="gap-2 border-slate-700 hover:bg-slate-800">
                  <Download size={16} /> Exportar JSON
                </Button>
                <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="gap-2 border-slate-700 hover:bg-slate-800">
                  <Upload size={16} /> Importar JSON
                </Button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImport} 
                  accept=".json" 
                  className="hidden" 
                />
              </div>
            </div>
          </div>
        </div>

        <div className="hub-panel space-y-4 p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-slate-800 rounded-xl">
              <Download size={24} className="text-cyan-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white">Importar de Outros Apps (TV Time / Letterboxd)</h3>
              <p className="text-sm text-slate-400 mb-4">
                Migre sua biblioteca inteira de uma vez subindo um arquivo CSV.
              </p>
              
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-3">
                  <Button 
                    onClick={() => csvInputRef.current?.click()} 
                    variant="outline" 
                    className="gap-2 border-slate-700 hover:bg-slate-800"
                    disabled={isImportingCSV}
                  >
                    <Upload size={16} /> Importar CSV
                  </Button>
                  <input 
                    type="file" 
                    ref={csvInputRef} 
                    onChange={handleCSVImport} 
                    accept=".csv" 
                    className="hidden" 
                  />
                </div>

                {isImportingCSV && (
                  <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5 space-y-2 mt-2">
                    <div className="flex justify-between text-xs font-bold text-slate-400">
                      <span>Processando arquivo...</span>
                      <span>{importProgress.current} de {importProgress.total}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-cyan-500 transition-all duration-300"
                        style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-1">Buscando metadados de: <strong className="text-white">{importProgress.currentTitle}</strong></p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="hub-panel space-y-4 p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-slate-800 rounded-xl">
              <Trash2 size={24} className="text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white">Limpeza Opcional</h3>
              <p className="text-sm text-slate-400 mb-4">Resultados dos catálogos são armazenados temporariamente no dispositivo para acelerar a navegação. A limpeza não remove sua biblioteca.</p>
              
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleClearCache} variant="outline" className="gap-2 border-slate-700 hover:bg-slate-800 text-slate-300">
                  Limpar Cache
                </Button>
                <Button onClick={() => void syncNow().then(() => toast.success('Sincronização concluída.'))} className="bg-[var(--hub-brand)] hover:bg-[var(--hub-brand-strong)] gap-2">
                  <RefreshCw size={18} />
                  Sincronizar agora
                </Button>
                <Button onClick={handleReset} variant="outline" className="gap-2 border-red-500/30 hover:bg-red-500/20 text-red-400">
                  Apagar Meus Dados
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="hub-panel space-y-4 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="p-3 bg-[var(--hub-brand-soft)] rounded-xl"><Database size={24} className="text-[var(--hub-brand)]" /></div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="font-bold text-[var(--hub-text-strong)]">Backups automáticos locais</h3><p className="mt-1 text-sm text-[var(--hub-muted)]">O Hubora mantém até sete snapshots diários neste aparelho. Eles não ocupam a nuvem e podem restaurar biblioteca, listas, Diário e metas.</p></div><Button variant="outline" onClick={() => void createAutomaticBackup(user).then(() => { refreshAutomaticBackups(); toast.success('Snapshot local criado.'); })}><Download size={16}/> Criar agora</Button></div>
              <div className="mt-4 space-y-2">{automaticBackups.slice(0, 7).map((snapshot) => <div key={snapshot.id} className="flex flex-col gap-2 rounded-xl border border-[var(--hub-border)] bg-[var(--hub-surface-2)] p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-[var(--hub-text-strong)]">{new Date(snapshot.createdAt).toLocaleString('pt-BR')}</p><p className="text-xs text-[var(--hub-subtle)]">Snapshot criptografado pelo isolamento do navegador e disponível somente neste aparelho.</p></div><Button size="sm" variant="outline" onClick={() => void readAutomaticBackup(snapshot.id).then(async (backup) => { if (!backup) throw new Error('Snapshot não encontrado'); if (!window.confirm('Restaurar este snapshot e substituir o estado atual?')) return; await restoreBackup(backup); toast.success('Snapshot restaurado.'); }).catch(() => toast.error('Não foi possível restaurar o snapshot.'))}>Restaurar</Button></div>)}{!automaticBackups.length && <p className="text-sm text-[var(--hub-subtle)]">O primeiro snapshot será criado automaticamente depois da inicialização ou quando você usar “Criar agora”.</p>}</div>
            </div>
          </div>
        </div>

        <h2 className="text-xl font-bold text-white border-b border-white/10 pb-2 mt-12">Debrids e Serviços Locais</h2>
        <p className="text-sm text-slate-400 mb-6">Configure suas contas de Debrid para download e streaming instantâneo de torrents via Companion. Se deixado em branco, o Companion usará WebTorrent (P2P gratuito) como fallback.</p>

        <div className="hub-panel space-y-6 p-5 sm:p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-widest text-[var(--hub-subtle)]">Chave de API do Real-Debrid</label>
              <input 
                type="password" 
                value={realDebridKey}
                onChange={(e) => setRealDebridKey(e.target.value)}
                placeholder="Insira sua API Key do Real-Debrid"
                className="hub-field"
              />
              <p className="mt-1 text-xs text-slate-500">Obtenha em: <a href="https://real-debrid.com/apitoken" target="_blank" rel="noreferrer" className="text-[var(--hub-brand)] hover:underline">real-debrid.com/apitoken</a></p>
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-widest text-[var(--hub-subtle)]">Chave de API do TorBox</label>
              <input 
                type="password" 
                value={torBoxKey}
                onChange={(e) => setTorBoxKey(e.target.value)}
                placeholder="Insira sua API Key do TorBox"
                className="hub-field"
              />
              <p className="mt-1 text-xs text-slate-500">Obtenha em: <a href="https://torbox.app/settings" target="_blank" rel="noreferrer" className="text-[var(--hub-brand)] hover:underline">torbox.app/settings</a></p>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
            <Button onClick={handleSaveDebridKeys} className="bg-[var(--hub-brand)] hover:bg-[var(--hub-brand-strong)]">
              Salvar Contas Debrid
            </Button>
          </div>
        </div>

        <h2 className="text-xl font-bold text-white border-b border-white/10 pb-2 mt-12">Ambiente Atual</h2>
        <div className="hub-panel space-y-4 p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-500/20 rounded-xl border border-purple-500/30">
              <Database size={24} className="text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white mb-2">Hubora local-first</h3>
              <p className="text-sm text-slate-400 mb-4">Sua biblioteca é gravada primeiro no IndexedDB. A sincronização Supabase é opcional e nunca substitui os dados locais por uma resposta vazia.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between p-2 bg-slate-950 rounded-lg border border-white/5">
                  <span className="text-slate-400">PWA preparado:</span>
                  <span className="text-green-400 font-bold">Sim</span>
                </div>
                <div className="flex justify-between p-2 bg-slate-950 rounded-lg border border-white/5">
                  <span className="text-slate-400">Service Worker:</span>
                  <span className={serviceWorkerActive ? 'text-green-400 font-bold' : 'text-yellow-400 font-bold'}>{serviceWorkerActive ? 'Ativo' : 'Disponível após instalar/publicar'}</span>
                </div>
                <div className="flex justify-between p-2 bg-slate-950 rounded-lg border border-white/5">
                  <span className="text-slate-400">Modo de dados:</span>
                  <span className="text-blue-400 font-bold">{systemStatus?.supabaseConfigured ? 'Supabase + IndexedDB' : 'IndexedDB local'}</span>
                </div>
                <div className="flex justify-between p-2 bg-slate-950 rounded-lg border border-white/5">
                  <span className="text-slate-400">Fila pendente:</span>
                  <span className={syncPending > 0 ? 'text-yellow-400 font-bold' : 'text-green-400 font-bold'}>{syncPending}</span>
                </div>
                <div className="flex justify-between p-2 bg-slate-950 rounded-lg border border-white/5 sm:col-span-2">
                  <span className="text-slate-400">Última sincronização:</span>
                  <span className="text-slate-200 font-bold">{lastSyncedAt ? new Date(lastSyncedAt).toLocaleString('pt-BR') : `Estado: ${syncState}`}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-12 mb-4 border-b border-white/10 pb-2">
          <h2 className="text-xl font-bold text-white">Status do Sistema {fullHealth && "(Teste Realizado)"}</h2>
          <Button variant="ghost" onClick={testConnections} disabled={isTestingConnect} className="text-sm border border-purple-500/50 hover:bg-purple-500/20">
            {isTestingConnect ? "Testando..." : "Testar Conexões Reais"}
          </Button>
        </div>
        
        {systemStatus ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={`p-4 rounded-xl border ${fullHealth?.tmdb === 'conectado' ? 'bg-green-500/10 border-green-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Wifi size={18} className={fullHealth?.tmdb === 'conectado' ? "text-green-500" : "text-yellow-500"} />
                <h4 className="font-bold text-white">TMDB (Filmes/Séries)</h4>
              </div>
              <p className="text-sm text-slate-400">
                {fullHealth ? fullHealth.tmdb : 'Use “Testar Conexões Reais” para validar o proxy protegido.'}
              </p>
            </div>

            <div className={`p-4 rounded-xl border ${systemStatus.games?.rawg === 'configured' ? 'bg-green-500/10 border-green-500/30' : 'bg-slate-500/10 border-slate-500/30'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Wifi size={18} className={systemStatus.games?.rawg === 'configured' ? "text-green-500" : "text-slate-400"} />
                <h4 className="font-bold text-white">RAWG (Opcional)</h4>
              </div>
              <p className="text-sm text-slate-400">
                {systemStatus.games?.rawg === 'configured' ? "Conectado" : "RAWG não configurado — essa fonte é opcional."}
              </p>
            </div>
            
            <div className={`p-4 rounded-xl border ${systemStatus.games?.igdb === 'configured' ? 'bg-green-500/10 border-green-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Wifi size={18} className={systemStatus.games?.igdb === 'configured' ? "text-green-500" : "text-yellow-500"} />
                <h4 className="font-bold text-white">Fontes de Jogos (Backend)</h4>
              </div>
              <p className="text-sm text-slate-400">
                IGDB: {systemStatus.games?.igdb === 'configured' ? "Configurado" : "Não configurado"}
                <br/>
                CheapShark: {fullHealth ? fullHealth.cheapshark : (systemStatus.games?.cheapshark || 'Indisponível')}
                <br/>
                Steam: {fullHealth ? fullHealth.steam : (systemStatus.games?.steam || 'Indisponível')}
              </p>
            </div>

            <div className={`p-4 rounded-xl border ${!fullHealth || fullHealth?.jikan === 'conectado' ? 'bg-green-500/10 border-green-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Wifi size={18} className={!fullHealth || fullHealth?.jikan === 'conectado' ? "text-green-500" : "text-yellow-500"} />
                <h4 className="font-bold text-white">Jikan / AniList (Animes)</h4>
              </div>
              <p className="text-sm text-slate-400">
                {fullHealth ? fullHealth.jikan : "Conectado (API Pública)"}
              </p>
            </div>

            <div className={`p-4 rounded-xl border ${!fullHealth || (fullHealth?.googleBooks === 'conectado' || fullHealth?.openLibrary === 'conectado') ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Wifi size={18} className={!fullHealth || (fullHealth?.googleBooks === 'conectado' || fullHealth?.openLibrary === 'conectado') ? "text-green-500" : "text-red-500"} />
                <h4 className="font-bold text-white">Fontes de Livros / HQs</h4>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Google Books: {fullHealth ? fullHealth.googleBooks : "Público"} <br/>
                Open Library (Fallback): {fullHealth ? fullHealth.openLibrary : "Público"} <br/>
                Cache Local: Disponível
              </p>
            </div>

            <div className={`p-4 rounded-xl border ${systemStatus.supabaseConfigured ? 'bg-green-500/10 border-green-500/30' : 'bg-blue-500/10 border-blue-500/30'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Database size={18} className={systemStatus.supabaseConfigured ? "text-green-500" : "text-blue-500"} />
                <h4 className="font-bold text-white">Persistência e sincronização</h4>
              </div>
              <p className="text-sm text-slate-400">
                {systemStatus.supabaseConfigured ? "Supabase conectado; IndexedDB continua como fonte local." : "Modo offline local ativo; configure Supabase para sincronizar entre dispositivos."}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-slate-500 text-sm animate-pulse">Carregando status do servidor backend...</p>
        )}

      </div>
      
      <div className="text-center pt-10">
        <p className="text-xs text-slate-600">Hubora Engine v4.0 - {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}
