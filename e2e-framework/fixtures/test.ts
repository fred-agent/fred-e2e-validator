// The test the test files import, with its fixtures: the worker's account
// set, test data and storage states; the users `admin`, `member`,
// `secondUser`, `outsider` and `visitor`; and the factory fixtures `teams`,
// `folders`, `agents`, `prompts` and `preferences`, which remove what they
// create, and restore what they change, in their own teardown.
import { stripVTControlCharacters } from "node:util";
import { test as base, type TestInfo } from "@playwright/test";
import { AccountSet, type AccountName } from "../config/accounts.ts";
import {
  readEnvConfig,
  REMOVAL_MARGIN_MS,
  type EnvConfig,
} from "../config/settings.ts";
import { loadTestData, type TestData } from "../config/test-data.ts";
import { PAGE_AT_FAILURE, REMOVAL_FAILED } from "../reporting/run-log.ts";
import { Agents } from "./agents.ts";
import { Folders } from "./folders.ts";
import { Preferences } from "./preferences.ts";
import { Prompts } from "./prompts.ts";
import { StorageStates } from "./storage-states.ts";
import { Teams } from "./teams.ts";
import {
  TestUsers,
  type RemovalUser,
  type User,
  type Visitor,
} from "./users.ts";

export type { Space } from "../config/test-data.ts";
export type { Agent } from "./agents.ts";
export type { Folder } from "./folders.ts";
export type { Prompt } from "./prompts.ts";
export type { TemporaryTeam } from "./teams.ts";
export { PROCESSING_TIMEOUT } from "../pages/resources-page.ts";
export { REMOVAL_FAILED };

/**
 * The timeout of each factory fixture's setup and teardown together, read
 * when this module is imported, as `playwright.config.ts` reads its own.
 */
const FACTORY_FIXTURE_TIMEOUT = readEnvConfig().factoryFixtureTimeout;

/**
 * One removal of what a factory fixture created, or restoration of what it
 * changed, run in its teardown.
 */
export type Removal = Readonly<{
  /** The step's title, such as `Delete the folder "e2e upload …" of "Personal space"`. */
  title: string;
  /** The account that created or changed the thing, whose storage state opens the removal's context. */
  account: AccountName;
  /**
   * Removes or restores even if setup stopped before the test ran. A
   * confirmed object must still exist.
   */
  remove: (user: User) => Promise<void>;
}>;

type WorkerFixtures = {
  envConfig: EnvConfig;
  /** The account set of this worker: its parallel index plus one. */
  accounts: AccountSet;
  testData: TestData;
  /** The storage state of each account, signed in once per worker. */
  storageStates: StorageStates;
  /** Counts the tests of this worker that name what they create, for their stamps. */
  testCounter: { next(): number };
};

type TestFixtures = {
  /** The users of the test: opened on first use, closed after the test. */
  testUsers: TestUsers;
  /** `e2e <word> <stamp>`: the stamp is the test's start time, worker and test number. */
  uniqueName: (word: string) => string;
  admin: User;
  member: User;
  secondUser: User;
  outsider: User;
  visitor: Visitor;
  teams: Teams;
  folders: Folders;
  agents: Agents;
  prompts: Prompts;
  preferences: Preferences;
};

function twoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Combines the UTC start time, worker number and test number within the worker.
 */
function testStamp(start: Date, worker: number, test: number): string {
  const date = `${start.getUTCFullYear()}${twoDigits(start.getUTCMonth() + 1)}${twoDigits(start.getUTCDate())}`;
  const time = `${twoDigits(start.getUTCHours())}${twoDigits(start.getUTCMinutes())}${twoDigits(start.getUTCSeconds())}`;
  return `${date}-${time}-${worker}.${test}`;
}

/** Generates a unique name for an object created by a test. */
function uniqueName(word: string, stamp: string): string {
  return `e2e ${word} ${stamp}`;
}

/** The first line of an error's message, without Playwright's terminal colours. */
function firstLine(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return (
    stripVTControlCharacters(message).trim().split("\n")[0]?.trim() ||
    "it failed without a message"
  );
}

/**
 * Runs a factory fixture's removals in its teardown, once the test's own
 * users are closed: every removal tried, in the order given, each in a
 * browser context of its own, closed in a `finally`, and as a step titled
 * for what it removes, with the subtitle `removal`. Each removal's limit is
 * the fixture's time left divided by the removals left; the fixture's
 * timeout covers its setup and its teardown, so the time left is the timeout
 * less the setup's duration and the time since the teardown started. A
 * removal past its limit does not go on. A failed removal's page is
 * attached. Then one error names every failed removal.
 */
async function removeEach(
  listRemovals: () => readonly Removal[],
  users: TestUsers,
  testInfo: TestInfo,
  setupMs: number,
): Promise<void> {
  const deadline =
    performance.now() + FACTORY_FIXTURE_TIMEOUT - setupMs - REMOVAL_MARGIN_MS;
  const failed: string[] = [];
  await users.closeUsers(testInfo.status);
  const removals = listRemovals();
  for (const [index, removal] of removals.entries()) {
    const limit = Math.floor(
      (deadline - performance.now()) / (removals.length - index),
    );
    if (limit <= 0) {
      failed.push(
        `${removal.title}: the factory fixture's timeout left no time for it`,
      );
      continue;
    }
    let opened: RemovalUser | undefined;
    let over = false;
    let settled = false;
    let shown: string | undefined;
    try {
      await base.step(
        removal.title,
        async () => {
          opened = await users.openForRemoval(removal.account, () => over);
          if (over) return;
          try {
            await removal.remove(opened.user);
          } finally {
            settled = true;
          }
        },
        { subtitle: "removal", timeout: limit },
      );
    } catch (error) {
      over = true;
      failed.push(`${removal.title}: ${firstLine(error)}`);
      if (!opened) shown = "a page that did not finish opening";
      else if (settled) shown = await opened.describePage();
      else shown = "a page closed at the removal deadline";
    } finally {
      over = true;
      await users.closeUsers();
    }
    if (shown)
      await testInfo.attach(PAGE_AT_FAILURE, {
        body: `${removal.account} removing at ${shown}`,
        contentType: "text/plain",
      });
  }
  if (failed.length > 0)
    throw new Error(`${REMOVAL_FAILED}\n${failed.join("\n")}`);
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  envConfig: [
    // eslint-disable-next-line no-empty-pattern -- Playwright requires the destructuring pattern
    async ({}, use) => {
      await use(readEnvConfig());
    },
    { scope: "worker" },
  ],
  accounts: [
    // eslint-disable-next-line no-empty-pattern -- Playwright requires the destructuring pattern
    async ({}, use, workerInfo) => {
      await use(new AccountSet(workerInfo.parallelIndex + 1, process.env));
    },
    { scope: "worker" },
  ],
  testData: [
    // eslint-disable-next-line no-empty-pattern -- Playwright requires the destructuring pattern
    async ({}, use) => {
      await use(loadTestData());
    },
    { scope: "worker" },
  ],
  storageStates: [
    async ({ accounts }, use) => {
      await use(new StorageStates(accounts));
    },
    { scope: "worker" },
  ],
  testCounter: [
    // eslint-disable-next-line no-empty-pattern -- Playwright requires the destructuring pattern
    async ({}, use) => {
      let count = 0;
      await use({ next: () => ++count });
    },
    { scope: "worker" },
  ],
  // Each test records its account set. On failure, the report includes the
  // state of each open page and any failed requests or responses.
  testUsers: [
    async ({ browser, accounts, storageStates }, use, testInfo) => {
      testInfo.annotations.push({
        type: "account set",
        description: String(accounts.number),
      });
      const users = new TestUsers({
        browser,
        accounts,
        storageStates,
        worker: testInfo.parallelIndex + 1,
      });
      await use(users);
      await users.closeAll(testInfo.status);
      if (testInfo.status !== testInfo.expectedStatus)
        await testInfo.attach(PAGE_AT_FAILURE, {
          body: users.describe(),
          contentType: "text/plain",
        });
    },
    { auto: true },
  ],
  uniqueName: async ({ testCounter }, use, testInfo) => {
    const stamp = testStamp(
      new Date(),
      testInfo.parallelIndex + 1,
      testCounter.next(),
    );
    await use((word) => uniqueName(word, stamp));
  },
  admin: async ({ testUsers }, use) => {
    await use(await testUsers.user("admin"));
  },
  member: async ({ testUsers }, use) => {
    await use(await testUsers.user("member"));
  },
  secondUser: async ({ testUsers }, use) => {
    await use(await testUsers.user("secondUser"));
  },
  outsider: async ({ testUsers }, use) => {
    await use(await testUsers.user("outsider"));
  },
  visitor: async ({ testUsers }, use) => {
    await use(await testUsers.visitor());
  },
  teams: [
    async ({ testUsers, accounts, uniqueName: name }, use, testInfo) => {
      const setupStart = performance.now();
      const teams = new Teams({ users: testUsers, accounts, uniqueName: name });
      const setupMs = performance.now() - setupStart;
      await use(teams);
      await removeEach(() => teams.removals(), testUsers, testInfo, setupMs);
    },
    { timeout: FACTORY_FIXTURE_TIMEOUT },
  ],
  // Depends on `teams`, so Playwright tears a folder down before its team.
  folders: [
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the dependency orders the teardowns
    async ({ testUsers, uniqueName: name, teams }, use, testInfo) => {
      const setupStart = performance.now();
      const folders = new Folders({ uniqueName: name });
      const setupMs = performance.now() - setupStart;
      await use(folders);
      await removeEach(() => folders.removals(), testUsers, testInfo, setupMs);
    },
    { timeout: FACTORY_FIXTURE_TIMEOUT },
  ],
  // Depends on `teams` and `folders`, so Playwright tears an agent down
  // before the folders it may be restricted to and before its team.
  agents: [
    async (
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the dependencies order the teardowns
      { testUsers, testData, uniqueName: name, teams, folders },
      use,
      testInfo,
    ) => {
      const setupStart = performance.now();
      const agents = new Agents({ testData, uniqueName: name });
      const setupMs = performance.now() - setupStart;
      await use(agents);
      await removeEach(() => agents.removals(), testUsers, testInfo, setupMs);
    },
    { timeout: FACTORY_FIXTURE_TIMEOUT },
  ],
  // Depends on `teams`, so Playwright tears a prompt down before its team.
  prompts: [
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the dependency orders the teardowns
    async ({ testUsers, uniqueName: name, teams }, use, testInfo) => {
      const setupStart = performance.now();
      const prompts = new Prompts({ uniqueName: name });
      const setupMs = performance.now() - setupStart;
      await use(prompts);
      await removeEach(() => prompts.removals(), testUsers, testInfo, setupMs);
    },
    { timeout: FACTORY_FIXTURE_TIMEOUT },
  ],
  preferences: [
    async ({ testUsers }, use, testInfo) => {
      const setupStart = performance.now();
      const preferences = new Preferences();
      const setupMs = performance.now() - setupStart;
      await use(preferences);
      await removeEach(
        () => preferences.removals(),
        testUsers,
        testInfo,
        setupMs,
      );
    },
    { timeout: FACTORY_FIXTURE_TIMEOUT },
  ],
});
