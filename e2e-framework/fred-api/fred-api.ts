// Team teardown uses the signed-in page's request context. The home page's
// bootstrap response identifies the user's teams and the control plane. The
// delete request reuses the bearer token from the bootstrap request.
import type { Page, Response } from "@playwright/test";
import { step } from "../pages/step.ts";
import { FRED_START_TIMEOUT } from "../pages/waits.ts";

/** The bootstrap's path under the control plane's address. */
const BOOTSTRAP_PATH = "/frontend/bootstrap";

/** How messages name the bootstrap, by the request that fetches it. */
const BOOTSTRAP = "Fred's bootstrap (GET /control-plane/v1/frontend/bootstrap)";

export type DeleteTeamOptions = Readonly<{
  /** A confirmed team must appear in the list before deletion. */
  expected: boolean;
}>;

/** A JSON object's fields, or undefined for any other value. */
function fieldsOf(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/**
 * The id of the signed-in user's team of this exact name in a bootstrap, its
 * `available_teams`, or undefined when the team list holds none. Two teams of
 * the name, or a team without an id, are errors.
 */
function userTeamId(bootstrap: unknown, name: string): string | undefined {
  const teams = fieldsOf(bootstrap)?.available_teams;
  if (!Array.isArray(teams))
    throw new Error(`${BOOTSTRAP} holds no list "available_teams".`);
  const named = teams
    .map((team: unknown) => fieldsOf(team))
    .filter((team) => team?.name === name);
  if (named.length > 1)
    throw new Error(
      `The signed-in user's team list holds ${named.length} teams named "${name}".`,
    );
  if (named.length === 0) return undefined;
  const id = named[0]?.id;
  if (typeof id !== "string" || id === "")
    throw new Error(`The team "${name}" has no id in the team list.`);
  return id;
}

function isBootstrap(response: Response): boolean {
  return new URL(response.url()).pathname.endsWith(
    `/control-plane/v1${BOOTSTRAP_PATH}`,
  );
}

export class FredApi {
  /** The name the run log shows for this object's calls. */
  static readonly displayName = "Fred API";
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Deletes the team whose name exactly matches an entry in the signed-in
   * user's team list. An absent team is an error if creation was confirmed.
   */
  @step
  async deleteTeam(
    name: string,
    { expected }: DeleteTeamOptions,
  ): Promise<void> {
    const { response, bootstrap } = await this.loadBootstrap();
    const id = userTeamId(bootstrap, name);
    if (id === undefined) {
      if (expected)
        throw new Error(
          `The team "${name}" is not in the signed-in user's team list, so it was not deleted.`,
        );
      return;
    }
    const authorization = await response.request().headerValue("authorization");
    if (!authorization?.startsWith("Bearer "))
      throw new Error(`${BOOTSTRAP} was sent without a bearer token.`);
    const url = new URL(response.url());
    const base = url.origin + url.pathname.slice(0, -BOOTSTRAP_PATH.length);
    // Checked by status only, and a call that fails is named without its
    // error: the message of either would list the request's headers, and with
    // them the token and the cookies.
    const deleted = await this.page.request
      .delete(`${base}/teams/${encodeURIComponent(id)}`, {
        headers: { authorization },
      })
      .catch(() => {
        throw new Error(
          `Fred did not answer the deletion of the team "${name}".`,
        );
      });
    if (!deleted.ok())
      throw new Error(
        `Fred did not delete the team "${name}": ${deleted.status()} ${deleted.statusText()}.`,
      );
  }

  /**
   * Waits for the bootstrap response after the new home page commits so a
   * response from the previous page cannot match. Reads the body immediately
   * because another navigation can discard it.
   */
  private async loadBootstrap(): Promise<
    Readonly<{ response: Response; bootstrap: unknown }>
  > {
    await this.page.goto("/", { waitUntil: "commit" });
    const response = await this.page.waitForResponse(isBootstrap, {
      timeout: FRED_START_TIMEOUT,
    });
    if (!response.ok())
      throw new Error(
        `${BOOTSTRAP} did not load: ${response.status()} ${response.statusText()}.`,
      );
    const bootstrap: unknown = await response.json();
    return { response, bootstrap };
  }
}
