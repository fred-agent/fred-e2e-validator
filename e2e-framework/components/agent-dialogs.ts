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

  /** Closes the dialog without copying. */
  @step
  async close(agent: string): Promise<void> {
    await this.button(agent, "Cancel").click();
    await expect(this.dialog(agent)).toBeHidden();
  }
}
