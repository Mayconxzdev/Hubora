# Hubora — relatório de readiness de release

**Veredito atual: NÃO PRONTO.**

Este repositório é preparado no Git preservando o histórico. A produção usa `main`; o estado de CI e deploy deve ser conferido no GitHub e no Netlify antes de qualquer declaração de prontidão.

## O que foi comprovado

- O repositório clonado preserva o histórico e aponta para `https://github.com/Mayconxzdev/Hubora.git`.
- As migrations `001_hubora_core.sql`, `002_hubora_v6_hardening.sql` e `003_hubora_public_accounts.sql` foram aplicadas no Supabase real com autorização expressa.
- Há 9 tabelas públicas observadas; RLS está ativo em todas. As policies de `profiles`, `library_entries`, `custom_lists`, `consumption_events`, `release_subscriptions` e `notifications` são vinculadas a `auth.uid()` nos metadados.
- Typecheck, testes unitários da linha de base, auditoria estática, build e smoke E2E Chromium foram executados com os resultados detalhados em [TEST_EVIDENCE.md](TEST_EVIDENCE.md).
- Uma falha de layout desktop foi corrigida: o conteúdo agora reserva a largura da sidebar compacta.

## Bloqueios para Deploy Preview

1. Executar E2E completo, acessibilidade e fluxo real com duas contas isoladas contra o Supabase já migrado.
2. Configurar ambiente local de teste de forma segura sem expor variáveis: `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` são públicas de bundle; `SUPABASE_SECRET_KEY`, `TMDB_API_KEY`, `IGDB_CLIENT_SECRET` e equivalentes permanecem somente no servidor.
3. Executar `netlify build`/Functions com o ambiente equivalente. A Netlify CLI não ficou disponível localmente: o `npx` terminou com bloqueios de cache no Windows, sem alterar o site.
4. Concluir a auditoria visual exigida: tema claro, estado autenticado, modais, player, leitores, menus e telas de erro ainda não têm evidência final.
5. Converter a matriz de 88 fontes de diretório técnico para status honesto por integração. A presença no catálogo não é prova de busca, disponibilidade ou reprodução. Jikan, por exemplo, retornou HTTP 504 durante a recaptura local.
6. Revisar e eliminar os 12 avisos de lint e o aviso de bundle de `hls.js`, ou aceitá-los explicitamente no Pull Request.
7. Criar e revisar os artefatos finais obrigatórios de ambiente, rollback, auditoria visual e changelog antes de qualquer push.

## Riscos atuais

- Não há prova dinâmica de que Usuário A não lê/escreve dados de Usuário B; somente RLS/policies foram inspecionadas.
- Integrações de servidores pessoais (Jellyfin, Plex, Emby, Komga, Kavita, OPDS) não podem ser homologadas sem uma configuração autorizada real. Não foram simuladas como funcionais.
- Fontes comerciais e não incorporáveis devem permanecer como links oficiais; não há autorização para usar fontes não licenciadas ou gerar players a partir de metadados.
- As screenshots atuais foram feitas em ambiente local e sem credenciais de provedores. Elas não são evidência de Deploy Preview.

## Próximo marco permitido

Depois que os bloqueios acima forem resolvidos, o máximo que poderá ser declarado será **PRONTO PARA DEPLOY PREVIEW**. Produção requer push da branch de release, CI verde, Deploy Preview real, teste do preview e nova autorização explícita.
