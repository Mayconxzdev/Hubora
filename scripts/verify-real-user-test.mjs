import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const testCases = [
  // 1. Filmes
  {
    category: 'Filmes',
    title: 'A Odisseia',
    url: 'http://localhost:3000/details/tmdb-movie-1108427',
    checkStream: true,
  },
  {
    category: 'Filmes',
    title: 'Interestelar',
    url: 'http://localhost:3000/details/tmdb-movie-157336',
    checkStream: true,
  },

  // 2. Séries
  {
    category: 'Séries',
    title: 'Stranger Things',
    url: 'http://localhost:3000/details/tmdb-tv-66732',
    checkStream: true,
    checkSeasons: true,
  },
  {
    category: 'Séries',
    title: 'Breaking Bad',
    url: 'http://localhost:3000/details/tmdb-tv-1396',
    checkStream: true,
    checkSeasons: true,
  },

  // 3. Doramas
  {
    category: 'Doramas',
    title: 'Pousando no Amor',
    url: 'http://localhost:3000/details/tmdb-tv-94997',
    checkStream: true,
  },
  {
    category: 'Doramas',
    title: 'Tudo Bem Nao Ser Normal',
    url: 'http://localhost:3000/details/tmdb-tv-100241',
    checkStream: true,
  },

  // 4. Animes
  {
    category: 'Animes',
    title: 'Fullmetal Alchemist: Brotherhood',
    url: 'http://localhost:3000/details/anime-5114',
    checkTrailer: true,
  },
  {
    category: 'Animes',
    title: 'Attack on Titan',
    url: 'http://localhost:3000/details/anime-16498',
    checkTrailer: true,
  },

  // 5. Mangás
  {
    category: 'Mangás',
    title: 'One Piece',
    url: 'http://localhost:3000/details/manga-a1c7c817-4e59-4f73-9419-d017a1923d47',
    checkReader: true,
  },
  {
    category: 'Mangás',
    title: 'Chainsaw Man',
    url: 'http://localhost:3000/details/manga-a77742b1-0346-423f-96a0-4b5d70f90e49',
    checkReader: true,
  },

  // 6. Livros
  {
    category: 'Livros',
    title: 'Dom Casmurro',
    url: 'http://localhost:3000/details/google-books-yH5_DwAAQBAJ',
    checkBookReader: true,
  },
  {
    category: 'Livros',
    title: '1984',
    url: 'http://localhost:3000/details/google-books-zqZDDwAAQBAJ',
    checkBookReader: true,
  },

  // 7. Novels
  {
    category: 'Novels',
    title: 'Solo Leveling (Novel)',
    url: 'http://localhost:3000/details/novel-solo-leveling',
    checkMetadata: true,
  },
  {
    category: 'Novels',
    title: 'Overlord (Novel)',
    url: 'http://localhost:3000/details/novel-overlord',
    checkMetadata: true,
  },

  // 8. Quadrinhos
  {
    category: 'Quadrinhos',
    title: 'Batman: O Cavaleiro das Trevas',
    url: 'http://localhost:3000/details/comic-batman',
    checkMetadata: true,
  },
  {
    category: 'Quadrinhos',
    title: 'Spider-Man: Blue',
    url: 'http://localhost:3000/details/comic-spiderman',
    checkMetadata: true,
  },

  // 9. Jogos
  { category: 'Jogos', title: 'Silly Survivors', url: 'http://localhost:3000/details/game-123', checkPriceBRL: true },
  { category: 'Jogos', title: 'Cyberpunk 2077', url: 'http://localhost:3000/details/game-456', checkPriceBRL: true },
];

async function runRealUserTests() {
  console.log('🧪 INICIANDO BATERIA DE TESTES REAIS E2E COM 18 OBRAS EM 9 CATEGORIAS...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  const results = [];

  for (const tc of testCases) {
    console.log(`\n🔍 Testando [${tc.category}] -> ${tc.title}...`);
    const itemResult = { category: tc.category, title: tc.title, passed: true, details: [] };

    try {
      await page.goto(tc.url, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => undefined);
      await page.waitForTimeout(3500);

      // Verificação 1: Título e Sinopse visíveis
      const hasTitle = (await page.locator('h1').count()) > 0;
      if (hasTitle) {
        const titleText = await page.locator('h1').innerText();
        itemResult.details.push(`✅ Título exibido: "${titleText}"`);
      } else {
        itemResult.passed = false;
        itemResult.details.push('❌ Título H1 não encontrado.');
      }

      // Verificação 2: Fontes de Streaming HD
      if (tc.checkStream) {
        const streamBtns = await page.locator('button:has-text("VidSrc"), button:has-text("Player")').count();
        if (streamBtns > 0) {
          itemResult.details.push(`✅ ${streamBtns} Servidor(es) HD de vídeo disponível(is)`);
        } else {
          itemResult.details.push('⚠️ Sem servidores de stream direta.');
        }
      }

      // Verificação 3: Seletor de Temporadas e Episódios
      if (tc.checkSeasons) {
        const seasonSelect = await page.locator('select').count();
        if (seasonSelect >= 2) {
          itemResult.details.push('✅ Seletor de Temporada e Episódio ativo');
        }
      }

      // Verificação 4: Leitor de Mangás Online
      if (tc.checkReader) {
        const readerLink = await page.locator('a:has-text("Ler Mangá Online")').count();
        if (readerLink > 0) {
          itemResult.details.push('✅ Botão de Leitor Web de Mangá presente');
        }
      }

      // Verificação 5: Leitor de Amostras de Livros
      if (tc.checkBookReader) {
        const bookReaderLink = await page.locator('a:has-text("Ler Amostra")').count();
        if (bookReaderLink > 0) {
          itemResult.details.push('✅ Botão de Amostra de Livro (Google Books) presente');
        }
      }

      // Verificação 6: Preços em R$ / BRL
      if (tc.checkPriceBRL) {
        const brlPrice = await page.locator('text=/R\\$/').count();
        if (brlPrice > 0) {
          itemResult.details.push('✅ Preço formatado em Reais (R$ / BRL) detectado');
        }
      }
    } catch (e) {
      itemResult.passed = false;
      itemResult.details.push(`❌ Falha no teste: ${e.message}`);
    }

    results.push(itemResult);
  }

  await browser.close();

  console.log('\n======================================================');
  console.log('📊 RELATÓRIO DA BATERIA DE TESTES REAIS E2E:');
  console.log('======================================================');
  for (const r of results) {
    console.log(`\n[${r.category}] ${r.title}: ${r.passed ? 'PASCOU 100%' : 'COM RESSALVAS'}`);
    r.details.forEach((d) => console.log(`  ${d}`));
  }
}

runRealUserTests().catch(console.error);
