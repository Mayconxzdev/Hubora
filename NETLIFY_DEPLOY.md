# Publicação privada no Netlify

## 1. Preparar o repositório

1. Garanta que `.env.local`, `.env`, `dist/`, `node_modules/` e backups não sejam enviados ao Git.
2. Faça uma última validação local:

```powershell
npm ci
npm run check
npm run test:e2e
```

3. Publique o repositório privado e importe-o no Netlify.

## 2. Configuração do site

- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`
- Node.js: 22 ou superior

O `netlify.toml` já entrega fallback de SPA, cabeçalhos de segurança, PWA e a Function diária de lançamentos.

## 3. Variáveis de ambiente

Configure no painel **Site configuration → Environment variables**. Valores com `VITE_` são públicos no bundle; os demais ficam só em Functions.

| Variável | Onde | Necessária | Finalidade |
| --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | Build | Sim para login/sync | URL do projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Build | Sim para login/sync | Chave publicável, nunca a secreta |
| `VITE_REQUIRE_AUTH` | Build | Recomendado | `true` |
| `VITE_ALLOW_PUBLIC_SIGNUP` | Build | Recomendado | `false` |
| `VITE_ALLOWED_EMAILS` | Build | Recomendado | Seu e-mail, como segunda barreira |
| `SUPABASE_URL` | Functions | Para releases | URL do Supabase |
| `SUPABASE_SECRET_KEY` | Functions | Para releases | Chave secreta **nova**, sem `VITE_` |
| `TMDB_API_READ_TOKEN` **ou** `TMDB_API_KEY` | Functions | Para catálogo TMDB | Nunca exponha ao navegador |
| `IGDB_CLIENT_ID` + `IGDB_CLIENT_SECRET` | Functions | Opcional | Catálogo IGDB de jogos |
| `GOOGLE_BOOKS_API_KEY` | Functions | Opcional | Cota ampliada Google Books |
| `RAWG_API_KEY` | Functions | Opcional | Dados adicionais de jogos |

Não configure os dois formatos de chave secreta do Supabase ao mesmo tempo. A chave legada `SUPABASE_SERVICE_ROLE_KEY` existe só para compatibilidade; prefira `SUPABASE_SECRET_KEY`.

## 4. Autenticação e domínio

1. Faça um deploy de preview.
2. Copie a URL de preview e a URL final do site.
3. No Supabase: **Authentication → URL Configuration → Redirect URLs**, inclua:
   - `https://SEU-SITE.netlify.app/**`
   - `https://SEU-DOMINIO/**`, se houver domínio próprio.
4. No provedor Google OAuth, acrescente o callback do Supabase que aparece na documentação/configuração do projeto.
5. No SQL Editor, mantenha somente o seu e-mail em `private.allowed_emails`.

## 5. Publicar e validar

1. Faça deploy de produção no Netlify.
2. Entre com a conta permitida no PC.
3. Adicione um título, atualize o progresso e confirme no Android.
4. Instale a PWA no Android pelo Chrome.
5. Teste trailer, fonte aberta, uma busca de jogo e uma sugestão de Hoje.
6. Instale o Companion, informe a URL do Netlify e pareie no PC.
7. No Android, teste `http://IP-DO-PC:49821` e aceite a permissão de rede local do Chrome quando ela aparecer. Use apenas uma rede privada.
8. Se a política de conteúdo misto do navegador bloquear HTTP local, publique o Companion por HTTPS privado (por exemplo, Tailscale Serve ou reverse proxy com certificado confiável) e salve essa URL na Central de Fontes.
9. Para Jellyfin/Kavita/Komga/Audiobookshelf fora do Companion, prefira HTTPS e CORS restrito ao seu domínio.

## Bloqueio de segurança antes da publicação

Se uma chave secreta foi enviada por chat, screenshot, commit ou log, considere-a comprometida. Revogue-a no provedor, crie outra e cadastre a substituta apenas no painel do Netlify. Depois faça um novo deploy para que as Functions recebam o valor novo.
