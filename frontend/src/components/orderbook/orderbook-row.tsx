"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCurrency, formatPrice, formatSize } from "@/lib/format";
import type { AggregatedLevel } from "@/types/market";

interface OrderBookRowProps {
  level: AggregatedLevel;
  side: "bid" | "ask";
  maxSize: number;
  cumulativeCost: number;
}

export function OrderBookRow({
  level,
  side,
  maxSize,
  cumulativeCost,
}: OrderBookRowProps) {
  const barWidth = maxSize > 0 ? (level.totalSize / maxSize) * 100 : 0;
  const isBid = side === "bid";

  const rowContent = (
    <div className="relative grid grid-cols-[44px_80px_1fr_1fr] items-center h-7 hover:bg-accent/40 transition-colors border-b border-border/20 overflow-hidden cursor-default">
      <div
        className="absolute left-0 top-0 h-full transition-all duration-200 pointer-events-none"
        style={{
          width: `${barWidth}%`,
          backgroundColor: isBid
            ? "rgba(0,192,135,0.12)"
            : "rgba(255,77,77,0.12)",
        }}
      />

      <div />

      <div
        className={`relative z-10 text-center font-mono text-xs tabular-nums font-semibold ${
          isBid ? "text-bid" : "text-ask"
        }`}
      >
        {formatPrice(level.price)}
      </div>

      <div className="relative z-10 text-right pr-3 font-mono text-xs tabular-nums text-foreground">
        {formatSize(level.totalSize)}
      </div>

      <div className="relative z-10 text-right pr-2 font-mono text-xs tabular-nums text-muted-foreground">
        {formatCurrency(cumulativeCost)}
      </div>
    </div>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{rowContent}</TooltipTrigger>
      <TooltipContent side="left">
        <div className="space-y-1">
          <p className="font-mono text-xs font-semibold">
            {formatPrice(level.price)}
          </p>
          {level.protocols.map((v) => (
            <div key={v.protocol} className="flex items-center gap-2 text-xs">
              <span
                className={`inline-block h-2 w-2 rounded-full ${v.protocol === "dflow" ? "bg-protocol-dflow" : "bg-protocol-poly"}`}
              />
              <span className="text-muted-foreground">
                {v.protocol === "dflow" ? "DFlow" : "Polymarket"}
              </span>
              <span className="font-mono ml-auto">{formatSize(v.size)}</span>
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
