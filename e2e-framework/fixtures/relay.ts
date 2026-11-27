// A container resolves loopback addresses to itself. When configured, global
// setup forwards the local port to the cluster ingress for the duration of the
// run.
import {
  createConnection,
  createServer,
  type Server,
  type Socket,
} from "node:net";
import { SettingsError } from "../config/settings-error.ts";

export type Relay = Readonly<{ listen: number; host: string; port: number }>;

/** A started relay; `stop` closes it and every connection it still holds. */
export type RunningRelay = Readonly<{ stop: () => Promise<void> }>;

/** Parses a local listening port and the upstream host and port. */
export function parseRelay(value: string): Relay {
  const match = /^(\d{2,5})=([a-z0-9.-]+):(\d{2,5})$/.exec(value);
  const listen = Number(match?.[1]);
  const port = Number(match?.[3]);
  if (!match?.[2] || listen > 65535 || port > 65535)
    throw new SettingsError([
      "LOCAL_RELAY must look like 8080=host.namespace.svc.cluster.local:80.",
    ]);
  return { listen, host: match[2], port };
}

function listening(server: Server, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve());
  });
}

/**
 * Forwards loopback connections to the upstream host. An error on either
 * socket closes its peer and emits a fixed diagnostic.
 */
export async function startRelay({
  listen,
  host,
  port,
}: Relay): Promise<RunningRelay> {
  const sockets = new Set<Socket>();
  const track = (socket: Socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
  };
  const server = createServer((client) => {
    const upstream = createConnection({ host, port });
    track(client);
    track(upstream);
    client.pipe(upstream).pipe(client);
    client.on("error", () => {
      console.error("Browser relay connection failed.");
      upstream.destroy();
    });
    upstream.on("error", () => {
      console.error("Upstream relay connection failed.");
      client.destroy();
    });
  });
  await listening(server, listen);
  return {
    stop: () =>
      new Promise((resolve) => {
        for (const socket of sockets) socket.destroy();
        server.close(() => resolve());
      }),
  };
}
