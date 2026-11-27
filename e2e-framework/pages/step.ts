// Each decorated method runs as a boxed Playwright step. The title includes the
// method and its arguments. The subtitle identifies the class and fixture
// account. Calls to other decorated methods appear as nested steps.
import { test, type Page } from "@playwright/test";
import { stepTitle } from "./step-title.ts";

type AsyncMethod<This, Args extends unknown[], Result> = (
  this: This,
  ...args: Args
) => Promise<Result>;

/** The account each browser page acts as, by the name steps show. */
const pageAccounts = new WeakMap<Page, string>();

/** Records the account a browser page acts as, for the subtitles of its steps. */
export function recordPageAccount(page: Page, account: string): void {
  pageAccounts.set(page, account);
}

/** The `displayName` the class of a decorated method declares. */
function displayNameOf(instance: object): string {
  const owner = instance.constructor;
  const displayName: unknown = Reflect.get(owner, "displayName");
  if (typeof displayName !== "string")
    throw new Error(
      `${owner.name} declares no static displayName for the steps of its methods.`,
    );
  return displayName;
}

/** The account of the page a decorated class acts on, read from its `page` member. */
function accountOf(instance: object): string {
  const owner = instance.constructor.name;
  const page: unknown = Reflect.get(instance, "page");
  if (typeof page !== "object" || page === null)
    throw new Error(
      `${owner} has no page member, so its steps cannot name their account.`,
    );
  const account = pageAccounts.get(page as Page);
  if (account === undefined)
    throw new Error(
      `${owner} acts on a page that no user opened, so its steps cannot name their account.`,
    );
  return account;
}

export function step<This extends object, Args extends unknown[], Result>(
  method: AsyncMethod<This, Args, Result>,
  context: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Result>>,
): AsyncMethod<This, Args, Result> {
  const name = String(context.name);
  return async function (this: This, ...args: Args): Promise<Result> {
    const subtitle = `${displayNameOf(this)} · ${accountOf(this)}`;
    return test.step(
      stepTitle(name, args),
      async () => method.apply(this, args),
      { box: true, subtitle },
    );
  };
}
