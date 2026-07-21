# Validação — Hubora 9.0.0

O registro reproduzível atual está em
[docs/evidence/BASELINE_VALIDATION.md](docs/evidence/BASELINE_VALIDATION.md) e
[docs/evidence/FEATURE_EVIDENCE_MATRIX.md](docs/evidence/FEATURE_EVIDENCE_MATRIX.md).

No baseline de 2026-07-20:

- typecheck: PASS;
- “lint”: PASS técnico, mas apenas repete o typecheck;
- build Vite/PWA: PASS com avisos de tamanho;
- Playwright: 11 PASS e 1 SKIP em Chromium desktop/Pixel 7;
- Vitest completo: PARTIAL por duas falhas intermitentes que passaram isoladas;
- autenticação, sync/RLS, providers reais, leitores, player, offline e deploy
  remoto: não verificados como fluxo completo.

Nenhum resultado histórico mais forte deve ser usado como certificação atual.
