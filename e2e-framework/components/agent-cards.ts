import { expect, type Locator, type Page } from "@playwright/test";
import { step } from "../pages/step.ts";
import { MoreActionsMenu } from "./more-actions-menu.ts";
import { endingWith, literal } from "./text-patterns.ts";

/** The options of an agent card's "More actions", by their labels. */
export type AgentAction =
  | "Edit"
  | "Deactivate"
  | "Activate"
  | "Duplicate"
  | "Copy to…"
  | "Publish to the marketplace"
  | "Delete";

/** The status shown on a suspended agent's card. */
const SUSPENDED =
  "Suspended — a capability this agent uses is broken or unavailable. Edit the agent to fix it.";

/**
 * Each team agent has a card identified by its name. "Chat" is a link when
 * the agent is available and a disabled button otherwise. The card indicates
 * suspension, shows details on hover and offers editors a "More actions"
 * menu.
 */
export class AgentCards {
  static readonly displayName = "Agent cards";
  private readonly page: Page;
  private readonly cards: Locator;
  // What a card's details show while hovered.
  private readonly details: Locator;
  private readonly menu: MoreActionsMenu<AgentAction>;

  constructor(page: Page) {
    this.page = page;
    // The cards have no ARIA role or test ID. Their CSS module class contains
    // "agentCard".
    this.cards = page.getByRole("main").locator('[class*="agentCard"]');
    this.details = page.getByRole("tooltip");
    this.menu = new MoreActionsMenu<AgentAction>(page);
  }

  /**
   * An agent's card, by the agent's name, which the card shows above its
   * role. The name has no ARIA role or test ID either: its CSS module class
   * contains "agentName".
   */
  private card(name: string): Locator {
    return this.cards.filter({
      has: this.page
        .locator('[class*="agentName"]')
        .filter({ hasText: new RegExp(`^${literal(name)}$`) }),
    });
  }

  /** The card's "Chat": a link, or a disabled button while the agent cannot be chatted with. */
  private chatLink(name: string): Locator {
    return this.card(name).getByRole("link", { name: "Chat", exact: true });
  }

  private chatButton(name: string): Locator {
    return this.card(name).getByRole("button", { name: "Chat", exact: true });
  }

  private suspension(name: string): Locator {
    return this.card(name).getByText(SUSPENDED, { exact: true });
  }

  @step
  async expectListed(name: string): Promise<void> {
    await expect(this.card(name)).toBeVisible();
  }

  @step
  async expectNotListed(name: string): Promise<void> {
    await expect(this.card(name)).toHaveCount(0);
  }

  /** Expects one agent's card before another one's. */
  @step
  async expectListedBefore(first: string, second: string): Promise<void> {
    await expect(this.cards).toContainText([first, second]);
  }

  /** Expects an agent's card to say that the agent is published. */
  @step
  async expectPublished(name: string): Promise<void> {
    await expect(
      this.card(name)
        .getByRole("group", { name: "Marketplace", exact: true })
        // The chip's icon is a font ligature whose text comes before the label.
        .getByText(endingWith("Published")),
    ).toBeVisible();
  }

  /** Whether an agent's card shows now; the caller first waits for the drawn list. */
  @step
  async lists(name: string): Promise<boolean> {
    return this.card(name).isVisible();
  }

  /** Expects an agent's card that shows to have no "More actions". */
  @step
  async expectNoMenu(name: string): Promise<void> {
    await this.menu.expectAbsent(this.card(name));
  }

  /** Opens a card's menu, expects exactly these actions and closes it without choosing. */
  @step
  async expectActions(
    name: string,
    actions: readonly AgentAction[],
  ): Promise<void> {
    await expect(this.card(name)).toBeVisible();
    await this.menu.expectOptions(this.card(name), actions);
  }

  /** Opens a card's "More actions" and chooses an action. */
  @step
  async choose(name: string, action: AgentAction): Promise<void> {
    await this.menu.choose(this.card(name), action);
  }

  /**
   * Hovers a card's "Agent details" and expects the details to name the
   * agent's template after "Template".
   */
  @step
  async expectTemplateInDetails(name: string, template: string): Promise<void> {
    await this.card(name)
      .getByRole("img", { name: "Agent details", exact: true })
      .hover();
    await expect(this.details).toHaveAccessibleName(
      new RegExp(`(^| )Template ${literal(template)}( |$)`),
    );
  }

  /** Clicks a card's "Chat" link, which opens a new conversation with the agent. */
  @step
  async startConversation(name: string): Promise<void> {
    await this.chatLink(name).click();
  }

  /** Expects an agent's card to say it is suspended, with "Chat" disabled. */
  @step
  async expectSuspended(name: string): Promise<void> {
    await expect(this.suspension(name)).toBeVisible();
    await this.expectChatDisabled(name);
  }

  /** Expects an agent's card without a suspension, offering "Chat". */
  @step
  async expectAvailable(name: string): Promise<void> {
    await expect(this.card(name)).toBeVisible();
    await expect(this.suspension(name)).toHaveCount(0);
    await this.expectChatLink(name);
  }

  /** Expects a card's "Chat" disabled: the agent cannot be chatted with. */
  @step
  async expectChatDisabled(name: string): Promise<void> {
    await expect(this.chatButton(name)).toBeDisabled();
    await expect(this.chatLink(name)).toHaveCount(0);
  }

  /** Expects a card's "Chat" link: the agent can be chatted with. */
  @step
  async expectChatLink(name: string): Promise<void> {
    await expect(this.chatLink(name)).toBeVisible();
    await expect(this.chatButton(name)).toBeEnabled();
  }
}
