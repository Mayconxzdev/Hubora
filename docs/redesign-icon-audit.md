# Hubora — auditoria de ícones

Status: `IMPLEMENTING`.

## Resolvido nesta fase

- Confirmado que `src/` usa apenas `lucide-react` como biblioteca de ícones.
- Criado registro canônico das nove categorias.
- Home, menu de categorias e command palette passaram a usar o mesmo registro.
- Filmes, Séries, Doramas, Animes, Mangás, Quadrinhos, Livros, Novels e Jogos possuem chaves semânticas distintas.
- Teste impede rótulo, rota, ID ou semântica duplicados.

## Achados ainda abertos

| ID | Achado | Impacto | Ação |
|---|---|---|---|
| ICON-001 | `Sparkles` é usado em assistente, recomendação e decoração | semântica diluída | reservar a recomendação/IA explicada |
| ICON-002 | áreas antigas usam ícones de leitura genéricos | distinção de domínio | migrar para registro canônico |
| ICON-003 | ícones sem texto em páginas legadas dependem de `title` | acessibilidade inconsistente | adicionar `aria-label` e tooltip quando necessário |
| ICON-004 | estados de saúde ainda dependem de classes verde/vermelha em Settings | cor como sinal | texto + ícone semântico + status |
| ICON-005 | alguns botões usam setas Unicode junto de Lucide | vocabulário misto | padronizar `Chevron*`/`Arrow*` |

## Gate final

Busca estática, inspeção de DOM e navegação por leitor de tela devem comprovar: uma biblioteca, significado consistente, nenhuma ação só por ícone sem nome e nenhuma categoria ausente.
