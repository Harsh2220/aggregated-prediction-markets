import "dotenv/config";
import express from "express";
import expressWs from "express-ws";
import { WebSocket } from "ws";
import { startPolymarket } from "./protocols/polymarket";
import { startDflow } from "./protocols/dflow";
import { PORT } from "./constants";
import type {
  BackendMessage,
  BookMessage,
  StatusMessage,
  ProtocolId,
} from "./types";
const DFLOW_API_KEY = process.env.DFLOW_API_KEY;

if (!DFLOW_API_KEY) {
  throw new Error("[Server] DFLOW_API_KEY is not set. Check backend/.env");
}

const currentStatus: Record<ProtocolId, StatusMessage["status"]> = {
  polymarket: "disconnected",
  dflow: "disconnected",
};

const currentBooks: Record<ProtocolId, BookMessage | null> = {
  polymarket: null,
  dflow: null,
};

const { app, getWss } = expressWs(express());

app.ws("/ws", (client) => {
  console.log(`[Server] WS client connected (total: ${getWss().clients.size})`);

  for (const protocol of ["polymarket", "dflow"] as ProtocolId[]) {
    client.send(
      JSON.stringify({
        type: "status",
        protocol,
        status: currentStatus[protocol],
      } satisfies BackendMessage),
    );
    if (currentBooks[protocol])
      client.send(JSON.stringify(currentBooks[protocol]));
  }

  client.on("close", () => {
    console.log(
      `[Server] WS client disconnected (total: ${getWss().clients.size})`,
    );
  });
});

function broadcast(msg: BackendMessage) {
  const payload = JSON.stringify(msg);
  getWss().clients.forEach((c) => {
    if (c.readyState === WebSocket.OPEN) c.send(payload);
  });
}

function protocolHandlers(protocol: ProtocolId) {
  return {
    onBook: (msg: BookMessage) => {
      currentBooks[protocol] = msg;
      broadcast(msg);
    },
    onStatus: (msg: StatusMessage) => {
      currentStatus[protocol] = msg.status;
      broadcast(msg);
    },
  };
}

const polymarket = protocolHandlers("polymarket");
const dflow = protocolHandlers("dflow");

const stopPolymarket = startPolymarket(polymarket.onBook, polymarket.onStatus);
const stopDflow = startDflow(DFLOW_API_KEY, dflow.onBook, dflow.onStatus);

const server = app.listen(PORT, () => {
  console.log(`[Server] Listening on http://localhost:${PORT} (HTTP + WS)`);
});

function shutdown() {
  console.log("\n[Server] Shutting down...");
  stopPolymarket();
  stopDflow();
  getWss().close(() => server.close(() => process.exit(0)));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
