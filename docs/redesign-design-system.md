# Design System Cinematográfico — Hubora 9.0.0

> Especificação de Tokens, Cores, Tipografia, Layout, Componentes e Diretrizes Visuais baseados na referência principal `referencia.png`.

---

## 1. Paleta de Cores e Tokens Visuais (Dark Cinematic Theme)

| Token CSS | Valor | Uso / Aplicação |
| :--- | :--- | :--- |
| `--hub-bg` | `#0B0D12` | Fundo principal da aplicação (Preto/Azul escuro profundo) |
| `--hub-bg-elevated` | `#0E1017` | Fundo elevado de superfícies |
| `--hub-surface-1` | `#131620` | Cards, painéis laterais e superfícies primárias |
| `--hub-surface-2` | `#1A1D2B` | Campos de formulário, botões secundários |
| `--hub-surface-3` | `#24283B` | Superfície em destaque/hover |
| `--hub-surface-glass` | `rgba(19, 22, 32, 0.85)` | Blur/Glassmorphism discreto |
| `--hub-brand` | `#6D4AFF` | Roxo accent primário de ações, foco e seleção |
| `--hub-brand-strong` | `#5A38E6` | Roxo forte para hover de botões |
| `--hub-brand-soft` | `rgba(109, 74, 255, 0.16)` | Fundo suave de chips e selecionados |
| `--hub-brand-glow` | `rgba(109, 74, 255, 0.35)` | Brilho suave em botões e progressos atômicos |
| `--hub-text` | `#E2E8F0` | Texto corrido de alto contraste |
| `--hub-text-strong` | `#FFFFFF` | Títulos e destaques |
| `--hub-muted` | `#94A3B8` | Subtítulos, metadados e legendas |
| `--hub-border` | `rgba(255, 255, 255, 0.08)` | Bordas sutis de baixo contraste |
| `--hub-border-strong` | `rgba(255, 255, 255, 0.16)` | Bordas em hover ou ativas |

---

## 2. Tipografia e Hierarquia

- **Fonte Principal**: `Inter`, `SF Pro Display`, `system-ui`
- **Títulos Hero**: `font-weight: 850`, `letter-spacing: -0.04em`, `line-height: 0.95`
- **Títulos de Seção**: `font-weight: 780`, `letter-spacing: -0.03em`
- **Metadados**: `font-size: 0.85rem`, `color: var(--hub-muted)`

---

## 3. Mapeamento Unificado de Ícones (`Lucide React`)

Centralizado em `src/config/iconRegistry.ts`:
- **Início**: `Home`
- **Filmes**: `Clapperboard`
- **Séries**: `Tv`
- **Doramas**: `Sparkles`
- **Animes**: `Flame`
- **Mangás**: `BookOpen`
- **Quadrinhos**: `Layers`
- **Livros**: `Book`
- **Novels**: `FileText`
- **Jogos**: `Gamepad2`
- **Biblioteca / Minha Lista**: `Bookmark`
- **Favoritos**: `Heart`
- **Diário**: `Calendar`
- **Histórico**: `History`
- **Cofre**: `ShieldCheck`
- **Fontes**: `Server`
- **Provedores**: `Cable`
- **Configurações**: `Settings`
- **Perfil**: `User`
- **Busca**: `Search`
- **Reproduzir / Continuar**: `Play`
