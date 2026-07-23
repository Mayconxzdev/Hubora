# Redesign Hubora — inventário de rotas

Status: `IMPLEMENTING`. Inventário extraído de `src/App.tsx`; controles serão refinados durante cada fatia.

| Rota | Superfície | Acesso | Controles/estados essenciais | Cenários |
|---|---|---|---|---|
| `/` | Home | todos | quatro decisões, nove categorias, recomendação, rails, fontes, vazio/populado | HOME-001..009 |
| `/discover` | Descobrir | todos | busca global, filtros, abas, Quick Pick, Vibe, Scene, vazio/erro | DISC-001..010 |
| `/radar` | Radar | todos | texto, URL, imagem/OCR, vídeo, consentimento, confiança, biblioteca | RADAR-001..010 |
| `/details/:id` | Detalhes | todos | identidade, abas, metadados, trailer, fontes, biblioteca, progresso | DETAIL-001..018 |
| `/library` | Biblioteca | todos | busca, categoria, status, ordem, grade/lista, modal, vazio/populado | LIB-001..012 |
| `/diary` | Diário | todos | filtros, totais, cronologia, eventos, vazio | DIARY-001..007 |
| `/guide` | Guia | todos | busca de franquia, ordem, visto/não visto, persistência | GUIDE-001..007 |
| `/releases` | Lançamentos | todos | busca, período, ano, tipo, inscrições, notificações | REL-001..009 |
| `/profile` | Perfil | todos | estado visitante/conta, dados, estatísticas, privacidade, logout | PROFILE-001..007 |
| `/settings` | Configurações | todos | tema, idioma, preferências, Cofre, sync, backup, import/export, reset | SET-001..022 |
| `/login` | Entrar | todos | convidado, Google, e-mail, credencial inválida, confirmação | AUTH-001..008 |
| `/register` | Cadastro | todos | visitante, e-mail/senha, validação, confirmação, sessão imediata | AUTH-009..014 |
| `/forgot-password` | Recuperação | todos | e-mail, resposta genérica, retorno seguro | AUTH-015..018 |
| `/movies` | Filmes | todos | abas, busca, gêneros, ordem, paginação, cards | CAT-MOV-001..012 |
| `/series` | Séries | todos | busca, filtros, temporadas, episódios, provedores | CAT-TV-001..012 |
| `/doramas` | Doramas | todos | busca, país/idioma, classificação correta, temporadas | CAT-DRA-001..012 |
| `/anime` | Animes | todos | populares, temporada, avaliação, episódios, vídeos, filtro adulto | CAT-ANI-001..012 |
| `/manga` | Mangás | todos | busca, capítulos, volumes, idiomas, leitor, progresso | CAT-MAN-001..014 |
| `/comics` | Quadrinhos | todos | busca, edição, autores, formatos, leitor/amostra | CAT-COM-001..014 |
| `/books` | Livros | todos | busca, edição, ISBN, prévia/completo/externo, leitor | CAT-BOO-001..014 |
| `/novels` | Novels | todos | busca, índice, capítulos, ordem, histórico, leitor/externo | CAT-NOV-001..014 |
| `/games` | Jogos | todos | busca, plataformas, lojas, modal, estados, horas, nota | CAT-GAM-001..016 |
| `/privacy` | Privacidade | todos | explicação convidado/conta/Cofre, links | LEGAL-001 |
| `/terms` | Uso responsável | todos | limites de fontes, compras e conteúdo | LEGAL-002 |
| `/wrapped` | Wrapped | todos | ano, preview, download/share, exclusão do Cofre | WRAP-001..006 |
| `/goals` | Metas | todos | criar, validar, progredir, editar, excluir | GOAL-001..007 |
| `/connections` | Conexões | todos | grafo, nós, zoom, seleção, vazio/erro | GRAPH-001..007 |
| `/vault` | Cofre Adulto | elegível | PIN, lockout, revelar, bloquear, isolamento, vazio | VAULT-001..014 |
| `/sources` | Conteúdo aberto | todos | pesquisa, fonte, abrir player/leitor/externo, provider manifest | SOURCE-001..012 |
| `/providers` | Provedores | todos | busca, filtros, capacidade, modo, saúde, verificação | PROVIDER-001..012 |
| `/reader` | Leitor | todos | fonte, páginas/capítulos, modo, direção, zoom/tipo, posição, erro | READER-001..016 |
| `/player` | Player | todos | URL segura, play/pause, seek, volume, tela cheia, erro | PLAYER-001..014 |
| `/insights` | Insights | todos | resumos derivados, estados sem dados e privacidade | INSIGHT-001..006 |
| `/personal-media` | legado | todos | redireciona para `/sources` | ROUTE-LEG-001 |
| `/community` | legado | todos | redireciona para `/` | ROUTE-LEG-002 |
| `/duo` | legado | todos | redireciona para `/` | ROUTE-LEG-003 |
| `*` | Não encontrada | todos | mensagem, início, voltar, busca | ROUTE-404-001 |

## Chrome transversal

| Área | Controles | Cenários |
|---|---|---|
| rail desktop | início, descobrir, biblioteca, expandir/recolher, configurações | NAV-001..005 |
| cabeçalho | busca, categorias, tema, notificações, perfil | NAV-006..012 |
| menu de categorias | nove categorias exatas, fontes, conteúdo aberto | NAV-013..015 |
| navegação móvel | quatro destinos, foco, safe area, “mais” progressivo | NAV-016..020 |
| command palette | abrir, filtrar, navegar, Escape, foco | NAV-021..025 |
| navegador | voltar, avançar, deep link, refresh, rota desconhecida | NAV-026..031 |
| footer | fontes, privacidade, termos e atribuição | NAV-032..034 |

## Regra de fechamento

Uma linha só recebe cobertura concluída quando cada controle visível possui cenário ou exclusão justificada, e quando os estados loading, sucesso, vazio, erro, offline e permissão aplicáveis foram observados.
