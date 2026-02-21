export const PORT = process.env.PORT || "8080";

export const RECONNECT_BASE_MS = 1_000;
export const RECONNECT_MAX_MS = 30_000;

export const POLYMARKET_WS_URL =
  "wss://ws-subscriptions-clob.polymarket.com/ws/market";
export const GAMMA_API = "https://gamma-api.polymarket.com";

export const DFLOW_API = "https://dev-prediction-markets-api.dflow.net/api/v1";
export const DFLOW_WS_URL =
  "wss://dev-prediction-markets-api.dflow.net/api/v1/ws";
export const DFLOW_SERIES = "KXBTC15M";
