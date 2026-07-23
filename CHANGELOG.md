# Changelog de preparação de release

## Não publicado — `release/hubora-9.0.2-prep`

- Preparado modelo público de contas, removendo a dependência de allowlist de e-mail no frontend.
- Criada migration `003_hubora_public_accounts.sql` com RLS/policies pessoais vinculadas a `auth.uid()` e tabelas de notificações/assinaturas.
- Aplicadas no Supabase real, sob autorização explícita, as migrations 001, 002 e 003.
- Restringido o leitor interno a fontes/embeds permitidos; URLs arbitrárias não viram iframe/leitor interno.
- Removidos dados inventados de capítulos de mangá ausentes.
- Ajustado o layout desktop para reservar espaço para a sidebar compacta.
- Tornado o capturador visual selecionável por rota para permitir recapturas controladas; removido cabeçalho de auditoria que causava preflight CORS artificial.

## Não incluído nesta release

- Push, Pull Request, Deploy Preview, merge e deploy de produção.
- Declaração de todos os provedores como funcionais.
- Homologação dinâmica de RLS entre duas contas, leitores, servidores pessoais e OAuth completo.
