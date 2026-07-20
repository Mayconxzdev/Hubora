# Hubora 9.0.0 — estado inicial auditado

Data do levantamento: 2026-07-20
Branch de trabalho: `refactor/hubora-verified-platform`
Baseline importado: `0ecfd1d9dfb73585bb03a5e3ac9398dfac6de544`
Checkpoint pré-plataforma verificada: `b11100f`, tag `hubora-9.0.0-pre-verified-platform`

Este documento registra o que foi observado localmente. Não certifica prontidão de produção e não converte código, catálogo estático ou teste mockado em integração real.

## Ambiente observado

- Windows NT 10.0.26100.
- Node.js 26.4.0; `package.json` aceita `>=22.12.0` e não fixa versão exata.
- npm 11.17.0; `packageManager` não está declarado.
- React 19.2.5, React Router 7.14.2, TypeScript 6.0.3 e Vite instalado 7.3.6.
- `.env.local` existe e está ignorado. Seu conteúdo não foi exibido nem versionado.
- Não há remote Git configurado; nenhum push, deploy ou alteração remota foi feito.

## Preservação

- O baseline original está no commit `0ecfd1d` e tag `hubora-9.0.0-pre-refactor`.
- O estado após a primeira limpeza de categoria está em `b11100f` e tag `hubora-9.0.0-pre-verified-platform`.
- A branch atual foi criada localmente conforme a especificação.
- O worktree estava limpo antes desta fase documental.

## Stack e topologia encontradas

- Web/PWA: React + Vite, Zustand, TanStack Query, Dexie/IndexedDB.
- Backend local de desenvolvimento: Express em `server.ts`.
- Backend hospedável: oito arquivos em `netlify/functions`.
- Nuvem opcional: cliente Supabase e três migrations.
- PWA: `vite-plugin-pwa` e service worker próprio.
- Testes: Vitest e Playwright.
- Subsistema contraditório: Companion Node/PowerShell, ZIP público, WebTorrent, debrid, mídia pessoal e launchers locais.

## Inventário

| Área | Evidência observada |
|---|---|
| Git | 677 arquivos rastreados após inclusão das skills locais auditadas |
| `src/` | 115 arquivos; páginas, componentes, serviços, store, tipos e service worker |
| Netlify | 8 arquivos, incluindo TMDB, jogos, catálogo gratuito e health |
| Supabase | 3 migrations SQL; nenhuma execução remota nesta fase |
| Companion | 4 arquivos em `companion/`, ZIP em `public/companion`, serviço web e teste |
| Testes | 16 suites Vitest e 12 casos Playwright em 2 perfis Chromium |
| Providers | diretório estático com 93 entradas; presença não comprova integração |

## Rotas e escopo

Existem rotas para Home, Descoberta, Radar, Detalhes, Biblioteca, Diário, Guia, Lançamentos, Perfil, Configurações, autenticação, oito páginas de categoria, Cofre, Fontes, Provedores, Leitor, Player e Insights.

Lacunas/contradições:

- Novels aparece na Home e no tipo de provedores, mas não possui `/novels`, detalhes ou leitor por capítulo.
- `/personal-media` e a interface do Companion contradizem a decisão de não usar arquivos/servidores locais como base.
- Player, Settings e protocolo ainda dependem ou anunciam Companion/debrid.
- Não existe TV; isso está correto para o escopo aprovado e não é uma lacuna.
- Jogos ainda contêm caminhos de descoberta/launcher além do modelo manual aprovado.

## Baseline executado nesta branch

| Gate | Resultado | Evidência resumida |
|---|---|---|
| `npm ci` | `VERIFIED` com avisos | Primeira tentativa: `EPERM` em DLL carregada por dois previews antigos desta raiz. Somente PIDs 48236 e 40784 foram encerrados; segunda tentativa instalou 861 pacotes |
| `npm run typecheck` | `VERIFIED` | exit 0, 22,7 s |
| `npm run lint` | `PARTIAL` | exit 0, 22,6 s; script apenas repete `tsc --noEmit`, sem linter |
| `npm test` | `PARTIAL` | execução completa: 14/16 arquivos e 40/42 testes; Companion e UI smoke falharam por timeout/carregamento; ambos passaram isoladamente |
| teste Companion isolado | `VERIFIED` no cenário isolado | 1/1, 2,48 s; não elimina flakiness da suíte completa |
| UI smoke isolado | `VERIFIED` no cenário isolado | 1/1, 3,88 s; não elimina flakiness da suíte completa |
| `npm run build` | `VERIFIED` com avisos | exit 0, 2.889 módulos, 65 entradas PWA, 2.594,53 KiB de precache |
| `npm run test:e2e` | `PARTIAL` | 11 pass, 1 skip em Desktop Chrome e Pixel 7; apenas smoke existente |
| `npm audit --json` | `BLOCKED` | 4 vulnerabilidades high na cadeia WebTorrent; nenhuma critical |
| `npm audit signatures` | `VERIFIED` | 861 pacotes com assinatura de registro e 235 com attestations |
| busca de segredo do produto | `PARTIAL` | nenhuma correspondência suspeita fora de `.agents`; gitleaks, Semgrep e Trivy não instalados |
| captura visual | `VERIFIED` como baseline visual | Home, Providers e Personal Media em `output/playwright/category-removal/` |

## Bundle de produção

| Artefato | Tamanho aproximado | Observação |
|---|---:|---|
| `hls` | 523,16 KiB | acima do aviso padrão de 500 KiB |
| `vendor-graph` | 442,92 KiB | grande, carregamento precisa ser medido por rota |
| bundle principal | 371,10 KiB | ainda contém responsabilidades transversais |
| `vendor-cloud` | 213,11 KiB | Supabase/cloud |
| CSS | 208,34 KiB | `src/index.css` possui 2.916 linhas |
| `PersonalMedia` | 9,26 KiB | deve desaparecer com a remoção aprovada |
| `companion` | 2,87 KiB | cliente web; não inclui o servidor/pacote Node |

Não existe budget versionado, Lighthouse ou Web Vitals de dispositivo real.

## Dependências e segurança

As quatro vulnerabilidades high são uma única cadeia: `webtorrent` → `torrent-discovery` → `bittorrent-tracker` → `ip` (`GHSA-2p57-rm9w-gvfp`). O npm propõe `webtorrent@0.7.3`, downgrade major incompatível. Não foi aplicado. A solução alinhada ao produto é remover a engine local junto com o Companion e auditar novamente.

O npm também deixou scripts de instalação pendentes para sete pacotes. Parte deles pertence ao grafo WebTorrent. Nenhuma permissão ampla foi concedida apenas para fazer o baseline passar.

## PWA, CI e operação

- Há duas fontes de manifest (`vite.config.ts`/plugin e `public/manifest.json`).
- O service worker possui fallback amplo que pode devolver HTML a GETs não navegacionais.
- O manifest ainda precisa de `maskable`, idioma e evidências de install/update/offline.
- CI atual não comprova Firefox, WebKit, acessibilidade, regressão visual, scanners especializados ou ambientes remotos.
- Health endpoints existem, mas não formam ainda o painel de saúde de provedores exigido.

## Classificação global inicial

`ALPHA`. O build e o smoke E2E funcionam, mas a suíte completa não está verde, existem vulnerabilidades high, o Companion contraditório ainda está presente e fluxos críticos de autenticação, sincronização, providers, leitura e reprodução não possuem evidência real completa.
