# Evidência de validação — 2026-07-20

## Ambiente

- Windows 10 build 26100
- Node.js 26.4.0
- npm 11.17.0

## Preservação

- Commit baseline: `0ecfd1d9dfb73585bb03a5e3ac9398dfac6de544`
- Tag anotada: `hubora-9.0.0-pre-refactor`
- Branch atual: `refactor/hubora-verified-platform`
- Checkpoint: `b11100f`, tag `hubora-9.0.0-pre-verified-platform`
- `.env.local` não foi versionado ou exibido.

## Instalação

Comando: `npm ci`

- Primeira tentativa: falhou com `EPERM` em `lightningcss` por árvore de processo do dev server deste workspace.
- Após encerrar somente os PIDs associados ao workspace: PASS.
- 861 pacotes instalados; 862 auditados no relato do install.
- npm indicou scripts de instalação de sete pacotes que ainda precisam de política explícita de allow-scripts.

## Revalidação antes da fase da plataforma verificada

- `npm run typecheck`: PASS, exit 0, 22,7 s.
- `npm run lint`: PASS técnico, exit 0, 22,6 s; o script é apenas `tsc --noEmit` e não constitui lint independente.
- suite Vitest completa: PARTIAL, 14/16 arquivos e 40/42 testes.
- falhas: timeout do Companion e UI smoke preso no fallback de carregamento.
- Companion isolado: PASS, 1/1, 2,48 s.
- UI smoke isolado: PASS, 1/1, 3,88 s.
- interpretação: concorrência/estado compartilhado intermitente continua aberta; o resultado completo mais recente não está verde.
- `npm run build`: PASS, exit 0, 42,1 s.
- `npm run test:e2e`: PASS parcial, 11 pass e 1 skip em 7,5 s.

## Testes da fatia de escopo

### RED

`npx vitest run tests/provider-catalog.test.ts tests/provider-protocol.test.ts`

- 2 testes novos falharam como esperado no comportamento anterior.

### GREEN e regressão

`npm test -- --run`

- PASS: 16 arquivos, 42 testes após a auto-revisão adicionar cobertura de registro legado.

`npm run build`

- PASS: typecheck e build Vite.
- WARN: chunk HLS 523,16 KiB; precache PWA 65 entradas / 2.594,39 KiB.

`npm run test:e2e`

- PASS parcial: 11 executados.
- WARN: 1 teste ignorado.
- Projetos: desktop Chromium e Android/Pixel 7 Chromium. Esse smoke não valida autenticação, sync, providers reais, player ou leitores.

## Inspeção visual

Preview confirmado como Hubora em `http://127.0.0.1:43117` e encerrado após a captura.

| Artefato | SHA-256 |
|---|---|
| `output/playwright/category-removal/home.png` | `9d577370287e3847bd899eb1a0c81623b148e39a91561591e905df790e104f20` |
| `output/playwright/category-removal/providers.png` | `0f6c37e847847bcaad9ac4c8b76e60cb81800d8bedcf340fb476cf6b7f616dff` |
| `output/playwright/category-removal/personal-media.png` | `5039f29337946b0a777e12d245ab40cf33716cde9710f219b7287cfb2d86c052` |

A tentativa anterior na porta 4173 foi invalidada após inspeção porque outro servidor respondeu. Os artefatos inválidos foram sobrescritos; não são usados como evidência.

## Dependências e supply chain

`npm audit --json`:

- 0 critical;
- 4 high;
- cadeia: `webtorrent` → `torrent-discovery` → `bittorrent-tracker` → `ip`;
- advisory central: GHSA-2p57-rm9w-gvfp;
- a correção automática propõe `webtorrent@0.7.3`, downgrade major incompatível; não aplicada.

`npm audit signatures`:

- PASS: 861 pacotes com assinatura de registry verificada.
- 235 pacotes com attestations verificadas.
- Isso não elimina advisories nem prova segurança do comportamento.

SBOM:

- Formato: CycloneDX 1.5.
- 857 componentes e 858 relações de dependência.
- Arquivo: `docs/evidence/sbom.cdx.json`.
- SHA-256: `6f395d750e1a72e068b5f2918bd54493c5c355fd00cc5f36302c16bfe4e6fef5`.

Scanners externos:

- gitleaks: não disponível.
- Trivy: não disponível.
- Semgrep: não disponível.
- Syft: não disponível.
- Nenhuma ferramenta foi instalada sem auditoria somente para obter um resultado verde.

Busca heurística local:

- padrões suspeitos foram pesquisados em arquivos rastreados sem imprimir valores;
- correspondências ocorreram apenas nas skills de referência;
- excluindo `.agents`, não houve correspondência suspeita no código do produto;
- classificação continua `PARTIAL` por não substituir um scanner especializado.
