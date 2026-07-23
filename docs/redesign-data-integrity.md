# Hubora — integridade de dados no redesign

## Regra principal

O redesign muda apresentação e interação, não a verdade dos dados. Nenhuma lacuna visual pode ser preenchida com dado fictício.

## Origem por domínio

| Dado | Origem aceitável | Fallback aceitável |
|---|---|---|
| título/identidade | provider + IDs externos | texto “não informado” |
| capa/backdrop | URL real permitida | superfície neutra com título |
| sinopse/metadados | adapter real | estado vazio explícito |
| avaliação pública | provider com escala identificada | omitir |
| avaliação pessoal | biblioteca do usuário | sem avaliação |
| progresso | repositório local/cloud do usuário | zero/não iniciado |
| disponibilidade | provider/serviço real | indisponível/não verificado |
| reprodução/leitura | fonte autorizada | link externo ou mensagem honesta |
| adulto | classificação real da fonte/modelo | seguro por padrão |

## Identidade e sincronização

- A chave canônica combina origem, tipo e identificador da origem; título isolado não une obras.
- RLS usa `auth.uid()` para todas as tabelas pessoais.
- Conflitos de sync são registrados e resolvidos sem misturar usuários.
- Visitante e conta não compartilham dados automaticamente sem ação explícita de importação/mesclagem.
- Logout não deve apagar silenciosamente dados locais nem mostrar cache de outra conta.

## Mídia e URLs

- somente HTTPS, `blob:` local controlado e esquemas internos explicitamente suportados;
- host de streaming deve corresponder exatamente à allowlist central;
- CSP, sandbox e política de player usam a mesma lista;
- redirects, MIME, tamanho e protocolos são validados no backend quando o Hubora faz fetch;
- indisponibilidade regional, assinatura e autenticação pertencem à mensagem do usuário.

## Referência visual

São proibidos no produto real os dados do protótipo, incluindo títulos como “Eclipse Prime”, “Nova Aurora”, “Órbita Zero” e “Silêncio de Eris”, bem como posters e números inventados. Uma busca automatizada final deve provar a ausência desses marcadores fora da pasta de referência e da documentação que os cita como proibidos.

## Evidências

Screenshots comprovam layout, não integridade isoladamente. Cada evidência visual deve estar ligada ao resultado JSON do cenário, commit, ambiente, viewport, console, rede e origem observada.
