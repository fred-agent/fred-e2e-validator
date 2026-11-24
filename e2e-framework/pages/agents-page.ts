import { expect, type Locator, type Page } from "@playwright/test";
import { AgentCards, type AgentAction } from "../components/agent-cards.ts";
import { CopyAgentDialog } from "../components/agent-dialogs.ts";
import { AgentForm, type AgentCapability } from "../components/agent-form.ts";
import { ConfirmDialog } from "../components/dialogs.ts";
import { TeamSettings } from "../components/team-settings.ts";
import { waitThenExpectButtonAbsent } from "./buttons.ts";
import { step } from "./step.ts";

/** The buttons of the agents page a test checks by name. */
export type AgentsButton = "Create Agent";

/** The orders "Sort" offers for a team's agents, by their labels. */
export type AgentOrder =
  "Alphabetical" | "Recently created" | "Recently updated";

/** The address of a space's agents. */
const AGENTS_ADDRESS = /\/team\/[^/]+\/agents$/;

/**
 * "Loading agents..." gives way to "Team agents" or the empty-list message.
 * Once team permissions load, editors can create and edit agents and see
 * suspended agents. Other members see only active agents. Reload the page to
 * verify saved changes.
 */
export class AgentsPage {
  static readonly displayName = "Agents page";
  private readonly page: Page;
  // Above the cards of a team that has agents, for every member, also when
  // the page hides every one of them.
  private readonly heading: Locator;
  // Above the cards, for an editor of a team that has agents.
  private readonly createAgent: Locator;
  // Under the text of a team without agents, for an editor.
  private readonly createFirst: Locator;
  // What the page shows instead of cards when the team has no agent.
  private readonly noAgents: Locator;
  // Above the cards; named "Sort", it shows the order chosen. Choosing an
  // order keeps it as the user's preference: nothing here chooses one.
  private readonly sort: Locator;
  // The orders "Sort" opens.
  private readonly orders: Locator;
  private readonly buttons: Readonly<Record<AgentsButton, Locator>>;
  private readonly cards: AgentCards;
  private readonly form: AgentForm;
  private readonly confirmDialog: ConfirmDialog;
  private readonly copyDialog: CopyAgentDialog;
  private readonly teamSettings: TeamSettings;

  constructor(page: Page) {
    this.page = page;
    const main = page.getByRole("main");
    this.heading = main.getByRole("heading", {
      level: 1,
      name: "Team agents",
      exact: true,
    });
    this.createAgent = main.getByRole("button", {
      name: "Create Agent",
      exact: true,
    });
    this.createFirst = main.getByRole("button", {
      name: "Create",
      exact: true,
    });
    this.noAgents = main.getByText(
      "Create your first team Agent to get started.",
      { exact: true },
    );
    this.sort = main.getByRole("button", { name: "Sort", exact: true });
    this.orders = page.getByRole("listbox");
    this.buttons = { "Create Agent": this.createAgent };
    this.cards = new AgentCards(page);
    this.form = new AgentForm(page);
    this.confirmDialog = new ConfirmDialog(page);
    this.copyDialog = new CopyAgentDialog(page);
    this.teamSettings = new TeamSettings(page);
  }

  /**
   * Expects the agents of a space once their list is drawn: the heading of a
   * team that has agents, or the text of a team without them.
   */
  @step
  async expectShown(): Promise<void> {
    await expect(this.page).toHaveURL(AGENTS_ADDRESS);
    await this.expectListDrawn();
  }

  /**
   * Reload and wait for both team permissions and the agent list before
   * checking that a card or action is absent.
   */
  private async reloadAndWaitForButtons(): Promise<void> {
    await expect(this.page).toHaveURL(AGENTS_ADDRESS);
    await this.page.reload();
    await this.waitForRecordAndList();
  }

  /**
   * Expects a button to be absent once the page, loaded again, shows that it
   * has drawn the team's record and its agents.
   */
  @step
  async reloadAndExpectButtonAbsent(name: AgentsButton): Promise<void> {
    await waitThenExpectButtonAbsent(this.buttons[name], async () =>
      this.reloadAndWaitForButtons(),
    );
  }

  /** Expects an agent's card without a menu once the page, loaded again, has drawn the team's record and its agents. */
  @step
  async reloadAndExpectNoMenu(name: string): Promise<void> {
    await this.reloadAndWaitForButtons();
    await this.cards.expectNoMenu(name);
  }

  /** Opens a card's menu, expects exactly these actions and closes it without choosing. */
  @step
  async expectCardActions(
    name: string,
    actions: readonly AgentAction[],
  ): Promise<void> {
    await this.cards.expectActions(name, actions);
  }

  /**
   * Hovers a card's "Agent details" and expects the details to name the
   * agent's template after "Template".
   */
  @step
  async expectTemplateInDetails(name: string, template: string): Promise<void> {
    await this.cards.expectTemplateInDetails(name, template);
  }

  /**
   * Opens "Sort", expects exactly these orders and closes the list without
   * choosing: a choice would be kept as the user's preference.
   */
  @step
  async expectSortOrders(orders: readonly AgentOrder[]): Promise<void> {
    await this.sort.click();
    for (const order of orders)
      await expect(
        this.orders.getByRole("option", { name: order, exact: true }),
      ).toBeVisible();
    await expect(this.orders.getByRole("option")).toHaveCount(orders.length);
    await this.page.keyboard.press("Escape");
    await expect(this.orders).toBeHidden();
  }

  /**
   * Opens a new conversation with an agent from its card's "Chat"; nothing
   * is sent. The chat page checks that the conversation shows.
   */
  @step
  async startConversation(name: string): Promise<void> {
    await this.cards.startConversation(name);
  }

  /**
   * Creating an agent requires a template, name and use case. A closed form and
   * a listed card confirm creation.
   */
  @step
  async create(template: string, name: string, useCase: string): Promise<void> {
    await this.startAgent(template, name);
    await this.form.fillUseCase(useCase);
    await this.form.save();
    await this.form.expectSaved();
    await this.cards.expectListed(name);
  }

  /**
   * With the use case empty, "Create" keeps the form open and shows a
   * validation message on that field. Close the form after checking the
   * message.
   */
  @step
  async expectUseCaseRequired(template: string, name: string): Promise<void> {
    await this.startAgent(template, name);
    await this.form.save();
    await this.form.expectUseCaseMissing();
    await this.form.close();
  }

  /** Expects an agent listed once the page, loaded again, has drawn the team's record and its agents. */
  @step
  async reloadAndExpectListed(name: string): Promise<void> {
    await this.reloadAndWaitForButtons();
    await this.cards.expectListed(name);
  }

  /**
   * Check for an absent card after the team permissions and agent list load. A
   * deleted agent is absent for everyone. Suspended agents are also hidden from
   * members without the Editor role.
   */
  @step
  async reloadAndExpectNotListed(name: string): Promise<void> {
    await this.reloadAndWaitForButtons();
    await this.cards.expectNotListed(name);
  }

  /**
   * Expects an agent suspended once the page has loaded again: its card says
   * so, with "Chat" disabled.
   */
  @step
  async reloadAndExpectSuspended(name: string): Promise<void> {
    await this.reloadAndWaitForButtons();
    await this.cards.expectSuspended(name);
  }

  /**
   * Expects an agent available once the page has loaded again: its card
   * says no suspension and offers "Chat".
   */
  @step
  async reloadAndExpectAvailable(name: string): Promise<void> {
    await this.reloadAndWaitForButtons();
    await this.cards.expectAvailable(name);
  }

  /**
   * Loads the page again and opens the section "Capabilities" of a new
   * agent's form from a template, so the form shows the capabilities the
   * team may give its agents now. Nothing is saved.
   */
  @step
  async reloadAndOpenNewAgentCapabilities(template: string): Promise<void> {
    await this.reloadAndWaitForButtons();
    await this.startNewAgent(template);
    await this.form.openCapabilities();
  }

  /** Expects the open form of a new agent to show a capability. */
  @step
  async expectCapabilityListed(capability: AgentCapability): Promise<void> {
    await this.form.expectCapabilityListed(capability);
  }

  /** Expects the open form of a new agent not to show a capability, once it shows its capabilities. */
  @step
  async expectCapabilityNotListed(capability: AgentCapability): Promise<void> {
    await this.form.expectCapabilityNotListed(capability);
  }

  /**
   * Loads the page again, expects a new agent's form, from a template, to
   * show a capability, and closes the form unsaved.
   */
  @step
  async reloadAndExpectCapabilityListedForNewAgent(
    template: string,
    capability: AgentCapability,
  ): Promise<void> {
    await this.reloadAndOpenNewAgentCapabilities(template);
    await this.form.expectCapabilityListed(capability);
    await this.form.close();
  }

  /**
   * Enable a capability that is currently off and wait for the form to close
   * after saving.
   */
  @step
  async turnOn(name: string, capability: AgentCapability): Promise<void> {
    await this.edit(name);
    await this.form.turnOnCapability(capability);
    await this.saveEdit();
  }

  /** Expects a capability on in an agent's form, once the page has loaded again. */
  @step
  async reloadAndExpectCapabilityOn(
    name: string,
    capability: AgentCapability,
  ): Promise<void> {
    await this.reloadAndEdit(name);
    await this.form.expectCapabilityOn(capability);
    await this.form.close();
  }

  /** Save the edited description and wait for the form to close. */
  @step
  async setDescription(name: string, description: string): Promise<void> {
    await this.edit(name);
    await this.form.fillDescription(description);
    await this.saveEdit();
  }

  /** Expects an agent's description in its form, once the page has loaded again. */
  @step
  async reloadAndExpectDescription(
    name: string,
    description: string,
  ): Promise<void> {
    await this.reloadAndEdit(name);
    await this.form.expectDescription(description);
    await this.form.close();
  }

  /** The disabled "Chat" control confirms that the agent was deactivated. */
  @step
  async deactivate(name: string): Promise<void> {
    await this.cards.choose(name, "Deactivate");
    await this.cards.expectChatDisabled(name);
  }

  /** The "Chat" link returns when the agent is active again. */
  @step
  async activate(name: string): Promise<void> {
    await this.cards.choose(name, "Activate");
    await this.cards.expectChatLink(name);
  }

  /** Expects an agent's "Chat" disabled once the page has loaded again: the agent cannot be chatted with. */
  @step
  async reloadAndExpectCannotChat(name: string): Promise<void> {
    await this.reloadAndWaitForButtons();
    await this.cards.expectChatDisabled(name);
  }

  /** Expects an agent's "Chat" link once the page has loaded again: the agent can be chatted with. */
  @step
  async reloadAndExpectCanChat(name: string): Promise<void> {
    await this.reloadAndWaitForButtons();
    await this.cards.expectChatLink(name);
  }

  /**
   * Restrict "Team documents" to one folder and wait for the saved form to
   * close.
   */
  @step
  async restrictTo(name: string, folder: string): Promise<void> {
    await this.edit(name);
    await this.form.restrictTo(folder);
    await this.saveEdit();
  }

  /** Expects an agent restricted to one folder in its form, once the page has loaded again. */
  @step
  async reloadAndExpectRestrictedTo(
    name: string,
    folder: string,
  ): Promise<void> {
    await this.reloadAndEdit(name);
    await this.form.expectRestrictedTo(folder);
    await this.form.close();
  }

  /**
   * Opens "Copy to…" for an agent, expects the agent's own team checked and
   * "Copy" disabled, and closes the dialog: nothing is copied.
   */
  @step
  async expectCopyDialog(name: string, origin: string): Promise<void> {
    await this.cards.choose(name, "Copy to…");
    await this.copyDialog.expectOpened(name, origin);
    await this.copyDialog.close(name);
  }

  /** Confirm deletion and wait for the card to disappear. */
  @step
  async delete(name: string): Promise<void> {
    await this.cards.choose(name, "Delete");
    await this.confirmDialog.confirm("Delete this agent?", "Delete");
    await this.cards.expectNotListed(name);
  }

  /**
   * A suspended agent becomes visible to an editor only after team permissions
   * load. Wait for those permissions and the list before deciding whether to
   * delete the agent.
   */
  @step
  async deleteIfListed(name: string): Promise<void> {
    await this.waitForRecordAndList();
    if (await this.cards.lists(name)) await this.delete(name);
    else await this.cards.expectNotListed(name);
  }

  /** Opens the form of a new agent, chooses the template and names the agent. */
  private async startAgent(template: string, name: string): Promise<void> {
    await this.startNewAgent(template);
    await this.form.fillName(name);
  }

  /**
   * Opens the form of a new agent from the create action, which the page
   * shows once its list is drawn, and chooses the template.
   */
  private async startNewAgent(template: string): Promise<void> {
    await this.expectListDrawn();
    await this.createAgent.or(this.createFirst).click();
    await this.form.chooseTemplate(template);
  }

  /** Opens an agent's form from its card menu, filled in with the agent's own values. */
  private async edit(name: string): Promise<void> {
    await this.cards.choose(name, "Edit");
    await this.form.expectEditing(name);
  }

  /** The form closes after the edit is saved. */
  private async saveEdit(): Promise<void> {
    await this.form.save();
    await this.form.expectSaved();
  }

  /** Loads the page again and opens an agent's form, once the card shows. */
  private async reloadAndEdit(name: string): Promise<void> {
    await this.reloadAndWaitForButtons();
    await this.edit(name);
  }

  /**
   * "Settings" becomes visible when the team record loads. The heading or
   * empty-list message appears when the agents load. Either can arrive first.
   */
  private async waitForRecordAndList(): Promise<void> {
    await this.teamSettings.expectSettingsShown();
    await this.expectListDrawn();
  }

  /**
   * A team with agents shows the heading even when all its agents are suspended
   * and the member cannot see their cards. A team with no agents shows the
   * empty-list message.
   */
  private async expectListDrawn(): Promise<void> {
    await expect(this.heading.or(this.noAgents).first()).toBeVisible();
  }
}
