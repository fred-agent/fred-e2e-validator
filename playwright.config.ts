// Loading the configuration is sufficient for test discovery. Global setup
// checks the accounts before a run.
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
} from "./e2e-framework/reporting/reporters.ts";

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
  : [["list"], html];

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
