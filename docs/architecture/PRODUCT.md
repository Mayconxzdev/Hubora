# Hubora — definição de produto

Status do documento: `VERIFIED` como decisão de produto; os recursos descritos possuem seus próprios estados na matriz de evidências.

## Propósito

Hubora é uma plataforma pessoal e privada, em português do Brasil, para descobrir, decidir, acompanhar, assistir, ler e organizar entretenimento em uma única experiência. Ele não promete possuir o conteúdo: reúne identidade, metadados, progresso e acessos autorizados, deixando explícito quando algo abre internamente, exige um serviço externo ou ainda não foi verificado.

## Usuário e ambiente

- Proprietário inicial: uma pessoa, usando computador e celular.
- Persistência desejada: local-first com sincronização privada posterior pelo Supabase.
- Hospedagem desejada: Netlify, após autorização e configuração remota explícitas.
- Expansão futura: familiares convidados, com papéis e isolamento de dados.
- Região, idioma e prioridade editorial: Brasil e PT-BR.
- Não existe requisito de TV, NAS ou biblioteca local obrigatória.

## Resultado principal

O usuário deve poder responder rapidamente a uma pergunta: “o que combina comigo agora e como eu acesso isso de verdade?”. Quando entrar em um item, deve encontrar uma página completa daquela obra, com dados reais disponíveis, relações, temporadas/capítulos/volumes quando aplicável, progresso, disponibilidade, fontes e trailers oficiais sem sair da página quando a incorporação for permitida.

## Escopo de mídia

As nove categorias possuem a mesma prioridade máxima:

1. Filmes
2. Séries
3. Doramas
4. Anime
5. Mangá
6. Quadrinhos
7. Livros
8. Novels
9. Jogos

`Novels` inclui light novels, webnovels, fanfics, ficção serializada e obras originais publicadas por capítulos.

O `Cofre` é um contexto transversal opcional para conteúdo adulto ou sensível. Não é uma décima categoria. A ausência de PIN obrigatório é uma decisão do proprietário e deve permanecer acompanhada de aviso de risco e isolamento por conta.

## Fora de escopo

- Categoria independente de audiolivros, música, podcasts, cursos, esportes, shows, concertos, documentários, programas de TV ou conteúdo genérico do YouTube.
- Documentário pode existir apenas como gênero de filme/série.
- Hubora Companion, scan automático de arquivos, pastas, programas ou jogos locais.
- Playnite, leitura automática de bibliotecas Steam/Epic/GOG ou execução de `.exe`.
- Engine torrent local e armazenamento de tokens de debrid.
- Interface de TV ou controle remoto.
- Área social pública.
- Dependência obrigatória de serviço pago.

## Princípios do produto

### Verdade antes de promessa

- Nome no diretório não significa integração.
- Homepage acessível não significa API, incorporação ou reprodução.
- Mock não comprova provedor externo.
- `VERIFIED` exige cenário real, reproduzível e evidência registrada.
- Falhas e requisitos externos devem aparecer na interface em linguagem direta.

### Todas as categorias são produtos completos

Cada categoria precisa do seu fluxo ideal, sem copiar mecanicamente o fluxo de filmes:

- audiovisual: temporadas, episódios, elenco, trailers, legendas e fontes;
- livros: edições, autores, formatos, leitor, marcadores e progresso;
- novels: capítulos, índice, leitor tipográfico, histórico e atualização;
- mangá/quadrinhos: volumes, capítulos, leitor vertical/paginado e direção de leitura;
- jogos: plataformas, tempo estimado, estados manuais e lojas/fontes externas.

### Acesso explícito

Cada opção de acesso deve declarar uma destas situações:

- reproduz ou lê dentro do Hubora;
- abre um aplicativo por deep link;
- abre uma página oficial externa;
- requer login/configuração;
- está indisponível ou ainda não foi testada.

### Pessoal e privado

- Cadastro público não concede acesso automaticamente.
- Primeira entrega: somente o proprietário.
- Convites e familiares ficam preparados no modelo, mas não simulados na interface.
- Nenhuma biblioteca, progresso ou Cofre é público.

## Experiência principal

### Início

A Home começa pela intenção do usuário, usando quatro situações: continuar, pouco tempo, descobrir e surpreender. Categorias, itens em andamento, novidades e disponibilidade entram depois, com densidade progressiva. Recomendações só aparecem quando houver base real para justificá-las.

### Busca e Radar

A busca é global para títulos, pessoas, franquias, capítulos, provedores e identificadores digitados. O Radar aceita texto, imagem e OCR; leitura de ISBN/código de barras pela câmera não entra. Identificação por imagem deve declarar confiança e fonte, sem inventar certeza.

### Detalhes

A página de detalhes é a central de uma obra. Ela deve combinar, conforme a categoria:

- identidade canônica e IDs externos;
- título, sinopse, gêneros, datas, duração e classificação;
- pessoas/autores/estúdios/editoras;
- temporadas, episódios, volumes ou capítulos;
- relações, adaptações, franquia e ordem recomendada;
- progresso e estado pessoal;
- disponibilidade no Brasil;
- opções de acesso com origem e requisito claros;
- trailers reais em abas como teaser, trailer oficial 1 e trailer oficial 2, quando a fonte oficial disponibilizar e permitir incorporação.

Nenhuma aba vazia deve existir apenas para completar layout. Dados ausentes geram estado vazio explícito.

### Player e leitores

- HTTPS web-ready e HLS/DASH compatível podem abrir no player interno.
- YouTube autorizado usa incorporação.
- `infoHash`, magnet e `notWebReady` não são reproduzíveis diretamente no navegador.
- Se o usuário configurar Stremio Service, o Hubora pode encaminhar recursos compatíveis; sem ele, oferece deep link ao aplicativo Stremio; sem aplicativo, informa o requisito.
- EPUB, PDF, HTML, TXT e formatos de quadrinhos só são anunciados quando realmente suportados e testados.

### Jogos

Jogos são adicionados e atualizados manualmente. Estados previstos: desejado, possuído, instalado, jogando e concluído. “Instalado” é uma declaração do usuário; o Hubora não vasculha nem abre programas locais.

## Fontes e provedores

O registro oficial separa metadados, conteúdo aberto, servidores pessoais opcionais, plataformas externas e candidatos experimentais. Provedores instaláveis são manifestos HTTP/JSON declarativos; JavaScript arbitrário não é executado. Cada provedor informa capacidades, autenticação, modo de acesso, saúde, última verificação e evidência.

## Conta e sincronização

Objetivo autorizado para etapa posterior:

- e-mail/senha, Google e GitHub;
- confirmação e recuperação de e-mail;
- sessões revogáveis e histórico de dispositivos;
- convite familiar futuro;
- RLS em todas as tabelas expostas;
- sincronização de biblioteca, progresso, preferências, provedores instalados e estado do Cofre;
- exportação e backup completos.

Configuração real de Supabase, Netlify, OAuth e e-mail exige ação do proprietário e não faz parte da auditoria local.

## Critério de pronto

O produto só pode ser chamado de `VERIFIED RELEASE` quando todos os cenários críticos definidos na especificação e na matriz de evidências tiverem execução reproduzível. Até lá, a classificação global será `ALPHA`, `BETA`, `RELEASE CANDIDATE` ou `BLOCKED`, conforme a evidência mais fraca que impeça o uso pretendido.
