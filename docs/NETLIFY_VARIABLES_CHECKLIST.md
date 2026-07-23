# Checklist de variáveis do Netlify

## Confirmadas na captura do projeto

- [x] `GOOGLE_BOOKS_API_KEY`
- [x] `IGDB_CLIENT_ID`
- [x] `IGDB_CLIENT_SECRET`
- [x] `SUPABASE_SECRET_KEY`
- [x] `SUPABASE_URL`
- [x] `TMDB_API_KEY`
- [x] `VITE_SUPABASE_PUBLISHABLE_KEY`
- [x] `VITE_SUPABASE_URL`

## Política pública multiusuário

O Hubora deve permitir cadastro por e-mail/senha e Google. Não cadastre nem
ative uma allowlist de e-mails para usuários comuns. Os controles opcionais de
experiência são públicos no bundle e podem permanecer ausentes, pois o padrão
da aplicação é aberto:

- `VITE_REQUIRE_AUTH=false` ou ausente;
- `VITE_ALLOW_PUBLIC_SIGNUP=true` ou ausente;
- `VITE_ALLOW_GUEST_MODE=true` ou ausente.

Essas opções não protegem dados. O isolamento real é a RLS por `auth.uid()` das
migrations do Supabase.

## Escopo recomendado

| Variável | Escopo Netlify | Contextos | Observação |
| --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | Builds + Functions | produção e previews | valor público no bundle |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Builds + Functions | produção e previews | chave publicável, nunca service role |
| `SUPABASE_URL` | Functions | produção e previews | backend somente |
| `SUPABASE_SECRET_KEY` | Functions | produção e previews | segredo, nunca `VITE_` |
| `TMDB_API_KEY` | Functions | produção e previews | segredo de catálogo |
| `IGDB_CLIENT_ID` | Functions | produção e previews | identificador do cliente |
| `IGDB_CLIENT_SECRET` | Functions | produção e previews | segredo |
| `GOOGLE_BOOKS_API_KEY` | Functions | produção e previews | segredo/chave com restrição por API |
| `RAWG_API_KEY` | Functions | quando habilitado | opcional |

Depois de qualquer alteração de variável, execute um novo deploy. O endpoint
`/api/health/config` informa somente presença/ausência; ele não confirma schema
ou RLS e não retorna valores.
