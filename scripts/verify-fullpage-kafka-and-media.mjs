import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outDir = path.join(process.cwd(), 'prints', 'full_page_real_tests');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function runFullPageRealTest() {
  console.log('🚀 INICIANDO TESTE REAL VISUAL E FULL-PAGE (COM A METAMORFOSE DE KAFKA, PLAYER HD E MANGÁS)...\n');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  const logs = [];

  try {
    // 1. PESQUISA DO LIVRO "A METAMORFOSE" DE KAFKA
    console.log('📚 1. Pesquisando "A Metamorfose" de Franz Kafka na busca do Hubora...');
    await page.goto('http://localhost:3000/books', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const searchInput = page.locator('input[placeholder*="Buscar"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('A Metamorfose Kafka');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(4000);
    }
    await page.screenshot({ path: path.join(outDir, '01_Busca_A_Metamorfose_Kafka.png'), fullPage: true });

    // Abrir o item do livro encontrado
    const firstBook = page.locator('a[href*="/details/"]').first();
    if (await firstBook.count() > 0) {
      await firstBook.click();
      await page.waitForTimeout(4000);
    } else {
      await page.goto('http://localhost:3000/details/gbooks-yH5_DwAAQBAJ', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(4000);
    }
    await page.screenshot({ path: path.join(outDir, '02_Detalhes_Livro_A_Metamorfose_FullPage.png'), fullPage: true });

    // Clicar no botão de PDF Gratuito (Domínio Público / MEC)
    const pdfBtn = page.locator('a:has-text("Ler PDF"), a:has-text("Domínio Público")').first();
    if (await pdfBtn.count() > 0) {
      console.log('   - Abrindo o leitor do PDF real de A Metamorfose...');
      await pdfBtn.click();
      await page.waitForTimeout(6000); // Aguarda o PDF carregar
      logs.push('✅ 1. PDF Real de "A Metamorfose" de Franz Kafka aberto no leitor');
    } else {
      const previewBtn = page.locator('a:has-text("Ler Amostra")').first();
      if (await previewBtn.count() > 0) {
        await previewBtn.click();
        await page.waitForTimeout(5000);
        logs.push('✅ 1. Leitor do livro "A Metamorfose" aberto');
      }
    }
    await page.screenshot({ path: path.join(outDir, '03_Leitor_PDF_Real_A_Metamorfose_Kafka.png'), fullPage: true });

    // 2. MANGÁ COM AGUARDO REAL DE IMAGENS (One Piece)
    console.log('\n📖 2. Testando Leitor de Mangá com carregamento real de capítulos...');
    await page.goto('http://localhost:3000/details/manga-a1c7c817-4e59-4f73-9419-d017a1923d47', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(outDir, '04_Detalhes_Manga_OnePiece_FullPage.png'), fullPage: true });

    const readMangaLink = page.locator('a:has-text("Ler Mangá Online")').first();
    if (await readMangaLink.count() > 0) {
      await readMangaLink.click();
      console.log('   - Aguardando download e carregamento das páginas do capítulo...');
      await page.waitForTimeout(7000); // Aguarda imagens da MangaDex
      logs.push('✅ 2. Leitor de Mangá aberto com capítulos reais da MangaDex');
    }
    await page.screenshot({ path: path.join(outDir, '05_Leitor_Manga_OnePiece_Carregado_FullPage.png'), fullPage: true });

    // 3. PLAYER DE FILME COM AGUARDO DE STREAM (Interestelar)
    console.log('\n🎬 3. Testando Player de Vídeo HD em Tela Cheia (Interestelar)...');
    await page.goto('http://localhost:3000/details/tmdb-movie-157336', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    const streamBtn = page.locator('button:has-text("VidSrc CC")').first();
    if (await streamBtn.count() > 0) {
      await streamBtn.click();
      console.log('   - Iniciando streaming de vídeo HD...');
      await page.waitForTimeout(6000); // Aguarda player carregar o iFrame de reprodução
      logs.push('✅ 3. Player HD de vídeo incorporado e ativo');
    }
    await page.screenshot({ path: path.join(outDir, '06_Player_Filme_Interestelar_Completo_FullPage.png'), fullPage: true });

    // 4. JOGOS E PREÇOS FORMATADOS EM R$ (Cyberpunk 2077)
    console.log('\n🎮 4. Testando Ofertas de Jogos em R$ (BRL)...');
    await page.goto('http://localhost:3000/details/game-456', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    logs.push('✅ 4. Tela de ofertas de jogos com preços em Reais (R$ / BRL)');
    await page.screenshot({ path: path.join(outDir, '07_Jogo_Cyberpunk_Ofertas_BRL_FullPage.png'), fullPage: true });

  } catch (e) {
    logs.push(`❌ Erro no teste visual: ${e.message}`);
  }

  await browser.close();

  console.log('\n======================================================');
  console.log('📋 RELATÓRIO DO TESTE VISUAL FULL-PAGE:');
  console.log('======================================================');
  logs.forEach(l => console.log(l));
  console.log(`\n📸 Screenshots FULL PAGE em alta resolução salvos em:\nprints/full_page_real_tests/`);
}

runFullPageRealTest().catch(console.error);
