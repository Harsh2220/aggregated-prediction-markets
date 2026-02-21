import WebSocket from "ws";
import type { NormalizedLevel, OnBook, OnStatus } from "../types";
import { POLYMARKET_WS_URL, GAMMA_API } from "../constants";
import { parseLevel, sortBook, calcReconnectDelay, closeWs } from "../utils";

interface GammaMarket {
  clobTokenIds: string[] | string;
  question: string;
  acceptingOrders: boolean;
}

export function startPolymarket(
  onBook: OnBook,
  onStatus: OnStatus,
): () => void {
  let tokenId: string | null = null;
  let ws: WebSocket | null = null;
  let pingInterval: NodeJS.Timeout | null = null;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  let rotationTimeout: NodeJS.Timeout | null = null;
  let reconnectAttempts = 0;
  let stopped = false;
  let currentBids: NormalizedLevel[] = [];
  let currentAsks: NormalizedLevel[] = [];

  function emit(bids: NormalizedLevel[], asks: NormalizedLevel[]) {
    onBook({
      type: "book",
      protocol: "polymarket",
      outcome: "yes",
      bids,
      asks,
      timestamp: Date.now(),
    });
  }

  function setStatus(status: "connected" | "connecting" | "disconnected") {
    onStatus({ type: "status", protocol: "polymarket", status });
  }

  function extractUpToken(market: GammaMarket): string | null {
    try {
      const ids =
        typeof market.clobTokenIds === "string"
          ? JSON.parse(market.clobTokenIds)
          : market.clobTokenIds;
      return Array.isArray(ids) && ids.length >= 1 ? ids[0] : null;
    } catch {
      return null;
    }
  }

  function getCurrentSlotTimestamp(): number {
    const now = new Date();
    const slotMin = Math.floor(now.getUTCMinutes() / 15) * 15;
    const slot = new Date(now);
    slot.setUTCMinutes(slotMin, 0, 0);
    return Math.floor(slot.getTime() / 1000);
  }

  function getCurrentSlotEndMs(): number {
    return (getCurrentSlotTimestamp() + 15 * 60) * 1000;
  }

  async function findActiveMarketToken(): Promise<string | null> {
    const currentTs = getCurrentSlotTimestamp();
    for (const ts of [currentTs, currentTs - 15 * 60, currentTs + 15 * 60]) {
      const slug = `btc-updown-15m-${ts}`;
      try {
        const res = await fetch(`${GAMMA_API}/markets?slug=${slug}`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) continue;
        const markets: GammaMarket[] = await res.json();
        if (markets.length === 0) continue;
        const token = extractUpToken(markets[0]);
        if (token) {
          console.log(
            `[Polymarket] Found market: ${markets[0].question}, token: ${token.slice(0, 16)}...`,
          );
          return token;
        }
      } catch {}
    }
    return null;
  }

  function cleanupWs() {
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
    if (rotationTimeout) {
      clearTimeout(rotationTimeout);
      rotationTimeout = null;
    }
    ws = closeWs(ws);
  }

  function handleMessage(msg: Record<string, unknown>) {
    if (msg.event_type === "book") {
      const bids = (msg.bids as Array<{ price: string; size: string }>) || [];
      const asks = (msg.asks as Array<{ price: string; size: string }>) || [];
      currentBids = bids.map(parseLevel);
      currentAsks = asks.map(parseLevel);
      sortBook(currentBids, currentAsks);
      emit([...currentBids], [...currentAsks]);
    } else if (msg.event_type === "price_change") {
      const changes =
        (msg.price_changes as Array<{
          asset_id: string;
          price: string;
          size: string;
          side: string;
        }>) || [];
      for (const change of changes) {
        if (change.asset_id !== tokenId) continue;
        const price = parseFloat(change.price);
        const size = parseFloat(change.size);
        const side = change.side === "BUY" ? currentBids : currentAsks;
        const idx = side.findIndex((l) => Math.abs(l.price - price) < 0.0001);
        if (size === 0) {
          if (idx >= 0) side.splice(idx, 1);
        } else if (idx >= 0) {
          side[idx] = { price, size };
        } else {
          side.push({ price, size });
        }
      }
      sortBook(currentBids, currentAsks);
      emit([...currentBids], [...currentAsks]);
    }
  }

  function scheduleReconnect() {
    if (stopped) return;
    reconnectAttempts++;
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    reconnectTimeout = setTimeout(() => {
      if (!stopped) connectWs();
    }, calcReconnectDelay(reconnectAttempts));
  }

  function connectWs() {
    if (stopped || !tokenId) return;
    try {
      ws = new WebSocket(POLYMARKET_WS_URL);

      ws.on("open", () => {
        if (stopped) return;
        reconnectAttempts = 0;
        setStatus("connected");
        ws!.send(
          JSON.stringify({
            assets_ids: [tokenId],
            type: "market",
            custom_feature_enabled: true,
          }),
        );
        pingInterval = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) ws.send("PING");
        }, 10_000);
      });

      ws.on("message", (raw) => {
        if (stopped) return;
        const data = raw.toString();
        if (data === "PONG") return;
        try {
          handleMessage(JSON.parse(data));
        } catch {}
      });

      ws.on("close", () => {
        if (stopped) return;
        cleanupWs();
        setStatus("disconnected");
        scheduleReconnect();
      });

      ws.on("error", (err) => {
        console.error("[Polymarket] WS error:", err.message);
        if (!stopped) ws?.close();
      });
    } catch {
      setStatus("disconnected");
      scheduleReconnect();
    }
  }

  function scheduleRotation() {
    if (rotationTimeout) clearTimeout(rotationTimeout);
    const delayMs = Math.max(getCurrentSlotEndMs() - Date.now() + 5000, 5000);
    rotationTimeout = setTimeout(() => {
      if (stopped) return;
      console.log("[Polymarket] Rotating to next market...");
      cleanupWs();
      setStatus("connecting");
      discoverAndConnect();
    }, delayMs);
  }

  async function discoverAndConnect() {
    try {
      const found = await findActiveMarketToken();
      if (stopped) return;
      if (!found) {
        console.warn("[Polymarket] No active market, retrying in 15s...");
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(() => {
          if (!stopped) discoverAndConnect();
        }, 15_000);
        return;
      }
      tokenId = found;
      currentBids = [];
      currentAsks = [];
      if (!stopped) connectWs();
      scheduleRotation();
    } catch (err) {
      console.error(
        "[Polymarket] Discovery failed:",
        err instanceof Error ? err.message : err,
      );
      if (!stopped) {
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(() => {
          if (!stopped) discoverAndConnect();
        }, 10_000);
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
