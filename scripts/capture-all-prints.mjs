import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const printsDir = path.join(process.cwd(), 'prints');
if (!fs.existsSync(printsDir)) {
  fs.mkdirSync(printsDir, { recursive: true });
}

// Mock de dados ricos para um usuário ativo
const mockUser = {
  uid: 'user-master-hubora',
  email: 'usuario.demo@hubora.app',
  displayName: 'Mayconxz (Dev Senior)',
  photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  preferences: {
    theme: 'dark',
    language: 'pt-BR',
  },
};

const mockLibrary = {
  'movie-1108427': {
    id: 'movie-1108427',
    mediaType: 'movie',
    status: 'completed',
    rating: 10,
    favorite: true,
    progress: { current: 1, total: 1, unit: 'filme' },
    addedAt: new Date().toISOString(),
    media: {
      id: 'movie-1108427',
      mediaType: 'movie',
      title: 'A Odisseia',
      posterPath: 'https://image.tmdb.org/t/p/w500/z112N25dKkWfX49jR56XG6y4N0b.jpg',
      releaseDate: '2026-05-15',
      voteAverage: 8.9,
      genres: ['Aventura', 'Fantasia', 'Histórico'],
    },
  },
  'game-123': {
    id: 'game-123',
    mediaType: 'game',
    status: 'in_progress',
    rating: 9,
    favorite: true,
    progress: { current: 45, total: 100, unit: 'horas' },
    addedAt: new Date().toISOString(),
    media: {
      id: 'game-123',
      mediaType: 'game',
      title: 'Silly Survivors',
      posterPath: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co5s5p.jpg',
      releaseDate: '2025-01-10',
      voteAverage: 9.5,
      genres: ['Indie', 'Ação', 'Roguelike'],
    },
  },
  'anime-5114': {
    id: 'anime-5114',
    mediaType: 'anime',
    status: 'completed',
    rating: 10,
    favorite: true,
    progress: { current: 64, total: 64, unit: 'episódios' },
    addedAt: new Date().toISOString(),
    media: {
      id: 'anime-5114',
      mediaType: 'anime',
      title: 'Fullmetal Alchemist: Brotherhood',
      posterPath: 'https://cdn.myanimelist.net/images/anime/1208/94745.jpg',
      releaseDate: '2009-04-05',
      voteAverage: 9.1,
      genres: ['Ação', 'Aventura', 'Drama'],
    },
  },
};

const routes = [
  { name: '01_Home_Full', url: 'http://localhost:3000/' },
  { name: '02_Movies_Full', url: 'http://localhost:3000/movies' },
  { name: '03_Series_Full', url: 'http://localhost:3000/series' },
  { name: '04_Doramas_Full', url: 'http://localhost:3000/doramas' },
  { name: '05_Anime_Full', url: 'http://localhost:3000/anime' },
  { name: '06_Manga_Full', url: 'http://localhost:3000/manga' },
  { name: '07_Comics_Full', url: 'http://localhost:3000/comics' },
  { name: '08_Books_Full', url: 'http://localhost:3000/books' },
  { name: '09_Novels_Full', url: 'http://localhost:3000/novels' },
  { name: '10_Games_Deduplicated_Full', url: 'http://localhost:3000/games' },
  { name: '11_Discover_Full', url: 'http://localhost:3000/discover' },
  { name: '12_Radar_Full', url: 'http://localhost:3000/radar' },
  { name: '13_Library_LoggedIn_Full', url: 'http://localhost:3000/library' },
  { name: '14_Diary_LoggedIn_Full', url: 'http://localhost:3000/diary' },
  { name: '15_Guide_LoggedIn_Full', url: 'http://localhost:3000/guide' },
  { name: '16_Releases_Full', url: 'http://localhost:3000/releases' },
  { name: '17_Profile_LoggedIn_Full', url: 'http://localhost:3000/profile' },
  { name: '18_Settings_Full', url: 'http://localhost:3000/settings' },
  { name: '19_Login_Full', url: 'http://localhost:3000/login' },
  { name: '20_Register_Full', url: 'http://localhost:3000/register' },
  { name: '21_Privacy_Full', url: 'http://localhost:3000/privacy' },
  { name: '22_Terms_Full', url: 'http://localhost:3000/terms' },
  { name: '23_Details_Movie_Full', url: 'http://localhost:3000/details/tmdb-movie-1108427' },
  { name: '24_Details_Game_BRL_Full', url: 'http://localhost:3000/details/game-123' },
];

async function capture() {
  console.log('🚀 Iniciando captura com TEMPO DE ESPERA EXPANDIDO (networkidle + 9s) por página...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });

  // Injeta estado logado e biblioteca populada em todas as páginas
  await context.addInitScript(
    ({ user, library }) => {
      window.localStorage.setItem('hubora_guest_mode', 'true');
      window.localStorage.setItem(
        'hubora-storage-v1',
        JSON.stringify({
          state: {
            user,
            library,
            guestTheme: 'dark',
            initialized: true,
          },
          version: 1,
        }),
      );
    },
    { user: mockUser, library: mockLibrary },
  );

  const page = await context.newPage();
  page.setDefaultTimeout(40000);

  for (const route of routes) {
    try {
      console.log(`⏳ Aguardando carregamento total das APIs para: ${route.name}...`);
      await page.goto(route.url, { waitUntil: 'networkidle', timeout: 35000 }).catch(() => undefined);

      // Aguarda 9 segundos extras para que requisições assíncronas e imagens terminem de carregar
      await page.waitForTimeout(9000);

      // Rola suavemente para baixo para acionar lazy-loading de todo o conteúdo da página
      await page.evaluate(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 500;
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;
            if (totalHeight >= scrollHeight || totalHeight > 4000) {
              clearInterval(timer);
              window.scrollTo(0, 0);
              resolve(true);
            }
          }, 150);
        });
      });

      await page.waitForTimeout(2500);

      const filePath = path.join(printsDir, `${route.name}.png`);
      await page.screenshot({ path: filePath, fullPage: true });
      console.log(`✅ Capturado com SUCESSO COMPLETO E IMAGENS: prints/${route.name}.png`);
    } catch (e) {
      console.warn(`⚠️ Erro ao capturar ${route.name}:`, e.message);
    }
  }

  await browser.close();
  console.log('🎉 Captura FULL PAGE com tempo de espera expandido concluída!');
}

capture().catch((err) => {
  console.error('Fatal error in capture script:', err);
});
