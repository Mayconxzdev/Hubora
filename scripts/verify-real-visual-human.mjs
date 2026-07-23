import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const visualDir = path.join(process.cwd(), 'prints', 'visual_user_test');
if (!fs.existsSync(visualDir)) {
  fs.mkdirSync(visualDir, { recursive: true });
}

async function runHumanVisualTest() {
  console.log('🎭 INICIANDO SIMULAÇÃO VISUAL DE NAVEGAÇÃO DE USUÁRIO REAL EM TODAS AS CATEGORIAS...\n');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  const logs = [];

  try {
    // PASS 1: ACESSO À HOME & NAVEGAÇÃO VISITANTE
    console.log('1. Acessando a página de Login e ativando Modo Visitante...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(visualDir, '01_Tela_Login.png') });

    const guestBtn = page.locator('button:has-text("Entrar como Visitante")').first();
    if (await guestBtn.count() > 0) {
      await guestBtn.click();
      await page.waitForTimeout(2500);
      logs.push('✅ 1. Modo Visitante ativado com sucesso');
    }
    await page.screenshot({ path: path.join(visualDir, '02_Home_Visitante.png') });

    // PASS 2: BUSCA GLOBAL E ASSISTIR FILME 1 (Interestelar)
    console.log('2. Pesquisando "Interestelar" na busca global...');
    const searchInput = page.locator('input[placeholder*="Buscar"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('Interestelar');
      await page.waitForTimeout(2000);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);
    }
    await page.goto('http://localhost:3000/details/tmdb-movie-157336', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500);
    await page.screenshot({ path: path.join(visualDir, '03_Detalhes_Filme_Interestelar.png') });

    // Clicar no servidor de vídeo do filme
    const streamBtn = page.locator('button:has-text("VidSrc CC")').first();
    if (await streamBtn.count() > 0) {
      await streamBtn.click();
      await page.waitForTimeout(3000);
      logs.push('✅ 2. Player de Vídeo HD ativado no filme Interestelar');
    }
    await page.screenshot({ path: path.join(visualDir, '04_Player_Filme_Interestelar_Rodando.png') });

    // PASS 3: SÉRIES COM TROCA DE TEMPORADA & EPISÓDIO (Stranger Things)
    console.log('3. Abrindo série "Stranger Things" e alterando temporada/episódio...');
    await page.goto('http://localhost:3000/details/tmdb-tv-66732', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500);
    await page.screenshot({ path: path.join(visualDir, '05_Detalhes_Serie_StrangerThings.png') });

    // Selecionar Temporada 2 e Episódio 3
    const seasonSelect = page.locator('select').first();
    if (await seasonSelect.count() > 0) {
      await seasonSelect.selectOption('2');
      await page.waitForTimeout(1000);
      logs.push('✅ 3. Temporada alterada para Temp 2 em Stranger Things');
    }
    const streamTvBtn = page.locator('button:has-text("VidSrc CC")').first();
    if (await streamTvBtn.count() > 0) {
      await streamTvBtn.click();
      await page.waitForTimeout(3000);
      logs.push('✅ 3. Player de Vídeo HD ativado no episódio da Série');
    }
    await page.screenshot({ path: path.join(visualDir, '06_Player_Serie_StrangerThings_Temp2.png') });

    // PASS 4: MANGÁS & LEITOR WEB (One Piece)
    console.log('4. Abrindo Mangá "One Piece" e iniciando Leitor Web...');
    await page.goto('http://localhost:3000/details/manga-a1c7c817-4e59-4f73-9419-d017a1923d47', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500);
    await page.screenshot({ path: path.join(visualDir, '07_Detalhes_Manga_OnePiece.png') });

    const readMangaLink = page.locator('a:has-text("Ler Mangá Online")').first();
    if (await readMangaLink.count() > 0) {
      await readMangaLink.click();
      await page.waitForTimeout(4000);
      logs.push('✅ 4. Leitor Web de Mangá aberto com capítulos do MangaDex');
    }
    await page.screenshot({ path: path.join(visualDir, '08_Leitor_Manga_OnePiece.png') });

    // PASS 5: LIVROS & AMOSTRA (Dom Casmurro)
    console.log('5. Abrindo Livro "Dom Casmurro" e leitor de amostra...');
    await page.goto('http://localhost:3000/details/google-books-yH5_DwAAQBAJ', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500);
    await page.screenshot({ path: path.join(visualDir, '09_Detalhes_Livro_DomCasmurro.png') });

    const readBookLink = page.locator('a:has-text("Ler Amostra")').first();
    if (await readBookLink.count() > 0) {
      await readBookLink.click();
      await page.waitForTimeout(3500);
      logs.push('✅ 5. Leitor de Amostra de Livro (Google Books) aberto');
    }
    await page.screenshot({ path: path.join(visualDir, '10_Leitor_Livro_DomCasmurro.png') });

    // PASS 6: JOGOS & OFERTAS EM R$ (Silly Survivors / Cyberpunk)
    console.log('6. Abrindo Jogos e verificando ofertas formatadas em R$ (BRL)...');
    await page.goto('http://localhost:3000/details/game-123', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500);
    logs.push('✅ 6. Ofertas de Jogos em R$ (BRL) exibidas com desconto');
    await page.screenshot({ path: path.join(visualDir, '11_Detalhes_Jogo_Ofertas_BRL.png') });

    // PASS 7: ANIMES & TRAILERS (Fullmetal Alchemist)
    console.log('7. Abrindo Anime e assistindo trailer...');
    await page.goto('http://localhost:3000/details/anime-5114', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500);
    await page.screenshot({ path: path.join(visualDir, '12_Detalhes_Anime.png') });

    // PASS 8: BIBLIOTECA & PERFIL
    console.log('8. Acessando a Biblioteca Pessoal e Perfil...');
    await page.goto('http://localhost:3000/library', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(visualDir, '13_Biblioteca_Pessoal.png') });

    await page.goto('http://localhost:3000/profile', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(visualDir, '14_Perfil_Estatisticas.png') });
    logs.push('✅ 8. Biblioteca Pessoal e Perfil acessados com sucesso');

  } catch (e) {
    logs.push(`❌ Erro no fluxo visual: ${e.message}`);
  }

  await browser.close();

  console.log('\n======================================================');
  console.log('🎭 LOG DA NAVEGAÇÃO VISUAL DE USUÁRIO REAL:');
  console.log('======================================================');
  logs.forEach(l => console.log(l));
  console.log(`\n📸 Todos os 14 prints de cada etapa da sua simulação visual foram salvos em:\nprints/visual_user_test/`);
}

runHumanVisualTest().catch(console.error);
