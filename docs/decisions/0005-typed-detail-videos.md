# ADR 0005 — vídeos tipados e múltiplos nos detalhes

- Estado: aceito
- Data: 2026-07-20

## Contexto

A tela de detalhes aceitava um único `trailerUrl`. Isso descartava teasers,
trailers em outros idiomas, clipes e bastidores, além de impedir que o usuário
escolhesse entre Trailer Oficial 1/2 sem sair da página.

Nem toda categoria possui trailer. Livros, novels, mangás e quadrinhos não
devem receber um bloco fictício. Filmes, séries, doramas e animes podem receber
vídeos das fontes de metadados; jogos só receberão vídeo quando uma origem real
o declarar.

## Decisão

1. `MediaItem.videos` é uma coleção de `MediaVideo`, com chave segura do
   YouTube, nome, tipo, idioma, origem e indicador oficial.
2. A coleção diferencia trailer, teaser, clipe, bastidores, abertura,
   encerramento, gameplay e outros vídeos.
3. TMDB consulta vídeos em `pt-BR` e `en-US`, filtra apenas YouTube, remove
   duplicados e prioriza idioma português, conteúdo oficial e trailer/teaser.
4. Jikan normaliza somente `youtube_id` ou URLs de hosts YouTube reconhecidos.
5. A incorporação usa `youtube-nocookie.com`; URLs arbitrárias não entram no
   iframe.
6. O modal permanece na página e oferece seletor horizontal quando a origem
   fornece mais de um vídeo.
7. `trailerUrl` permanece temporariamente como compatibilidade, convertido
   somente se for uma URL YouTube válida.
8. O servidor usa `Referrer-Policy: strict-origin-when-cross-origin`, igual ao
   Netlify, para o player conseguir identificar a origem do embed.

## Consequências

- obras audiovisuais podem mostrar todos os vídeos reais disponíveis;
- categorias sem vídeo ficam sem o bloco, em vez de receber conteúdo genérico;
- TMDB continua dependente de chave gratuita no backend para prova real;
- Jikan/YouTube possui um cenário real exercitado;
- a tela de detalhes inteira continua `PARTIAL`: temporadas/episódios,
  relações, providers e layout específico por categoria exigem outras fatias.
