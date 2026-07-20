# Hubora Design System 7.1 — Cinematic Focus

## Direção

O Hubora 7.1 usa uma identidade cinematográfica sóbria: preto, branco e dourado quente. A arte das obras recebe destaque, enquanto navegação e controles desaparecem visualmente quando não são necessários. A interface deve parecer premium sem copiar Netflix, Prime Video ou outro serviço específico.

## Princípios

1. **Conteúdo primeiro:** a mídia ocupa a maior parte da tela; o shell deve ser discreto.
2. **Navegação adaptativa:** rail compacta no desktop, expansão sob demanda e barra inferior no celular.
3. **Uma decisão principal por contexto:** CTAs secundários não competem com a ação principal.
4. **Divulgação progressiva:** filtros, categorias e áreas menos usadas ficam em “Mais”, popovers, sheets ou painéis temporários.
5. **Imersão sem ruído:** gradientes, blur e movimento ficam concentrados em hero, detalhes e transições de estado.
6. **Clareza universal:** ícones não universais ganham rótulo quando a navegação é expandida, tooltip e nome da página no cabeçalho.
7. **Local-first perceptível:** sincronização aparece como estado, não como bloqueio da experiência.

## Identidade

### Escuro

- Fundo: `#030303`.
- Superfícies: `#0d0d0e`, `#151515`, `#1d1d1d`.
- Texto forte: `#fffdf8`.
- Texto secundário: `#aaa49a`.
- Marca: dourado `#d99a28`.
- Acento: areia `#e5bf78`.

### Claro

- Fundo: `#ffffff`.
- Superfícies: `#ffffff`, `#f4f4f6`, `#ebebef`.
- Texto forte: `#050506`.
- Texto secundário: `#5e5e67`.
- Marca: âmbar profundo `#a9680d`.

Verde, amarelo e vermelho são reservados a estados semânticos. Roxo e ciano legados são normalizados para a paleta oficial.

## Navegação

### Desktop e tablet

- Rail compacta de `4.75rem` por padrão.
- Cinco destinos principais: Início, Descobrir, Biblioteca, Diário e Radar.
- Ícones com `aria-label` e tooltip quando recolhidos.
- Expansão temporária por hover, foco ou botão.
- Opção de fixar a rail aberta; preferência persistida localmente.
- “Mais” reúne categorias e configurações pessoais; não há área de comunidade.
- Perfil, notificações, tema e sincronização ficam no cabeçalho.
- A expansão temporária sobrepõe o conteúdo; não empurra a página.

### Celular

- Barra inferior com cinco destinos: Início, Descobrir, Biblioteca, Diário e Mais.
- Áreas secundárias abrem em bottom sheet.
- Busca ganha ação própria no topo.
- Respeito a safe areas de iOS e Android.

## Estrutura das telas

### Início

- Hero compacto, sem ocupar toda a primeira dobra.
- “Continue de onde parou” aparece imediatamente abaixo.
- Categorias usam faixa horizontal leve.
- Trilhos exibidos apenas quando contêm conteúdo relevante.
- Atalhos decorativos redundantes foram removidos.

### Biblioteca

- Cabeçalho funcional, sem hero.
- Busca, ordenação, filtros e alternância grade/lista em uma única barra.
- Filtros rápidos são chips; opções avançadas permanecem recolhidas.
- Cards não repetem status e nota em várias camadas.

### Descobrir

- Uma busca principal.
- Três modos: busca direta, busca por pistas e experiência/vibe.
- Filtros detalhados aparecem sob demanda.
- Resultados recebem a maior largura disponível.

### Radar e lançamentos

- Priorizam datas e alterações das obras acompanhadas.
- Sem banner promocional gigante.
- Filtros de mídia compactos e eventos em cards legíveis.

### Detalhes

- Hero limitado a aproximadamente dois terços da viewport.
- Poster menor e título responsivo.
- Ação primária evidente; ações secundárias não competem.
- Movimento de imagem reduzido e sem zoom agressivo.
- Conteúdo detalhado continua abaixo em painéis claros.

### Perfil e configurações

- Painéis neutros, sem neon.
- Informações densas divididas por função.
- Modo claro herda corretamente superfícies, texto e bordas.
- Estados técnicos usam cores semânticas, não cores da marca.

## Componentes

### Card de mídia

- Poster com proporção consistente.
- Título sempre visível.
- Status, progresso e nota aparecem uma vez.
- Ações avançadas surgem por foco/hover ou menu de contexto.
- Sem expansão que empurre cards vizinhos.

### Hero

- Uma obra por vez.
- Título, descrição curta e no máximo duas ações.
- Overlay independente da arte garante legibilidade.
- Controles de carrossel discretos e acessíveis.

### Modais e sheets

Radix Dialog é usado para:

- foco preso em modais;
- fechamento com Escape;
- título e descrição anunciados;
- retorno de foco ao gatilho;
- bottom sheet em telas pequenas;
- cabeçalho/rodapé estáveis quando o conteúdo rola.

### Campos e botões

- Alvo interativo confortável, preferencialmente 44px ou mais nos controles principais.
- Foco visível com contorno de 3px.
- Placeholder não substitui label em ações importantes.
- Botões primários usam dourado; ações perigosas usam vermelho.

## Responsividade

- `320–767px`: barra inferior, grids de uma ou duas colunas e sheets.
- `768–1199px`: rail compacta e conteúdo fluido.
- `1200px+`: busca global, rail expansível e maior densidade de cards.
- Monitores ultrawide: conteúdo limitado a `106rem` para preservar leitura.
- TV: largura limitada e tipografia escalável evitam conteúdo disperso.

## Acessibilidade

- teclado completo e ordem de foco lógica;
- foco nunca dependente apenas de cor;
- controles essenciais não dependem de hover;
- `prefers-reduced-motion` respeitado pelo Motion e CSS;
- zoom do navegador permitido;
- contraste tratado por tokens de tema;
- textos alternativos e estados vazios descritivos;
- labels acessíveis em ícones compactos.

## Arquivos centrais

- `src/index.css`: tokens, temas, shell, navegação e compatibilidade visual.
- `src/components/layout/Sidebar.tsx`: rail compacta, cabeçalho e navegação móvel.
- `src/components/layout/Layout.tsx`: persistência da navegação fixa.
- `src/components/ui/Hero.tsx`: hero cinematográfico.
- `src/components/ui/MediaCard.tsx`: card de mídia simplificado.
- `src/pages/Home.tsx`, `Discover.tsx`, `Library.tsx`, `Radar.tsx`, `Releases.tsx`: hierarquia principal.
