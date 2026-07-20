import { MediaItem } from '@/types';
import { isAfter, differenceInDays } from 'date-fns';

export function calculateHypeScore(item: MediaItem, trendingRank?: number, isNew?: boolean): MediaItem {
  let score = 0;
  let reason = 'Em alta no radar de tendências.';

  // 1. Trending Position (up to 40 points)
  if (trendingRank !== undefined) {
    score += Math.max(0, (20 - trendingRank) * 2);
  }

  // 2. Base Popularity metric (up to 25 points)
  if (item.popularity) {
    score += Math.min(item.popularity / 100, 25);
  }

  // 3. Recency / Upcoming (up to 25 points)
  const today = new Date();
  if (item.releaseDate) {
    const releaseDate = new Date(item.releaseDate);
    const diffDays = Math.abs(differenceInDays(today, releaseDate));
    
    if (diffDays <= 14) {
      score += 25;
      reason = isAfter(releaseDate, today) ? 'Estreia muito aguardada' : 'Lançamento recente bombando';
    } else if (diffDays <= 30) {
      score += 15;
      reason = 'Muito falado no último mês';
    } else if (diffDays <= 90) {
      score += 5;
    }
  } else if (isNew) {
    score += 15;
    reason = 'Novidade em alta';
  }

  // 4. Quality / Votes (up to 10 points)
  if (item.voteAverage) {
    score += item.voteAverage; // 0-10
  }
  
  // 5. Custom Promos / Deals (Games)
  if (item.customBadge && item.customBadge.includes('promoção')) {
    score += 15;
    reason = item.hypeReason || 'Promoção imperdível';
  }

  score = Math.min(Math.round(score), 100);
  
  if (reason === 'Em alta no radar de tendências.') {
      if (score > 85) reason = 'Top Hype 🔥';
      else if (score > 70 && !reason.includes('Estreia')) reason = 'Popular agora';
      else if (score > 50 && score <= 70) reason = 'Subindo no radar';
  }

  return { ...item, hypeScore: score, hypeReason: reason, hypeRank: trendingRank };
}
