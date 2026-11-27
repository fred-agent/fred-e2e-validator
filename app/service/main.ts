import { createServer } from "node:http";
import { join } from "node:path";
import { PROJECT_ROOT } from "../../e2e-framework/config/environment.ts";
import { createAdmit } from "./admit.ts";
import { loadServiceConfig } from "./config.ts";
import { createHandler } from "./routes.ts";
import { Runner } from "./runner.ts";
import { RunStore } from "./runs.ts";
import { readTestInventory } from "./test-inventory.ts";

function start(): void {
  const config = loadServiceConfig(process.env);
  const inventory = readTestInventory(PROJECT_ROOT);
  const store = new RunStore(config.runsDir, config.keepRuns);
  if (store.interruptLeftovers().length > 0)
    console.log("Unfinished runs were marked interrupted.");
  store.prune();

  const runner = new Runner({
    store,
    command: [join(PROJECT_ROOT, "node_modules", ".bin", "playwright"), "test"],
    cwd: PROJECT_ROOT,
    env: process.env,
    inventory,
    stopGraceMs: config.stopGraceMs,
  });
  const server = createServer(
    createHandler({
      config,
      inventory,
      store,
      runner,
      admit: createAdmit(config.controlPlaneUrl),
      uiDir: join(PROJECT_ROOT, "app", "ui", "dist"),
    }),
  );

  let stopping = false;
  async function stop(): Promise<void> {
    if (stopping) return;
    stopping = true;
    console.log("Stopping the service.");
    try {
      server.close();
      await runner.shutdown();
    } catch {
      console.error("The service could not shut down cleanly.");
      process.exitCode = 1;
    }
    process.exit();
  }
  server.on("error", () => {
    console.error("The service listener failed.");
    process.exitCode = 1;
    void stop();
  });
  server.listen(config.port, () => console.log("The service is listening."));
  for (const signal of ["SIGTERM", "SIGINT"] as const)
    process.once(signal, () => void stop());
}

try {
  start();
} catch {
  console.error("The service could not start.");
  process.exitCode = 1;
}
