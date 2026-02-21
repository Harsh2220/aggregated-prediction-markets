"use client";

import {
  formatSize,
  formatCurrency,
  formatPrice,
  formatBps,
} from "@/lib/format";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import type { QuoteResult as QuoteResultType } from "@/types/market";

interface QuoteResultProps {
  quote: QuoteResultType;
}

export function QuoteResult({ quote }: QuoteResultProps) {
  const {
    totalShares,
    averagePrice,
    protocolBreakdown,
    unfilled,
    slippageBps,
  } = quote;

  if (totalShares === 0 && unfilled === 0) return null;

  return (
    <div className="space-y-4">
      {totalShares > 0 && (
        <div className="text-center py-3">
          <p className="text-lg">
            You would receive{" "}
            <span className="font-mono font-bold text-foreground">
              {formatSize(totalShares)}
            </span>{" "}
            shares at{" "}
            <span className="font-mono font-bold text-foreground">
              {formatPrice(averagePrice)}
            </span>
          </p>
        </div>
      )}

      {protocolBreakdown.length > 0 && (
        <div className="space-y-2">
          <div className="flex h-4 w-full overflow-hidden rounded-full bg-secondary/50">
            {protocolBreakdown.map((v) => (
              <div
                key={v.protocol}
                className={`h-full transition-all duration-300 ${v.protocol === "dflow" ? "bg-protocol-dflow" : "bg-protocol-poly"}`}
                style={{ width: `${v.percentage}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            {protocolBreakdown.map((v) => (
              <span key={v.protocol}>
                {v.protocol === "dflow" ? "DFlow" : "Polymarket"}: {v.percentage.toFixed(0)}%
              </span>
            ))}
          </div>
        </div>
      )}

      {protocolBreakdown.length > 0 && (
        <div className="space-y-1 text-sm">
          {protocolBreakdown.map((v) => (
            <div
              key={v.protocol}
              className="flex items-center justify-between text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${v.protocol === "dflow" ? "bg-protocol-dflow" : "bg-protocol-poly"}`}
                />
                <span className={v.protocol === "dflow" ? "text-protocol-dflow" : "text-protocol-poly"}>
                  {v.protocol === "dflow" ? "DFlow" : "Polymarket"}:
                </span>
              </div>
              <span className="font-mono">
                {formatSize(v.shares)} shares ({formatCurrency(v.cost)})
              </span>
            </div>
          ))}
        </div>
      )}

      {unfilled > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {formatCurrency(unfilled)} could not be filled — insufficient
            liquidity
          </AlertDescription>
        </Alert>
      )}

      {slippageBps > 50 && (
        <Alert className="border-protocol-dflow/50 text-protocol-dflow">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Slippage: {formatBps(slippageBps)} vs mid-price
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
