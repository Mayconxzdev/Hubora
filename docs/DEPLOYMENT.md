# Implantação

Este documento foi consolidado em [../NETLIFY_DEPLOY.md](../NETLIFY_DEPLOY.md). Use o guia principal para variáveis, Supabase, redirects, publicação e validação pós-deploy.

Não use `VITE_TMDB_API_KEY`: o Hubora 7.1 usa `TMDB_API_READ_TOKEN` ou `TMDB_API_KEY` exclusivamente no ambiente das Netlify Functions.
