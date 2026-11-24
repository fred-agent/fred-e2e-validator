import { expect, type Locator, type Page } from "@playwright/test";
import { startingWith } from "../components/text-patterns.ts";
import { step } from "./step.ts";

/** The side panels of a conversation, by the label of the toggle that opens each. */
export type ChatPanel =
  "Prompt library" | "Full reasoning" | "Debug — raw messages";

/** The entries of the chat actions a test looks for, by how their label starts. */
export type ChatAction = "Prompt library";

/** Each side panel's own name, by the label of its toggle. */
const PANEL_NAMES: Readonly<Record<ChatPanel, string>> = {
  "Prompt library": "Select a prompt to insert",
  "Full reasoning": "Full reasoning",
  "Debug — raw messages": "Debug — raw messages",
};

/** The address of a conversation with a team's agent. */
const CONVERSATION_ADDRESS = /\/team\/[^/]+\/managed-chat\/[^/]+$/;

/**
 * A conversation with an agent. The page object looks at what the
 * conversation offers and opens its menu and panels, which it closes
 * unchanged; it has no way to type, choose or send anything, so it never
 * sends a message, which would need a chat model.
 */
export class ChatPage {
  static readonly displayName = "Chat page";
  private readonly page: Page;
  private readonly conversation: Locator;
  private readonly chatActions: Locator;
  // The menu "Open chat actions" opens: a dialog named after it.
  private readonly chatActionsMenu: Locator;
  // The toggles on the conversation's side rail, and the panels they open.
  private readonly panelToggles: Readonly<Record<ChatPanel, Locator>>;
  private readonly panels: Readonly<Record<ChatPanel, Locator>>;

  constructor(page: Page) {
    this.page = page;
    const main = page.getByRole("main");
    this.conversation = main.getByRole("region", {
      name: "Conversation",
      exact: true,
    });
    this.chatActions = main.getByRole("button", {
      name: "Open chat actions",
      exact: true,
    });
    this.chatActionsMenu = page.getByRole("dialog", {
      name: "Chat actions",
      exact: true,
    });
    const toggle = (label: ChatPanel) =>
      main.getByRole("button", { name: label, exact: true });
    const panel = (label: ChatPanel) =>
      page.getByRole("complementary", {
        name: PANEL_NAMES[label],
        exact: true,
      });
    this.panelToggles = {
      "Prompt library": toggle("Prompt library"),
      "Full reasoning": toggle("Full reasoning"),
      "Debug — raw messages": toggle("Debug — raw messages"),
    };
    this.panels = {
      "Prompt library": panel("Prompt library"),
      "Full reasoning": panel("Full reasoning"),
      "Debug — raw messages": panel("Debug — raw messages"),
    };
  }

  /** Expects a conversation with an agent. */
  @step
  async expectShown(): Promise<void> {
    await expect(this.page).toHaveURL(CONVERSATION_ADDRESS);
    await expect(this.conversation).toBeVisible();
  }

  /**
   * Opens the chat actions, expects an entry, matched by how its name
   * starts, as an entry may go on with its current value, and closes the
   * menu without choosing.
   */
  @step
  async expectChatAction(label: ChatAction): Promise<void> {
    await this.chatActions.click();
    await expect(
      this.chatActionsMenu.getByRole("menuitem", {
        name: startingWith(label),
      }),
    ).toBeVisible();
    await this.page.keyboard.press("Escape");
    await expect(this.chatActionsMenu).toBeHidden();
  }

  /** Opens a side panel from its toggle, expects it and closes it. */
  @step
  async expectPanel(label: ChatPanel): Promise<void> {
    const panel = this.panels[label];
    await this.panelToggles[label].click();
    await expect(panel).toBeVisible();
    await panel
      .getByRole("button", { name: "Close panel", exact: true })
      .click();
    await expect(panel).toBeHidden();
  }
}
