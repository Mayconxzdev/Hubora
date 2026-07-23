# Evidências de teste — Hubora

Data da atualização: 23 de julho de 2026. Este documento só registra execuções observadas; não contém segredos, tokens nem dados de usuários.

| Verificação | Resultado | Evidência e limites |
| --- | --- | --- |
| `npm ci --no-audit --no-fund` | APROVADO | Instalação limpa concluída. Avisos de dependências descontinuadas e scripts pendentes foram registrados; nenhum script foi aprovado manualmente. |
| `npm run typecheck` | APROVADO | Executado após as correções de layout e migrations locais. |
| `npm run lint` | APROVADO COM RESSALVAS | Zero erros e 12 avisos preexistentes de importações/variáveis não usadas. |
| `npm test -- --run` | APROVADO | 41 arquivos / 118 testes antes da correção visual mais recente. |
| `npm test -- --run tests/design-contract.test.ts` | APROVADO | 1 arquivo / 3 testes após a correção da reserva de espaço da sidebar. |
| `npm run verify:static` | APROVADO | 54 verificações estáticas concluídas na linha de base. |
| `npm run build` | APROVADO COM RESSALVAS | Reexecutado após a correção visual: build Vite/PWA concluído; permanece aviso de bundle `hls.js` acima de 500 kB minificado. |
| `npm audit --omit=dev --json` | APROVADO | Nenhuma vulnerabilidade reportada nas dependências de produção na execução registrada. |
| Playwright smoke Chromium | APROVADO | `tests/e2e/smoke.spec.ts`, caso “abre o Hubora sem erro fatal”: 1 aprovado em 46 s. |
| Playwright E2E completo | NÃO CONCLUÍDO | A execução excedeu o limite local de ferramenta. Não foi marcada como aprovada. |
| Captura de rotas local | PARCIAL, COM EVIDÊNCIA | 120 screenshots de 30 rotas × 4 viewports em tema escuro, mais estado vazio e palette. A captura anterior foi interrompida aos 111 arquivos e completada em lote. Tema claro, estados autenticados e leitores ainda não foram homologados. |
| Supabase: migrations 001–003 | APROVADO NO AMBIENTE REAL | Aplicadas manualmente, em ordem, pelo SQL Editor do projeto `xjzhjmhrtthhhswltqum`; cada uma retornou “Success. No rows returned”. |
| Supabase: estrutura pós-migration | APROVADO | 9 tabelas públicas observadas, todas com RLS ativo. |
| Supabase: isolamento declarado | APROVADO EM METADADOS | As 23 policies das 6 tabelas pessoais verificadas contêm vínculo a `auth.uid()`. Teste dinâmico entre duas contas ainda é pendente. |

## Observações importantes

- As migrations foram executadas pelo SQL Editor, portanto não foram automaticamente registradas pelo mecanismo de tracking da Supabase CLI. Antes de adotar `supabase db push`, conferir o histórico remoto para não tratá-las como pendentes sem análise.
- A página de Mangás recebeu correção de layout: `--hub-nav-offset` agora inicia com a largura da sidebar compacta, evitando título e filtros atrás da navegação no desktop. A recaptura confirmou o corte resolvido.
- A recaptura de Mangás recebeu respostas HTTP 504 do catálogo Jikan em quatro viewports. O aplicativo exibiu estado vazio honesto; isso **não** comprova disponibilidade do provedor nem o classifica como funcional homologado.
- Nenhum teste remoto de duas contas, OAuth completo, confirmação de e-mail, sincronização, conflito ou recuperação de senha foi concluído ainda.
