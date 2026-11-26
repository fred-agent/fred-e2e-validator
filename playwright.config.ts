// Loading the configuration is sufficient for test discovery. Global setup
// checks the accounts before a run.
import { join } from "node:path";
import {
  defineConfig,
  devices,
  type ReporterDescription,
} from "@playwright/test";
import { loadDotEnv } from "./e2e-framework/config/environment.ts";
import {
  fredBaseUrl,
  readEnvConfig,
  type Browser,
} from "./e2e-framework/config/settings.ts";
import type { RunLogOptions } from "./e2e-framework/reporting/run-log-reporter.ts";
import {
  RUN_LOG_REPORTER,
  STEP_REPORTER,
  ZEPHYR_CSV_REPORTER,
} from "./e2e-framework/reporting/reporters.ts";
import {
  zephyrReportDir,
  type ZephyrCsvOptions,
} from "./e2e-framework/reporting/zephyr-csv.ts";

loadDotEnv();
const envConfig = readEnvConfig();
// Runs started from the run page report progress to this file.
const progressFile = process.env.RUN_PROGRESS_FILE?.trim();

const DEVICES: Readonly<Record<Browser, string>> = {
  msedge: "Desktop Edge",
  chromium: "Desktop Chrome",
  firefox: "Desktop Firefox",
  webkit: "Desktop Safari",
};

/** Matches a test that carries any of the tags, as a whole tag. */
function anyTag(tags: readonly string[]): RegExp | undefined {
  if (tags.length === 0) return undefined;
  const escaped = tags.map((tag) => tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`(^|\\s)(${escaped.join("|")})(\\s|$)`);
}
const grepInvert = anyTag(envConfig.excludeTags);

/**
 * The browser's proxy, from HTTPS_PROXY and NO_PROXY, for an environment that
 * reaches its identity provider through one. NO_PROXY lists the hosts reached
 * directly, such as Fred's, separated by commas.
 */
function browserProxy():
  | { server: string; bypass?: string; username?: string; password?: string }
  | undefined {
  const value = (process.env.HTTPS_PROXY ?? process.env.https_proxy)?.trim();
  if (!value) return undefined;
  const url = new URL(value);
  const bypass = (process.env.NO_PROXY ?? process.env.no_proxy)?.trim();
  return {
    server: `${url.protocol}//${url.host}`,
    ...(bypass && { bypass }),
    ...(url.username && {
      username: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
    }),
  };
}
const proxy = browserProxy();

const zephyrDir = zephyrReportDir(import.meta.dirname);

const html: ReporterDescription = [
  "html",
  { open: "never", noSnippets: true, noCopyPrompt: true },
];
const reporter: ReporterDescription[] = progressFile
  ? [
      [
        RUN_LOG_REPORTER,
        {
          progressFile,
          logFile: process.env.RUN_LOG_FILE,
        } satisfies RunLogOptions,
      ],
      html,
    ]
  : [
      ["list"],
      html,
      // The files for Zephyr (Jira): the CSV and the JUnit XML of the run.
      [
        ZEPHYR_CSV_REPORTER,
        {
          outputFile: join(zephyrDir, "zephyr-tests.csv"),
        } satisfies ZephyrCsvOptions,
      ],
      [
        "junit",
        {
          outputFile: join(zephyrDir, "junit.xml"),
          stripANSIControlSequences: true,
        },
      ],
    ];

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: envConfig.workers,
  timeout: envConfig.testTimeout,
  expect: { timeout: envConfig.expectTimeout },
  globalSetup: "./e2e-framework/fixtures/global-setup.ts",
  reporter: [[STEP_REPORTER], ...reporter],
  quiet: true,
  preserveOutput: "never",
  captureGitInfo: { commit: false, diff: false },
  use: {
    baseURL: fredBaseUrl(envConfig),
    // An environment whose certificate an internal authority signs, which
    // the image does not trust, sets FRED_IGNORE_HTTPS_ERRORS=true.
    ignoreHTTPSErrors: process.env.FRED_IGNORE_HTTPS_ERRORS === "true",
    ...(proxy && { proxy }),
    // Page objects use English labels. Accounts without a saved preference
    // inherit the browser language.
    locale: "en-US",
    actionTimeout: envConfig.expectTimeout,
    screenshot: "off",
    trace: "off",
    video: "off",
  },
  projects: [
    {
      name: envConfig.browser,
      use: {
        ...devices[DEVICES[envConfig.browser]],
        ...(envConfig.browser === "msedge" ? { channel: "msedge" } : {}),
      },
      ...(grepInvert ? { grepInvert } : {}),
    },
  ],
});
