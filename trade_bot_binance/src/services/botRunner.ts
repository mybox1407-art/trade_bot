import { getCurrentPrice } from './exchange';
import { shouldBuy } from './strategy';

export async function runBotOnce() {
  const symbol = 'BTC/USDT';
  const price = await getCurrentPrice(symbol);

  if (price === null) {
    return { symbol, price: null, buy: false };
  }

  const buy = shouldBuy(price);

  return {
    symbol,
    price,
    buy
  };
}
