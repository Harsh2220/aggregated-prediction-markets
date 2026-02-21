"use client";

import { useMemo } from "react";
import { useMarketSelector } from "@/hooks/use-market-data";
import { formatPrice } from "@/lib/format";
import { OrderBookRow } from "./orderbook-row";
import type { AggregatedBook, AggregatedLevel, ViewMode } from "@/types/market";

interface OrderBookTableProps {
  book: AggregatedBook;
}

function filterByProtocol(
  levels: AggregatedLevel[],
  viewMode: ViewMode
): AggregatedLevel[] {
  if (viewMode === "combined") return levels;

  return levels
    .map((level) => {
      const filtered = level.protocols.filter((v) => v.protocol === viewMode);
      if (filtered.length === 0) return null;
      const totalSize = filtered.reduce((sum, v) => sum + v.size, 0);
      return {
        ...level,
        totalSize,
        protocols: filtered,
      };
    })
    .filter((l): l is AggregatedLevel => l !== null);
}

export function OrderBookTable({ book }: OrderBookTableProps) {
  const viewMode = useMarketSelector((s) => s.viewMode);

  const filteredBids = useMemo(
    () => filterByProtocol(book.bids, viewMode),
    [book.bids, viewMode]
  );

  const filteredAsks = useMemo(
    () => filterByProtocol(book.asks, viewMode),
    [book.asks, viewMode]
  );

  const maxSize = useMemo(() => {
    const allSizes = [
      ...filteredBids.map((l) => l.totalSize),
      ...filteredAsks.map((l) => l.totalSize),
    ];
    return allSizes.length > 0 ? Math.max(...allSizes) : 1;
  }, [filteredBids, filteredAsks]);

  const asksWithCost = useMemo(
    () =>
      filteredAsks.reduce<{ level: AggregatedLevel; cumulativeCost: number }[]>(
        (acc, level) => {
          const prev = acc[acc.length - 1]?.cumulativeCost ?? 0;
          return [...acc, { level, cumulativeCost: prev + level.totalSize * level.price }];
        },
        []
      ),
    [filteredAsks]
  );

  const bidsWithCost = useMemo(
    () =>
      filteredBids.reduce<{ level: AggregatedLevel; cumulativeCost: number }[]>(
        (acc, level) => {
          const prev = acc[acc.length - 1]?.cumulativeCost ?? 0;
          return [...acc, { level, cumulativeCost: prev + level.totalSize * level.price }];
        },
        []
      ),
    [filteredBids]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 grid grid-cols-[44px_80px_1fr_1fr] text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-0 py-1.5 border-b border-border/60 bg-secondary/40">
        <div />
        <div className="text-center">Price</div>
        <div className="text-right pr-3">Shares</div>
        <div className="text-right pr-2">Total</div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="flex flex-col-reverse">
          {asksWithCost.map(({ level, cumulativeCost }) => (
            <OrderBookRow
              key={`ask-${level.price}`}
              level={level}
              side="ask"
              maxSize={maxSize}
              cumulativeCost={cumulativeCost}

            />
          ))}
        </div>
      </div>

      <div className="shrink-0 flex items-center justify-center gap-4 py-1.5 text-xs font-medium bg-secondary/50 border-y border-border">
        <span className="text-muted-foreground">
          Last{" "}
          <span className="font-mono font-semibold text-foreground">
            {formatPrice(book.bestBid ?? 0)}
          </span>
        </span>
        <span className="text-border">|</span>
        <span className="text-muted-foreground">
          Spread{" "}
          <span className="font-mono font-semibold text-foreground">
            {formatPrice(book.spread)}
          </span>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {bidsWithCost.map(({ level, cumulativeCost }) => (
          <OrderBookRow
            key={`bid-${level.price}`}
            level={level}
            side="bid"
            maxSize={maxSize}
            cumulativeCost={cumulativeCost}
          />
        ))}
      </div>
    </div>
  );
}
