---
name: Hubora
description: Cabine pessoal de curadoria para descobrir, acompanhar, ler e assistir cultura pop.
colors:
  canvas-dark: '#000000'
  surface-dark: '#0A0A0A'
  surface-dark-raised: '#121212'
  surface-dark-strong: '#1A1A1A'
  ink-dark: '#FFFFFF'
  body-dark: '#E8E8EA'
  muted-dark: '#A1A1AA'
  canvas-light: '#FFFFFF'
  surface-light: '#F5F5F7'
  ink-light: '#050507'
  body-light: '#242429'
  violet: '#8C7CFF'
  violet-strong: '#725CFF'
  danger: '#EF4444'
typography:
  display:
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif'
    fontSize: '3rem'
    fontWeight: 820
    lineHeight: 1
    letterSpacing: '-0.04em'
  headline:
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1.75rem'
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: '-0.025em'
  body:
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1rem'
    fontWeight: 450
    lineHeight: 1.6
  label:
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.8125rem'
    fontWeight: 700
    lineHeight: 1.3
rounded:
  sm: '8px'
  md: '12px'
  lg: '16px'
  pill: '999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '16px'
  lg: '24px'
  xl: '32px'
components:
  button-primary:
    backgroundColor: '{colors.violet}'
    textColor: '{colors.ink-dark}'
    rounded: '{rounded.md}'
    padding: '10px 16px'
  button-secondary:
    backgroundColor: '{colors.surface-dark-raised}'
    textColor: '{colors.body-dark}'
    rounded: '{rounded.md}'
    padding: '10px 16px'
  input:
    backgroundColor: '{colors.surface-dark-raised}'
    textColor: '{colors.ink-dark}'
    rounded: '{rounded.md}'
    padding: '11px 14px'
---

# Design System: Hubora

## Overview

**Creative North Star: "A Cabine de Curadoria"**

O Hubora parece uma cabine pessoal preparada para uma sessão noturna: silenciosa, precisa e densamente útil. O conteúdo fornece cor e emoção; o chrome permanece preto ou branco neutro, e o violeta aparece apenas quando orienta uma decisão, foco ou estado selecionado.

O design serve à tarefa. Busca, categorias, metadados, progresso e fontes são reconhecíveis de imediato; leitura e reprodução reduzem o chrome ao mínimo. A composição é cinematográfica sem imitar um serviço de streaming e familiar sem virar painel administrativo genérico.

**Key Characteristics:**

- conteúdo primeiro, controles depois;
- superfícies tonais planas, com bordas discretas;
- densidade moderada e hierarquia forte;
- um único conjunto Lucide, com semântica estável;
- movimento curto para comunicar estado;
- desktop, tablet, celular, toque, teclado e zoom tratados como o mesmo produto.

## Colors

A paleta combina neutros absolutos com um violeta de orientação. As cores normativas estão no frontmatter; tons de categoria podem colorir somente o ícone ou um detalhe contextual, nunca a estrutura inteira.

### Primary

- **Violeta de decisão:** ação principal, foco, seleção, progresso e confirmação de navegação.
- **Violeta profundo:** hover e estado pressionado; nunca como fundo decorativo de grandes áreas.

### Neutral

- **Canvas de sala escura:** fundo principal do tema escuro.
- **Superfícies de cabine:** três níveis tonais para separar chrome, conteúdo e controles sem sombras decorativas.
- **Tinta e corpo:** texto forte, texto corrente e texto secundário com contraste AA.
- **Sala clara:** tema claro realmente branco, com superfícies cinza neutras e tinta quase preta.

**The One Signal Rule.** O violeta ocupa no máximo o necessário para indicar a próxima ação ou o estado atual. Se duas ações gritam ao mesmo tempo, ambas estão erradas.

**The Content Owns Color Rule.** Capas, backdrops, screenshots e ilustrações reais carregam a cor emocional. O chrome não compete com a mídia.

## Typography

**Display Font:** Inter, com `ui-sans-serif` e fontes do sistema como fallback.
**Body Font:** Inter, com `ui-sans-serif` e fontes do sistema como fallback.

**Character:** uma única família sem serifa mantém o produto rápido e coerente. Peso, tamanho e espaço — não troca arbitrária de fonte — constroem a hierarquia.

### Hierarchy

- **Display** (820, 3rem/2.25rem móvel, 1): somente o título principal de uma superfície; espaçamento nunca menor que `-0.04em`.
- **Headline** (800, 1.75rem, 1.15): seções importantes e identidade de obra.
- **Title** (700, 1rem–1.25rem, 1.3): cards, grupos e diálogos.
- **Body** (450, 1rem, 1.6): instruções, sinopses e mensagens; parágrafos limitados a 65–75 caracteres.
- **Label** (700, 0.8125rem, 1.3): controles e metadados. Caixa alta só para um rótulo excepcional, nunca acima de toda seção.

**The Quiet Label Rule.** Rótulos ajudam a escanear; não viram uma camada de slogans em caixa alta.

## Elevation

O sistema é plano por padrão. Profundidade vem da diferença entre canvas e superfícies, da sobreposição funcional e de bordas discretas. Sombras aparecem somente quando um elemento realmente flutua — menu, diálogo, toast — ou responde ao hover de uma capa.

### Shadow Vocabulary

- **Resposta curta** (`0 8px 8px rgba(0,0,0,.28)`): capa elevada por hover/foco, sem combinar grande blur com borda decorativa.
- **Overlay estrutural** (`0 24px 64px rgba(0,0,0,.52)`): diálogo ou menu fora do fluxo.

**The Flat-At-Rest Rule.** Cards e painéis em repouso não recebem sombras ambientais. Se uma borda já separa a superfície, a sombra é removida.

## Components

### Buttons

- **Shape:** retângulo suavemente curvo (`12px`); botão somente com ícone pode ser circular.
- **Primary:** violeta de decisão, texto branco, altura mínima de `44px`.
- **Hover / Focus:** mudança curta de tom e anel de foco de `3px`; movimento máximo de `2px`, removido em `prefers-reduced-motion`.
- **Secondary / Ghost:** superfície tonal ou transparente; nunca imita a prioridade do primário.
- **Danger:** texto e fundo semântico vermelho, sempre com confirmação quando a ação for irreversível.

### Chips

- **Style:** pílulas compactas para filtro, estado ou metadado curto; não são botões genéricos para qualquer ação.
- **State:** seleção combina texto, fundo e indicação acessível; cor sozinha nunca comunica estado.

### Cards / Containers

- **Corner Style:** `12px` para controles e `16px` para agrupamentos principais.
- **Background:** superfícies tonais; backdrop de obra pode ocupar um hero de detalhe.
- **Shadow Strategy:** plano em repouso, conforme Elevation.
- **Border:** `1px` discreto quando necessário para separação.
- **Internal Padding:** `16px` em controles e `24px` em agrupamentos grandes; cards de mídia não recebem moldura vazia ao redor da capa.

### Inputs / Fields

- **Style:** fundo de superfície, borda discreta, raio de `12px` e altura mínima de `44px`.
- **Focus:** borda forte e anel violeta visível.
- **Error / Disabled:** mensagem no contexto, `aria-describedby`, texto explícito e estado visual que não depende só da cor.

### Navigation

Desktop usa rail lateral e cabeçalho compacto; tablet pode recolher o rail; celular usa barra inferior com quatro destinos primários e acesso progressivo ao restante. Rota atual usa `aria-current`, ícone e superfície selecionada. Menus fecham com `Escape`, devolvem foco e nunca são cortados pelo contêiner.

### Media Card

A capa é a unidade visual. Título e metadados ficam abaixo; avaliação, estado e progresso aparecem somente quando existem em dados reais. A ação de biblioteca ganha nome acessível e feedback persistente. Sem capa, o fallback é neutro e textual — nunca uma arte inventada.

### Player and Readers

O chrome desaparece durante consumo e reaparece por ação do usuário. Controles têm alvo de toque, nome acessível, estado de buffering/erro e saída previsível. Leitores preservam posição e mostram honestamente quando a origem oferece apenas prévia ou link externo.

## Do's and Don'ts

### Do:

- **Do** manter as nove categorias visíveis, únicas e com ícones semanticamente distintos.
- **Do** usar o violeta somente para ação, foco, progresso ou seleção.
- **Do** esperar conteúdo real terminar de carregar antes de remover skeletons e capturar evidência.
- **Do** mostrar estados inicial, carregando, vazio, parcial, offline, erro e sem autorização.
- **Do** preservar foco visível, alvo mínimo de `44px`, contraste AA e reflow a 320 CSS px.
- **Do** explicar se uma fonte é interna, externa, deep link, experimental, indisponível ou exige autenticação.

### Don't:

- **Don't** parecer landing page SaaS, painel administrativo genérico ou streaming fictício.
- **Don't** usar gradiente de texto, brilho neon, glassmorphism como padrão ou gradiente violeta decorativo.
- **Don't** combinar borda de `1px` com sombra decorativa de blur maior ou igual a `16px` no mesmo card.
- **Don't** usar raio maior que `16px` em cards e seções; pílulas são reservadas a chips e controles apropriados.
- **Don't** colocar um pequeno eyebrow em caixa alta acima de toda seção.
- **Don't** transformar cada informação em card, badge ou modal.
- **Don't** usar dados, capas, títulos, progresso, avaliações ou provedores fictícios do protótipo visual.
- **Don't** ocultar assinatura, erro externo, falta de licença ou integração incompleta atrás de uma ação visualmente ativa.
- **Don't** apresentar o Cofre como décima categoria ou permitir que seu conteúdo apareça em compartilhamentos, recomendações ou Wrapped.
