import cron from 'node-cron';
import { getCandles, getCurrentPrice } from './exchange';
import { analyzeMarket } from './strategy';
import { getPosition, openPosition, closePosition } from './positionState';
import { logSignalCheck, logTrade } from './logger';

const SYMBOL = 'BTC/USDT';
const ENTRY_TIMEFRAME = '15m';

export function startScheduler() {
  cron.schedule('*/15 * * * *', async () => {
    const candles = await getCandles(SYMBOL, ENTRY_TIMEFRAME, 250);
    if (candles.length < 200) return;

    const result = analyzeMarket(candles);
    const positionOpen = !!getPosition();

    logSignalCheck({
      time: new Date().toISOString(),
      symbol: SYMBOL,
      price: result.price,
      buy: result.buy,
      trendUp: result.indicators.trendUp,
      macdCrossUp: result.indicators.macdCrossUp,
      rsiOk: result.indicators.rsiOk,
      lastRsi: result.indicators.lastRsi.toFixed(2),
      lastAtr: result.indicators.lastAtr.toFixed(2),
      positionAlreadyOpen: positionOpen,
      actionTaken: !positionOpen && result.buy ? 'OPEN' : 'SKIP'
    });

    if (positionOpen || !result.buy || !result.takeProfitPrice || !result.stopLossPrice) return;

    openPosition({
      symbol: SYMBOL,
      entryPrice: result.price,
      takeProfitPrice: result.takeProfitPrice,
      stopLossPrice: result.stopLossPrice,
      openedAt: new Date().toISOString()
    });

    logTrade({
      event: 'OPEN',
      symbol: SYMBOL,
      entryPrice: result.price,
      takeProfitPrice: result.takeProfitPrice,
      stopLossPrice: result.stopLossPrice,
      time: new Date().toISOString()
    });
  });

  cron.schedule('*/15 * * * * *', async () => {
    const position = getPosition();
    if (!position) return;

    const price = await getCurrentPrice(position.symbol);

    if (price >= position.takeProfitPrice) {
      logTrade({
        event: 'CLOSE_TP',
        symbol: position.symbol,
        entryPrice: position.entryPrice,
        exitPrice: price,
        pnlPct: ((price - position.entryPrice) / position.entryPrice * 100).toFixed(2),
        openedAt: position.openedAt,
        closedAt: new Date().toISOString()
      });
      closePosition();
    } else if (price <= position.stopLossPrice) {
      logTrade({
        event: 'CLOSE_SL',
        symbol: position.symbol,
        entryPrice: position.entryPrice,
        exitPrice: price,
        pnlPct: ((price - position.entryPrice) / position.entryPrice * 100).toFixed(2),
        openedAt: position.openedAt,
        closedAt: new Date().toISOString()
      });
      closePosition();
    }
  });
}
