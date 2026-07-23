# Matriz de provedores — status de release

A matriz detalhada de 88 fontes fica em [docs/PROVIDER_MATRIX.md](docs/PROVIDER_MATRIX.md) e [docs/PROVIDER_MATRIX.csv](docs/PROVIDER_MATRIX.csv).

## Leitura obrigatória do status atual

- **Nenhuma fonte está aprovada como “funcional e testada” para esta release.** Ter adaptador, item de catálogo, URL oficial ou componente de player não prova integração ponta a ponta.
- **Metadados com caminho de código, sem homologação externa:** TMDB via Function, TVmaze, AniList, Jikan, Google Books, IGDB e Open Library. Jikan retornou HTTP 504 no ambiente local durante a auditoria visual.
- **Somente link externo/catalogado:** a maior parte dos serviços comerciais, catálogos, lojas e leitores externos.
- **Requer configuração pessoal:** Jellyfin, Komga, Kavita, Calibre-Web/OPDS e protocolos equivalentes. Plex e Emby estão catalogados, mas não possuem prova de conector completo neste checkout.
- **Leitura/reprodução autorizada condicionada:** YouTube oficial, Internet Archive, Project Gutenberg e fontes explicitamente permitidas pelo código de segurança; cada obra ainda precisa de uma URL/manifesto real permitido.
- **Rejeitado:** fontes não licenciadas, embutidas por dedução a partir de IDs/título, ou sem autorização de incorporação. Não serão adicionadas como player apenas por terem sido citadas como exemplo.

Antes do Deploy Preview, a matriz detalhada precisa ser normalizada para os estados oficiais: `funcional e testado`, `funcional sem homologação externa`, `somente metadados`, `somente disponibilidade`, `somente link externo`, `requer configuração pessoal`, `implementado parcialmente`, `catalogado, mas não implementado`, `bloqueado` ou `rejeitado`.
