// Each worker keeps one storage state per account in memory. The first fixture
// that needs the account signs in with an empty context. Later contexts reuse
// that state.
import type { BrowserContext } from "@playwright/test";
import type { AccountName, AccountSet } from "../config/accounts.ts";
import { Flows } from "../flows/flows.ts";
import { createPages } from "../pages/pages.ts";
import { recordPageAccount } from "../pages/step.ts";

/** What `browserContext.storageState()` returns: cookies and local storage. */
export type StorageState = Awaited<ReturnType<BrowserContext["storageState"]>>;

/**
 * Opens an empty browser context with the configuration's `use` options. The
 * opener closes it after the test if it is still open then.
 */
export type OpenEmptyContext = (label: string) => Promise<BrowserContext>;

export class StorageStates {
  private readonly accounts: AccountSet;
  /** Each account's sign-in, kept once started: a refused one is not tried again. */
  private readonly states = new Map<AccountName, Promise<StorageState>>();

  constructor(accounts: AccountSet) {
    this.accounts = accounts;
  }

  /**
   * On first use, signs in with an empty context, accepts the terms if shown,
   * and caches the storage state for the worker.
   */
  async get(name: AccountName, open: OpenEmptyContext): Promise<StorageState> {
    let state = this.states.get(name);
    if (state === undefined) {
      state = this.signIn(name, open);
      this.states.set(name, state);
    }
    return state;
  }

  /**
   * Close the context after sign-in. Fixture teardown closes it on failure.
   */
  private async signIn(
    name: AccountName,
    open: OpenEmptyContext,
  ): Promise<StorageState> {
    const account = this.accounts.get(name);
    const context = await open(`${name} signing in`);
    const page = await context.newPage();
    recordPageAccount(page, name);
    await new Flows(createPages(page)).signIn(account);
    const state = await context.storageState();
    await context.close();
    return state;
  }
}
