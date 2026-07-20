# ADR-0001: Preservar o baseline importado antes da refatoração

## Status

Aceito

## Data

2026-07-20

## Contexto

O diretório recebido não possuía repositório Git, mas já continha código, documentação, migrations, testes, skills e recursos que não poderiam ser descartados. A missão exige refatoração incremental, preservação de dados e capacidade de comparar o comportamento anterior.

## Decisão

Versionar o estado importado sem segredos no commit `0ecfd1d9dfb73585bb03a5e3ac9398dfac6de544`, criar a tag anotada `hubora-9.0.0-pre-refactor` e executar mudanças somente na branch `refactor/hubora-real-platform`.

`.env.local`, `node_modules`, `dist` e saídas de teste não fizeram parte do baseline.

## Alternativas consideradas

### Refatorar diretamente no diretório sem Git

Rejeitada porque não oferece diff confiável, rollback auditável ou separação entre estado recebido e mudanças novas.

### Criar um projeto novo e copiar partes do Hubora

Rejeitada porque aumenta o risco de perder dados, migrations, recursos e comportamento válido; também viola a estratégia incremental solicitada.

## Consequências

- O baseline pode ser inspecionado e comparado de forma reproduzível.
- Mudanças podem ser revertidas por commit sem reset destrutivo.
- A tag não afirma que a versão é segura ou funcional; ela identifica apenas o estado importado.
