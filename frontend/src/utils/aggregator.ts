import type {
  NormalizedBook,
  AggregatedBook,
  AggregatedLevel,
  ProtocolBreakdown,
} from "@/types/market";
import { PRICE_TICK_SIZE } from "@/constants";

const EMPTY_BOOK: AggregatedBook = {
  bids: [],
  asks: [],
  spread: 0,
  midPrice: 0,
  bestBid: null,
  bestAsk: null,
};

function roundToTick(price: number): number {
  return Math.round(price / PRICE_TICK_SIZE) * PRICE_TICK_SIZE;
}

function aggregateSide(
  books: NormalizedBook[],
  side: "bids" | "asks"
): AggregatedLevel[] {
  const priceMap = new Map<number, ProtocolBreakdown[]>();

  for (const book of books) {
    const levels = book[side];
    for (const level of levels) {
      const price = roundToTick(level.price);
      const key = Math.round(price * 10000);
      if (!priceMap.has(key)) {
        priceMap.set(key, []);
      }
      const protocols = priceMap.get(key)!;
      const existing = protocols.find((v) => v.protocol === book.protocol);
      if (existing) {
        existing.size += level.size;
      } else {
        protocols.push({ protocol: book.protocol, size: level.size });
      }
    }
  }

  const aggregated: AggregatedLevel[] = [];
  for (const [key, protocols] of priceMap) {
    const price = key / 10000;
    const totalSize = protocols.reduce((sum, v) => sum + v.size, 0);
    aggregated.push({
      price,
      totalSize,
      cumulativeSize: 0,
      protocols,
    });
  }

  if (side === "bids") {
    aggregated.sort((a, b) => b.price - a.price);
  } else {
    aggregated.sort((a, b) => a.price - b.price);
  }

  let cumulative = 0;
  for (const level of aggregated) {
    cumulative += level.totalSize;
    level.cumulativeSize = cumulative;
  }

  return aggregated;
}

export function flipBookToNo(book: AggregatedBook): AggregatedBook {
  if (book.bids.length === 0 && book.asks.length === 0) return book;

  const flip = (level: AggregatedLevel): AggregatedLevel => ({
    ...level,
    price: roundToTick(1 - level.price),
    cumulativeSize: 0,
  });

  const withCumulative = (levels: AggregatedLevel[]): AggregatedLevel[] => {
    let cum = 0;
    return levels.map((l) => ({ ...l, cumulativeSize: (cum += l.totalSize) }));
  };

  const noBids = withCumulative(book.asks.map(flip).sort((a, b) => b.price - a.price));
  const noAsks = withCumulative(book.bids.map(flip).sort((a, b) => a.price - b.price));

  const bestBid = noBids[0]?.price ?? null;
  const bestAsk = noAsks[0]?.price ?? null;
  const spread = bestBid !== null && bestAsk !== null ? bestAsk - bestBid : 0;
  const midPrice =
    bestBid !== null && bestAsk !== null
      ? (bestBid + bestAsk) / 2
      : (bestBid ?? bestAsk ?? 0);

  return { bids: noBids, asks: noAsks, spread, midPrice, bestBid, bestAsk };
}

export function aggregateBooks(
  books: (NormalizedBook | null)[]
): AggregatedBook {
  const validBooks = books.filter((b): b is NormalizedBook => b !== null);

  if (validBooks.length === 0) {
    return EMPTY_BOOK;
  }

  const bids = aggregateSide(validBooks, "bids");
  const asks = aggregateSide(validBooks, "asks");

  const bestBid = bids.length > 0 ? bids[0].price : null;
  const bestAsk = asks.length > 0 ? asks[0].price : null;

  const spread =
    bestBid !== null && bestAsk !== null ? bestAsk - bestBid : 0;
  const midPrice =
    bestBid !== null && bestAsk !== null ? (bestBid + bestAsk) / 2 : (bestBid ?? bestAsk ?? 0);

  return {
    bids,
    asks,
    spread,
    midPrice,
    bestBid,
    bestAsk,
  };
}
