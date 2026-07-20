# Direção visual aprovada

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

## Decisão do proprietário

Em 2026-07-20, o proprietário escolheu a Sonda A como experiência principal. A
Sonda B será usada somente como referência para o tema claro. A Sonda C será
usada somente em Fontes, Saúde e Diagnóstico, onde a densidade técnica é útil.

Essa decisão está consolidada em `PRODUCT.md`, `DESIGN.md`, `DESIGN_SYSTEM.md`
e `ACCESSIBILITY.md`. Não existe mais bloqueio de entrevista visual para iniciar
o planejamento; a implementação permanece pendente e será incremental.

## Correções identificadas na interface atual

- reduzir cards aninhados e superfícies arredondadas sem função;
- não exibir contagens promocionais de provedores sem status/evidência;
- substituir placeholders de recomendação por estados vazios honestos;
- remover toda a superfície do Companion;
- criar rota e experiência próprias para Novels;
- preservar a mesma estrutura em claro/escuro;
- validar 320, 375, 768, 1024 e 1440 px; TV está fora do escopo.
