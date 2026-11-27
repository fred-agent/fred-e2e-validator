// The creation response supplies the team ID used for teardown.
// Before deletion, the adapter checks that the home page's bootstrap response
// lists that ID and reuses the bearer token from the bootstrap request.
import type { Page, Response } from "@playwright/test";
import { step } from "../pages/step.ts";
import { FRED_START_TIMEOUT } from "../pages/waits.ts";

/** The bootstrap's path under the control plane's address. */
const BOOTSTRAP_PATH = "/frontend/bootstrap";

/** How messages name the bootstrap, by the request that fetches it. */
const BOOTSTRAP = "Fred's bootstrap (GET /control-plane/v1/frontend/bootstrap)";

/** Step titles omit the contents of this object. */
export type TeamId = Readonly<{ id: string }>;

/** A JSON object's fields, or undefined for any other value. */
function fieldsOf(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/** The signed-in user's teams in a bootstrap, its `available_teams`. */
function userTeams(
  bootstrap: unknown,
): (Record<string, unknown> | undefined)[] {
  const teams = fieldsOf(bootstrap)?.available_teams;
  if (!Array.isArray(teams))
    throw new Error(`${BOOTSTRAP} holds no list "available_teams".`);
  return teams.map((team: unknown) => fieldsOf(team));
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

  /** Records the ID from the form's creation response before its UI checks can fail. */
  @step
  async recordTeamCreation(
    name: string,
    create: () => Promise<void>,
    record: (team: TeamId) => void,
  ): Promise<void> {
    const controller = new AbortController();
    const capture = this.page
      .waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          new URL(response.url()).pathname.endsWith(
            "/control-plane/v1/teams",
          ) &&
          fieldsOf(response.request().postDataJSON())?.name === name,
        { signal: controller.signal, timeout: 0 },
      )
      .then(async (response) => {
        if (response.status() !== 201) return false;
        const team = fieldsOf(await response.json());
        if (
          team?.name !== name ||
          typeof team.id !== "string" ||
          !team.id.trim()
        )
          return false;
        record(Object.freeze({ id: team.id }));
        return true;
      })
      .catch(() => false);
    let recorded: boolean;
    try {
      await create();
    } finally {
      // Stop listening when the form finishes and let any received body finish reading.
      controller.abort();
      recorded = await capture;
    }
    if (!recorded)
      throw new Error(
        "The creation response did not confirm the new team's ID.",
      );
  }

  /** Deletes the recorded team if the signed-in account still lists its ID. */
  @step
  async deleteTeam(team: TeamId, name: string): Promise<void> {
    const { response, bootstrap } = await this.loadBootstrap();
    if (!userTeams(bootstrap).some((entry) => entry?.id === team.id))
      throw new Error(
        `The team "${name}" is not in the signed-in user's team list, so it was not deleted.`,
      );
    const authorization = await response
      .request()
      .headerValue("authorization")
      .catch(() => null);
    if (!authorization?.startsWith("Bearer "))
      throw new Error(`${BOOTSTRAP} was sent without a bearer token.`);
    const url = new URL(response.url());
    const base = url.origin + url.pathname.slice(0, -BOOTSTRAP_PATH.length);
    // Checked by status only, and a call that fails is named without its
    // error: the message of either would list the request's headers, and with
    // them the token and the cookies.
    const deleted = await this.page.request
      .delete(`${base}/teams/${encodeURIComponent(team.id)}`, {
        headers: { authorization },
      })
      .catch(() => {
        throw new Error(
          `Fred did not answer the deletion of the team "${name}".`,
        );
      });
    if (!deleted.ok())
      throw new Error(
        `Fred did not delete the team "${name}" (HTTP ${deleted.status()}).`,
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
    await this.page.goto("/", { waitUntil: "commit" }).catch(() => {
      throw new Error("The home page could not be opened for team removal.");
    });
    const response = await this.page
      .waitForResponse(isBootstrap, {
        timeout: FRED_START_TIMEOUT,
      })
      .catch(() => {
        throw new Error(
          "The team list response was not available for removal.",
        );
      });
    if (!response.ok())
      throw new Error(`${BOOTSTRAP} did not load (HTTP ${response.status()}).`);
    const bootstrap: unknown = await response.json().catch(() => {
      throw new Error("The team list response could not be read for removal.");
    });
    return { response, bootstrap };
  }
}
