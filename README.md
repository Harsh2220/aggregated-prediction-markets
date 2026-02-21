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

- Separate backend because DFlow's WebSocket requires custom headers that don't work client-side. The backend handles all protocol connections and sends a single normalized stream to the frontend.
- `useSyncExternalStore` with a module-level store instead of Context or Redux. No providers needed, components only re-render when their selected slice changes, and a static server snapshot keeps SSR hydration clean.
- Both protocols share a common abstraction — they normalize into the same `BookMessage` shape. Adding a new protocol is just writing one `startProtocol(onBook, onStatus)` function.
- The "no" outcome isn't stored separately. It's computed on demand by flipping "yes" prices (`1 - price`) and swapping bids/asks, so there's no duplicate data.
- Orders are rounded to 0.01 ticks before aggregation. This keeps the order book table clean and each level tracks which protocol contributed how much size.

## Assumptions & Tradeoffs

- I used regular float math instead of BigNumber. It's good enough for a display layer, but wouldn't be safe for real trade execution.
- The module-level store only supports one market view at a time. Comparing two markets side-by-side would need a different approach.
- The quote calculator walks through the book and simulates fills, but it doesn't account for order impact, protocol fees, or execution risk.
- Reconnection uses exponential backoff (1s up to 30s cap). It's simple but will keep retrying forever if the server stays down.

## Future Improvements

- Add more protocols (Opinion, etc.) — the abstraction layer is already set up for it.
- Model protocol fees in the quote calculator so cost estimates are closer to reality.
- Batch rapid WebSocket updates with `requestAnimationFrame` to reduce unnecessary re-renders.
- Persist user preferences (outcome toggle) to `localStorage` so they survive page reloads.
- Add validation for incoming WebSocket messages instead of trusting the shape blindly.
- Switch the depth chart to canvas rendering if order books get large enough to lag with SVG.
