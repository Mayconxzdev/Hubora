# Como ler a matriz inicial de provedores

`PROVIDER_MATRIX_INITIAL.csv` é inventário, não selo de funcionamento.

## `implementation_status`

- `NOT_STARTED`: nome/candidato inventariado, sem implementação comprovada.
- `IMPLEMENTING`: trabalho ativo ainda sem fluxo completo.
- `PARTIAL`: existe catálogo, adapter, proxy, parser ou link, mas falta evidência real completa.
- `BLOCKED`: há impedimento técnico conhecido.
- `VERIFIED`: cenário real reproduzível passou. Nenhuma entrada recebe este status no levantamento inicial.

## `access_class`

- `NOT_TESTED`: modo real ainda não foi estabelecido.
- `EXTERNAL_ONLY`: implementação atual apenas abre a origem.
- `INTERNAL_CANDIDATE`: API/arquivo/player pode permitir integração, ainda não verificada.
- `PERSONAL_OPTIONAL`: servidor do próprio usuário; não é requisito do Hubora.
- `MANIFEST`: protocolo declarativo instalável.
- `EXPERIMENTAL`: candidato instável/comunitário; precisa de adapter isolado e teste individual.
- `UNAVAILABLE_RECORDED`: mantido no histórico como indisponível conhecido.
- `OUT_OF_SCOPE`: item lembrado na matriz para não reaparecer por engano, mas
  excluído por decisão de produto.

Uma entrada só poderá virar `VERIFIED` após registrar data, versão, região BR, entrada de teste, busca/metadados/acesso aplicáveis, navegador/dispositivo e evidência. “Abriu a homepage” comprova apenas reachability.
