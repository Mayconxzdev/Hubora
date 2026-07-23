# Publicação pública do Hubora no Netlify

O Hubora é uma aplicação pública e multiusuário. Qualquer pessoa pode criar conta por e-mail/senha ou Google quando esses provedores estiverem habilitados no Supabase. A privacidade da biblioteca, listas, progresso e notificações depende de Supabase Auth e RLS com `auth.uid()`, não de uma allowlist no frontend.

## Configuração do projeto

- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`
- Node.js: 22

O `netlify.toml` já define build, fallback de SPA, cabeçalhos de segurança e Functions. O site continua conectado ao repositório GitHub; o fluxo correto é branch de release, Pull Request, CI, Deploy Preview e somente então `main`.

## Variáveis de ambiente

Use a matriz canônica em [ENVIRONMENT_VARIABLES.md](../../ENVIRONMENT_VARIABLES.md). Nunca publique valores em Git ou no frontend.

- `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` são valores públicos necessários ao browser.
- `SUPABASE_SECRET_KEY`, `TMDB_API_KEY`, `IGDB_CLIENT_SECRET`, `IGDB_CLIENT_ID` e `GOOGLE_BOOKS_API_KEY` pertencem apenas às Functions.
- Configure produção e Deploy Preview. Secrets não devem ter prefixo `VITE_`.

## Supabase

As migrations aplicadas neste projeto, na ordem, são:

1. `001_hubora_core.sql`;
2. `002_hubora_v6_hardening.sql`;
3. `003_hubora_public_accounts.sql`.

Elas já foram aplicadas manualmente no projeto Supabase real do Hubora. Não aplicar migrations privadas antigas, nem criar `private.allowed_emails`; esse modelo foi substituído. Antes de usar Supabase CLI, conferir que as migrations aplicadas pelo SQL Editor não serão tratadas como pendentes sem análise.

No painel Supabase, manter:

- confirmação de e-mail habilitada;
- cadastro por e-mail habilitado;
- Google OAuth habilitado e com callback da Supabase configurado;
- Site URL e Redirect URLs para produção e preview corretos;
- usuários anônimos desabilitados, se esse continuar sendo o requisito de produto.

## Deploy Preview e produção

Antes de enviar:

```bash
npm ci --no-audit --no-fund
npm run check
```

Envie a branch de release e abra Pull Request para `main`. O Netlify deve criar o Deploy Preview automaticamente pela integração GitHub. Teste nessa URL autenticação, dados de duas contas, Functions, PWA, leitores, player e rotas antes de pedir merge.

Somente após aprovação explícita, faça merge em `main`. O Netlify então publica `dist` no domínio de produção.

## Conteúdo e fontes

O leitor/player interno só deve abrir conteúdo com URL/manifesto real e autorizado: YouTube oficial, Internet Archive permitido, domínio público, prévia autorizada, arquivo pessoal ou servidor pessoal configurado. Serviços comerciais e fontes sem incorporação autorizada abrem a página oficial externa. Consulte [PROVIDER_MATRIX.md](../../PROVIDER_MATRIX.md) para o status honesto das fontes.
