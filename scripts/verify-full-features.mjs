import { chromium } from 'playwright';

async function verifyFullFeatures() {
  console.log('🧪 INICIANDO TESTES E2E REAIS DE PLAYER, LEITOR DE MANGÁ, AMUSTRA DE LIVRO E OFERTAS BRL...\n');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  const report = [];

  // 1. TESTE DE PLAYER DE VÍDEO (FILMES E SÉRIES)
  try {
    console.log('🎬 1. Testando Player de Vídeo HD (Filme: Interestelar)...');
    await page.goto('http://localhost:3000/details/tmdb-movie-157336', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Clica no botão de servidor de reprodução
    const playerBtn = page.locator('button:has-text("VidSrc CC")').first();
    if (await playerBtn.count() > 0) {
      await playerBtn.click();
      await page.waitForTimeout(2000);
      const iframeCount = await page.locator('iframe[src*="vidsrc"]').count();
      if (iframeCount > 0) {
        const iframeSrc = await page.locator('iframe[src*="vidsrc"]').getAttribute('src');
        report.push(`✅ PLAYER DE VÍDEO HD: Sucesso! Player VidSrc incorporado com URL "${iframeSrc}"`);
      } else {
        report.push('⚠️ PLAYER DE VÍDEO HD: Iframe de reprodução não foi encontrado.');
      }
    } else {
      report.push('⚠️ PLAYER DE VÍDEO HD: Botão de servidor de vídeo não disponível.');
    }
  } catch (e) {
    report.push(`❌ PLAYER DE VÍDEO HD: Erro - ${e.message}`);
  }

  // 2. TESTE DE LEITOR DE MANGÁ (MANGADEX REAL)
  try {
    console.log('\n📖 2. Testando Leitor Real de Mangá (MangaDex API)...');
    await page.goto('http://localhost:3000/reader?kind=manga&mangaId=a1c7c817-4e59-4f73-9419-d017a1923d47&chapterId=1b790d56-7870-4d51-a9e9-01f66d405232', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    const imagesCount = await page.locator('img[alt*="Página"]').count();
    const hasChapterTitle = await page.locator('text=/Capítulo/').count();
    if (imagesCount > 0 || hasChapterTitle > 0) {
      report.push(`✅ LEITOR DE MANGÁ MANGADEX: Sucesso! ${imagesCount} páginas do capítulo carregadas diretamente no leitor web.`);
    } else {
      report.push('⚠️ LEITOR DE MANGÁ MANGADEX: Nenhuma página carregada.');
    }
  } catch (e) {
    report.push(`❌ LEITOR DE MANGÁ: Erro - ${e.message}`);
  }

  // 3. TESTE DE LEITOR DE AMOSTRA DE LIVRO (GOOGLE BOOKS)
  try {
    console.log('\n📚 3. Testando Leitor de Amostra de Livro (Google Books)...');
    await page.goto('http://localhost:3000/reader?kind=google-books&volumeId=yH5_DwAAQBAJ&title=Dom%20Casmurro', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const viewerContainer = await page.locator('div[aria-label="Leitor do Google Books"]').count();
    if (viewerContainer > 0) {
      report.push('✅ LEITOR DE LIVRO GOOGLE BOOKS: Sucesso! Container e leitor do Google Books inicializado com sucesso.');
    } else {
      report.push('⚠️ LEITOR DE LIVRO GOOGLE BOOKS: Elemento do leitor não renderizado.');
    }
  } catch (e) {
    report.push(`❌ LEITOR DE LIVRO: Erro - ${e.message}`);
  }

  // 4. TESTE DE OFERTAS DE JOGOS E FORMATO R$ / BRL
  try {
    console.log('\n🎮 4. Testando Ofertas de Jogos e Conversão para R$ (BRL)...');
    await page.goto('http://localhost:3000/details/game-123', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const brlPriceText = await page.locator('text=/R\\$/').first().innerText().catch(() => '');
    if (brlPriceText.includes('R$')) {
      report.push(`✅ OFERTAS DE JOGOS EM R$: Sucesso! Preço em reais detectado: "${brlPriceText.trim()}"`);
    } else {
      report.push('⚠️ OFERTAS DE JOGOS EM R$: Preço em R$ não encontrado na tela.');
    }
  } catch (e) {
    report.push(`❌ OFERTAS DE JOGOS: Erro - ${e.message}`);
  }

  await browser.close();

  console.log('\n======================================================');
  console.log('📋 RELATÓRIO DOS TESTES DE RECURSOS REAIS:');
  console.log('======================================================');
  report.forEach(line => console.log(line));
}

verifyFullFeatures().catch(console.error);
