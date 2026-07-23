# Auditoria visual local — estado parcial

**Classificação geral: NÃO EXECUTÁVEL COMO HOMOLOGAÇÃO FINAL.** As imagens foram capturadas localmente, em tema escuro e sem sessão autenticada/controlada de provedor; elas não substituem a auditoria de Deploy Preview.

## Evidência disponível

- Diretório: `artifacts/redesign-route-gallery/`
- 120 capturas de rota em tema escuro: 30 rotas × desktop 1920×1080, desktop 1440×900, tablet 768×1024 e mobile 390×844.
- Mais 2 estados: biblioteca vazia e palette de comando.
- A captura integral inicial excedeu dez minutos e foi completada em lote para `/terms` e 404. A recaptura posterior de Mangás confirmou a correção de layout.

## Achado corrigido

| Tela | Estado anterior | Correção | Evidência |
| --- | --- | --- | --- |
| `/manga`, desktop | Título e início da barra de busca apareciam atrás da sidebar compacta. | `--hub-nav-offset` passou a iniciar em `--hub-nav-compact` para reservar 4.5rem no conteúdo desktop. | `manga--desktop-1440x900.png` recapturada, sem conteúdo cortado. |

## Ressalvas abertas

- Não foram geradas as contrapartes em tema claro.
- Não há screenshots de conta autenticada, modais de dados reais, player, EPUB, PDF, mangá, sincronização, configurações pessoais ou falhas de Function.
- Jikan respondeu HTTP 504 nas quatro capturas de Mangás após a remoção do cabeçalho de auditoria que antes induzia CORS. A interface mostrou estado vazio honesto, porém o provedor não está homologado.
- O arquivo `_report.json` registra somente o último lote executado; o inventário final acima foi contado no sistema de arquivos. O gerador precisa ser aprimorado antes de publicar um relatório definitivo.
