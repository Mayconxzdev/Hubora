# Deploy Preview e rollback

## Fluxo permitido

1. Fechar bloqueios de teste local e revisar `git diff` antes de enviar mudanças à `main`.
2. Com autorização explícita, enviar somente a branch de release ao repositório preservando `main`.
3. Abrir Pull Request para `main`; CI e Netlify devem criar Deploy Preview.
4. Testar URL do preview: autenticação, isolamento, Functions, busca, PWA, rotas e auditoria visual.
5. Pedir aprovação explícita antes de merge em `main`.
6. Após deploy de produção, executar smoke test e registrar o identificador do deploy.

## Rollback

- **Aplicação:** no Netlify, publicar novamente o último deploy de produção conhecido como íntegro, ou reverter o merge em `main` por um commit novo. Não usar `git reset --hard` em branch compartilhada.
- **Banco:** as migrations `001`–`003` já foram aplicadas ao Supabase real. Não há rollback automático seguro. Antes de qualquer mudança posterior de schema, preparar migration reversível ou backup lógico e obter autorização explícita.
- **Dados de usuário:** não apagar tabelas, usuários, buckets ou histórico como forma de rollback. RLS e dados devem ser preservados.

## Estado no momento deste documento

Nenhum push, Pull Request, Deploy Preview, merge ou deploy de produção foi feito nesta auditoria.
