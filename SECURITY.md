# Segurança do Hubora

## Relato responsável

Não publique vulnerabilidades, chaves ou dados pessoais em issues abertas. Envie o relato de forma privada ao mantenedor do repositório, incluindo impacto, passos de reprodução e uma prova de conceito mínima.

## Segredos

- Nunca armazene `.env` no Git ou em pacotes compartilhados.
- Variáveis `VITE_*` são públicas no bundle do navegador; use apenas chaves publicáveis.
- `SUPABASE_SECRET_KEY`, `IGDB_CLIENT_SECRET`, `TMDB_API_READ_TOKEN` e outros segredos permanecem somente nas Functions.
- Revogue imediatamente qualquer credencial exposta e gere uma substituta.

## Banco e autenticação

- Aplique as migrações `001`, `002` e `003` na ordem e mantenha a allowlist em `private.allowed_emails`.
- Não desative Row Level Security nas tabelas expostas ao cliente.
- Use a chave publicável no navegador; nunca use chave secreta no navegador. Prefira `SUPABASE_SECRET_KEY` no ambiente de Functions.
- Revise políticas com dois usuários de teste antes de abrir o ambiente ao público.

## Atualizações

Execute regularmente:

```bash
npm ci
npm audit --omit=dev
npm run check
npm run test:e2e
```

## Credencial já exposta

Uma credencial publicada em chat, screenshot, repositório ou log deve ser revogada no provedor e substituída antes do deploy. Não basta removê-la do código: ela continua utilizável até ser rotacionada.
