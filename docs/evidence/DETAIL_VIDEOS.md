# Evidência — vídeos reais nos detalhes

Data: 2026-07-20

Branch: `refactor/hubora-verified-platform`

ADR: `docs/decisions/0005-typed-detail-videos.md`

## Implementação

- coleção tipada de vídeos no domínio;
- normalização TMDB/Jikan e compatibilidade YouTube segura;
- trailers e teasers múltiplos no mesmo modal;
- preferência por português e itens oficiais;
- deduplicação por chave do vídeo;
- URLs/hosts arbitrários rejeitados;
- modal responsivo sem sair da página;
- política de referer do servidor alinhada ao Netlify.

## TDD e gates

### RED

O primeiro teste não encontrou `mediaVideos.ts`. Depois da implementação, dois
testes falharam: a deduplicação mantinha o último item menos qualificado e o
matcher usado não fazia parte da configuração Chai. O algoritmo passou a
preservar o primeiro item já ordenado, e o teste do iframe passou a consultar o
atributo DOM diretamente.

| Gate | Resultado |
|---|---|
| `npm run typecheck` | aprovado |
| `npm test` | 19/19 arquivos, 58/58 testes, exit 0 |
| `npm run build` | aprovado; 2.889 módulos transformados |
| PWA build | 64 entradas, 2.568,63 KiB de precache |
| `npm run test:e2e` | 13 aprovados, 1 skip deliberado, exit 0 |

O aviso preexistente do chunk HLS de 523,16 KiB permanece.

## Fluxo real Jikan → YouTube

O endpoint público do Jikan para `mal_id=5114` respondeu com **Fullmetal
Alchemist: Brotherhood** e o embed
`youtube-nocookie.com/embed/1ac3_YdSSy0`. No runtime do Hubora:

1. `/details/mal-anime-5114` carregou título e metadados reais;
2. o botão Trailer abriu o modal sem navegar para outra página;
3. o iframe usou somente a chave normalizada;
4. a primeira tentativa exibiu erro 153 do YouTube;
5. a inspeção encontrou `Referrer-Policy: no-referrer` herdado do Helmet;
6. após alinhar para `strict-origin-when-cross-origin`, o frame carregou o
   canal `アニプレックス チャンネル` e reproduziu o vídeo sem erro de página;
7. o mesmo fluxo foi capturado em desktop e Pixel 7, com overflow horizontal 0.

O runtime usou `http://127.0.0.1:43120`; `/api/health` respondeu 200 e informou
a política de referer correta. A porta foi liberada depois da validação.

## TMDB

O código suporta a lista real de vídeos de filmes e séries/doramas em português
e inglês. A documentação oficial confirma endpoints próprios de vídeos para
filmes e TV:

- <https://developer.themoviedb.org/reference/movie-videos>
- <https://developer.themoviedb.org/reference/tv-series-videos>

Não houve chamada TMDB real porque nenhuma chave foi configurada neste
ambiente. Portanto, múltiplos trailers TMDB possuem contrato e testes, mas
continuam `BLOCKED` para evidência externa até a configuração gratuita.

Jikan foi consultado conforme sua documentação pública:

- <https://docs.api.jikan.moe/#tag/anime/operation/getAnimeFullById>

## Evidência visual

| Artefato | SHA-256 | Observação |
|---|---|---|
| `docs/evidence/screenshots/details-videos/anime-trailer-desktop-dark.png` | `5ddda9d8cf24dc6ae66887c845db8363d3b44514c914c3b43994f2862b37a2b5` | vídeo real reproduzindo no modal desktop |
| `docs/evidence/screenshots/details-videos/anime-trailer-pixel7-dark.png` | `f87d32163cfa694f7c61d82ec491ea8dfc45881d9d12c88de893d37db2d60096` | modal e reprodução real no Pixel 7 |

## Classificação

`DETAIL-VIDEO-001`: `PARTIAL`.

Anime/Jikan possui um fluxo real aprovado. A coleção múltipla e TMDB dependem
de chave/ambiente e de uma obra real com vários vídeos. Livros, novels, mangás
e quadrinhos deliberadamente não exibem trailer sem fonte. A prontidão global
do Hubora continua `ALPHA`.
