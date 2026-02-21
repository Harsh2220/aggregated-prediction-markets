export type ProtocolId = "polymarket" | "dflow";
export type ConnectionStatus =
  | "connected"
  | "connecting"
  | "disconnected"
  | "stale";
export type Outcome = "yes" | "no";
export type ViewMode = "combined" | "polymarket" | "dflow";

export interface MarketConfig {
  id: string;
  question: string;
  description: string;
  outcomes: [string, string];
}

export interface NormalizedLevel {
  price: number;
  size: number;
}

export interface NormalizedBook {
  protocol: ProtocolId;
  outcome: Outcome;
  bids: NormalizedLevel[];
  asks: NormalizedLevel[];
  timestamp: number;
}

export interface ProtocolBreakdown {
  protocol: ProtocolId;
  size: number;
}

export interface AggregatedLevel {
  price: number;
  totalSize: number;
  cumulativeSize: number;
  protocols: ProtocolBreakdown[];
}

export interface AggregatedBook {
  bids: AggregatedLevel[];
  asks: AggregatedLevel[];
  spread: number;
  midPrice: number;
  bestBid: number | null;
  bestAsk: number | null;
}

export interface Fill {
  price: number;
  shares: number;
  cost: number;
  protocol: ProtocolId;
}

export interface ProtocolFillSummary {
  protocol: ProtocolId;
  shares: number;
  cost: number;
  percentage: number;
}

export interface QuoteResult {
  totalShares: number;
  totalCost: number;
  averagePrice: number;
  fills: Fill[];
  protocolBreakdown: ProtocolFillSummary[];
  unfilled: number;
  slippageBps: number;
}
