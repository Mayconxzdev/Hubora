# Hubora 9.0 — escolha primeiro, catálogo depois

Hubora é um hub pessoal brasileiro de cultura pop. A versão 9 combina o visual limpo da alternativa C com a decisão imediata da alternativa D: a entrada mostra categorias e quatro intenções, entrega uma recomendação principal e só então oferece mais catálogo.

## O que está pronto

- Home C+D em preto real (`#000`) ou branco real (`#fff`), responsiva e sem painel administrativo.
- Nove entradas imediatas: filmes, séries, animes, mangás, doramas, livros, quadrinhos, jogos e novels.
- Quatro escolhas: **Quero continuar**, **Tenho pouco tempo**, **Quero descobrir** e **Me surpreenda**.
- Uma recomendação principal com motivo e uma alternativa; trilhos infinitos deixaram de comandar a experiência.
- Central com 96 fontes mapeadas, filtros por categoria, modo, custo, autorização e capacidade real.
- Modos de fonte separados: metadados, arquivo nativo, player incorporado, servidor pessoal, página externa, manifesto e launcher.
- Protocolo Hubora `hubora-provider/v1` e compatibilidade com manifestos Stremio para origens autorizadas.
- IDs cruzados de TMDB, IMDb e TVDB nos detalhes, além de AniList/MAL, Google Books e outros IDs quando a fonte os informa.
- Player de vídeo direto/HLS, YouTube e incorporações permitidas; leitores de Google Books, EPUB, PDF e HTML.
- Hubora Companion Windows: cache progressivo de 25 GB, progresso e descarte automático dez minutos depois de parar.
- Acesso ao Companion pelo Android na mesma rede usando `http://IP-DO-PC:49821`, pareamento e permissão de rede local.
- Servidores pessoais: Jellyfin, Emby, Plex, Kavita, Komga, Calibre-Web, Suwayomi e OPDS.
- Fontes abertas e oficiais para livros, vídeo, mangás, quadrinhos, doramas e jogos; páginas externas são identificadas como externas.
- Catálogo PT-BR/região BR, biblioteca local-first, PWA, backup, sincronização privada e launchers de jogos pelo Companion.

## Fontes sem promessas falsas

Estar no diretório não significa que uma fonte permite iframe, download ou reprodução. A Central informa o modo real de cada uma. Uma plataforma sem API incorporável abre o título na origem; uma fonte de metadados não aparece como vídeo; um servidor pessoal só funciona depois de conectado.

O Hubora não inclui torrents, magnet links, add-ons piratas, contorno de DRM ou scraping de streaming comercial. Manifestos personalizados aceitam URLs HTTPS/locais autorizadas e recusam `.torrent`/magnet. Isso preserva o projeto privado e evita esconder uma origem quebrada ou apresentar conteúdo como disponível quando não está.

## Rodar no PC

Requer Node.js 22.12 ou superior:

```powershell
npm ci
npm run build
npm run dev
```

Abra `http://localhost:3000`. `npm run preview` serve somente o build estático e não executa as Netlify Functions.

## Instalar o Companion Windows

1. Abra **Fontes e Companion** no Hubora e baixe `Hubora-Companion-Windows.zip`.
2. Extraia o ZIP e execute `install-windows.ps1` no PowerShell.
3. Informe a URL final do Netlify e aceite rede local se quiser usar o Android.
4. No celular, use `http://IP-DO-PC:49821`; no próprio PC, use `http://127.0.0.1:49821`.
5. Digite no Hubora o código de seis dígitos mostrado pelo Companion.

O cache recebe somente a mídia que você escolheu e tem autorização para acessar. Ao parar, o progresso é salvo; dez minutos depois, os temporários daquela sessão são apagados.

## Manifesto Hubora

Uma fonte própria pode expor `manifest.json`:

```json
{
  "protocol": "hubora-provider/v1",
  "id": "minha-fonte",
  "name": "Minha fonte",
  "version": "1.0.0",
  "capabilities": ["search", "stream", "reader", "chapters", "health"],
  "mediaTypes": ["movies", "series", "anime", "doramas", "books", "novels", "manga", "comics", "games"],
  "endpoints": {
    "search": "/v1/search?q={query}",
    "access": "/v1/access/{type}/{id}",
    "health": "/v1/health"
  }
}
```

Os endpoints precisam permanecer na mesma origem do manifesto. A resposta de acesso pode declarar vídeo, HLS, áudio, EPUB, PDF, HTML, YouTube ou página oficial.

## Supabase e Netlify

Execute as migrations em `supabase/migrations/`, mantenha somente o seu e-mail em `private.allowed_emails` e siga [NETLIFY_DEPLOY.md](NETLIFY_DEPLOY.md).

No cliente, use apenas URL e chave publicável do Supabase. Segredos de Supabase, TMDB e IGDB ficam nas Functions. **Revogue e gere novamente todas as chaves que já foram expostas em chat, screenshot, commit ou log.** O pacote não contém os valores secretos enviados na conversa.

## Verificação desta entrega

- TypeScript: aprovado.
- Vitest: 16 arquivos e 39 testes aprovados.
- Companion: pareamento, 25 GB, sessão, progresso e limpeza em dez minutos validados em processo real.
- Build Vite/PWA: aprovado.
- Playwright: rotas, temas preto/branco, dez categorias, quatro intenções, PWA e Android validados; veja [VALIDATION.md](VALIDATION.md).

Leia também [RELATORIO-HUBORA-9.0.md](RELATORIO-HUBORA-9.0.md), [FEATURES-AND-LIMITS.md](FEATURES-AND-LIMITS.md), [SECURITY.md](SECURITY.md) e [QUICKSTART.md](QUICKSTART.md).
