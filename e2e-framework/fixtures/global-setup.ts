import type { FullConfig } from "@playwright/test";
import { SettingsError } from "../config/settings-error.ts";
import { runProblems } from "../config/settings.ts";
import { readSignInSteps, readSignOutSteps } from "../config/sign-in-steps.ts";
import { checkRunReporters } from "../reporting/reporters.ts";
import { parseRelay, startRelay } from "./relay.ts";

export default async function globalSetup(
  config: FullConfig,
): Promise<(() => Promise<void>) | undefined> {
  checkRunReporters(config.reporter);
  const problems = runProblems(config.workers, process.env);
  if (problems.length > 0) throw new SettingsError(problems);
  readSignInSteps();
  readSignOutSteps();
  const relay = process.env.LOCAL_RELAY?.trim();
  if (!relay) return undefined;
  return (await startRelay(parseRelay(relay))).stop;
}
