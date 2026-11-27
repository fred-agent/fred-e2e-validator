// Deployment settings and test settings are validated together at startup.
import type { Environment } from "../../e2e-framework/config/environment.ts";
import { SettingsError } from "../../e2e-framework/config/settings-error.ts";
import {
  ENV_CONFIG_FILE,
  fredBaseUrl,
  readEnvConfig,
  type EnvConfig,
} from "../../e2e-framework/config/settings.ts";

/** Most workers a run from the run page may ask for; each needs its own account set. */
export const MAX_RUN_WORKERS = 2;

/**
 * Time the service waits for a cancelled run to stop beyond the worst case of
 * a test's teardown, for closing the browsers and writing the reports.
 */
export const STOP_MARGIN_MS = 30_000;

/**
 * The worst case of a test's teardown: the factory fixtures `teams`,
 * `folders` and `agents` tear down one after another, each within its own
 * factory fixture timeout, and the other fixtures, the trace and a stopping
 * worker's cleanup each within the test timeout.
 */
export function worstTeardownMs(envConfig: EnvConfig): number {
  return 3 * envConfig.factoryFixtureTimeout + 3 * envConfig.testTimeout;
}

export type ServiceConfig = Readonly<{
  /** The control plane verifies access to each team route. */
  controlPlaneUrl: string;
  /** The run page displays the configured test target as read-only. */
  fredUrl: string;
  runsDir: string;
  /** Each team's finished runs kept with their logs and reports. */
  keepRuns: number;
  port: number;
  /** The run page's default number of workers, and the most a run may ask for. */
  workers: Readonly<{ default: number; max: number }>;
  /**
   * The stop grace: the time the service waits for a cancelled run to stop,
   * the worst case of a test's teardown and STOP_MARGIN_MS.
   */
  stopGraceMs: number;
}>;

function text(env: Environment, key: string): string | undefined {
  return env[key]?.trim() || undefined;
}

function wholeNumber(
  env: Environment,
  key: string,
  [fallback, min, max]: readonly [number, number, number],
  problems: string[],
): number {
  const value = text(env, key);
  if (value === undefined) return fallback;
  const number = Number(value);
  if (Number.isInteger(number) && number >= min && number <= max) return number;
  problems.push(`${key} must be a whole number from ${min} to ${max}.`);
  return fallback;
}

function controlPlane(env: Environment, problems: string[]): string {
  const value = text(env, "CONTROL_PLANE_URL");
  if (value === undefined) {
    problems.push(
      "Set CONTROL_PLANE_URL, the address of Fred's control plane, such as http://control-plane-backend:8222.",
    );
    return "";
  }
  const url = URL.canParse(value) ? new URL(value) : undefined;
  if (url?.protocol !== "http:" && url?.protocol !== "https:") {
    problems.push("CONTROL_PLANE_URL must be a full http or https address.");
    return "";
  }
  return url.href.replace(/\/+$/, "");
}

/** Reads the settings; throws one error that lists every problem. */
export function loadServiceConfig(
  env: Environment,
  envConfig: EnvConfig = readEnvConfig(),
): ServiceConfig {
  const problems: string[] = [];
  const controlPlaneUrl = controlPlane(env, problems);
  const keepRuns = wholeNumber(env, "KEEP_RUNS", [10, 1, 1000], problems);
  const port = wholeNumber(env, "PORT", [8080, 1, 65535], problems);
  if (envConfig.workers > MAX_RUN_WORKERS)
    problems.push(
      `The workers of ${ENV_CONFIG_FILE} must be from 1 to ${MAX_RUN_WORKERS} for a run started from the run page.`,
    );
  if (problems.length > 0) throw new SettingsError(problems);
  return Object.freeze({
    controlPlaneUrl,
    fredUrl: fredBaseUrl(envConfig),
    runsDir: text(env, "RUNS_DIR") ?? "/runs",
    keepRuns,
    port,
    workers: Object.freeze({
      default: envConfig.workers,
      max: MAX_RUN_WORKERS,
    }),
    stopGraceMs: worstTeardownMs(envConfig) + STOP_MARGIN_MS,
  });
}
