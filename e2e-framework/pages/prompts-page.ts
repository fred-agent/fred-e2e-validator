import { expect, type Locator, type Page } from "@playwright/test";
import { ConfirmDialog } from "../components/dialogs.ts";
import {
  CategoriesDialog,
  DuplicatePromptDialog,
  PromptForm,
  PromptView,
  type PromptContent,
} from "../components/prompt-dialogs.ts";
import { expectButtonVisible } from "./buttons.ts";
import { step } from "./step.ts";

/** The buttons of the prompts page a test checks by name. */
export type PromptsButton = "Create prompt";

/** The options of a prompt card's menu that the page object chooses. */
type PromptAction = "Edit" | "Duplicate" | "Delete";

/** The address of a space's prompts. */
const PROMPTS_ADDRESS = /\/team\/[^/]+\/prompts$/;

/**
 * A populated space shows its prompts under the list heading with a search
 * field. Editors can open "Manage categories" there. "Create prompt" appears
 * for editors above the list or beneath the empty-list message, which a list
 * that fails to load does not show.
 */
export class PromptsPage {
  static readonly displayName = "Prompts page";
  private readonly page: Page;
  private readonly heading: Locator;
  private readonly noPrompt: Locator;
  private readonly createButton: Locator;
  private readonly manageCategories: Locator;
  private readonly searchField: Locator;
  // The filter and the star of each card have this name; the filter comes
  // first on the page.
  private readonly favoritesFilter: Locator;
  private readonly actions: Locator;
  private readonly buttons: Readonly<Record<PromptsButton, Locator>>;
  private readonly categories: CategoriesDialog;
  private readonly form: PromptForm;
  private readonly view: PromptView;
  private readonly duplicateDialog: DuplicatePromptDialog;
  private readonly confirmDialog: ConfirmDialog;

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
    this.createButton = main.getByRole("button", {
      name: "Create prompt",
      exact: true,
    });
    this.manageCategories = main.getByRole("button", {
      name: "Manage categories",
      exact: true,
    });
    this.searchField = main.getByRole("textbox", {
      name: "Search prompts...",
      exact: true,
    });
    this.favoritesFilter = main
      .getByRole("button", { name: "Favorites", exact: true })
      .first();
    this.actions = page.getByRole("listbox");
    this.buttons = { "Create prompt": this.createButton };
    this.categories = new CategoriesDialog(page);
    this.form = new PromptForm(page);
    this.view = new PromptView(page);
    this.duplicateDialog = new DuplicatePromptDialog(page);
    this.confirmDialog = new ConfirmDialog(page);
  }

  /** A prompt's card, a button that holds the prompt's name. */
  private card(name: string): Locator {
    return this.page
      .getByRole("main")
      .getByRole("button")
      .filter({ has: this.page.getByText(name, { exact: true }) });
  }

  /** The star of a prompt's card. */
  private star(name: string): Locator {
    return this.card(name).getByRole("button", {
      name: "Favorites",
      exact: true,
    });
  }

  /** Expects the prompts of a space once their list, or the text of none, shows. */
  @step
  async expectShown(): Promise<void> {
    await expect(this.page).toHaveURL(PROMPTS_ADDRESS);
    await this.expectListDrawn();
  }

  /**
   * After reloading, wait for either the list heading or the empty-list
   * message.
   */
  @step
  async reloadAndExpectPromptList(): Promise<void> {
    await expect(this.page).toHaveURL(PROMPTS_ADDRESS);
    await this.page.reload();
    await this.expectListDrawn();
  }

  @step
  async expectButtonVisible(name: PromptsButton): Promise<void> {
    await expectButtonVisible(this.buttons[name]);
  }

  /**
   * Remembers the exact address of the prompts shown, once their list is
   * drawn. The returned function tells whether the browser is at that
   * address now; the address, which holds a space's identifier, stays in it.
   */
  @step
  async rememberAddress(): Promise<() => boolean> {
    await this.expectListDrawn();
    const address = this.page.url();
    return () => this.page.url() === address;
  }

  /**
   * Expects the browser back at a remembered address, exactly, and the
   * prompts' list drawn there. The message names neither address.
   */
  @step
  async expectBackAt(isAtAddress: () => boolean): Promise<void> {
    await expect
      .poll(isAtAddress, {
        message: "The browser is not back at the address of the prompts",
      })
      .toBe(true);
    await this.expectListDrawn();
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
    await this.createButton.click();
    await this.form.expectEmptyNewPrompt();
    await this.form.close();
  }

  /** Creates a prompt; the form closes and the page lists the prompt. */
  @step
  async create(prompt: PromptContent): Promise<void> {
    await this.createButton.click();
    await this.form.submitNew(prompt);
    await this.form.expectSaved();
    await this.expectListed(prompt.name);
  }

  /**
   * Submits a new prompt with a command another prompt carries, expects the
   * form to say so and closes it unsaved.
   */
  @step
  async expectCommandRefused(prompt: PromptContent): Promise<void> {
    await this.createButton.click();
    await this.form.submitNew(prompt);
    await this.form.expectCommandInUse();
    await this.form.close();
  }

  /** Replaces a prompt's text; the form closes once it is saved. */
  @step
  async replaceText(prompt: PromptContent, text: string): Promise<void> {
    await this.choose(prompt.name, "Edit");
    await this.form.replaceText(prompt, text);
  }

  /** Opens a prompt from its card, expects its text and closes it. */
  @step
  async expectText(name: string, text: string): Promise<void> {
    await this.card(name).click();
    await this.view.expectAndClose(name, text);
  }

  /**
   * Opens a prompt from its card, expects its name, its whole text and its
   * command, or no command when it has none, and closes it.
   */
  @step
  async expectDetail(prompt: PromptContent): Promise<void> {
    await this.card(prompt.name).click();
    await this.view.expectDetailAndClose(prompt);
  }

  /**
   * Duplicates a prompt from its card's menu under a new name; the dialog
   * closes and the page lists the copy.
   */
  @step
  async duplicate(name: string, copy: string): Promise<void> {
    await this.choose(name, "Duplicate");
    await this.duplicateDialog.submit(name, copy);
    await this.expectListed(copy);
  }

  /** Deletes a prompt; its card disappears. */
  @step
  async delete(name: string): Promise<void> {
    await this.choose(name, "Delete");
    await this.confirmDialog.confirm("Delete prompt?", "Delete");
    await expect(this.card(name)).toHaveCount(0);
  }

  /** Deletes a prompt if the page, its list drawn, shows it. */
  @step
  async deleteIfListed(name: string): Promise<void> {
    await this.expectListDrawn();
    if (await this.card(name).isVisible()) await this.delete(name);
    else await expect(this.card(name)).toHaveCount(0);
  }

  @step
  async expectListed(name: string): Promise<void> {
    await expect(this.card(name)).toBeVisible();
  }

  /** Expects one prompt listed and another one not. */
  @step
  async expectListedWithout(name: string, without: string): Promise<void> {
    await this.expectListed(name);
    await expect(this.card(without)).toHaveCount(0);
  }

  /** Expects a prompt not listed, once the page has drawn its list. */
  @step
  async expectNotListed(name: string): Promise<void> {
    await this.expectListDrawn();
    await expect(this.card(name)).toHaveCount(0);
  }

  /** Searches the listed prompts. */
  @step
  async search(text: string): Promise<void> {
    await this.searchField.fill(text);
    await expect(this.searchField).toHaveValue(text);
  }

  /**
   * Marks a prompt that is not a favorite as one, then loads the page again,
   * as the star turns before the application saves it, and expects it marked.
   */
  @step
  async addToFavoritesAndReload(name: string): Promise<void> {
    await expect(this.star(name)).toHaveAttribute("aria-pressed", "false");
    await this.star(name).click();
    await expect(this.star(name)).toHaveAttribute("aria-pressed", "true");
    await this.reloadAndExpectPromptList();
    await expect(this.star(name)).toHaveAttribute("aria-pressed", "true");
  }

  /** Expects a listed prompt not marked as a favorite. */
  @step
  async expectNotFavorite(name: string): Promise<void> {
    await expect(this.star(name)).toHaveAttribute("aria-pressed", "false");
  }

  /** Shows only the prompts marked as favorite. */
  @step
  async showOnlyFavorites(): Promise<void> {
    await this.favoritesFilter.click();
    await expect(this.favoritesFilter).toHaveAttribute("aria-pressed", "true");
  }

  /**
   * Opens the menu of a prompt's card and chooses an action. The menu button
   * has no name: it is the card's button that opens a list. It shows once the
   * space's record says that the user may change prompts.
   */
  private async choose(name: string, action: PromptAction): Promise<void> {
    await this.card(name)
      .getByRole("button")
      .and(this.page.locator('[aria-haspopup="listbox"]'))
      .click();
    await this.actions
      .getByRole("option", { name: action, exact: true })
      .click();
  }

  private async expectListDrawn(): Promise<void> {
    await expect(this.heading.or(this.noPrompt).first()).toBeVisible();
  }
}
