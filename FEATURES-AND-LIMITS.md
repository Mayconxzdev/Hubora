# Recursos e limites — Hubora 9.0 Personal

## Recursos implementados

- Dez categorias visíveis e quatro intenções na Home; uma escolha principal reduz indecisão.
- Busca, detalhes, biblioteca, listas, favoritos, progresso, diário, backup, restauração e sincronização privada.
- 96 fontes classificadas por categoria, modo, autenticação, custo e capacidade real.
- IDs externos cruzados; busca em fontes conectadas a partir da obra.
- Manifesto Hubora universal e adaptador do protocolo Stremio para catálogos/URLs autorizados.
- Player para vídeo direto, HLS, áudio, YouTube e embeds permitidos; leitor de Google Books, EPUB, PDF e HTML.
- Companion Windows com 25 GB, streaming/cache progressivo, progresso, HLS, limpeza em dez minutos e launchers.
- Jellyfin, Emby, Plex, Kavita, Komga, Audiobookshelf, Calibre-Web, Suwayomi e OPDS no diretório/conectores.
- Catálogos PT-BR: TMDB/TVmaze, AniList/Jikan, Google Books/Open Library/Gutenberg/Internet Archive e IGDB/Steam/CheapShark.
- PWA desktop/Android, tema preto/branco e uso do Companion na rede local após pareamento.

## O que depende de configuração

- Login/sync: Supabase, migrations, allowlist e OAuth.
- Filmes/séries: TMDB nas Netlify Functions.
- Jogos: IGDB client ID/secret nas Functions.
- Servidor pessoal: URL, token, CORS e mídia do proprietário.
- Companion no Android: rede privada, endereço IP do PC e permissão de rede local/firewall.
- Manifesto: servidor HTTPS ou local que implemente o contrato documentado.

## Limites deliberados

- Metadados não são reprodução. O TMDB/IMDb/IGDB identifica obras, mas não concede o arquivo comercial.
- Uma página externa sem API incorporável continua externa; o Hubora não finge que existe um player interno.
- DRM, paywall, CORS e restrições territoriais da origem permanecem válidos.
- Torrent, magnet, scraping de streaming comercial e add-ons piratas são recusados.
- Fontes comunitárias mutáveis não são hardcoded; uma origem autorizada pode entrar por manifesto e teste de saúde.
- O cache do Companion é temporário, não uma biblioteca permanente nem mecanismo de cópia.
