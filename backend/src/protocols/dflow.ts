import WebSocket from "ws";
import type { NormalizedLevel, OnBook, OnStatus } from "../types";
import { DFLOW_API, DFLOW_WS_URL, DFLOW_SERIES } from "../constants";
import { calcReconnectDelay, closeWs, sortBook } from "../utils";

interface DFlowMarket {
  ticker: string;
  closeTime: number;
  status: string;
}

interface DFlowEvent {
  seriesTicker: string;
  markets?: DFlowMarket[];
}

export function startDflow(apiKey: string, onBook: OnBook, onStatus: OnStatus): () => void {
  let ws: WebSocket | null = null;
  let currentTicker: string | null = null;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  let rotationTimeout: NodeJS.Timeout | null = null;
  let reconnectAttempts = 0;
  let stopped = false;

  function setStatus(status: "connected" | "connecting" | "disconnected") {
    onStatus({ type: "status", protocol: "dflow", status });
  }

  async function findActiveMarket(): Promise<DFlowMarket | null> {
    const res = await fetch(
      `${DFLOW_API}/events?seriesTickers=${DFLOW_SERIES}&withNestedMarkets=true&status=active`,
      { headers: { "x-api-key": apiKey }, signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) throw new Error(`DFlow events HTTP ${res.status}`);
    const data = await res.json();
    const events: DFlowEvent[] = data.events || [];

    const markets: DFlowMarket[] = [];
    for (const event of events) {
      if (event.seriesTicker === DFLOW_SERIES && event.markets) {
        for (const m of event.markets) {
          if (m.status === "active" || m.status === "open") markets.push(m);
        }
      }
    }
    if (markets.length === 0) return null;

    const now = Date.now() / 1000;
    const active = markets
      .filter((m) => m.closeTime > now)
      .sort((a, b) => a.closeTime - b.closeTime);
    return active.length > 0 ? active[0] : markets[0];
  }

  function parseOrderbook(msg: {
    yes_bids?: Record<string, number>;
    no_bids?: Record<string, number>;
  }) {
    const yesBids = msg.yes_bids || {};
    const noBids = msg.no_bids || {};

    const bids: NormalizedLevel[] = Object.entries(yesBids).map(([p, s]) => ({
      price: parseFloat(p),
      size: s,
    }));
    const asks: NormalizedLevel[] = Object.entries(noBids).map(([p, s]) => ({
      price: 1 - parseFloat(p),
      size: s,
    }));
    sortBook(bids, asks);

    onBook({ type: "book", protocol: "dflow", outcome: "yes", bids, asks, timestamp: Date.now() });
  }

  function cleanupWs() {
    if (rotationTimeout) {
      clearTimeout(rotationTimeout);
      rotationTimeout = null;
    }
    ws = closeWs(ws);
  }

  function scheduleReconnect() {
    if (stopped) return;
    reconnectAttempts++;
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    reconnectTimeout = setTimeout(
      () => { if (!stopped) discoverAndConnect(); },
      calcReconnectDelay(reconnectAttempts),
    );
  }

  function connectWs(ticker: string) {
    if (stopped) return;
    ws = new WebSocket(DFLOW_WS_URL, { headers: { "x-api-key": apiKey } });

    ws.on("open", () => {
      if (stopped) return;
      reconnectAttempts = 0;
      ws!.send(JSON.stringify({ type: "subscribe", channel: "orderbook", tickers: [ticker] }));
      setStatus("connected");
    });

    ws.on("message", (raw) => {
      if (stopped) return;
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.channel === "orderbook" && msg.market_ticker === ticker) {
          parseOrderbook(msg);
        }
      } catch {}
    });

    ws.on("close", () => {
      if (stopped) return;
      setStatus("disconnected");
      cleanupWs();
      scheduleReconnect();
    });

    ws.on("error", (err) => {
      console.error("[DFlow] WS error:", err.message);
      if (!stopped) ws?.close();
    });
  }

  function scheduleRotation(closeTime: number) {
    if (rotationTimeout) clearTimeout(rotationTimeout);
    const delayMs = Math.max(closeTime * 1000 - Date.now() + 5000, 5000);
    rotationTimeout = setTimeout(() => {
      if (stopped) return;
      console.log("[DFlow] Rotating to next market...");
      cleanupWs();
      setStatus("connecting");
      discoverAndConnect();
    }, delayMs);
  }

  async function discoverAndConnect() {
    try {
      const market = await findActiveMarket();
      if (stopped) return;
      if (!market) {
        console.warn("[DFlow] No active market, retrying in 30s...");
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(() => { if (!stopped) discoverAndConnect(); }, 30_000);
        return;
      }
      currentTicker = market.ticker;
      console.log(`[DFlow] Found market: ${currentTicker}`);
      connectWs(currentTicker);
      scheduleRotation(market.closeTime);
    } catch (err) {
      console.error("[DFlow] Discovery failed:", err instanceof Error ? err.message : err);
      if (!stopped) {
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(() => { if (!stopped) discoverAndConnect(); }, 10_000);
      }
    }
  }

  setStatus("connecting");
  discoverAndConnect();

  return function stop() {
    stopped = true;
    cleanupWs();
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    if (rotationTimeout) clearTimeout(rotationTimeout);
  };
}
