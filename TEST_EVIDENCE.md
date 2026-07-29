# Evidências de teste — Hubora

Data da atualização: 28 de julho de 2026.

Este documento registra as execuções mais recentes observadas no projeto. Não contém tokens, credenciais ou dados pessoais.

| Verificação | Resultado | Evidência e limites |
|---|---|---|
| Instalação limpa com `npm ci` | APROVADO | Dependências instaladas a partir do lockfile versionado. |
| TypeScript / typecheck | APROVADO | Verificação de tipos concluída na versão atual. |
| ESLint | APROVADO | Nenhum erro bloqueante na execução mais recente. |
| Testes unitários | APROVADO | **138 testes** executados com sucesso. |
| Build de produção e PWA | APROVADO | Build de produção e artefatos PWA gerados. |
| Playwright E2E completo | APROVADO | Fluxos principais executados no ambiente de teste. |
| Auditoria visual e acessibilidade | APROVADO | Verificações em desktop, tablet e viewport Android. |
| Autenticação por e-mail/senha | APROVADO | Login e sessão validados. |
| Login Google | APROVADO | Fluxo OAuth validado no ambiente publicado. |
| Isolamento RLS com duas contas | APROVADO | Uma conta não conseguiu consultar ou alterar os registros pessoais da outra. |
| Sincronização entre dispositivos | APROVADO | Biblioteca e progresso sincronizados entre dispositivos autenticados. |
| Deploy Netlify | APROVADO | A branch `main` atual corresponde à demonstração pública. |
| Google Books | BLOQUEADO EXTERNAMENTE | O provedor apresenta erro externo; o Hubora exibe indisponibilidade sem gerar conteúdo fictício. |

## Limites

- A aprovação dos testes não representa SLA ou homologação para operação comercial em grande escala.
- Provedores externos podem variar por região, credencial, limite de uso, disponibilidade e termos do serviço.
- Uma fonte só deve ser classificada como funcional quando o fluxo de ponta a ponta tiver sido exercitado.
