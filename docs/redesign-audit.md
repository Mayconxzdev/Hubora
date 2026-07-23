# Auditoria Geral do Redesign Cinematográfico do Hubora

> Documento de diagnóstico, inventário de rotas, funcionalidades, fontes de dados e plano de migração para o Hubora 9.0.0.

---

## 1. Visão Geral da Stack e Arquitetura Real

- **Framework**: React 19 + TypeScript 6
- **Build Tool**: Vite 7
- **Estilização**: Tailwind CSS v4 + Vanilla CSS Design Tokens (`src/index.css`)
- **Roteamento**: React Router DOM v7 (modo Single Page Application com transições animadas)
- **Gerenciamento de Estado**: Zustand v5 + IDB Persist (`idb-keyval`, Dexie) + TanStack Query v5
- **Backend / Persistência**: Express / tsx (`server.ts`) + Supabase (@supabase/supabase-js) + Netlify Serverless Functions
- **Mídias e Reprodução**: HLS.js (Player de vídeo), Tesseract.js (OCR), Papaparse (CSV), Reader (PDF/EPUB)
- **Suíte de Testes**: Vitest (99 testes unitários/integração) + Playwright (E2E e acessibilidade axe-core)

---

## 2. Inventário Completo de Rotas Reais e Status de Migração

| Rota | Descrição / Domínio | Categoria | Estado Atual | Ação no Redesign |
| :--- | :--- | :--- | :--- | :--- |
| `/` | Home (Central Pessoal) | Início | Funcional | Redesenhar com Hero cinematográfico, trilhas por atividade e busca instantânea |
| `/discover` | Descobrir & Busca Global Federada | Explorar | Funcional | Implementar modal/popover federado instantâneo + página de resultados com tabs |
| `/radar` | Radar de Atualizações & Lançamentos | Explorar | Funcional | Redesenhar painel de alertas, lançamentos e acompanhamento de obras |
| `/details/:id` | Detalhes do Conteúdo | Mídia | Funcional | Reconstruir layout com base exata na `referencia.png` |
| `/library` | Minha Lista & Coleções | Minha Coleção | Funcional | Redesenhar filtros, visualização em grid/lista e progresso |
| `/diary` | Diário de Consumo | Minha Coleção | Funcional | Timeline cinematográfica com logs de episódios/capítulos/jogos |
| `/guide` | Guia de Calendário e Franquias | Explorar | Funcional | Calendário visual de lançamentos por data e ordem cronológica |
| `/releases` | Próximos Lançamentos | Explorar | Funcional | Lista de lançamentos com filtros por tipo de mídia |
| `/profile` | Perfil do Usuário | Sistema | Funcional | Estatísticas, nivelamento, avatar e dados de conta |
| `/settings` | Configurações do Sistema | Sistema | Funcional | Painel limpo com abas de Aparência, Fontes, Sincronização e Dados |
| `/movies` | Catálogo de Filmes | Biblioteca | Funcional | Grid com metadados de filmes (ano, duração, resolução, fontes) |
| `/series` | Catálogo de Séries | Biblioteca | Funcional | Grid com metadados de séries (temporadas, episódios, status) |
| `/anime` | Catálogo de Animes | Biblioteca | Funcional | Grid com animes (estúdio, episódios, temporada) |
| `/manga` | Catálogo de Mangás | Biblioteca | Funcional | Grid com autor, volumes, capítulos e progresso de leitura |
| `/comics` | Catálogo de Quadrinhos | Biblioteca | Funcional | Grid de HQs com edições, autores e arcos |
| `/books` | Catálogo de Livros | Biblioteca | Funcional | Grid de livros com autor, páginas, formato e progresso |
| `/novels` | Catálogo de Novels | Biblioteca | Funcional | Grid de webnovels/light novels com capítulos e tradução |
| `/games` | Catálogo de Jogos | Biblioteca | Funcional | Grid de jogos com plataformas, tempo jogado e lojas |
| `/doramas` | Catálogo de Doramas | Biblioteca | Funcional | Grid com episódios, emissora e progresso |
| `/vault` | Cofre Pessoal / Adulto | Minha Coleção | Funcional | Proteção por PIN, derivação PBKDF2 e isolamento de mídia |
| `/sources` | Fontes Gratuitas / Mídia Pessoal | Sistema | Funcional | Integração Jellyfin, Plex, Emby e arquivos locais |
| `/providers` | Provedores de Metadados e APIs | Sistema | Funcional | Configuração de TMDB, AniList, IGDB, OpenLibrary, Jikan |
| `/reader` | Leitor da Aplicação | Mídia | Funcional | Leitor imersivo para EPUB, PDF e Mangá com controles de tema |
| `/player` | Player de Mídia | Mídia | Funcional | Player customizado HLS/HTML5 com suporte a faixas, áudio e legendas |
| `/insights` | Insights & Métricas | Minha Jornada | Funcional | Gráficos de tempo de consumo por categoria e hábitos |
| `/goals` | Metas de Consumo | Minha Jornada | Funcional | Progresso de metas anuais/mensais de leitura e maratonas |
| `/wrapped` | Retrospectiva | Minha Jornada | Funcional | Resumo cinematográfico do ano de consumo |
| `/connections` | Conexões Sociais | Minha Jornada | Funcional | Amigos, estatísticas compartilhadas e recomendações |
| `/login` | Autenticação (Entrar) | Auth | Funcional | Formulário acessível, suporte a Supabase/Local e mensagens de erro |
| `/register` | Autenticação (Cadastro) | Auth | Funcional | Cadastro com validação e aceite de termos |
| `/forgot-password` | Recuperação de Senha | Auth | Funcional | Formulário de redefinição via e-mail |
| `/privacy` | Políticas de Privacidade | Público | Funcional | Documentação jurídica e retenção de dados |
| `/terms` | Termos de Serviço | Público | Funcional | Regras da plataforma e licença AGPL |
| `*` | Página 404 (Não Encontrada) | Sistema | Funcional | Página amigável de redirecionamento |

---

## 3. Fontes de Dados e Integrações Reais

1. **Catálogos Oficiais**:
   - TMDB (Filmes, Séries, Doramas)
   - AniList & Jikan (Animes e Mangás)
   - IGDB & RAWG (Jogos)
   - Google Books & OpenLibrary (Livros, HQs, Novels)
2. **Servidores Domésticos & Mídia Pessoal**:
   - Jellyfin / Emby REST API
   - Plex Media Server API
   - Cofre local cifrado em IndexedDB
3. **Persistência Local**:
   - Dexie / IDB Key-Val para estado offline instantâneo
   - Sync bidirecional com Supabase quando autenticado

---

## 4. Matriz de Estados Exigidos

Todas as views e componentes devem suportar os seguintes estados:
1. `loading`: Skeletons animados com proporção idêntica ao conteúdo.
2. `empty`: Mensagens honestas com ação recomendada.
3. `error`: Mensagens explicativas em português simples com opção de tentar novamente.
4. `partial_error`: Resiliência em consultas federadas sem derrubar toda a página.
5. `authenticated` vs `guest`: Modos adaptativos mantendo privacidade local.
