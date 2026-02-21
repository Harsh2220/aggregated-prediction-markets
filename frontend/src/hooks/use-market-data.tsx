"use client";

import { useSyncExternalStore } from "react";
import { RECONNECT_BASE_DELAY_MS, RECONNECT_MAX_DELAY_MS } from "@/constants";
import { aggregateBooks, flipBookToNo } from "@/utils/aggregator";
import type {
  AggregatedBook,
  ConnectionStatus,
  NormalizedBook,
  Outcome,
  ProtocolId,
  ViewMode,
} from "@/types/market";
import { WS_URL } from "@/constants";

const EMPTY_BOOK: AggregatedBook = {
  bids: [],
  asks: [],
  spread: 0,
  midPrice: 0,
  bestBid: null,
  bestAsk: null,
};

interface StoreState {
  protocolBooks: Record<ProtocolId, NormalizedBook | null>;
  protocolStatus: Record<ProtocolId, ConnectionStatus>;
  protocolLastUpdate: Record<ProtocolId, number | null>;
  priceTrend: "up" | "down" | null;
  viewMode: ViewMode;
  selectedOutcome: Outcome;
  aggregatedBook: AggregatedBook;
  outcomeBook: AggregatedBook;
  _prevMidPrice: number;
}

export type MarketData = Omit<StoreState, "_prevMidPrice"> & {
  setViewMode: (mode: ViewMode) => void;
  setSelectedOutcome: (outcome: Outcome) => void;
};

let state: StoreState = {
  protocolBooks: { polymarket: null, dflow: null },
  protocolStatus: { polymarket: "disconnected", dflow: "disconnected" },
  protocolLastUpdate: { polymarket: null, dflow: null },
  priceTrend: null,
  viewMode: "combined",
  selectedOutcome: "yes",
  aggregatedBook: EMPTY_BOOK,
  outcomeBook: EMPTY_BOOK,
  _prevMidPrice: 0,
};

const listeners = new Set<() => void>();

function notify(): void {
  snapshot = buildSnapshot(state);
  listeners.forEach((l) => l());
}

function buildSnapshot(s: StoreState): MarketData {
  return {
    protocolBooks: s.protocolBooks,
    protocolStatus: s.protocolStatus,
    protocolLastUpdate: s.protocolLastUpdate,
    priceTrend: s.priceTrend,
    viewMode: s.viewMode,
    selectedOutcome: s.selectedOutcome,
    aggregatedBook: s.aggregatedBook,
    outcomeBook: s.outcomeBook,
    setViewMode,
    setSelectedOutcome,
  };
}

let snapshot: MarketData = buildSnapshot(state);
const serverSnapshot: MarketData = snapshot;

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): MarketData {
  return snapshot;
}

function computeOutcomeBook(
  book: AggregatedBook,
  outcome: Outcome,
): AggregatedBook {
  return outcome === "yes" ? book : flipBookToNo(book);
}

function updateProtocolBook(protocol: ProtocolId, book: NormalizedBook): void {
  const now = Date.now();
  const newBooks = { ...state.protocolBooks, [protocol]: book };
  const newLastUpdate = { ...state.protocolLastUpdate, [protocol]: now };

  const aggregatedBook = aggregateBooks([newBooks.polymarket, newBooks.dflow]);
  const outcomeBook = computeOutcomeBook(aggregatedBook, state.selectedOutcome);

  const newMid = aggregatedBook.midPrice;
  const prevMid = state._prevMidPrice;
  const priceTrend: "up" | "down" | null =
    newMid > 0 && prevMid > 0 && newMid !== prevMid
      ? newMid > prevMid
        ? "up"
        : "down"
      : state.priceTrend;

  state = {
    ...state,
    protocolBooks: newBooks,
    protocolLastUpdate: newLastUpdate,
    aggregatedBook,
    outcomeBook,
    priceTrend,
    _prevMidPrice: newMid > 0 ? newMid : prevMid,
  };
  notify();
}

function updateProtocolStatus(
  protocol: ProtocolId,
  status: ConnectionStatus,
): void {
  if (state.protocolStatus[protocol] === status) return;
  state = {
    ...state,
    protocolStatus: { ...state.protocolStatus, [protocol]: status },
  };
  notify();
}

function updateAllProtocolStatus(status: ConnectionStatus): void {
  state = {
    ...state,
    protocolStatus: { polymarket: status, dflow: status },
  };
  notify();
}

function setViewMode(mode: ViewMode): void {
  if (state.viewMode === mode) return;
  state = { ...state, viewMode: mode };
  notify();
}

function setSelectedOutcome(outcome: Outcome): void {
  if (state.selectedOutcome === outcome) return;
  state = {
    ...state,
    selectedOutcome: outcome,
    outcomeBook: computeOutcomeBook(state.aggregatedBook, outcome),
  };
  notify();
}

let ws: WebSocket | null = null;
let attempts = 0;

function connect(): void {
  updateAllProtocolStatus("connecting");

  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    attempts = 0;
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data as string);

      if (msg.type === "status" && msg.protocol && msg.status) {
        updateProtocolStatus(
          msg.protocol as ProtocolId,
          msg.status as ConnectionStatus,
        );
      } else if (msg.type === "book" && msg.protocol) {
        const book: NormalizedBook = {
          protocol: msg.protocol as ProtocolId,
          outcome: msg.outcome ?? "yes",
          bids: msg.bids ?? [],
          asks: msg.asks ?? [],
          timestamp: msg.timestamp ?? Date.now(),
        };
        updateProtocolBook(msg.protocol as ProtocolId, book);
      }
    } catch {}
  };

  ws.onclose = () => {
    ws = null;
    updateAllProtocolStatus("disconnected");
    attempts++;
    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * Math.pow(2, attempts - 1),
      RECONNECT_MAX_DELAY_MS,
    );
    setTimeout(connect, delay);
  };

  ws.onerror = () => {
    ws?.close();
  };
}

if (typeof window !== "undefined") {
  connect();
}

export function useMarketData(): MarketData {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
}

export function useMarketSelector<T>(selector: (data: MarketData) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(snapshot),
    () => selector(serverSnapshot),
  );
}
