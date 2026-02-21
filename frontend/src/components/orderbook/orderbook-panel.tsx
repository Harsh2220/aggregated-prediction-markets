"use client";

import { useMarketData } from "@/hooks/use-market-data";
import { ProtocolToggle } from "./protocol-toggle";
import { OutcomeToggle } from "./outcome-toggle";
import { OrderBookTable } from "./orderbook-table";
import { DepthChart } from "./depth-chart";

export function OrderBookPanel() {
  const { outcomeBook } = useMarketData();

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-1 flex-col min-h-0">
        <div className="flex items-center justify-between pb-3 shrink-0">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Order Book
          </h2>
          <div className="flex items-center gap-2">
            <OutcomeToggle />
            <ProtocolToggle />
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <OrderBookTable book={outcomeBook} />
        </div>
      </div>

      <div className="h-px w-full bg-border shrink-0" />

      <div className="flex flex-1 flex-col min-h-0">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Depth
        </h2>
        <div className="flex-1 overflow-hidden min-h-0">
          <DepthChart book={outcomeBook} />
        </div>
      </div>
    </div>
  );
}
