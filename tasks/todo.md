# Checklist de Execução e Tarefas Hubora 9.0.0 (Alpha -> Beta)

## Estado Atual da Branch
- [x] Branch local ativa: `refactor/hubora-media-contracts`
- [x] Preservar commits `19cbeb2` e `a755b96`
- [x] Remoção definitiva de Companion local, torrent engine local, pareamento e modo TV

---

## 1. Auditoria e Empacotamento Limpo
- [x] Scripts de auditoria criados: `scripts/package-release.mjs` e `scripts/verify-clean-package.mjs`
- [x] `skills-lock.json` criado e auditado
- [x] Relatórios gerados em `docs/audit/`:
  - `CLEAN_INSTALL_REPORT.md`
  - `PACKAGE_CONTENTS.md`
  - `REPRODUCIBILITY_REPORT.md`
- [x] Testes unitários passando: 64/64 no Vitest
- [x] Typecheck TypeScript zerado sem erros

---

## 2. Contratos Universais por Categoria (Media Presentation Registry)
- [x] Registro central em `src/services/mediaPresentation/index.ts`
- [x] Contratos para as 9 mídias principais:
  - Filmes
  - Séries
  - Doramas
  - Animes
  - Mangás
  - Quadrinhos
  - Livros
  - Novels
  - Jogos (gestão 100% manual e links para lojas oficiais)
- [x] Testes automatizados de contrato em `tests/media-presentation-contract.test.ts` (6/6 testes)

---

## 3. Próximas Fatias Verticais (Implementação Incremental)
- [ ] Aplicar o `MediaPresentationContract` nas telas centrais (`Home`, `Details`, `Discover`, `Library`)
- [ ] Implementar a aba e modal de **Jogos Manuais** com filtros por loja (Steam, Epic, GOG, Xbox, PSN, eShop) e acompanhamento de backlog/horas
- [ ] Conectar os endpoints seguros de leitura de Open Library (`/api/open-library`)
- [ ] Integrar testes E2E Playwright de ponta a ponta com relatórios de evidência visual
