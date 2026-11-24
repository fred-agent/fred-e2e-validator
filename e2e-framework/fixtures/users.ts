// Each user gets a separate browser context. Signed-in users reuse their
// account's storage state. The visitor starts with an empty context and can
// sign in and out. Each context records request failures and closes after the
// test.
import { setTimeout as sleep } from "node:timers/promises";
import type {
  Browser,
  BrowserContext,
  Page,
  Request,
  Response,
  TestInfo,
} from "@playwright/test";
import { describePage } from "../components/page-state.ts";
import { SignOutMenu } from "../components/sign-out-menu.ts";
import type { Account, AccountName, AccountSet } from "../config/accounts.ts";
import { Flows } from "../flows/flows.ts";
import { FredApi } from "../fred-api/fred-api.ts";
import { createPages, type Pages } from "../pages/pages.ts";
import { recordPageAccount } from "../pages/step.ts";
import type { StorageState, StorageStates } from "./storage-states.ts";

/** Page objects, flows and API access share a browser context. */
export class User {
  readonly pages: Pages;
  readonly flows: Flows;
  readonly api: FredApi;
  protected signedInAs: Account | undefined;

  constructor(page: Page, account: Account | undefined) {
    this.pages = createPages(page);
    this.flows = new Flows(this.pages);
    this.api = new FredApi(page);
    this.signedInAs = account;
  }

  /** The account the user is signed in as. */
  get account(): Account {
    if (this.signedInAs === undefined)
      throw new Error(
        "visitor is not signed in: visitor.signIn(name) signs an account in.",
      );
    return this.signedInAs;
  }
}

/**
 * The visitor starts with an empty context. Choosing "Disconnect" ends the
 * identity provider session created at sign-in.
 */
export class Visitor extends User {
  private readonly accounts: AccountSet;
  private readonly signOutMenu: SignOutMenu;

  constructor(page: Page, accounts: AccountSet) {
    super(page, undefined);
    this.accounts = accounts;
    this.signOutMenu = new SignOutMenu(page);
  }

  async signIn(name: AccountName): Promise<void> {
    const account = this.accounts.get(name);
    await this.flows.signIn(account);
    this.signedInAs = account;
  }

  async signOut(): Promise<void> {
    await this.signOutMenu.signOut();
    this.signedInAs = undefined;
  }
}

/** A user for one removal, in a browser context of its own. */
export type RemovalUser = Readonly<{
  user: User;
  describePage: () => Promise<string>;
}>;

export type TestUsersOptions = Readonly<{
  browser: Browser;
  accounts: AccountSet;
  storageStates: StorageStates;
  /** The worker's number, its parallel index plus one. */
  worker: number;
}>;

/** A browser context a test's fixture opened, with the name the report gives it. */
type OpenedContext = Readonly<{ label: string; context: BrowserContext }>;

const METHODS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);

/** How long reading one page or cutting off one context may take: a page that no longer responds cannot hold up the teardown. */
const READ_LIMIT_MS = 2_000;
const CUT_OFF_LIMIT_MS = 1_000;
const UNREADABLE = "a page that could not be read";
const CLOSED_AT_END = "a page closed at the test's end";

/** Live diagnostics require both browser and API traffic to have stopped. */
async function isolateForDiagnostics(
  context: BrowserContext,
): Promise<boolean> {
  return Promise.race([
    Promise.all([context.setOffline(true), context.request.dispose()]).then(
      () => true,
      () => false,
    ),
    sleep(CUT_OFF_LIMIT_MS, false, { ref: false }),
  ]);
}

async function shownBy(page: Page): Promise<string> {
  return Promise.race([
    describePage(page).catch(() => UNREADABLE),
    sleep(READ_LIMIT_MS, UNREADABLE, { ref: false }),
  ]);
}

function requestLine(request: Request): string {
  const method = request.method();
  const type = request.resourceType();
  const operation =
    type === "document"
      ? "navigation"
      : type === "fetch" || type === "xhr"
        ? "API request"
        : "resource request";
  return `${METHODS.has(method) ? method : "HTTP"} ${operation}`;
}

/**
 * The users of one test. `user(name)` opens an account's user on first use
 * and gives the same user to every later call. `closeUsers()` ends the
 * test's own part, before the first removal; `closeAll()` closes every
 * context after the test.
 */
export class TestUsers {
  private readonly options: TestUsersOptions;
  /** The users' contexts, the removals' included. */
  private readonly opened: OpenedContext[] = [];
  /** The contexts an account signs in on. */
  private readonly signIns: OpenedContext[] = [];
  private readonly users = new Map<AccountName, Promise<User>>();
  /** What each page showed when its context was closed. */
  private readonly shown: string[] = [];
  /** Set once the test's own part is over: from then on only a removal opens a user. */
  private testOver = false;
  /** Failed requests and application responses with status 400 or higher. */
  private readonly failures: string[] = [];

  constructor(options: TestUsersOptions) {
    this.options = options;
  }

  /** The test's user of an account, opened on first use, signed in from its storage state. */
  async user(name: AccountName): Promise<User> {
    let user = this.users.get(name);
    if (user === undefined) {
      user = this.openTestUser(name);
      this.users.set(name, user);
    }
    return user;
  }

  /** A user whose browser context starts with no state. */
  async visitor(): Promise<Visitor> {
    const context = await this.openContext(this.opened, "visitor");
    const page = await context.newPage();
    recordPageAccount(page, "visitor");
    return new Visitor(page, this.options.accounts);
  }

  /**
   * A user of an account in a browser context of its own, opened from the
   * account's storage state, for one removal; closeUsers closes it. None is
   * opened once the removal is over.
   */
  async openForRemoval(
    name: AccountName,
    removalOver: () => boolean,
  ): Promise<RemovalUser> {
    const context = await this.openSignedIn(
      name,
      `${name} removing`,
      removalOver,
    );
    const { user, page } = await this.openFred(name, context);
    return { user, describePage: () => shownBy(page) };
  }

  /**
   * Summarizes each page at closure, grouped by account, followed by the
   * failed requests and error responses from all test contexts.
   */
  describe(): string {
    const failed =
      this.failures.length > 0
        ? `Fred's failed responses: ${this.failures.join(", ")}`
        : "no failed response of Fred";
    return [...this.shown, failed].join("; ");
  }

  /**
   * Closes the test's contexts before cleanup and each removal's context
   * afterwards. The test status selects page diagnostics for the test itself.
   */
  async closeUsers(testStatus?: TestInfo["status"]): Promise<void> {
    this.testOver = true;
    await this.close(this.opened, testStatus);
  }

  /** Closes every context the test's fixtures opened that is still open. */
  async closeAll(testStatus: TestInfo["status"]): Promise<void> {
    await this.closeUsers(testStatus);
    await this.close(this.signIns, testStatus);
  }

  private async close(
    contexts: OpenedContext[],
    testStatus?: TestInfo["status"],
  ): Promise<void> {
    const closing = contexts
      .splice(0)
      .filter(({ context }) => !context.isClosed());
    const shown = await Promise.all(
      closing.map(async ({ label, context }) => {
        context.removeAllListeners("requestfailed");
        try {
          if (testStatus === undefined) return [];
          if (testStatus === "timedOut" || testStatus === "interrupted")
            return [`${label} at ${CLOSED_AT_END}`];
          if (!(await isolateForDiagnostics(context)))
            return [`${label} at ${UNREADABLE}`];
          return await Promise.all(
            context
              .pages()
              .map(async (page) => `${label} at ${await shownBy(page)}`),
          );
        } finally {
          await context.close();
        }
      }),
    );
    this.shown.push(...shown.flat());
  }

  /** The test's user of an account; none once the test's own part is over. */
  private async openTestUser(name: AccountName): Promise<User> {
    const context = await this.openSignedIn(name, name, () => this.testOver);
    return (await this.openFred(name, context)).user;
  }

  /**
   * A browser context that starts from an account's storage state. One that
   * comes after its user's part is over is closed at once.
   */
  private async openSignedIn(
    name: AccountName,
    label: string,
    over: () => boolean,
  ): Promise<BrowserContext> {
    const tooLate = () =>
      new Error(`${label}: its time was over before its page was opened.`);
    const storageState = await this.options.storageStates.get(
      name,
      async (signingIn) => this.openContext(this.signIns, signingIn),
    );
    if (over()) throw tooLate();
    const context = await this.openContext(this.opened, label, storageState);
    if (over()) {
      await context.close();
      throw tooLate();
    }
    return context;
  }

  /**
   * Opens the application using the account's stored session. Only the
   * signed-in menu confirms success. The sign-in form or terms page indicates
   * that the session was refused.
   */
  private async openFred(
    name: AccountName,
    context: BrowserContext,
  ): Promise<{ user: User; page: Page }> {
    const { accounts, worker } = this.options;
    const page = await context.newPage();
    recordPageAccount(page, name);
    const user = new User(page, accounts.get(name));
    const shown = await user.pages.home.openAndReadSignInState(name, worker);
    if (shown !== "signed in")
      throw new Error(
        `Fred refused the session of ${name}, worker ${worker}: opened from the account's storage state, it showed the ${shown}.`,
      );
    return { user, page };
  }

  /**
   * Opens a context with the configured browser options and optional storage
   * state. It records failed requests and error responses.
   */
  private async openContext(
    contexts: OpenedContext[],
    label: string,
    storageState?: StorageState,
  ): Promise<BrowserContext> {
    const context = await this.options.browser.newContext(
      storageState === undefined ? {} : { storageState },
    );
    contexts.push({ label, context });
    context.on("response", (response: Response) => {
      if (response.status() >= 400)
        this.failures.push(
          `${requestLine(response.request())} ${response.status()}`,
        );
    });
    context.on("requestfailed", (request: Request) => {
      this.failures.push(`${requestLine(request)} failed`);
    });
    return context;
  }
}
