# Evidência — remoção do subsistema local

Data: 2026-07-20

Branch: `refactor/hubora-verified-platform`
ADR: `docs/decisions/0003-remove-companion-and-local-execution.md`

## Escopo executado

- removidos servidor Node, scripts Windows, ZIP público, cliente web e teste de processo;
- removidas as telas/ações de pareamento, cache, debrid, scan e launcher;
- `/personal-media` preservado apenas como redirecionamento para `/sources`, sem apagar dados legados;
- lojas de jogos mantidas como páginas externas; Playnite e launchers locais saíram do runtime;
- player passou a usar apenas a origem web validada;
- adapter de manifesto falha fechado para magnet, `infoHash` e `.torrent`;
- `webtorrent` e 160 pacotes foram removidos do grafo;
- documentação operacional contraditória foi substituída.

## TDD

### RED

`npx vitest run tests/legacy-surface-removal.test.ts tests/provider-protocol.test.ts`

- 2 arquivos falharam;
- 4 testes falharam e 4 passaram;
- falhas comprovaram servidor/pacote presentes, dependência WebTorrent, anúncios na UI/docs e aceitação de `.torrent`.

### GREEN

`npx vitest run tests/legacy-surface-removal.test.ts tests/provider-protocol.test.ts tests/provider-catalog.test.ts`

- 3 arquivos e 11 testes aprovados.

O teste antigo de providers exigia uma quantidade promocional mínima de 90. Ele foi corrigido para validar cobertura de todas as categorias, IDs únicos, ausência de launchers e ausência da capability `launch`.

## Instalação e supply chain

`npm ci --ignore-scripts`

- 701 pacotes instalados a partir do lockfile;
- scripts de dependências desativados;
- 0 vulnerabilidades durante a instalação.

O lockfile importado continha cinco campos `version` como `6.0.0`, embora URL, integridade e `package.json` dos tarballs fossem `5.0.0`: `whatwg-mimetype`, `escape-string-regexp`, `unist-util-position`, `w3c-xmlserializer` e `xml-name-validator`. Os campos foram corrigidos e uma nova instalação congelada comprovou a árvore.

| Gate | Resultado |
|---|---|
| `npm ls --all --depth=20` | árvore válida, sem pacote missing/invalid |
| `npm audit --json` | 0 info/low/moderate/high/critical |
| `npm audit signatures` | 701 assinaturas de registry e 202 attestations verificadas |
| SBOM | CycloneDX 1.5, 773 componentes e 774 relações |
| SHA-256 SBOM | `3a0fe3fbb9cf67155a7d60c2056660acf11064dda81008fb554536870d4910ef` |

## Qualidade e build

| Gate | Resultado |
|---|---|
| `npm test` | 17/17 arquivos, 45/45 testes, exit 0 |
| `npm run build` | typecheck + Vite, exit 0 |
| módulos transformados | 2.887 |
| PWA | 63 entradas, 2.557,95 KiB de precache |
| burn-in E2E | 65 pass, 5 skips esperados, cinco repetições em desktop Chromium + Pixel 7 |

O único tipo de skip é deliberado: o teste específico de celular é ignorado no projeto desktop e executado no perfil Android. Uma repetição inicial com 14 workers falhou por a Home ainda não ter atingido o marco visível em 5 segundos. O teste passou 10/10 isolado; a configuração foi limitada a 4 workers locais e 2 em CI, e a asserção agora aguarda a Home visível antes da navegação. O burn-in completo de cinco repetições aprovou 65 testes e produziu 5 skips esperados, sem retry. O build mantém o aviso preexistente do chunk HLS de 523,16 KiB.

A revisão final também encontrou aceitação herdada de HTTP em localhost/LAN. Dois testes falharam em RED; depois do ajuste, player e respostas de stream aceitam somente HTTPS, além do YouTube por ID permitido. A suíte final de 45 testes e o E2E padrão de 13 pass/1 skip foram executados após essa correção.

Comparado ao baseline, desapareceram os chunks `companion` e `PersonalMedia`; o CSS caiu de 208,34 para 204,79 KiB e o precache de 65 para 63 entradas.

## Inspeção visual

Preview validado em `http://127.0.0.1:43118`, depois encerrado. Nenhum listener permaneceu na porta.

| Artefato | SHA-256 | Observação |
|---|---|---|
| `docs/evidence/screenshots/companion-removal/providers-desktop-dark.png` | `23c934a36b733cf340a440fa2fcf8668e59916ee0b53ecd1bfb6c9b82a7d434c` | sem download/pareamento/cache; “mapeada não significa verificada” |
| `docs/evidence/screenshots/companion-removal/providers-pixel7-dark.png` | `2a757d4f0eaa72193c35ac2f4b77217c58db972ed34a64a7d432237647991b84` | sem overflow fatal; lista excessivamente longa permanece como débito de UX |
| `docs/evidence/screenshots/companion-removal/settings-desktop-dark.png` | `9ea4dccf2df10580fa0f5a2100a6a4f65102a7c7817c2f196015818d30ba8bd0` | nenhuma seção de debrid/serviço local |

## Classificação

- remoção do subsistema e da superfície pública: `VERIFIED` neste commit;
- Stremio Service/deep link: `NOT_STARTED` e separado desta fatia;
- player web geral: `PARTIAL`, pois formatos/erros reais ainda exigem matriz E2E;
- página técnica de providers: `PARTIAL`, pois a visualização atual com 86 cards é longa e health por capability ainda não existe;
- release global: continua `ALPHA`.
