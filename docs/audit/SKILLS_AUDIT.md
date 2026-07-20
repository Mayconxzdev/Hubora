# Auditoria e lock de skills

Data: 2026-07-20. Destino: `.agents/skills`, restrito ao projeto.

## Procedimento

1. Clonagem somente leitura em diretório temporário.
2. Registro do commit exato antes da instalação.
3. Inspeção de licença, árvore de arquivos, modos executáveis, scripts de pacote e conteúdo dos entrypoints.
4. Instalação pelo helper oficial do Codex, em commit fixo e no escopo local.
5. Hash determinístico da árvore instalada registrado em `skills-lock.json`.

## Fontes instaladas

| Fonte | Commit | Licença | Escopo instalado | Resultado da auditoria |
|---|---|---|---|---|
| `addyosmani/agent-skills` | `2fbfa004a0192529bc997d103fc12f19a3804aab` | MIT | 18 skills de engenharia selecionadas | Pastas selecionadas contêm somente `SKILL.md`; executáveis existentes em outras áreas do repositório não foram instalados |
| `currents-dev/playwright-best-practices-skill` | `ef329e7e65149918e1ff0eed2cf7d2e6e6f9eb5b` | MIT | Skill raiz e 62 referências/configs | Nenhum arquivo executável no repositório; instruções podem sugerir testes que só devem rodar no projeto controlado |
| `netresearch/security-audit-skill` | `62895f093bc835dcbccfbccb421816c0f44192ce` | MIT AND CC-BY-SA-4.0 | `skills/security-audit` | Contém scripts Bash executáveis. O pacote raiz possui `prepare` que pode instalar hook; não houve instalação npm nem execução de scripts |
| `wshobson/agents` | `c4b82b0ad771190355eb8e204b1329732a18449a` | MIT | `architecture-patterns` | Três arquivos Markdown; executáveis de outros plugins não foram instalados |

## Skills preexistentes

UI UX Pro Max, Impeccable, Vercel React Best Practices e outras skills já estavam no projeto. O lock v1 não registra commits/licenças para todas elas. Foram preservadas, mas a proveniência deve ser resolvida antes de qualquer reinstalação ou upgrade.

## Política de execução

- Nenhum script de skill de terceiros é executado automaticamente.
- Nenhuma skill autoriza segredos, deploy, alteração remota ou ação destrutiva.
- Instruções conflitantes cedem ao `AGENTS.md`, ao pedido do usuário e às políticas de segurança.
- Atualizações futuras exigem nova auditoria e novo commit/hash no lock.
