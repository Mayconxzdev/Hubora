# Relatório de Reprodutibilidade (REPRODUCIBILITY_REPORT.md)

- **Produto:** Hubora v9.0.0 (Alpha)
- **Modo:** Web / PWA Privado (Netlify + Supabase)
- **Garantia de Reprodutibilidade:** Ambientes determinísticos sem dependências de máquina local ou binaries nativos.

---

## 1. Requisitos para Reprodução

Para reproduzir a compilação e testes em qualquer máquina limpa:

```bash
# 1. Clonar repositório e selecionar a branch de contratos
git checkout refactor/hubora-media-contracts

# 2. Instalação determinística de dependências
npm ci

# 3. Verificação de Tipos TypeScript
npm run typecheck

# 4. Suíte de Testes Unitários e Contratos (Vitest)
npm run test

# 5. Build de Produção Vite + Service Worker
npm run build

# 6. Validação de Empacotamento Limpo
node scripts/verify-clean-package.mjs
node scripts/package-release.mjs
```

---

## 2. Status dos Testes

- **Testes de Contrato e Unidade:** 58/58 Aprovados
- **Typecheck:** 0 erros
- **Build Output:** `dist/index.html` (2.43 kB), `dist/sw.js` (PWA injectManifest)
- **Clean Package Verification:** OK
