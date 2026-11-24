import { expect, type Locator, type Page } from "@playwright/test";
import { CategoriesDialog, PromptForm } from "../components/prompt-dialogs.ts";
import { expectButtonVisible } from "./buttons.ts";
import { step } from "./step.ts";

/** The buttons of the prompts page a test checks by name. */
export type PromptsButton = "Create prompt";

/** The address of a space's prompts. */
const PROMPTS_ADDRESS = /\/team\/[^/]+\/prompts$/;

/**
 * A populated space shows its prompts under the list heading with a search
 * field. Editors can open "Manage categories" there. "Create prompt" appears
 * for editors above the list or beneath the empty-list message.
 */
export class PromptsPage {
  static readonly displayName = "Prompts page";
  private readonly page: Page;
  private readonly heading: Locator;
  private readonly noPrompt: Locator;
  private readonly create: Locator;
  private readonly manageCategories: Locator;
  private readonly buttons: Readonly<Record<PromptsButton, Locator>>;
  private readonly categories: CategoriesDialog;
  private readonly form: PromptForm;

  constructor(page: Page) {
    this.page = page;
    const main = page.getByRole("main");
    this.heading = main.getByRole("heading", {
      level: 1,
      name: /^(Team prompts|Your personal prompts)$/,
    });
    this.noPrompt = main.getByText("Create your first prompt to get started.", {
      exact: true,
    });
    this.create = main.getByRole("button", {
      name: "Create prompt",
      exact: true,
    });
    this.manageCategories = main.getByRole("button", {
      name: "Manage categories",
      exact: true,
    });
    this.buttons = { "Create prompt": this.create };
    this.categories = new CategoriesDialog(page);
    this.form = new PromptForm(page);
  }

  /**
   * After reloading, wait for either the list heading or the empty-list
   * message.
   */
  @step
  async reloadAndExpectPromptList(): Promise<void> {
    await expect(this.page).toHaveURL(PROMPTS_ADDRESS);
    await this.page.reload();
    await expect(this.heading.or(this.noPrompt).first()).toBeVisible();
  }

  @step
  async expectButtonVisible(name: PromptsButton): Promise<void> {
    await expectButtonVisible(this.buttons[name]);
  }

  /** Opens "Manage categories", expects the category manager and closes it unsaved. */
  @step
  async openExpectAndCloseCategoriesDialog(): Promise<void> {
    await this.manageCategories.click();
    await this.categories.expectShown();
    await this.categories.close();
  }

  /**
   * A new prompt needs both a name and prompt text. Check that "Create" is
   * disabled on the empty form, then cancel.
   */
  @step
  async expectEmptyPromptRefused(): Promise<void> {
    await this.create.click();
    await this.form.expectEmptyNewPrompt();
    await this.form.close();
  }
}
