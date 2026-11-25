import { expect, type Locator, type Page } from "@playwright/test";
import { AgentCards, type AgentAction } from "../components/agent-cards.ts";
import {
  CopyAgentDialog,
  DuplicateAgentDialog,
  PublishAgentDialog,
} from "../components/agent-dialogs.ts";
import {
  AgentForm,
  type AdvancedCapability,
  type AgentCapability,
  type WikiMode,
} from "../components/agent-form.ts";
import { ConfirmDialog } from "../components/dialogs.ts";
import { waitThenExpectButtonAbsent } from "./buttons.ts";
import { step } from "./step.ts";

/** The buttons of the agents page a test checks by name. */
export type AgentsButton = "Create Agent";

const ORDERS = [
  "Alphabetical",
  "Recently created",
  "Recently updated",
] as const;

/** The orders "Sort" offers for a space's agents, by their labels. */
export type AgentOrder = (typeof ORDERS)[number];

/** The address of a space's agents. */
const AGENTS_ADDRESS = /\/team\/[^/]+\/agents$/;

/**
 * "Loading agents..." gives way to the list heading, "Team agents" or "Your
 * personal agents", or to the empty-list message. Once the space's
 * permissions load, editors can create and edit agents and see suspended
 * agents. Other members see only active agents. Reload the page to verify
 * saved changes.
 */
export class AgentsPage {
  static readonly displayName = "Agents page";
  private readonly page: Page;
  // Above the cards of a space that has agents, for every member, also when
  // the page hides every one of them.
  private readonly heading: Locator;
  // Above the cards, for an editor of a team that has agents.
  private readonly createAgent: Locator;
  // Under the text of a team without agents, for an editor.
  private readonly createFirst: Locator;
  // What the page shows instead of cards when the team has no agent.
  private readonly noAgents: Locator;
  // Above the cards; named "Sort", it shows the order chosen, which is kept
  // as the user's preference.
  private readonly sort: Locator;
  // The orders "Sort" opens.
  private readonly orders: Locator;
  private readonly buttons: Readonly<Record<AgentsButton, Locator>>;
  private readonly cards: AgentCards;
  private readonly form: AgentForm;
  private readonly confirmDialog: ConfirmDialog;
  private readonly copyDialog: CopyAgentDialog;
  private readonly duplicateDialog: DuplicateAgentDialog;
  private readonly publishDialog: PublishAgentDialog;
  // "Settings" of a team's space, for a member with access to the members.
  private readonly settings: Locator;

  constructor(page: Page) {
    this.page = page;
    const main = page.getByRole("main");
    this.heading = main.getByRole("heading", {
      level: 1,
      name: /^(Team agents|Your personal agents)$/,
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
    this.duplicateDialog = new DuplicateAgentDialog(page);
    this.publishDialog = new PublishAgentDialog(page);
    this.settings = page.getByRole("button", { name: "Settings", exact: true });
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

  /** The order the agents are in, from the list of "Sort". */
  @step
  async readOrder(): Promise<AgentOrder> {
    await this.sort.click();
    await expect(this.orders).toBeVisible();
    let chosen: AgentOrder | undefined;
    for (const name of ORDERS)
      if (
        await this.orders
          .getByRole("option", { name, exact: true, selected: true })
          .isVisible()
      )
        chosen = name;
    await this.page.keyboard.press("Escape");
    await expect(this.orders).toBeHidden();
    if (chosen === undefined)
      throw new Error(
        `"Sort" shows none of the orders ${ORDERS.join(", ")} chosen.`,
      );
    return chosen;
  }

  /** Sorts the agents; the order is kept as the user's preference. */
  @step
  async chooseOrder(order: AgentOrder): Promise<void> {
    await this.sort.click();
    await this.orders.getByRole("option", { name: order, exact: true }).click();
    await this.expectOrder(order);
  }

  /** Expects "Sort" to show an order. */
  @step
  async expectOrder(order: AgentOrder): Promise<void> {
    await expect(this.sort).toContainText(order);
  }

  /** Expects one agent listed before another one. */
  @step
  async expectListedBefore(first: string, second: string): Promise<void> {
    await this.cards.expectListedBefore(first, second);
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

  /** Turns on several capabilities that are off and waits for the form to close after saving. */
  @step
  async turnOnAll(
    name: string,
    capabilities: readonly AgentCapability[],
  ): Promise<void> {
    await this.edit(name);
    for (const capability of capabilities)
      await this.form.turnOnCapability(capability);
    await this.saveEdit();
  }

  /**
   * Loads the page again, so the form shows what is saved, turns off a
   * capability that is on and waits for the form to close after saving.
   */
  @step
  async reloadAndTurnOff(
    name: string,
    capability: AgentCapability,
  ): Promise<void> {
    await this.reloadAndEdit(name);
    await this.form.turnOffCapability(capability);
    await this.saveEdit();
  }

  /** Turns on a capability that is off and closes the form unsaved. */
  @step
  async turnOnUnsaved(
    name: string,
    capability: AgentCapability,
  ): Promise<void> {
    await this.edit(name);
    await this.form.turnOnCapability(capability);
    await this.form.close();
  }

  /** Expects a capability off in an agent's form, once the page has loaded again. */
  @step
  async reloadAndExpectCapabilityOff(
    name: string,
    capability: AgentCapability,
  ): Promise<void> {
    await this.reloadAndEdit(name);
    await this.form.expectCapabilityOff(capability);
    await this.form.close();
  }

  /** Expects capabilities on and others off in an agent's form, once the page has loaded again. */
  @step
  async reloadAndExpectCapabilities(
    name: string,
    on: readonly AgentCapability[],
    off: readonly AgentCapability[],
  ): Promise<void> {
    await this.reloadAndEdit(name);
    for (const capability of on) await this.form.expectCapabilityOn(capability);
    for (const capability of off)
      await this.form.expectCapabilityOff(capability);
    await this.form.close();
  }

  /** Turns on the wiki for an agent, chooses what it may do there and saves. */
  @step
  async turnOnWiki(name: string, mode: WikiMode): Promise<void> {
    await this.edit(name);
    await this.form.turnOnCapability("Access to the team wiki");
    await this.form.chooseWikiMode(mode);
    await this.saveEdit();
  }

  /**
   * Loads the page again, so the form shows what is saved, chooses what the
   * agent may do in the wiki and saves.
   */
  @step
  async reloadAndChooseWikiMode(name: string, mode: WikiMode): Promise<void> {
    await this.reloadAndEdit(name);
    await this.form.chooseWikiMode(mode);
    await this.saveEdit();
  }

  /** Expects what an agent may do in the wiki, once the page has loaded again. */
  @step
  async reloadAndExpectWikiMode(name: string, mode: WikiMode): Promise<void> {
    await this.reloadAndEdit(name);
    await this.form.expectCapabilityOn("Access to the team wiki");
    await this.form.expectWikiMode(mode);
    await this.form.close();
  }

  /** Turns on presentations for an agent, with a plan shown first, and saves. */
  @step
  async turnOnPresentationWithPlan(name: string): Promise<void> {
    await this.edit(name);
    await this.form.turnOnCapability("Generate a presentation");
    await this.form.turnOnPlanValidation();
    await this.saveEdit();
  }

  /** Expects presentations with a plan shown first, once the page has loaded again. */
  @step
  async reloadAndExpectPresentationWithPlan(name: string): Promise<void> {
    await this.reloadAndEdit(name);
    await this.form.expectCapabilityOn("Generate a presentation");
    await this.form.expectPlanValidationOn();
    await this.form.close();
  }

  /** Turns on the "Advanced" view of the open capabilities of a new agent. */
  @step
  async showAdvancedCapabilities(): Promise<void> {
    await this.form.showAdvancedView();
  }

  /** Expects the "Advanced" view of the open form of a new agent to show a capability. */
  @step
  async expectAdvancedCapabilityListed(
    capability: AdvancedCapability,
  ): Promise<void> {
    await this.form.expectAdvancedCapabilityListed(capability);
  }

  /** Opens an agent's form, expects the team's default first among its models and closes it. */
  @step
  async expectDefaultModelFirst(name: string): Promise<void> {
    await this.edit(name);
    await this.form.expectDefaultModelFirst();
    await this.form.close();
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

  /** Expects an agent's "Team documents" restricted to no folder, once the page has loaded again. */
  @step
  async reloadAndExpectNotRestricted(name: string): Promise<void> {
    await this.reloadAndEdit(name);
    await this.form.expectNotRestricted();
    await this.form.close();
  }

  /** Duplicates an agent under a name; the page then lists the duplicate. */
  @step
  async duplicate(name: string, duplicate: string): Promise<void> {
    await this.cards.choose(name, "Duplicate");
    await this.duplicateDialog.submit(duplicate);
    await this.cards.expectListed(duplicate);
  }

  /** Publishes an agent to the marketplace; its card then says so. */
  @step
  async publish(name: string): Promise<void> {
    await this.cards.choose(name, "Publish to the marketplace");
    await this.publishDialog.publish(name);
    await this.cards.expectPublished(name);
  }

  /** Copies an agent to a space; the page says that the agent was copied. */
  @step
  async copyTo(name: string, space: string): Promise<void> {
    await this.cards.choose(name, "Copy to…");
    await this.copyDialog.copyTo(name, space);
  }

  /**
   * Opens "Copy to…" for an agent, expects one space among the destinations
   * and another one not, once they have loaded, and closes the dialog.
   */
  @step
  async expectCopyDestinations(
    name: string,
    origin: string,
    shown: string,
    notShown: string,
  ): Promise<void> {
    await this.cards.choose(name, "Copy to…");
    await this.copyDialog.expectOpened(name, origin);
    await this.copyDialog.expectDestinations(name, shown, notShown);
    await this.copyDialog.close(name);
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
   * "Settings" of a team, and the create action of an editor, also in a
   * personal space, become visible when the space's record loads. The heading
   * or empty-list message appears when the agents load. Either can arrive
   * first.
   */
  private async waitForRecordAndList(): Promise<void> {
    await expect(
      this.settings.or(this.createAgent).or(this.createFirst).first(),
    ).toBeVisible();
    await this.expectListDrawn();
  }

  /**
   * A space with agents shows the heading even when all its agents are suspended
   * and the member cannot see their cards. A team with no agents shows the
   * empty-list message.
   */
  private async expectListDrawn(): Promise<void> {
    await expect(this.heading.or(this.noAgents).first()).toBeVisible();
  }
}
