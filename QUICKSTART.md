# Quickstart — Hubora Personal

## Explorar localmente

```powershell
Copy-Item .env.example .env.local
npm ci
npm run dev
```

Abra `http://localhost:5173`. Sem Supabase, a biblioteca continua local e você pode navegar por toda a interface; não há sincronização entre aparelhos nesse modo.

## Ativar sua conta e sincronização

1. Execute as três migrações SQL indicadas no README.
2. Adicione somente seu e-mail em `private.allowed_emails`.
3. Ative Google Login ou e-mail/senha no Supabase.
4. Preencha em `.env.local` `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_REQUIRE_AUTH=true`, `VITE_ALLOW_PUBLIC_SIGNUP=false`, `VITE_ALLOWED_EMAILS` e `VITE_ENFORCE_SERVER_ALLOWLIST=true`.
5. Entre no PC, adicione algo à biblioteca, depois abra o mesmo domínio no Android e entre com a mesma conta.

## Conteúdo dentro do Hubora

- Filmes/séries/doramas: trailers e embeds autorizados no player; catálogo TMDB/TVmaze e disponibilidade de provedores quando a API informar.
- Anime/mangá: dados AniList/Jikan; Radar especializado em prints de anime; leitura de fontes abertas e servidores pessoais.
- Livros: Google Books, Open Library, Gutenberg e Internet Archive; o leitor mostra somente visualizações/arquivos autorizados.
- Jogos: IGDB, Steam e CheapShark para descobrir jogos, novidades, preços e popularidade quando a fonte disponibilizar.
- Mídia pessoal: Jellyfin, Kavita, Komga e OPDS, com HTTPS e CORS.

Para conteúdo comercial completo, conecte uma origem à qual você tenha direito de acesso. O Hubora não configura fontes ilegais.

## Cinco fluxos para conferir antes do Netlify

1. Procurar uma obra e salvar em “Planejo consumir”.
2. Usar Escolha de Hoje e abrir uma das três sugestões.
3. Abrir trailer/fonte autorizada de um filme ou série.
4. Ler uma obra de domínio público ou uma fonte pessoal no leitor.
5. Atualizar o progresso no PC e confirmar no Android com Supabase configurado.

Para publicação, siga [NETLIFY_DEPLOY.md](NETLIFY_DEPLOY.md).
