export type ProtocolId = "polymarket" | "dflow";
export type ConnectionStatus = "connected" | "connecting" | "disconnected";

export interface NormalizedLevel {
  price: number;
  size: number;
}

export interface BookMessage {
  type: "book";
  protocol: ProtocolId;
  outcome: "yes";
  bids: NormalizedLevel[];
  asks: NormalizedLevel[];
  timestamp: number;
}

export interface StatusMessage {
  type: "status";
  protocol: ProtocolId;
  status: ConnectionStatus;
}

export type BackendMessage = BookMessage | StatusMessage;

export type OnBook = (msg: BookMessage) => void;
export type OnStatus = (msg: StatusMessage) => void;
