# Hubora — mapa semântico de ícones

Biblioteca única: `lucide-react`. Ícone é apoio; ações ambíguas mantêm texto ou nome acessível.

## Categorias oficiais

| Categoria | Ícone | Chave canônica | Motivo |
|---|---|---|---|
| Filmes | `Clapperboard` | `clapperboard` | produção cinematográfica |
| Séries | `Tv` | `tv` | conteúdo episódico televisivo |
| Doramas | `Drama` | `drama` | domínio dramático próprio |
| Animes | `Zap` | `zap` | energia visual sem reutilizar TV |
| Mangás | `Layers3` | `layers` | sequência de capítulos/volumes |
| Quadrinhos | `PanelsTopLeft` | `panels` | painéis de HQ |
| Livros | `BookOpen` | `book-open` | leitura editorial |
| Novels | `ScrollText` | `scroll-text` | narrativa seriada textual |
| Jogos | `Gamepad2` | `gamepad` | interação de jogo |

O registro executável está em `src/config/navigation.ts` e alimenta Home, menu e command palette.

## Ações transversais

| Semântica | Ícone primário | Proibido confundir com |
|---|---|---|
| buscar | `Search` | descobrir (`Compass`) |
| descobrir | `Compass` | Radar (`Activity`) |
| reproduzir | `Play`/`PlayCircle` | continuar progresso genérico |
| biblioteca | `Library` | livro (`BookOpen`) |
| adicionar | `Plus` | criar conta |
| editar | `Edit3` | progresso rápido |
| concluído | `Check`/`CheckCircle2` | salvar |
| configurações | `Settings` | diagnóstico |
| fontes | `Cable`/`Server` | conteúdo aberto |
| conteúdo aberto | `Globe2`/`LibraryBig` | provedor configurado |
| privacidade | `ShieldCheck` | Cofre (`Lock`) |
| Cofre | `Lock` | logout |
| tema | `Sun`/`Moon` | brilho de player |
| notificações | `Bell` | lançamentos (`CalendarDays`) |
| erro | `CircleAlert` | aviso (`TriangleAlert`) |

## Tamanhos

- `14–16px`: metadado ou rótulo compacto;
- `17–20px`: botão, navegação e campo;
- `21–24px`: estado vazio ou destaque curto;
- acima de `24px`: somente estado vazio/ilustração funcional, nunca decoração recorrente.
