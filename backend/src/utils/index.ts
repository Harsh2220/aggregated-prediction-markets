import type { NormalizedLevel } from "../types";
import { RECONNECT_BASE_MS, RECONNECT_MAX_MS } from "../constants";

export function parseLevel(raw: { price: string; size: string }): NormalizedLevel {
  return { price: parseFloat(raw.price), size: parseFloat(raw.size) };
}

export function sortBook(bids: NormalizedLevel[], asks: NormalizedLevel[]): void {
  bids.sort((a, b) => b.price - a.price);
  asks.sort((a, b) => a.price - b.price);
}

export function calcReconnectDelay(attempts: number): number {
  return Math.min(RECONNECT_BASE_MS * Math.pow(2, attempts - 1), RECONNECT_MAX_MS);
}

export function closeWs(ws: import("ws") | null): null {
  if (ws) {
    ws.removeAllListeners();
    ws.close();
  }
  return null;
}
