# Recursos e limites — Hubora 9.0.0

Os estados canônicos são `NOT_STARTED`, `IMPLEMENTING`, `PARTIAL`, `BLOCKED` e
`VERIFIED`. Este resumo não substitui a matriz de evidências.

## Evidência parcial existente

- Home, nove entradas, quatro intenções e navegação responsiva em smoke Chromium.
- Busca, detalhes, biblioteca, progresso, backup e sync com implementações
  parciais e cobertura predominantemente local/mockada.
- Novels possui rota própria, catálogo Open Library real, detalhes e prévia
  restrita do Internet Archive comprovada; Google Books aguarda chave gratuita
  no backend e a categoria permanece `PARTIAL`.
- Player HTTPS/HLS/YouTube e leitores existentes, ainda sem matriz E2E real de
  formatos.
- Diretório de fontes por categoria/modo/requisito; entrada mapeada não significa
  integração.
- Manifestos Hubora/Stremio analisados por código e testes mockados.
- PWA gerada no build, sem prova completa de instalação/offline/upgrade.

## Depende de configuração e prova externa

- Supabase Auth, RLS, sincronização e isolamento entre usuários.
- OAuth Google/GitHub e e-mail.
- Netlify Functions no domínio final.
- Chaves gratuitas de TMDB/IGDB/Google Books/RAWG quando necessárias.
- CORS, login, território e disponibilidade de cada origem.
- Servidor pessoal opcional configurado pelo próprio usuário.

## Limites deliberados

- Sem scan de pastas, jogos ou programas; estados de jogos são manuais.
- Sem execução de arquivo/protocolo local pela aplicação web.
- Sem engine torrent local ou armazenamento de tokens de debrid.
- Magnet, `infoHash`, `.torrent` e `notWebReady` exigem adapter explícito ou
  abertura em aplicativo compatível; não são vídeo web.
- Sem categoria independente para música, podcast, cursos, esportes, shows,
  programas de TV, documentários ou conteúdo genérico do YouTube.
- Sem modo TV.
- Metadados, homepage acessível e mocks não comprovam reprodução/leitura.
- Um iframe ou `ocaid` não comprova leitura integral: a disponibilidade pode ser
  prévia, empréstimo, restrita ou aberta e deve ser rotulada conforme a origem.
