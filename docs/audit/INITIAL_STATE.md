# Hubora 9.0.0 — Estado inicial auditado

Data do levantamento: 2026-07-20  
Branch de trabalho: `refactor/hubora-real-platform`  
Baseline preservado: commit `0ecfd1d9dfb73585bb03a5e3ac9398dfac6de544`  
Tag: `hubora-9.0.0-pre-refactor`

Este documento registra evidências observadas. Ele não certifica prontidão para produção nem substitui os gates definidos em `FEATURE_EVIDENCE_MATRIX.md`.

## Ambiente observado

- Windows 10, build 26100.
- Node.js 26.4.0.
- npm 11.17.0.
- Git 2.54.0.
- Instalação limpa controlada por `package-lock.json`.
- `.env.local` existe, não foi lido nem versionado. Apenas os nomes das variáveis foram inventariados.

## Stack e topologia atuais

- Frontend: React 19, React Router 7, Vite 7, TypeScript 6 e Tailwind CSS 4.
- Estado: Zustand, TanStack Query e persistência local em IndexedDB/Dexie.
- Backend local: Express 5 em `server.ts`.
- Backend hospedado: Netlify Functions em `netlify/functions`.
- Nuvem opcional: Supabase, com três migrations existentes.
- PWA: `vite-plugin-pwa`, Workbox e service worker próprio em `src/sw.ts`.
- Testes: Vitest e Playwright.
- Companion atual: servidor Node/PowerShell em `companion/`; não é Tauri e depende de Node instalado.

## Inventário aproximado

| Área | Quantidade observada | Observação |
|---|---:|---|
| Arquivos no baseline Git | 517 | Inclui skills locais e documentação |
| `src/` | 115 arquivos | Aproximadamente 852 KiB |
| Companion | 4 arquivos-fonte | Há também pacote em `public/` |
| Netlify Functions | 8 | APIs e proxies específicos |
| Migrations Supabase | 3 | Auditoria de RLS ainda não constitui prova em ambiente remoto |
| Testes encontrados | 18 arquivos | 16 suites Vitest no baseline e 2 áreas E2E/configuração |

## Rotas encontradas

Há rotas para home, descoberta, radar, detalhes, biblioteca, diário, guia, lançamentos, perfil, configurações, autenticação, filmes, séries, anime, mangá, quadrinhos, livros, jogos, doramas, privacidade, termos, wrapped, metas, conexões, mídia pessoal, cofre, fontes, provedores, leitor, player e insights.

Lacunas de navegação observadas:

- Novels não possui uma rota de domínio própria; usa filtro do diretório de provedores.
- Não há rota ou shell de TV/controle remoto.
- Várias telas obrigatórias do pedido ainda não têm fluxo E2E real.

## Baseline executado

| Gate | Resultado | Evidência resumida |
|---|---|---|
| `npm ci` | PASS com avisos | Primeira tentativa falhou por lock de processo local; após parar somente a árvore do dev server deste workspace, instalou 861 pacotes e auditou 862 |
| `npm run typecheck` | PASS no baseline | 24,1 s |
| `npm test` | WARN | Primeira execução: 38/39, falha do Companion; teste isolado passou; segunda execução: 39/39. A intermitência continua aberta |
| `npm run build` | PASS com avisos | 2.889 módulos, PWA com 65 entradas e 2.597,10 KiB de precache; chunks acima de 500 KiB |
| `npm run test:e2e` | PASS parcial | 11 executados, 1 ignorado, somente Chromium desktop e Pixel 7; smoke test, não prova fluxos críticos |
| `npm audit --json` | BLOCKED | 4 vulnerabilidades `high`, todas na cadeia de `webtorrent`; correção sugerida implica downgrade major incompatível |
| gitleaks/Trivy/Semgrep/Syft | NOT_RUN | Binários não estavam disponíveis; nenhum pacote aleatório foi instalado para mascarar a ausência |

## Bundle observado no baseline

| Artefato | Tamanho | gzip |
|---|---:|---:|
| `hls` | 523,16 KiB | 162,15 KiB |
| `vendor-graph` | 442,92 KiB | 141,93 KiB |
| bundle principal | 371,11 KiB | 117,08 KiB |
| `vendor-cloud` | 213,11 KiB | 55,71 KiB |
| CSS | 208,27 KiB | 31,31 KiB |

Não há orçamento de performance versionado nem evidência de Lighthouse/Web Vitals em dispositivo real.

## PWA e offline

- O manifest é configurado no Vite e também existe um `public/manifest.json`, criando duas fontes de verdade.
- O manifest observado não apresenta `maskable`, screenshots de instalação ou idioma.
- O service worker usa o cache versionado manualmente como `hubora-precache-v7`.
- Requisições GET same-origin são cacheadas de forma ampla.
- A resposta offline usa `/index.html` inclusive para requisições que não sejam navegação, o que pode devolver HTML onde JSON/arquivo era esperado.
- O share target confia no prefixo MIME de imagem sem validar magic bytes.

## CI/CD

- GitHub Actions executa install, typecheck, testes, build e E2E Chromium.
- Actions usam tags mutáveis como `actions/checkout@v4` e `actions/setup-node@v4`, não SHAs imutáveis.
- Não há Firefox, WebKit, tablet/TV, acessibilidade automatizada, regressão visual, SBOM ou secret scan no pipeline atual.

## Evidência que não deve ser superinterpretada

- Uma rota renderizar não prova integração real.
- Um teste mockado não prova um provedor externo.
- O build produzir PWA não prova instalação/offline/upgrade.
- O smoke E2E não prova login, sincronização, reprodução, leitura, Companion, restore, conflito ou segurança.
- A documentação existente contém afirmações mais fortes que a evidência observada.

## Primeira fatia em andamento

A categoria de áudio narrado fora do escopo foi removida do contrato público, catálogo, UI, integração dedicada, protocolo, testes de smoke e documentação operacional. Os identificadores históricos permanecem somente em testes negativos de regressão. Possíveis registros antigos no IndexedDB não são retornados à UI, mas ainda não foram apagados: exclusão silenciosa seria destrutiva e requer uma migração explicitamente revisada.
