# Segurança do Hubora

O Hubora é uma aplicação pública multiusuário. Público não significa que dados pessoais sejam públicos: biblioteca, listas, progresso, histórico, notificações e perfil completo são isolados por Row Level Security (RLS) com `auth.uid()` no Supabase.

## Segredos e variáveis

- Variáveis `VITE_*` entram no JavaScript do navegador; devem conter somente a URL do projeto e a chave publicável do Supabase ou opções não sensíveis.
- Nunca exponha `SUPABASE_SECRET_KEY`, `IGDB_CLIENT_SECRET`, `TMDB_API_KEY`, `GOOGLE_BOOKS_API_KEY`, token de servidor pessoal, senha, cookie, backup ou arquivo `.env` em commits, logs, screenshots ou Deploy Preview.
- Credenciais de backend devem ter escopo **Functions** no Netlify. Valores `VITE_*` são de build e Functions, pois são públicos no bundle.
- Caso um segredo apareça fora do cofre de variáveis, revogue-o no serviço de origem antes de continuar a investigação.

## Banco e autenticação

Antes de um deploy que prometa sincronização:

1. aplique e registre as migrations locais aprovadas;
2. confirme que todas as tabelas pessoais têm RLS habilitado;
3. valide com duas contas que `auth.uid()` impede leitura, inserção, atualização e exclusão cruzadas;
4. teste e-mail/senha, Google, logout, recuperação, expiração de sessão e redirects autorizados;
5. mantenha login anônimo desativado;
6. garanta que `SUPABASE_SECRET_KEY` não é importada por código de navegador.

Cadastro público e Google são permitidos para o produto. O bloqueio correto de dados vem de RLS, não de uma allowlist de e-mails exposta ao cliente.

## Fontes externas

Não gere player, embed ou URL de mídia a partir de título, IMDb/TMDB/MAL ou outro identificador isolado. Somente conteúdo com origem autorizada e URL validada pode abrir internamente. Serviços comerciais e catálogos de metadados devem abrir sua página oficial quando apropriado.

## Relato de vulnerabilidade

Não abra issue pública com credenciais ou dados pessoais. Registre o problema sem valores secretos, interrompa a exposição e faça a rotação das chaves que possam ter sido afetadas.
