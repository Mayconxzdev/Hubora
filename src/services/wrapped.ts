import type { ConsumptionEvent, MediaType, UserMediaEntry } from '@/types';
import { entriesSafeForSharing, eventsSafeForSharing } from '@/services/privacy';

export interface WrappedStats {
  year: number;
  completed: number;
  totalMinutes: number;
  favoriteGenre: string;
  favoriteMediaType: MediaType | 'mixed';
  longestStreak: number;
  biggestMarathon: number;
  topTitles: string[];
}

export function calculateWrapped(
  entries: UserMediaEntry[],
  events: ConsumptionEvent[],
  year = new Date().getFullYear(),
  options: { includeAdultPrivate?: boolean } = {},
): WrappedStats {
  const scopedEntries = options.includeAdultPrivate ? entries : entriesSafeForSharing(entries);
  const scopedEvents = options.includeAdultPrivate ? events : eventsSafeForSharing(events, entries);
  const start = new Date(year, 0, 1).getTime();
  const end = new Date(year + 1, 0, 1).getTime();
  const relevantEvents = scopedEvents.filter((event) => event.occurredAt >= start && event.occurredAt < end);
  const completedEntries = scopedEntries.filter((entry) => entry.status === 'completed' && entry.lastUpdated >= start && entry.lastUpdated < end);
  const typeCounts = new Map<string, number>();
  const genreCounts = new Map<string, number>();
  let totalMinutes = 0;
  let biggestMarathon = 0;

  for (const entry of scopedEntries) {
    typeCounts.set(entry.mediaType, (typeCounts.get(entry.mediaType) || 0) + 1);
    for (const genre of entry.media.genres || []) genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
  }

  const sessionsByDay = new Map<string, number>();
  for (const event of relevantEvents) {
    const date = new Date(event.occurredAt).toISOString().slice(0, 10);
    sessionsByDay.set(date, (sessionsByDay.get(date) || 0) + 1);
    const minutes = Number(event.metadata?.minutes || (event.kind === 'session' ? event.value : 0) || 0);
    if (Number.isFinite(minutes)) {
      totalMinutes += minutes;
      biggestMarathon = Math.max(biggestMarathon, minutes);
    }
  }

  const days = [...sessionsByDay.keys()].sort();
  let longestStreak = 0;
  let currentStreak = 0;
  let previous: number | null = null;
  for (const day of days) {
    const current = new Date(`${day}T12:00:00Z`).getTime();
    currentStreak = previous !== null && current - previous === 86_400_000 ? currentStreak + 1 : 1;
    longestStreak = Math.max(longestStreak, currentStreak);
    previous = current;
  }

  const favoriteGenre = [...genreCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'Explorador';
  const favoriteMediaType = ([...typeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'mixed') as WrappedStats['favoriteMediaType'];
  const topTitles = [...scopedEntries].sort((a, b) => (b.rating || 0) - (a.rating || 0) || b.lastInteractedAt - a.lastInteractedAt).slice(0, 3).map((entry) => entry.title);

  return { year, completed: completedEntries.length, totalMinutes, favoriteGenre, favoriteMediaType, longestStreak, biggestMarathon, topTitles };
}

export function wrappedSvg(stats: WrappedStats, displayName = 'Minha jornada'): string {
  const safe = (text: string) => text.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character] || character);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#030303"/><stop offset="0.55" stop-color="#171109"/><stop offset="1" stop-color="#3a2306"/></linearGradient></defs>
  <rect width="1080" height="1350" rx="64" fill="url(#bg)"/>
  <circle cx="900" cy="190" r="260" fill="#d99a28" opacity=".16"/>
  <text x="80" y="110" fill="#e5bf78" font-size="32" font-family="Arial" font-weight="700">HUBORA WRAPPED ${stats.year}</text>
  <text x="80" y="190" fill="#fffdf8" font-size="58" font-family="Arial" font-weight="800">${safe(displayName)}</text>
  <text x="80" y="330" fill="#fffdf8" font-size="170" font-family="Arial" font-weight="900">${stats.completed}</text>
  <text x="80" y="390" fill="#c8c2b8" font-size="34" font-family="Arial">obras concluídas</text>
  <text x="80" y="540" fill="#fffdf8" font-size="84" font-family="Arial" font-weight="800">${Math.round(stats.totalMinutes / 60)}h</text>
  <text x="80" y="590" fill="#c8c2b8" font-size="30" font-family="Arial">registradas na sua jornada</text>
  <rect x="80" y="690" width="920" height="210" rx="38" fill="#ffffff" opacity=".07"/>
  <text x="120" y="755" fill="#e5bf78" font-size="28" font-family="Arial" font-weight="700">SEU PERFIL DE CONSUMO</text>
  <text x="120" y="825" fill="#fffdf8" font-size="42" font-family="Arial" font-weight="800">${safe(stats.favoriteGenre)}</text>
  <text x="120" y="870" fill="#c8c2b8" font-size="26" font-family="Arial">gênero mais presente • streak de ${stats.longestStreak} dias</text>
  <text x="80" y="1030" fill="#e5bf78" font-size="28" font-family="Arial" font-weight="700">TOP MEMÓRIAS</text>
  ${stats.topTitles.map((title, index) => `<text x="80" y="${1095 + index * 62}" fill="#fffdf8" font-size="34" font-family="Arial">${index + 1}. ${safe(title.slice(0, 42))}</text>`).join('')}
  <text x="80" y="1280" fill="#8f887d" font-size="24" font-family="Arial">Gerado localmente. Seus dados não saíram do aparelho.</text>
  </svg>`;
}
