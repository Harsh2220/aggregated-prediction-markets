# Aggregated Prediction Markets

Aggregated order book viewer for prediction markets. Combines liquidity from **Polymarket** and **DFlow** into a unified real-time order book with depth chart and quote calculator.

## Features

- **Aggregated Order Book** — merges bids/asks from multiple protocols into a single, sortable view
- **D3 Depth Chart** — interactive cumulative depth visualization with hover tooltips
- **Quote Calculator** — simulate fills across the aggregated book with per-protocol cost breakdown
- **Real-time Streaming** — WebSocket-powered updates with automatic reconnection and staleness detection

## Architecture

```
backend/    Express + WebSocket server — connects to Polymarket & DFlow,
            normalizes order books, broadcasts to frontend clients

frontend/   Next.js 16 + React 19 — real-time order book,depth
            chart, and quote calculator with protocol-level breakdown
```

## Setup

### Backend

```sh
cd backend
pnpm install
cp .env.example .env
pnpm run dev
```

### Frontend

```sh
cd frontend
pnpm install
cp .env.example .env
pnpm run dev
```

## Design Decisions

- I used a **module-level store with `useSyncExternalStore`** instead of Context or Redux. It's simpler — no providers, no boilerplate. `useMarketSelector` lets components subscribe to only what they need, and a static server snapshot avoids hydration mismatches.
- Each protocol (Polymarket, DFlow) is behind a **common abstraction** — they both normalize into the same `BookMessage` shape. To add a new protocol you just write one `startProtocol(onBook, onStatus)` function.
- I went with **raw D3** for the depth chart instead of something like Recharts. It's more code (~390 lines), but I needed full control over per-protocol color-coding, the crosshair tooltip, and how the SVG updates on every tick.
- The **"no" outcome isn't stored separately** — it's computed on the fly by flipping "yes" prices (`1 - price`) and swapping bids/asks. No reason to keep two copies of the same data.
- Orders are **rounded to 0.01 ticks** before aggregation. This keeps the table from being overwhelmed with micro-price levels, and each level tracks which protocol contributed what for the quote breakdown.

## Assumptions & Tradeoffs

- I used regular float math instead of BigNumber. Good enough for display purposes, wouldn't use this for real execution.
- The module-level store means you get one market view per app. If you wanted to compare two markets side-by-side, you'd need to rethink this.
- The quote calculator walks through the book and simulates fills, but it doesn't model order impact, protocol fees, or execution risk.
- Reconnection uses exponential backoff (1s up to 30s cap). Simple, but it'll keep retrying forever if the server is down.

## Future Improvements

- Add more protocols (Opinion, etc.) — the abstraction is already there.
- Model protocol fees in the quote calculator so cost estimates are more realistic.
- Batch rapid updates with `requestAnimationFrame` to avoid unnecessary re-renders.
- Save user preferences (outcome toggle, view mode) to `localStorage`.
- Validate incoming WebSocket messages on both sides instead of trusting the shape.
- Switch the depth chart to canvas rendering if order books get large enough to lag SVG.
