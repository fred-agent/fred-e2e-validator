import { expect, type Locator, type Page } from "@playwright/test";
import { step } from "../pages/step.ts";
import { literal } from "./text-patterns.ts";

/** The buttons of the copy dialog, by their labels. */
type CopyDialogButton = "Copy" | "Cancel";

/**
 * An agent's "Copy <agent> to another team" dialog: one checkbox per
 * destination, "Personal space" and each team, named by the space's name,
 * which the agent's own team follows with "Origin team". Its locators
 * depend on the agent's name, which names the dialog.
 */
export class CopyAgentDialog {
  static readonly displayName = "Copy agent dialog";
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private dialog(agent: string): Locator {
    return this.page.getByRole("dialog", {
      name: `Copy ${agent} to another team`,
      exact: true,
    });
  }

  /** A destination's checkbox, by the space's name at the start of its name. */
  private destination(agent: string, space: string): Locator {
    return this.dialog(agent).getByRole("checkbox", {
      name: new RegExp(`^${literal(space)}( |$)`),
    });
  }

  private button(agent: string, name: CopyDialogButton): Locator {
    return this.dialog(agent).getByRole("button", { name, exact: true });
  }

  /**
   * Once the destinations load, the agent's own team is checked. "Copy" stays
   * disabled until another destination is selected.
   */
  @step
  async expectOpened(agent: string, origin: string): Promise<void> {
    await expect(this.destination(agent, origin)).toBeChecked();
    await expect(this.button(agent, "Copy")).toBeDisabled();
  }

  /** Expects one space among the destinations and another one not. */
  @step
  async expectDestinations(
    agent: string,
    shown: string,
    notShown: string,
  ): Promise<void> {
    await expect(this.destination(agent, shown)).toBeVisible();
    await expect(this.destination(agent, notShown)).toHaveCount(0);
  }

  /**
   * Copies the agent to a space, chosen through the visible label of its
   * checkbox; the dialog closes and the page says that the agent was copied.
   */
  @step
  async copyTo(agent: string, space: string): Promise<void> {
    await this.dialog(agent).getByText(space, { exact: true }).click();
    await expect(this.destination(agent, space)).toBeChecked();
    await this.button(agent, "Copy").click();
    await expect(this.dialog(agent)).toBeHidden();
    await expect(
      this.page.getByRole("alert").filter({ hasText: "Agent copied to 1" }),
    ).toBeVisible();
  }

  /** Closes the dialog without copying. */
  @step
  async close(agent: string): Promise<void> {
    await this.button(agent, "Cancel").click();
    await expect(this.dialog(agent)).toBeHidden();
  }
}

/** An agent's "Duplicate this agent" dialog, which names the duplicate. */
export class DuplicateAgentDialog {
  static readonly displayName = "Duplicate agent dialog";
  private readonly page: Page;
  private readonly dialog: Locator;
  private readonly name: Locator;
  private readonly duplicate: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByRole("dialog", {
      name: "Duplicate this agent",
      exact: true,
    });
    this.name = this.dialog.getByRole("textbox", {
      name: "New agent name",
      exact: true,
    });
    this.duplicate = this.dialog.getByRole("button", {
      name: "Duplicate",
      exact: true,
    });
  }

  /** Names the duplicate and creates it; the dialog closes. */
  @step
  async submit(name: string): Promise<void> {
    await this.name.fill(name);
    await this.duplicate.click();
    await expect(this.dialog).toBeHidden();
  }
}

/**
 * The dialog "Publish <agent> to the marketplace?", whose "Publish" waits for
 * "I understand", a styled checkbox turned on through its visible label.
 */
export class PublishAgentDialog {
  static readonly displayName = "Publish agent dialog";
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private dialog(agent: string): Locator {
    return this.page.getByRole("dialog", {
      name: `Publish ${agent} to the marketplace?`,
      exact: true,
    });
  }

  /** Confirms the publication; the dialog closes. */
  @step
  async publish(agent: string): Promise<void> {
    const dialog = this.dialog(agent);
    await dialog.getByText("I understand", { exact: true }).click();
    await expect(
      dialog.getByRole("checkbox", { name: "I understand", exact: true }),
    ).toBeChecked();
    await dialog.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(dialog).toBeHidden();
  }
}

/**
 * The marketplace's "Import <agent>" dialog: one checkbox per destination,
 * "Personal space" and each team, chosen through its visible label.
 */
export class ImportAgentDialog {
  static readonly displayName = "Import agent dialog";
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Imports the agent into one space; the result says that it was imported
   * under the agent's own name, and the result is closed. The result names
   * the space by its id when the page's list of teams predates it, and an
   * icon's ligature text starts each result, so the result is read by its
   * words, "Imported into" (capitalized) and "Not imported into".
   */
  @step
  async importInto(agent: string, space: string): Promise<void> {
    const dialog = this.page.getByRole("dialog", {
      name: `Import ${agent}`,
      exact: true,
    });
    await dialog.getByText(space, { exact: true }).click();
    await expect(
      dialog.getByRole("checkbox", { name: space, exact: true }),
    ).toBeChecked();
    await dialog.getByRole("button", { name: "Import", exact: true }).click();
    await expect(dialog).toBeHidden();
    const result = this.page.getByRole("dialog", {
      name: `Import of ${agent}`,
      exact: true,
    });
    const results = result.getByRole("listitem");
    await expect(results.filter({ hasText: /Imported into / })).toHaveCount(1);
    await expect(results.filter({ hasText: /Not imported into / })).toHaveCount(
      0,
    );
    await expect(results.filter({ hasText: /Named "/ })).toHaveCount(0);
    await result.getByRole("button", { name: "Close", exact: true }).click();
    await expect(result).toBeHidden();
  }
}
