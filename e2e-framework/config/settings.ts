// The run configuration supplies the base URL, browser and timeouts. Each
// process reads it once. Validation requires every key and rejects unknown
// keys.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { hasCompleteAccountSets, INCOMPLETE_ACCOUNTS } from "./accounts.ts";
import { PROJECT_ROOT, type Environment } from "./environment.ts";
import { SettingsError } from "./settings-error.ts";

export const ENV_CONFIG_FILE = "env-config.json";

/** Most parallel workers allowed; each needs its own account set. */
export const MAX_WORKERS = 16;

export const BROWSERS = ["msedge", "chromium", "firefox", "webkit"] as const;
export type Browser = (typeof BROWSERS)[number];

const milliseconds = z.number().int().min(1);

/**
 * The part of a factory fixture's timeout its removals leave for describing
 * the page of a failed removal, closing its context and raising the
 * combined error.
 */
export const REMOVAL_MARGIN_MS = 10_000;

const parsedUrl = (value: string) =>
  URL.canParse(value) ? new URL(value) : undefined;

/**
 * An http or https origin: no user name, no password, no path other than
 * "/", no query, no fragment. A message never holds the value.
 */
const origin = z
  .string()
  .refine((value) => /^https?:$/.test(parsedUrl(value)?.protocol ?? ""), {
    error:
      "must be a full http or https address, such as http://localhost:8080",
    abort: true,
  })
  .refine((value) => {
    const url = new URL(value);
    return (
      url.username === "" &&
      url.password === "" &&
      url.pathname === "/" &&
      url.search === "" &&
      url.hash === ""
    );
  }, "must be an origin, such as http://localhost:8080, without a user name, a password, a path, a query or a fragment");

const ENV_CONFIG = z.strictObject({
  /** The base URL used for browser navigation. */
  fredBaseUrl: origin,
  workers: z.number().int().min(1).max(MAX_WORKERS),
  browser: z.enum(BROWSERS),
  /** The test timeout. */
  testTimeout: milliseconds,
  /** The timeout of a web-first assertion and of an action, such as a click. */
  expectTimeout: milliseconds,
  /** The timeout of each factory fixture's setup and teardown, which leaves its removals time beside the margin. */
  factoryFixtureTimeout: milliseconds.min(3 * REMOVAL_MARGIN_MS),
  /** The tags whose tests this environment leaves out, such as "@model". */
  excludeTags: z.array(
    z.string().regex(/^@[\w-]+$/, "a tag starts with @, such as @model"),
  ),
});

export type EnvConfig = Readonly<
  Omit<z.infer<typeof ENV_CONFIG>, "excludeTags"> & {
    excludeTags: readonly string[];
  }
>;

function describeIssue(file: string, issue: z.core.$ZodIssue): string {
  if (issue.code === "unrecognized_keys")
    return `${file} holds the unknown key ${issue.keys.map((key) => `"${key}"`).join(", ")}; its keys are ${Object.keys(ENV_CONFIG.shape).join(", ")}.`;
  const where = issue.path.length > 0 ? ` ${issue.path.join(".")}:` : "";
  return `${file}:${where} ${issue.message}.`;
}

/** The run configuration of a parsed `env-config.json`; throws one error naming every problem. */
export function parseEnvConfig(
  content: unknown,
  file: string = ENV_CONFIG_FILE,
): EnvConfig {
  const parsed = ENV_CONFIG.safeParse(content);
  if (!parsed.success)
    throw new SettingsError(
      parsed.error.issues.map((issue) => describeIssue(file, issue)),
    );
  return Object.freeze({
    ...parsed.data,
    excludeTags: Object.freeze([...parsed.data.excludeTags]),
  });
}

let cached: EnvConfig | undefined;

/** The project's `env-config.json`, read and parsed on first use, once per process. */
export function readEnvConfig(): EnvConfig {
  if (cached) return cached;
  let content: unknown;
  try {
    content = JSON.parse(
      readFileSync(join(PROJECT_ROOT, ENV_CONFIG_FILE), "utf8"),
    );
  } catch (error) {
    throw new SettingsError([
      `${ENV_CONFIG_FILE} could not be read as JSON: ${(error as Error).message}`,
    ]);
  }
  cached = parseEnvConfig(content);
  return cached;
}

/** Returns the configured application origin. */
export function fredBaseUrl(envConfig: EnvConfig = readEnvConfig()): string {
  return new URL(envConfig.fredBaseUrl).origin;
}

/**
 * Everything a run of `workers` workers needs and lacks: one complete account
 * set per worker.
 */
export function runProblems(workers: number, env: Environment): string[] {
  return hasCompleteAccountSets(workers, env) ? [] : [INCOMPLETE_ACCOUNTS];
}
