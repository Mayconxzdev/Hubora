# Direção visual inicial

## Evidência observada

O build local apresenta identidade predominantemente preta/branca, acento violeta, tipografia display forte, navegação lateral, busca global e superfícies de conteúdo com baixo contraste de elevação. Home, Providers e Personal Media foram capturadas após a primeira fatia em `output/playwright/category-removal/`.

## Resultado da consulta UI UX Pro Max

A busca para uma plataforma pessoal de entretenimento sugeriu:

- padrão `Video-First Hero`;
- estética flat touch-first;
- paleta monocromática com azul;
- Cormorant Garamond/Crimson Pro;
- ausência de sombras e feedback imediato.

## Avaliação

Não aplicar o pacote sugerido como design system do Hubora.

Motivos:

1. Um hero em vídeo compete com o objetivo de decisão rápida e aumenta custo de rede/renderização.
2. O baseline já possui precache de aproximadamente 2,5 MiB e chunk HLS acima de 500 KiB; adicionar vídeo não é justificável sem medição.
3. Azul e serifas editoriais substituiriam, em vez de preservar, a identidade atual.
4. A proposta é genérica para landing page; o Hubora é uma aplicação de uso recorrente e densa em conteúdo.

## Direção recomendada para validação humana

- Preservar preto real/branco real e acento violeta como base.
- Tratar posters/capas como principal fonte de cor.
- Manter hierarquia compacta, conteúdo primeiro e estados explícitos.
- Criar tokens semânticos para superfícies, texto, foco, sucesso, aviso, erro e mídia adulta.
- Suportar `prefers-reduced-motion`, foco visível e contraste WCAG 2.2 AA.
- Validar 320/375, 768, 1024, 1440 e um viewport 10-foot/TV antes de redesenhar layouts.

## Bloqueio Impeccable

`PRODUCT.md` não foi criado. O fluxo `impeccable:init` exige pelo menos uma rodada real de respostas do proprietário sobre usuário, personalidade, referências e anti-referências antes de materializar o contexto de produto. As perguntas estão registradas no handoff da auditoria.
