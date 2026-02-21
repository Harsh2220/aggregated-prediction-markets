import type {
  AggregatedBook,
  Fill,
  QuoteResult,
  ProtocolFillSummary,
  ProtocolId,
} from "@/types/market";

export function calculateQuote(
  book: AggregatedBook,
  dollarAmount: number,
  side: "buy" | "sell"
): QuoteResult {
  const levels = side === "buy" ? book.asks : book.bids;
  let remaining = dollarAmount;
  const fills: Fill[] = [];

  for (const level of levels) {
    if (remaining <= 0) break;

    const maxCostForLevel = level.totalSize * level.price;

    if (remaining >= maxCostForLevel) {
      for (const v of level.protocols) {
        const protocolShares = v.size;
        const protocolCost = protocolShares * level.price;
        fills.push({
          price: level.price,
          shares: protocolShares,
          cost: protocolCost,
          protocol: v.protocol,
        });
      }
      remaining -= maxCostForLevel;
    } else {
      const totalSharesAtLevel = remaining / level.price;
      for (const v of level.protocols) {
        const proportion = v.size / level.totalSize;
        const protocolShares = totalSharesAtLevel * proportion;
        const protocolCost = protocolShares * level.price;
        fills.push({
          price: level.price,
          shares: protocolShares,
          cost: protocolCost,
          protocol: v.protocol,
        });
      }
      remaining = 0;
    }
  }

  const totalShares = fills.reduce((sum, f) => sum + f.shares, 0);
  const totalCost = fills.reduce((sum, f) => sum + f.cost, 0);
  const averagePrice = totalShares > 0 ? totalCost / totalShares : 0;

  const protocolMap = new Map<ProtocolId, { shares: number; cost: number }>();
  for (const fill of fills) {
    const existing = protocolMap.get(fill.protocol) ?? { shares: 0, cost: 0 };
    existing.shares += fill.shares;
    existing.cost += fill.cost;
    protocolMap.set(fill.protocol, existing);
  }

  const protocolBreakdown: ProtocolFillSummary[] = Array.from(
    protocolMap.entries()
  ).map(([protocol, data]) => ({
    protocol,
    shares: data.shares,
    cost: data.cost,
    percentage: totalCost > 0 ? (data.cost / totalCost) * 100 : 0,
  }));

  const midPrice = book.midPrice;
  const slippageBps =
    midPrice > 0 && averagePrice > 0
      ? ((averagePrice - midPrice) / midPrice) * 10000 * (side === "buy" ? 1 : -1)
      : 0;

  return {
    totalShares,
    totalCost,
    averagePrice,
    fills,
    protocolBreakdown,
    unfilled: Math.max(0, remaining),
    slippageBps,
  };
}
