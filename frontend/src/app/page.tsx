"use client";

import { OrderBookPanel } from "@/components/orderbook/orderbook-panel";
import { QuoteCalculator } from "@/components/quote/quote-calculator";
import { useMarketSelector } from "@/hooks/use-market-data";
import type { ConnectionStatus, ProtocolId } from "@/types/market";

function dotColor(status: ConnectionStatus): string {
  switch (status) {
    case "connected":
      return "bg-green-500";
    case "connecting":
      return "bg-yellow-400 animate-pulse";
    case "stale":
      return "bg-amber-500 animate-pulse";
    case "disconnected":
      return "bg-red-500";
  }
}

function ProtocolStatusBar() {
  const protocolStatus = useMarketSelector((s) => s.protocolStatus);
  return (
    <div className="shrink-0 border-t border-border flex items-center gap-4 px-2 py-2">
      {(["polymarket", "dflow"] as ProtocolId[]).map((protocol) => (
        <span
          key={protocol}
          className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground"
        >
          <span
            className={`inline-block h-2 w-2 rounded-full ${dotColor(protocolStatus[protocol])}`}
          />
          {protocol === "polymarket" ? "Polymarket" : "DFlow"}
        </span>
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <div className="h-screen overflow-hidden bg-background">
      <div className="h-full p-4">
        <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-[70%_auto_1fr]">
          <div className="min-h-0">
            <OrderBookPanel />
          </div>
          <div className="hidden lg:flex lg:items-stretch">
            <div className="w-px h-full bg-border" />
          </div>
          <div className="min-h-0 flex flex-col h-full">
            <div className="flex-1 overflow-y-auto">
              <QuoteCalculator />
            </div>
            <ProtocolStatusBar />
          </div>
        </div>
      </div>
    </div>
  );
}
