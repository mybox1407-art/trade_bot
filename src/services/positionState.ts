import { MAX_RISK_PER_TRADE } from './strategy';

export interface VirtualPosition {
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  quantity: number;
  notional: number;
  takeProfitPrice: number;
  stopLossPrice: number;
  openedAt: string;
}

export interface ClosedTrade {
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  notional: number;
  realizedPnL: number;
  closedAt: string;
  reason: 'take_profit' | 'stop_loss' | 'manual';
}

const STARTING_BALANCE = 500;
const POSITION_PERCENT = 0.10;

let balance = STARTING_BALANCE;
let currentPosition: VirtualPosition | null = null;
let lastClosedTrade: ClosedTrade | null = null;

function isFinitePositive(value: number) {
  return Number.isFinite(value) && value > 0;
}

function isValidLevels(params: {
  side: 'long' | 'short';
  entryPrice: number;
  takeProfitPrice: number;
  stopLossPrice: number;
}) {
  const { side, entryPrice, takeProfitPrice, stopLossPrice } = params;

  if (
    !isFinitePositive(entryPrice) ||
    !Number.isFinite(takeProfitPrice) ||
    !Number.isFinite(stopLossPrice)
  ) {
    return false;
  }

  if (side === 'long') {
    return stopLossPrice < entryPrice && takeProfitPrice > entryPrice;
  }

  return stopLossPrice > entryPrice && takeProfitPrice < entryPrice;
}

export function getBalance() {
  return balance;
}

export function getPosition() {
  return currentPosition;
}

export function getLastClosedTrade() {
  return lastClosedTrade;
}

export function getPositionNotional() {
  return balance * POSITION_PERCENT;
}

export function getRiskCapital() {
  return balance * MAX_RISK_PER_TRADE;
}

export function openPosition(data: {
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  takeProfitPrice: number;
  stopLossPrice: number;
}) {
  if (currentPosition) {
    return { ok: false, message: 'Position already open', position: currentPosition };
  }

  if (!isValidLevels(data)) {
    return { ok: false, message: 'Invalid entry / stop / take-profit levels' };
  }

  const stopDistance = Math.abs(data.entryPrice - data.stopLossPrice);
  if (!isFinitePositive(stopDistance)) {
    return { ok: false, message: 'Invalid stop distance' };
  }

  const maxNotionalByPercent = getPositionNotional();
  const maxQuantityByPercent = maxNotionalByPercent / data.entryPrice;

  const riskCapital = getRiskCapital();
  const riskQuantity = riskCapital / stopDistance;

  const quantity = Math.min(riskQuantity, maxQuantityByPercent);
  const notional = quantity * data.entryPrice;

  if (!isFinitePositive(quantity) || !isFinitePositive(notional)) {
    return { ok: false, message: 'Calculated position size is invalid' };
  }

  currentPosition = {
    symbol: data.symbol,
    side: data.side,
    entryPrice: data.entryPrice,
    quantity,
    notional,
    takeProfitPrice: data.takeProfitPrice,
    stopLossPrice: data.stopLossPrice,
    openedAt: new Date().toISOString()
  };

  return { ok: true, balance, position: currentPosition };
}

export function closePosition(exitPrice: number, reason: 'take_profit' | 'stop_loss' | 'manual') {
  if (!currentPosition) {
    return { ok: false, message: 'No open position' };
  }

  const realizedPnL = currentPosition.side === 'long'
    ? (exitPrice - currentPosition.entryPrice) * currentPosition.quantity
    : (currentPosition.entryPrice - exitPrice) * currentPosition.quantity;

  lastClosedTrade = {
    symbol: currentPosition.symbol,
    side: currentPosition.side,
    entryPrice: currentPosition.entryPrice,
    exitPrice,
    quantity: currentPosition.quantity,
    notional: currentPosition.notional,
    realizedPnL,
    closedAt: new Date().toISOString(),
    reason
  };

  balance = balance + realizedPnL;
  currentPosition = null;

  return { ok: true, balance, lastClosedTrade };
}
