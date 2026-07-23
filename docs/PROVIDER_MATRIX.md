# Matriz única de fontes e provedores

Gerada a partir de `src/data/providerCatalog.ts`. Total: **88 fontes**.

**Regra:** “Executável” significa que há um caminho de código. Ainda exige credencial quando aplicável e teste real após o deploy. “Página externa”, “Diretório” ou “pendente” não significa integração.

| ID | Fonte | Categorias | Modo | Autenticação | Estado técnico | Evidência |
| --- | --- | --- | --- | --- | --- | --- |
| jellyfin | Jellyfin | movies, series, anime, doramas | personal-server | server-token | Configurável e executável | src/services/personalMedia.ts |
| emby | Emby | movies, series, anime, doramas | personal-server | server-token | Servidor catalogado; conector pendente | src/data/providerCatalog.ts |
| plex | Plex Media Server | movies, series, anime, doramas | personal-server | account | Servidor catalogado; conector pendente | src/data/providerCatalog.ts |
| youtube | YouTube | movies, series, anime, doramas, books, novels, manga, comics, games | embedded-player | none | Executável condicionado | src/config/streamHosts.ts + player |
| peertube | PeerTube | movies, series, anime, games | embedded-player | none | Embed catalogado; integração pendente | src/data/providerCatalog.ts |
| internet-archive-video | Internet Archive Video | movies, series, anime, doramas | embedded-player | none | Executável condicionado | netlify/functions/free-catalog.mts |
| wikimedia-commons | Wikimedia Commons | movies, series, anime, books, comics | downloadable-file | none | Diretório de arquivo; adaptador pendente | src/data/providerCatalog.ts |
| libreflix | Libreflix | movies, series | external-page | none | Página externa catalogada | src/data/providerCatalog.ts |
| mercado-play | Mercado Play | movies, series | external-page | none | Página externa catalogada | src/data/providerCatalog.ts |
| pluto-tv | Pluto TV | movies, series, anime | external-page | none | Página externa catalogada | src/data/providerCatalog.ts |
| netmovies | NetMovies | movies, series | external-page | none | Página externa catalogada | src/data/providerCatalog.ts |
| itau-cultural-play | Itaú Cultural Play | movies, series | external-page | account | Página externa catalogada | src/data/providerCatalog.ts |
| sesc-digital | Sesc Digital | movies, series | external-page | none | Página externa catalogada | src/data/providerCatalog.ts |
| viki | Viki | doramas, series, movies | external-page | account | Página externa catalogada | src/data/providerCatalog.ts |
| kocowa | Kocowa | doramas, series | external-page | account | Página externa catalogada | src/data/providerCatalog.ts |
| iqiyi | iQIYI | doramas, series, movies, anime | external-page | account | Página externa catalogada | src/data/providerCatalog.ts |
| wetv | WeTV | doramas, series | external-page | account | Página externa catalogada | src/data/providerCatalog.ts |
| youku | Youku | doramas, series, movies | external-page | account | Página externa catalogada | src/data/providerCatalog.ts |
| crunchyroll | Crunchyroll | anime | external-page | account | Página externa catalogada | src/data/providerCatalog.ts |
| hidive | HIDIVE | anime | external-page | account | Página externa catalogada | src/data/providerCatalog.ts |
| retrocrush | RetroCrush | anime | external-page | account | Página externa catalogada | src/data/providerCatalog.ts |
| tmdb | TMDB | movies, series, anime, doramas | metadata | api-key | Executável | netlify/functions/tmdb.mts + src/services/api.ts |
| tvmaze | TVmaze | series, doramas | metadata | none | Executável | src/services/api.ts |
| trace-moe | trace.moe | anime | metadata | none | Executável | src/services/api.ts |
| imdb | IMDb | movies, series, anime, doramas, games | metadata | none | Metadados catalogados; adaptador pendente | src/data/providerCatalog.ts |
| tvdb | TheTVDB | series, anime, doramas | metadata | api-key | Metadados catalogados; adaptador pendente | src/data/providerCatalog.ts |
| omdb | OMDb | movies, series | metadata | api-key | Metadados catalogados; adaptador pendente | src/data/providerCatalog.ts |
| watchmode | Watchmode | movies, series, anime, doramas | metadata | api-key | Metadados catalogados; adaptador pendente | src/data/providerCatalog.ts |
| justwatch | JustWatch | movies, series, anime, doramas | metadata | none | Metadados catalogados; adaptador pendente | src/data/providerCatalog.ts |
| anilist | AniList | anime, manga | metadata | none | Executável | src/services/api.ts |
| jikan | Jikan / MyAnimeList | anime, manga | metadata | none | Executável | src/services/api.ts |
| kitsu | Kitsu | anime, manga | metadata | none | Metadados catalogados; adaptador pendente | src/data/providerCatalog.ts |
| anidb | AniDB | anime | metadata | account | Metadados catalogados; adaptador pendente | src/data/providerCatalog.ts |
| wikidata | Wikidata | movies, series, anime, doramas, books, novels, manga, comics, games | metadata | none | Metadados catalogados; adaptador pendente | src/data/providerCatalog.ts |
| stremio-protocol | Manifesto compatível com Stremio | movies, series, anime | manifest | manifest-url | Configurável por manifesto | src/services/providerProtocol.ts |
| custom-provider | Manifesto Hubora | movies, series, anime, doramas, books, novels, manga, comics, games | manifest | manifest-url | Configurável por manifesto | src/services/providerProtocol.ts |
| biblioteca-mundial | Biblioteca Mundial | books | external-page | none | Página externa catalogada | src/data/providerCatalog.ts |
| project-gutenberg | Project Gutenberg | books | downloadable-file | none | Executável | src/services/providerProtocol.ts |
| standard-ebooks | Standard Ebooks | books | external-page | none | Página externa catalogada | src/data/providerCatalog.ts |
| dominio-publico | Portal Domínio Público | books | downloadable-file | none | Diretório de arquivo; adaptador pendente | src/data/providerCatalog.ts |
| bndigital | BNDigital | books, comics | external-page | none | Página externa catalogada | src/data/providerCatalog.ts |
| wikisource | Wikisource | books | embedded-player | none | Embed catalogado; integração pendente | src/data/providerCatalog.ts |
| scielo-livros | SciELO Livros | books | external-page | none | Página externa catalogada | src/data/providerCatalog.ts |
| doab | DOAB | books | external-page | none | Página externa catalogada | src/data/providerCatalog.ts |
| open-library | Open Library | books, novels | embedded-player | account | Executável | src/services/api.ts + free-catalog.mts |
| google-books | Google Books | books, novels, comics | embedded-player | api-key | Executável condicionado | netlify/functions/books.mts + Reader |
| internet-archive-books | Internet Archive BookReader | books, comics | embedded-player | account | Executável condicionado | netlify/functions/free-catalog.mts + Reader |
| mec-livros | MEC Livros | books | external-page | none | Página externa catalogada | src/data/providerCatalog.ts |
| biblion | BibliON | books, comics | external-page | account | Página externa catalogada | src/data/providerCatalog.ts |
| kavita | Kavita | books, novels, manga, comics | personal-server | server-token | Configurável e executável | src/services/personalMedia.ts |
| calibre-web | Calibre-Web | books, novels, comics | personal-server | server-token | Configurável via OPDS | src/services/personalMedia.ts |
| kindle | Kindle | books, novels, comics | external-page | account | Página externa catalogada | src/data/providerCatalog.ts |
| kobo | Kobo | books | external-page | account | Página externa catalogada | src/data/providerCatalog.ts |
| storytel | Storytel | books | external-page | account | Página externa catalogada | src/data/providerCatalog.ts |
| royal-road | Royal Road | novels | external-page | account | Página externa catalogada | src/data/providerCatalog.ts |
| wattpad | Wattpad | novels | external-page | account | Página externa catalogada | src/data/providerCatalog.ts |
| webnovel | WebNovel | novels | external-page | account | Página externa catalogada | src/data/providerCatalog.ts |
| scribble-hub | Scribble Hub | novels | external-page | account | Página externa catalogada | src/data/providerCatalog.ts |
| tapas-novels | Tapas Novels | novels, comics, manga | external-page | account | Página externa catalogada | src/data/providerCatalog.ts |
| inkitt | Inkitt | novels | external-page | account | Página externa catalogada | src/data/providerCatalog.ts |
| ao3 | Archive of Our Own | novels | downloadable-file | account | Diretório de arquivo; adaptador pendente | src/data/providerCatalog.ts |
| fanfiction-net | FanFiction.net | novels | external-page | account | Página externa catalogada | src/data/providerCatalog.ts |
| komga | Komga | manga, comics | personal-server | server-token | Configurável e executável | src/services/personalMedia.ts |
| suwayomi | Suwayomi Server | manga, comics | personal-server | server-token | Servidor catalogado; conector pendente | src/data/providerCatalog.ts |
| manga-plus | MANGA Plus | manga | external-page | account | Página externa catalogada | src/data/providerCatalog.ts |
| webtoon | WEBTOON | manga, comics | external-page | account | Página externa catalogada | src/data/providerCatalog.ts |
| globalcomix | GlobalComix | manga, comics | external-page | account | Página externa catalogada | src/data/providerCatalog.ts |
| comikey | Comikey | manga | external-page | account | Página externa catalogada | src/data/providerCatalog.ts |
| inkr | INKR | manga, comics | external-page | account | Página externa catalogada | src/data/providerCatalog.ts |
| manga-up | Manga UP! | manga | external-page | account | Página externa catalogada | src/data/providerCatalog.ts |
| mangadex | MangaDex | manga | external-page | account | Executável | src/services/mangaService.ts + Reader |
| digital-comic-museum | Digital Comic Museum | comics | downloadable-file | account | Diretório de arquivo; adaptador pendente | src/data/providerCatalog.ts |
| comic-book-plus | Comic Book Plus | comics | downloadable-file | account | Diretório de arquivo; adaptador pendente | src/data/providerCatalog.ts |
| marvel-unlimited | Marvel Unlimited | comics | external-page | account | Página externa catalogada | src/data/providerCatalog.ts |
| dc-universe-infinite | DC Universe Infinite | comics | external-page | account | Página externa catalogada | src/data/providerCatalog.ts |
| dark-horse-digital | Dark Horse Digital | comics | external-page | account | Página externa catalogada | src/data/providerCatalog.ts |
| igdb | IGDB | games | metadata | api-key | Executável | netlify/functions/_shared/games.ts |
| steam | Steam | games | external-page | account | Executável externo | netlify/functions/_shared/games.ts |
| epic-games | Epic Games Store | games | external-page | account | Página externa catalogada | src/data/providerCatalog.ts |
| gog | GOG | games | external-page | account | Página externa catalogada | src/data/providerCatalog.ts |
| xbox | Xbox / Microsoft Store | games | external-page | account | Página externa catalogada | src/data/providerCatalog.ts |
| playstation | PlayStation Store | games | external-page | account | Página externa catalogada | src/data/providerCatalog.ts |
| nintendo | Nintendo eShop | games | external-page | account | Página externa catalogada | src/data/providerCatalog.ts |
| itch-io | itch.io | games | external-page | account | Página externa catalogada | src/data/providerCatalog.ts |
| game-jolt | Game Jolt | games | external-page | account | Página externa catalogada | src/data/providerCatalog.ts |
| free-to-game | FreeToGame | games | metadata | none | Executável externo | netlify/functions/_shared/games.ts |
| rawg | RAWG | games | metadata | api-key | Executável opcional | netlify/functions/_shared/games.ts |
| cheapshark | CheapShark | games | metadata | none | Executável externo | netlify/functions/_shared/games.ts |

## Critério para promoção de estado

Uma fonte só deve passar de diretório/página externa para executável após possuir adaptador isolado, identidade, busca ou resolução, acesso real autorizado, tratamento de erro, saúde, teste de contrato, teste E2E e evidência reproduzível.
