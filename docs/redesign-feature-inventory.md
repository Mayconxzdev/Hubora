# Redesign Hubora — inventário funcional

Status em 2026-07-22. `IMPLEMENTED` significa que existe código; não significa prova remota ou release verificada.

| Domínio | Capacidade | Estado | Fonte principal de verdade | Próxima prova |
|---|---|---|---|---|
| acesso | link compartilhável | IMPLEMENTED_LOCAL | Netlify flags + `accessConfiguration` | deploy por SHA |
| acesso | convidado local | IMPLEMENTED_LOCAL | IndexedDB/local state | refresh, novo contexto, offline |
| auth | cadastro e-mail | IMPLEMENTED_LOCAL | Supabase Auth | conta remota e confirmação |
| auth | Google OAuth | PARTIAL | Supabase/Google | configuração e login reais |
| auth | recuperação | PARTIAL | Supabase Auth | e-mail/recovery real |
| segurança | isolamento por conta | IMPLEMENTED_LOCAL | migration 005 RLS | dois usuários remotos |
| catálogo | nove categorias | IMPLEMENTED_LOCAL | registro canônico + adapters | 18 títulos reais |
| descoberta | busca/filtros/Quick Pick/Vibe/Scene | PARTIAL | adapters e heurísticas | matriz real/error/offline |
| radar | texto/URL/imagem/vídeo | PARTIAL | OCR/adapters/proxies | arquivos locais seguros e consentimento |
| biblioteca | CRUD/status/progresso/nota | IMPLEMENTED_LOCAL | Dexie/Zustand/cloud | sync entre contextos |
| consumo | player | PARTIAL | player policy + hosts autorizados | 30 s fonte autorizada |
| consumo | leitores | PARTIAL | Google/PDF/EPUB/MangaDex | 3 páginas + posição |
| jogos | fluxo manual | IMPLEMENTED_LOCAL | modal + biblioteca | sequência completa E2E |
| diário | eventos e totais | IMPLEMENTED_LOCAL | repository/store | assistir/ler/jogar reais |
| fontes | catálogo e manifestos | PARTIAL | provider catalog/protocol | saúde e destinos reais |
| cofre | PIN/privacidade | PARTIAL | adult policy/local security | classificação adulta real + lockout |
| PWA | manifest/SW/offline | PARTIAL | VitePWA/Workbox | instalação, update, offline/online |
| visual | contratos/tokens | IMPLEMENTED_LOCAL | `DESIGN.md` | todas as rotas migradas |
| acessibilidade | teclado/contraste/reflow | PARTIAL | componentes/testes | axe + manual + NVDA |
| performance | budgets | PARTIAL | E2E laboratório | todas as rotas críticas |

## Títulos obrigatórios

Nenhuma substituição silenciosa é permitida: Interestelar, O Poderoso Chefão, Stranger Things, Breaking Bad, Pousando no Amor, Uma Advogada Extraordinária, Fullmetal Alchemist: Brotherhood, Attack on Titan, One Piece, Chainsaw Man, Batman: O Cavaleiro das Trevas, Spider-Man: Blue, Dom Casmurro, A Metamorfose, Solo Leveling, Overlord, Cyberpunk 2077 e Hades.

Obras adicionais autorizadas podem provar player ou leitor, mas não convertem uma busca obrigatória ausente em sucesso.
