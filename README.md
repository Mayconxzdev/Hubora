# 🌌 Hubora v9.0.0 — Unified Pop Culture Hub & Media Tracker

[![Vite](https://img.shields.io/badge/Vite-v7.3-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-v19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Netlify](https://img.shields.io/badge/Netlify-Serverless-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)](https://www.netlify.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Vitest](https://img.shields.io/badge/Vitest-Unit_Tested-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)

**Hubora** é uma plataforma de gerenciamento e descoberta de mídias de cultura pop de alta performance. Desenvolvida para unificar 9 domínios universais de entretenimento (Filmes, Séries, Doramas, Animes, Mangás, Quadrinhos, Livros, Novels e Jogos) em uma única interface cinematográfica e privada.

---

## 💎 Arquitetura & Destaques de Engenharia (Senior Level)

### 1. **Zero-Token Security & Proxy Serverless (Netlify Edge Functions)**
- Nenhuma chave de API de terceiros (TMDB, IGDB, Supabase) é exposta no cliente público.
- Requisições para metadados e capas são sanitizadas e interceptadas por Serverless Functions com suporte a Fallback gracioso (OpenLibrary, MangaDex, Jikan).

### 2. **Contratos Universais de Apresentação de Mídias (`MediaPresentationRegistry`)**
- Arquitetura fortemente tipada que desacopla os domínios de mídia:
  - **Audiovisual (Filmes, Séries, Doramas, Animes):** Trailers reais do YouTube com iluminação ambiente (Ambilight), elenco e temporadas.
  - **Leitura (Livros, Mangás, Quadrinhos, Novels):** Acompanhamento preciso por páginas, volumes e edições sem botões redundantes.
  - **Jogos (PC & Consoles):** Gestão 100% manual por status (*Possuído*, *Instalado*, *Jogando*, *Concluído*), horas e links oficiais via HTTPS (Steam, Epic Games, GOG).

### 3. **Design System Personalizado (Liquid Glass Aesthetics)**
- Componentes construídos com princípios modernos de UI/UX (*ui-ux-pro-max*):
  - Modos Claro e Escuro calibrados (Sem contraste quebrado em fundo claro).
  - Componentes responsivos otimizados para Desktop (1920x1080), Tablet (768x1024) e Mobile (390x844).
  - Micro-interações e suporte a acessibilidade WCAG 2.2.

### 4. **Privacidade First-Class & Vault Criptografado**
- Suporte a cofre privado protegido por PIN derivado (PBKDF2/SHA-256) para armazenamento de preferências pessoais.
- Opção de sincronização nuvem via Supabase ou persistência local em IndexedDB/LocalStorage.

---

## 🛠️ Tech Stack & Ferramentas

- **Core:** React 19, TypeScript 5.7, Vite 7
- **Styling:** Vanilla CSS + Tailwind CSS v4, Lucide Icons, Glassmorphism Tokens
- **State & Data:** Zustand (Persistência reativa), TanStack Query v5 (Cache de API)
- **Backend & Cloud:** Netlify Edge Functions (Node.js/TypeScript), Supabase (Auth & Postgres)
- **Qualidade & Testes:** Vitest (64 testes unitários e de integração), Playwright (Auditoria E2E)

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- Node.js v18+
- npm v9+

### Passos

```bash
# 1. Clonar o repositório
git clone https://github.com/Mayconxzdev/Hubora.git

# 2. Entrar no diretório
cd Hubora

# 3. Instalar dependências
npm install

# 4. Criar o arquivo .env com suas chaves (Veja .env.example)
cp .env.example .env

# 5. Iniciar o servidor de desenvolvimento
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

---

## 🧪 Suíte de Testes & Qualidade de Código

Para executar os testes unitários e a checagem rigorosa de tipos do TypeScript:

```bash
# Executar a suíte de testes unitários (Vitest)
npm run test

# Executar checagem de tipos estática do TypeScript
npm run typecheck

# Compilar para produção (Vite + Service Worker PWA)
npm run build
```

---

## 📜 Licença

Distribuído sob a Licença MIT. Veja `LICENSE` para mais informações.

Desenvolvido por **[Mayconxzdev](https://github.com/Mayconxzdev)** — *Software Engineer*.
