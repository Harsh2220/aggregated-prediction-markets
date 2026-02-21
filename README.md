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

frontend/   Next.js 16 + React 19 — real-time order book table, D3 depth
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
