/**
 * Utilitário de Formatação de Preços para Reais Brasileiros (R$ / BRL)
 */

const USD_TO_BRL_RATE = 5.8; // Taxa de conversão de referência USD -> BRL

export function formatPriceBRL(priceUSD: string | number | null | undefined): string {
  if (priceUSD === null || priceUSD === undefined || priceUSD === '') return 'Sob consulta';

  const numPrice = typeof priceUSD === 'string' ? parseFloat(priceUSD.replace('$', '').trim()) : priceUSD;
  if (isNaN(numPrice)) return String(priceUSD);

  if (numPrice === 0) return 'Gratuito';

  const priceBRL = numPrice * USD_TO_BRL_RATE;
  const formattedBRL = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(priceBRL);

  const formattedUSD = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(numPrice);

  return `${formattedBRL} (${formattedUSD})`;
}
