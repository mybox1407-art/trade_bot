export interface VirtualPosition {
  symbol: string;
  entryPrice: number;
  takeProfitPrice: number;
  stopLossPrice: number;
  openedAt: string;
}

let currentPosition: VirtualPosition | null = null;

export function getPosition() {
  return currentPosition;
}

export function openPosition(pos: VirtualPosition) {
  if (currentPosition) {
    return { ok: false, message: 'Position already open', position: currentPosition };
  }
  currentPosition = pos;
  return { ok: true, position: currentPosition };
}

export function closePosition() {
  const closed = currentPosition;
  currentPosition = null;
  return { ok: true, closed };
}
