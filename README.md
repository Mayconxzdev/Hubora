# Hubora

O Hubora é uma plataforma pública e multiusuário para descobrir, organizar e acompanhar filmes, séries, doramas, animes, mangás, quadrinhos, livros, novels e jogos. As nove categorias compartilham uma identidade de obra; o Cofre é um recurso transversal de privacidade, não uma décima categoria.

Visitantes podem explorar e manter dados somente no dispositivo. Contas criadas com e-mail/senha ou Google sincronizam biblioteca, listas e progresso entre dispositivos. Cada registro pessoal é protegido no Supabase por RLS com `auth.uid()`; uma conta não pode consultar ou alterar dados de outra.

> Estado atual: **em auditoria de release**. Não considere esta versão pronta para produção antes da homologação dinâmica de schema/RLS entre duas contas, CI e um Deploy Preview aprovado. Nenhuma fonte comercial é tratada como player incorporável sem autorização verificável.

## Requisitos

- Node.js `>=22.12.0` (o Netlify usa Node 22);
- npm compatível com o `package-lock.json`;
- `.env` local criado a partir de `.env.example`.

```bash
npm ci --no-audit --no-fund
cp .env.example .env
npm run dev
```

## Configuração

As variáveis que a captura do Netlify confirma como cadastradas são `GOOGLE_BOOKS_API_KEY`, `IGDB_CLIENT_ID`, `IGDB_CLIENT_SECRET`, `SUPABASE_SECRET_KEY`, `SUPABASE_URL`, `TMDB_API_KEY`, `VITE_SUPABASE_PUBLISHABLE_KEY` e `VITE_SUPABASE_URL`.

O prefixo `VITE_` só é permitido para a URL do projeto e a chave publicável do Supabase: ambas entram no bundle. Segredos, inclusive `SUPABASE_SECRET_KEY`, `IGDB_CLIENT_SECRET`, `TMDB_API_KEY` e `GOOGLE_BOOKS_API_KEY`, ficam somente em Functions. Veja [a matriz completa de variáveis](docs/ENVIRONMENT_VARIABLES.md).

## Supabase

O schema remoto do Hubora já recebeu, pelo SQL Editor e com autorização explícita, a sequência abaixo. Ela permanece versionada para revisão e reprodução controlada:

1. `001_hubora_core.sql`
2. `002_hubora_v6_hardening.sql`
3. `003_hubora_public_accounts.sql`

A terceira migration cria notificações/assinaturas e estabelece as policies definitivas de propriedade. Não há allowlist por e-mail para usuários comuns. Após aplicá-las, a homologação exige duas contas isoladas, testes de login por e-mail/senha e Google, e prova de que uma conta não lê nem escreve a outra.

## Validação

```bash
# regras estáticas de segurança e contrato
npm run verify:static

# lint, TypeScript, testes e build
npm run check

# portão completo, incluindo Playwright quando o ambiente estiver configurado
npm run verify:release
```

Não faça merge em `main` quando qualquer comando obrigatório falhar. O fluxo de release previsto está em [docs/DEPLOY_AND_ROLLBACK.md](docs/DEPLOY_AND_ROLLBACK.md).

## Fontes e reprodução

O Hubora diferencia metadados, disponibilidade, trailer oficial, prévia, conteúdo aberto/autorizado, servidor pessoal e link comercial externo. O app só abre player ou leitor interno quando a origem é autorizada e a URL foi validada; caso contrário abre a página oficial apropriada ou informa que não há acesso confirmado. O diretório não prova disponibilidade de uma obra.

Consulte [docs/PROVIDER_MATRIX.md](docs/PROVIDER_MATRIX.md) para o inventário e o estado de cada fonte.

## Documentação

- [Produto](PRODUCT.md) e [design](DESIGN.md)
- [Variáveis de ambiente](docs/ENVIRONMENT_VARIABLES.md)
- [Matriz de provedores](docs/PROVIDER_MATRIX.md)
- [Deploy e rollback](docs/DEPLOY_AND_ROLLBACK.md)
- [Segurança](SECURITY.md)

## Licença

O código está sob GNU Affero General Public License v3 ou posterior. Metadados, imagens, mídias e serviços externos continuam sujeitos às respectivas licenças e termos.
