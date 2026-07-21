# Hubora — acessibilidade

Meta: WCAG 2.2 nível AA. Status global atual: `PARTIAL`; ainda não existe auditoria completa automatizada e manual.

## Requisitos não negociáveis

- Operação completa por teclado, sem armadilha de foco.
- Foco visível com contraste suficiente.
- Ordem de foco coerente com a ordem visual.
- Landmarks, títulos e hierarquia de headings corretos.
- Nome, função, valor e estado expostos para controles.
- Contraste AA em texto, ícones informativos, bordas necessárias e foco.
- Zoom de 200% sem perda de conteúdo e reflow a 320 CSS px.
- Alvos mínimos de 24 × 24 CSS px; meta do produto 44 × 44 para toque.
- Erros identificados em texto e ligados ao campo.
- `prefers-reduced-motion`, `prefers-contrast` quando possível e ausência de flashes.
- Legendas e alternativas fornecidas pela origem quando disponíveis; o Hubora não afirma gerar acessibilidade inexistente.

## Navegação

- Link “pular para o conteúdo”.
- Sidebar e navegação móvel com nome acessível.
- Rota atual indicada semanticamente.
- Command palette não sequestra atalhos do navegador/leitor de tela.
- Mudança de rota atualiza título e posiciona foco de forma previsível.

## Conteúdo de mídia

- Poster decorativo usa `alt=""`; poster informativo usa o título da obra sem redundância.
- Player expõe play/pause, tempo, volume, legenda, tela cheia e erros.
- Autoplay com som é proibido.
- Trailer incorporado possui título que inclui obra e tipo do vídeo.
- Leitor permite tamanho, espaçamento, largura e tema; progresso não depende apenas de porcentagem visual.
- Quadrinhos/mangás permitem direção e modo de leitura quando o conteúdo suportar.

## Estados e anúncios

- Loading longo usa `aria-busy` e texto não intrusivo.
- Resultados de busca e salvamento usam live region moderada.
- Toast crítico não desaparece antes de poder ser lido e também fica no contexto.
- Saúde do provedor usa texto (`Disponível`, `Parcial`, `Indisponível`), não somente verde/amarelo/vermelho.

## Temas

Claro e escuro passam pelos mesmos testes. Cofre, erro, sucesso e aviso nunca dependem apenas de matiz. O tema escolhido é persistido e não deve produzir flash agressivo na inicialização.

## Matriz de validação

Antes de release candidate:

- axe ou equivalente em rotas críticas;
- navegação manual somente por teclado;
- NVDA + Chromium no Windows;
- TalkBack + Chromium em Android real ou ambiente equivalente documentado;
- zoom 200% e reflow 320 px;
- claro/escuro e redução de movimento;
- player, leitor, formulário de login, detalhes, busca, fontes e Cofre.

Cada falha recebe severidade, rota, componente, passos, evidência e versão. Nenhum `VERIFIED RELEASE` é permitido com violação crítica/alta aberta nos fluxos essenciais.
