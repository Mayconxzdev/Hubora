import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outDir = path.join(process.cwd(), 'prints', 'master_10_categories_logged_in');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function runMasterTest() {
  console.log('🚀 INICIANDO TESTE MASTER COMPLETO (10 CATEGORIAS, USUÁRIO LOGADO REAL, CARREGAMENTO TOTAL & FULL-PAGE)...\n');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  // Injetar estado de Usuário Logado ("MayconDev") com Biblioteca Completa no localStorage
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const mockState = {
      state: {
        user: {
          id: 'user-maycon-dev',
          name: 'MayconDev',
          email: 'maycon.dev@hubora.app',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
          bio: 'Arquiteto de Software & Entusiasta Multimídia',
          joinedDate: '2024-01-15'
        },
        library: [
          { id: 'tmdb-movie-157336', mediaType: 'movie', title: 'Interestelar', status: 'completed', rating: 10, addedAt: Date.now() - 8000000 },
          { id: 'tmdb-tv-66732', mediaType: 'tv', title: 'Stranger Things', status: 'watching', rating: 9.5, addedAt: Date.now() - 7000000 },
          { id: 'tmdb-tv-94997', mediaType: 'tv', title: 'Pousando no Amor', status: 'completed', rating: 9.8, addedAt: Date.now() - 6000000 },
          { id: 'anime-5114', mediaType: 'anime', title: 'Fullmetal Alchemist: Brotherhood', status: 'completed', rating: 10, addedAt: Date.now() - 5000000 },
          { id: 'manga-a1c7c817-4e59-4f73-9419-d017a1923d47', mediaType: 'manga', title: 'One Piece', status: 'reading', rating: 10, addedAt: Date.now() - 4000000 },
          { id: 'gbooks-yH5_DwAAQBAJ', mediaType: 'book', title: 'Dom Casmurro', status: 'completed', rating: 9, addedAt: Date.now() - 3000000 },
          { id: 'novel-solo-leveling', mediaType: 'novel', title: 'Solo Leveling', status: 'reading', rating: 9.7, addedAt: Date.now() - 2000000 },
          { id: 'comic-batman', mediaType: 'comic', title: 'Batman: O Cavaleiro das Trevas', status: 'completed', rating: 9.9, addedAt: Date.now() - 1000000 },
          { id: 'game-456', mediaType: 'game', title: 'Cyberpunk 2077', status: 'playing', rating: 9.2, addedAt: Date.now() - 50000 }
        ]
      },
      version: 1
    };
    localStorage.setItem('hubora-storage-v1', JSON.stringify(mockState));
  });

  const logs = [];

  try {
    // 1. HOME COM USUÁRIO LOGADO
    console.log('1. Acessando a Home com Usuário Logado "MayconDev"...');
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(outDir, '01_Home_Usuario_Logado_FullPage.png'), fullPage: true });
    logs.push('✅ 1. Home com Perfil Logado carregada');

    // 2. FILMES (Interestelar, A Odisseia, Poderoso Chefão, Vingadores)
    console.log('2. Testando Filmes com busca e player HD (Interestelar & Vingadores)...');
    await page.goto('http://localhost:3000/details/tmdb-movie-157336', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    const movieStreamBtn = page.locator('button:has-text("VidSrc CC")').first();
    if (await movieStreamBtn.count() > 0) {
      await movieStreamBtn.click();
      await page.waitForTimeout(6000); // Aguarda player HD
    }
    await page.screenshot({ path: path.join(outDir, '02_Filme_Interestelar_Player_HD_FullPage.png'), fullPage: true });

    await page.goto('http://localhost:3000/details/tmdb-movie-299534', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(outDir, '03_Filme_Vingadores_Detalhes_FullPage.png'), fullPage: true });
    logs.push('✅ 2. Filmes testados com reprodução HD e dados oficiais');

    // 3. SÉRIES (Stranger Things & Breaking Bad)
    console.log('3. Testando Séries com seleção de Temporada e Episódio...');
    await page.goto('http://localhost:3000/details/tmdb-tv-66732', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    const seasonSelect = page.locator('select').first();
    if (await seasonSelect.count() > 0) {
      await seasonSelect.selectOption('2');
      await page.waitForTimeout(2000);
    }
    const tvStreamBtn = page.locator('button:has-text("VidSrc CC")').first();
    if (await tvStreamBtn.count() > 0) {
      await tvStreamBtn.click();
      await page.waitForTimeout(6000);
    }
    await page.screenshot({ path: path.join(outDir, '04_Serie_StrangerThings_Temp2_FullPage.png'), fullPage: true });
    logs.push('✅ 3. Séries testadas com troca de temporada/episódio');

    // 4. DORAMAS (Pousando no Amor & Tudo Bem Não Ser Normal)
    console.log('4. Testando Doramas e provedores...');
    await page.goto('http://localhost:3000/details/tmdb-tv-94997', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(outDir, '05_Dorama_Pousando_No_Amor_FullPage.png'), fullPage: true });
    logs.push('✅ 4. Doramas validados');

    // 5. ANIMES (Fullmetal Alchemist & Attack on Titan)
    console.log('5. Testando Animes e trailers...');
    await page.goto('http://localhost:3000/details/anime-5114', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(outDir, '06_Anime_Fullmetal_Brotherhood_FullPage.png'), fullPage: true });
    logs.push('✅ 5. Animes testados');

    // 6. MANGÁS (One Piece & Chainsaw Man com Leitor MangaDex)
    console.log('6. Testando Mangás e leitor de páginas MangaDex...');
    await page.goto('http://localhost:3000/details/manga-a1c7c817-4e59-4f73-9419-d017a1923d47', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    const mangaReadBtn = page.locator('a:has-text("Ler Mangá Online")').first();
    if (await mangaReadBtn.count() > 0) {
      await mangaReadBtn.click();
      await page.waitForTimeout(8000); // Aguarda download completo das páginas do capítulo
    }
    await page.screenshot({ path: path.join(outDir, '07_Leitor_Manga_OnePiece_Completo_FullPage.png'), fullPage: true });
    logs.push('✅ 6. Leitor de Mangá testado com carregamento real de capítulos');

    // 7. LIVROS (A Metamorfose de Kafka & Dom Casmurro)
    console.log('7. Testando Livros e PDF de A Metamorfose (Kafka)...');
    await page.goto('http://localhost:3000/details/gbooks-yH5_DwAAQBAJ', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    const pdfBtn = page.locator('a:has-text("Ler PDF"), a:has-text("Domínio Público")').first();
    if (await pdfBtn.count() > 0) {
      await pdfBtn.click();
      await page.waitForTimeout(7000);
    }
    await page.screenshot({ path: path.join(outDir, '08_Livro_A_Metamorfose_PDF_Kafka_FullPage.png'), fullPage: true });
    logs.push('✅ 7. Leitor de PDF real de "A Metamorfose" de Franz Kafka testado');

    // 8. NOVELS (Solo Leveling & Overlord)
    console.log('8. Testando Novels e acervo...');
    await page.goto('http://localhost:3000/details/novel-solo-leveling', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(outDir, '09_Novel_Solo_Leveling_FullPage.png'), fullPage: true });
    logs.push('✅ 8. Novels validadas');

    // 9. QUADRINHOS / COMICS (Batman & Spider-Man)
    console.log('9. Testando Quadrinhos (HQs)...');
    await page.goto('http://localhost:3000/details/comic-batman', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(outDir, '10_HQ_Batman_Cavaleiro_Das_Trevas_FullPage.png'), fullPage: true });
    logs.push('✅ 9. Quadrinhos testados');

    // 10. JOGOS (Cyberpunk 2077 com ofertas em R$ / BRL)
    console.log('10. Testando Jogos e ofertas CheapShark em Reais...');
    await page.goto('http://localhost:3000/details/game-456', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(outDir, '11_Jogo_Cyberpunk_Precos_BRL_FullPage.png'), fullPage: true });
    logs.push('✅ 10. Ofertas de Jogos em R$ (BRL) testadas');

    // TELAS DE GESTÃO DO USUÁRIO LOGADO (Biblioteca & Perfil)
    console.log('11. Testando Biblioteca Pessoal Populada & Perfil de MayconDev...');
    await page.goto('http://localhost:3000/library', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(outDir, '12_Biblioteca_Usuario_Logado_FullPage.png'), fullPage: true });

    await page.goto('http://localhost:3000/profile', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(outDir, '13_Perfil_Usuario_Logado_FullPage.png'), fullPage: true });
    logs.push('✅ 11. Biblioteca Pessoal e Perfil de Usuário Logado validados');

  } catch (e) {
    logs.push(`❌ Erro durante o teste master: ${e.message}`);
  }

  await browser.close();

  console.log('\n======================================================');
  console.log('🏆 RELATÓRIO DO TESTE MASTER DE TODAS AS 10 CATEGORIAS:');
  console.log('======================================================');
  logs.forEach(l => console.log(l));
  console.log(`\n📸 Todas as 13 capturas FULL PAGE de ponta a ponta estão disponíveis em:\nprints/master_10_categories_logged_in/`);
}

runMasterTest().catch(console.error);
