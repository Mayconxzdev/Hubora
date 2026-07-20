# Hubora — direção de experiência e interface

Status: direção aprovada pelo proprietário em 2026-07-20. Implementação visual permanece `NOT_STARTED` nesta nova fase.

## Direção H aprovada

O sistema visual combina três referências com responsabilidades distintas:

- **Sonda A — estrutura e experiência principal:** navegação, hierarquia, atmosfera cinematográfica, foco no conteúdo e decisão rápida.
- **Sonda B — tema claro:** tradução clara da mesma estrutura, sem criar uma segunda interface.
- **Sonda C — densidade técnica localizada:** apenas Fontes, Saúde e Diagnóstico, onde tabelas, filtros, capacidades, latência e falhas precisam ser comparáveis.

A experiência de A é soberana. B e C não competem com ela nem introduzem novos padrões globais.

## Personalidade

- cinematográfica sem imitar streaming específico;
- pessoal, não social;
- precisa e honesta;
- tecnológica sem parecer painel corporativo;
- silenciosa quando o conteúdo fala por si;
- acolhedora em PT-BR;
- densa somente quando a tarefa exige.

## Estrutura global

### Desktop

- sidebar recolhível para destinos principais;
- barra superior com busca global, contexto de categoria, tema e conta;
- largura de leitura controlada e conteúdo principal fluido;
- navegação profunda por breadcrumbs/contexto, não por menus duplicados;
- rodapé discreto somente onde trouxer informação útil.

### Celular

- quatro destinos persistentes no máximo;
- busca e categorias acessíveis sem rolagem horizontal;
- ações primárias ao alcance do polegar;
- detalhes em blocos progressivos, sem reproduzir a sidebar desktop;
- player/leitor ocupando o espaço disponível e respeitando safe areas.

## Hierarquia de conteúdo

1. Contexto e ação principal.
2. Conteúdo ou decisão atual.
3. Continuidade/progresso.
4. Descoberta relacionada.
5. Metadados e ferramentas secundárias.
6. Diagnóstico técnico, apenas sob demanda.

## Regras de composição

- Poster, capa, frame ou arte oficial é a principal fonte de cor.
- Violeta é acento controlado para seleção, progresso, foco e ação primária.
- Cards são usados para unidades interativas; seções e texto não ganham card automaticamente.
- Evitar cards dentro de cards e fileiras repetidas sem função editorial.
- Separação usa espaço, alinhamento, tipografia e borda antes de sombra.
- Números, avaliações, percentuais e contagens só aparecem quando derivados de dados reais e carregados.
- Loading usa skeleton compatível com a forma final; nunca texto permanente como “comparando opções” sem uma operação real.
- Estado vazio explica o que falta e qual ação pode resolver.

## Temas

Claro e escuro compartilham exatamente:

- estrutura;
- componentes;
- conteúdo;
- ações;
- ordem;
- estados;
- navegação.

Somente cores, superfícies, bordas, sombras, contraste e tratamento de imagem mudam. Tema escuro usa preto real em superfícies profundas; tema claro usa branco real na base, com superfícies neutras suficientes para separar conteúdo sem cinza sujo generalizado.

## Áreas técnicas

Fontes, Saúde e Diagnóstico podem adotar o padrão C:

- visão resumida no topo;
- filtros por categoria, capacidade, modo, autenticação e estado;
- tabela ou lista densa com cabeçalho persistente;
- última verificação, latência e resultado separados;
- detalhes expansíveis para evidência e falha;
- cores semânticas acompanhadas de texto/ícone;
- sem transformar a Home, Biblioteca ou Detalhes em dashboard.

## Detalhes e trailer

Detalhes combina hero contido, identidade, ações e conteúdo em abas/âncoras adequadas à categoria. A área de vídeo promocional aceita uma coleção real: teaser, trailer oficial, trailers adicionais e clipes somente quando a origem os identificar. A troca ocorre dentro da página; título, canal/origem, idioma, duração e disponibilidade precisam ser reais. Falha de incorporação oferece abrir na origem.

## Movimento

- transições curtas e funcionais;
- nenhuma animação impede interação;
- `prefers-reduced-motion` remove deslocamentos e paralaxe;
- skeletons não piscam agressivamente;
- feedback de foco, seleção, salvamento e erro é imediato.

## O que não usar

- glassmorphism generalizado;
- neon excessivo;
- gradiente em texto;
- botões falsos;
- cards para tudo;
- aparência genérica de SaaS;
- cópia visual da Netflix;
- nomes, capas, fontes, notas ou estatísticas fictícias permanentes.

## Validação visual obrigatória

Cada fatia de UI deve ser aberta e utilizada em 320, 375, 768, 1024 e 1440 px, com tema claro e escuro, teclado e redução de movimento. A matriz principal deve cobrir Chromium; Firefox e WebKit entram antes de release candidate. Captura isolada não substitui navegação e interação.
