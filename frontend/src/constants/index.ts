export const PRICE_TICK_SIZE = 0.01;
export const RECONNECT_MAX_DELAY_MS = 30_000;
export const RECONNECT_BASE_DELAY_MS = 1_000;
export const WS_URL =
  process.env.NEXT_PUBLIC_BACKEND_WS_URL || "ws://localhost:8080/ws";
