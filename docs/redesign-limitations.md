# Limitações e Considerações de Ambiente — Hubora 9.0.0

> Documentação transparente de dependências externas, limites de taxa de APIs e premissas de execução.

---

## 1. Dependências de APIs de Terceiros e Limites de Taxa (Rate Limits)

1. **TMDB (The Movie Database)**:
   - Utilizado para metadados de filmes, séries, atores, trailers e imagens.
   - Resiliência: fallback automático para TVMaze em séries quando TMDB não estiver disponível ou configurado.
2. **AniList & Jikan (MyAnimeList API)**:
   - Utilizado para animes e mangás.
   - Resiliência: Jikan aplica limitação de requisições de 3 req/seg. O Hubora possui fallback automático para AniList e cache local IDB de 24h.
3. **Google Books & Open Library**:
   - Utilizado para acervo de livros e novels.
   - Resiliência: fallback bidirecional instantâneo entre Google Books API e Open Library REST.
4. **IGDB & RAWG**:
   - Utilizado para catálogo de jogos e lojas.

---

## 2. Servidores Domésticos & Mídia Pessoal

- **Jellyfin / Plex / Emby**:
  - Requer que o servidor pessoal esteja ativo e acessível na rede local/remota do usuário.
  - O Hubora armazena as credenciais de conexão exclusivamente no IndexedDB local do navegador (Zero-Token Policy).

---

## 3. Segurança e Zero-Token Policy

- Nenhuma chave de API de produção nem credencial de usuário é commitada no código-fonte.
- O cofre privado (`/vault`) utiliza criptografia e derivação forte de chave via PBKDF2 diretamente no navegador.
