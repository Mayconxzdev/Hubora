# Hubora — sistema de design inicial

Status: `IMPLEMENTING`. Este documento define o contrato; os tokens atuais ainda precisam ser migrados e verificados.

## Camadas de tokens

1. **Primitivos:** escala neutra, violeta, tipografia, espaços, raios, duração e elevação.
2. **Semânticos:** fundo, superfície, texto, borda, foco, seleção, sucesso, aviso, erro e Cofre.
3. **Componente:** botão, campo, navegação, mídia, tabela, dialog, toast, player e leitor.

Componentes não devem consumir cores primitivas diretamente quando existir token semântico.

## Cores semânticas propostas

| Token | Escuro | Claro | Uso |
|---|---|---|---|
| `--hub-bg` | `#000000` | `#ffffff` | Base da aplicação |
| `--hub-surface-1` | `#090909` | `#f7f7f8` | Seção elevada |
| `--hub-surface-2` | `#111113` | `#eeeeef` | Controle/linha selecionável |
| `--hub-text` | `#f7f7f8` | `#111113` | Texto primário |
| `--hub-text-muted` | `#a1a1aa` | `#52525b` | Texto secundário |
| `--hub-border` | `#27272a` | `#d4d4d8` | Divisores e controles |
| `--hub-accent` | `#8b7cf6` | `#6757d9` | Ação, seleção e progresso |
| `--hub-focus` | `#b8adff` | `#4f3fca` | Anel de foco |
| `--hub-success` | `#34d399` | `#087f5b` | Sucesso/saúde |
| `--hub-warning` | `#fbbf24` | `#9a6700` | Atenção/requisito |
| `--hub-danger` | `#fb7185` | `#b42335` | Erro/bloqueio |
| `--hub-vault` | `#c084fc` | `#7e22ce` | Cofre, sempre com rótulo |

Os valores são ponto de partida e só se tornam `VERIFIED` após medição de contraste em todos os estados.

## Tipografia

- Uma única família principal variável ou uma pilha de sistema de alta qualidade.
- Títulos podem usar pesos altos; corpo não deve parecer condensado.
- Escala responsiva com `clamp`, sem saltos bruscos.
- Corpo mínimo de 16 px em leitura longa; metadados técnicos nunca abaixo de 12 px.
- Comprimento de linha: 45–75 caracteres em leitor e textos longos.

## Espaçamento e forma

- Unidade base: 4 px.
- Escala recomendada: 4, 8, 12, 16, 24, 32, 48, 64.
- Raios: 8 para controles, 12 para mídia compacta, 16–20 apenas em superfícies principais.
- Alvos de toque: mínimo 44 × 44 px.
- A interface usa alinhamento e espaço; bordas arredondadas não substituem hierarquia.

## Componentes essenciais

### Botão

Variantes: primário, secundário, ghost, destrutivo e link. Estados: default, hover, active, focus-visible, loading e disabled. Ícone sem texto exige nome acessível e tooltip quando não for óbvio.

### Campo e busca

Rótulo visível ou nome acessível equivalente, ajuda separada do erro, validação sem depender apenas de cor e botão de limpar. Busca global mostra escopo e atalhos sem bloquear teclado móvel.

### Unidade de mídia

Poster/capa, título real, tipo/ano opcional, estado pessoal e uma ação principal. Badges só comunicam fatos. Skeleton preserva proporção. Imagem ausente usa placeholder neutro com título; nunca capa inventada.

### Tabela/lista de saúde

Colunas responsivas, ordenação identificada, cabeçalho acessível, filtros removíveis, estado vazio, última verificação com data/hora e expansão de falhas. No celular, transforma cada linha em grupo rotulado, não em tabela espremida.

### Dialog e painel lateral

Foco preso, retorno de foco, título, descrição quando necessária, `Escape`, prevenção de scroll de fundo e confirmação para ação destrutiva.

### Toast

Confirma efeitos transitórios; erros persistentes também aparecem junto ao contexto. Não é o único lugar para informação crítica.

### Player e leitor

Controles operáveis por teclado/toque, legendas, velocidade quando aplicável, estado de buffering/erro, retomada e saída previsível. Leitores possuem fonte/tamanho/tema, marcador, progresso e navegação estrutural quando o formato oferecer.

## Iconografia e imagens

- Um único conjunto de ícones, traço e tamanho consistentes.
- Ícone não substitui texto em ações ambíguas.
- Imagens externas usam origem conhecida, `alt` contextual e política de referrer/CSP.
- Backdrops recebem tratamento de contraste local, sem escurecer toda a página indiscriminadamente.

## Estados obrigatórios

Todo componente de dados deve prever: inicial, carregando, sucesso com dados, vazio, parcial, desatualizado, erro recuperável, erro bloqueante, offline e sem autorização.
