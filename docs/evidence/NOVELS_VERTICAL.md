# Evidência — Novels como domínio próprio

Data: 2026-07-20

Branch: `refactor/hubora-verified-platform`

ADR: `docs/decisions/0004-novels-as-first-class-domain.md`

## Escopo comprovado nesta fatia

- rota e tela `/novels` próprias;
- tipo `novel` preservado em descoberta, detalhes, biblioteca, progresso,
  recomendações, notificações, lançamentos, backup e restauração;
- navegação desktop, menu de categorias, Home e busca global atualizados;
- Google Books encapsulado em Function/servidor com chave somente no backend;
- fallback real pela Open Library;
- detalhes Open Library consultam edição e disponibilidade antes de rotular o
  acesso do Internet Archive;
- leitor HTTPS interno para a prévia incorporável declarada pela origem;
- estados de imagem ausente/falha distintos do skeleton de carregamento;
- bloco global vazio de trilha sonora removido dos detalhes.

## Desenvolvimento dirigido por testes

### RED inicial

`tests/novels-domain.test.ts` e `tests/provider-protocol.test.ts` começaram com
5 falhas e 4 aprovações. As falhas demonstraram ausência de rota/página/API,
reclassificação como livro e rejeição de `novel` no backup.

Depois, testes separados falharam antes da Function Google Books existir, antes
de uma edição com `ocaid` produzir acesso e antes de o leitor rejeitar HTTP
local/LAN. Um teste adicional falhou porque uma edição restrita estava sendo
rotulada incorretamente como leitura gratuita. A revisão final ainda produziu
um RED para comprovar que a página 2 do fallback repetia a página 1; o offset
Open Library passou a acompanhar a paginação solicitada.

### GREEN final

| Gate | Resultado |
|---|---|
| `npm run typecheck` | aprovado |
| `npm test` | 18/18 arquivos, 54/54 testes, exit 0 |
| `npm run build` | aprovado; 2.888 módulos transformados |
| PWA build | 64 entradas, 2.564,66 KiB de precache |
| `npm run test:e2e` | 13 aprovados, 1 skip deliberado, exit 0 |

O aviso conhecido do chunk HLS permanece: 523,16 KiB. O skip E2E continua
sendo o cenário específico de celular ignorado no projeto desktop e executado
no perfil Pixel 7.

## Prova com fontes reais

### Google Books

A chamada anônima real respondeu `429 RESOURCE_EXHAUSTED`, com quota diária zero
para o projeto associado ao ambiente. Isso não foi mascarado como sucesso. A
Function está pronta para `GOOGLE_BOOKS_API_KEY`, sem expor a chave, e a UI usa
Open Library quando a chamada falha. A documentação oficial descreve os
endpoints de volumes e a autenticação por chave/OAuth:

- <https://developers.google.com/books/docs/v1/using>
- <https://developers.google.com/books/docs/v1/reference/volumes/list>

### Open Library e Internet Archive

- busca real `light novel`: 4.231 resultados informados pela origem no momento
  da validação;
- busca por assunto encontrou `/works/OL19661341W`,
  `蜘蛛ですが、なにか? (light novel)`;
- a edição `/books/OL26946014M` declarou
  `ocaid=soimspidersowhat0012baba`;
- a API Books declarou `availability=restricted`;
- o Hubora exibiu **Ver prévia no Internet Archive**, sem selo “gratuito”;
- o clique abriu `/reader` com iframe HTTPS;
- o BookReader real carregou o título, metadados e indicador `0/261`.

A prévia é restrita; esta evidência não afirma leitura integral. O script
externo `ia-sentry.min.js` do Internet Archive gerou `Cannot convert undefined
or null to object` no Chromium headless. O shell e os dados do Hubora não
geraram erro, e o BookReader continuou renderizando; o erro externo permanece
registrado como limitação da incorporação.

Documentação pública usada:

- <https://openlibrary.org/developers/api>
- <https://openlibrary.org/dev/docs/api/search>

O runtime foi exercitado em `http://127.0.0.1:43119`, `/api/health` respondeu
200 e a porta foi liberada após a captura.

## Evidência visual

| Artefato | SHA-256 | Observação |
|---|---|---|
| `docs/evidence/screenshots/novels/novels-desktop-dark.png` | `af0bb7da7b88e82984bea55bbfae218c4c3a01064bbd372015e0616ff1b2484c` | catálogo real, busca/filtros e estado de capa ausente |
| `docs/evidence/screenshots/novels/novels-pixel7-dark.png` | `308efa40239e6794eb1b958fd7f87b2a057e4e2273c661d55ab6a0b00ad23fb8` | grade móvel e navegação Pixel 7 |
| `docs/evidence/screenshots/novels/novel-details-desktop-dark.png` | `1ba03eb700d537c688d6a06a49308b2f0abe1ff73f4bafa52801174979814399` | detalhe real e rótulo honesto de prévia restrita |
| `docs/evidence/screenshots/novels/novel-reader-desktop-dark.png` | `27c73a3d04c80dd147b12c5e051ee9bcc10468a2e3b479d459a9eec4112ef9fc` | BookReader real incorporado |

## Classificação honesta

`NOVEL-001`: `PARTIAL`.

A fundação vertical e o caso real Open Library/Internet Archive estão
comprovados. Ainda não é `VERIFIED` porque chave Google/Netlify, todos os
providers, leitura completa, autenticação/sync, tema claro, outros browsers e
acessibilidade ainda não possuem evidência integral. O Hubora global permanece
`ALPHA`.
