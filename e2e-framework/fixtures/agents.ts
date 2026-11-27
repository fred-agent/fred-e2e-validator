// The agents of one test. `create` makes an agent of a personal space or a
// temporary team through the agents page, from the template and with the use
// case of the test data; the fixture's teardown deletes each agent, and
// restores the order a test chose, in a browser context of its own opened as
// the account.
import type { AccountName } from "../config/accounts.ts";
import type { Space, TestData } from "../config/test-data.ts";
import type { AgentOrder } from "../pages/agents-page.ts";
import type { Removal } from "./test.ts";
import type { User } from "./users.ts";

/** The space and unique name of an agent created by a test. */
export type Agent = Readonly<{ space: Space; name: string }>;

export type AgentsOptions = Readonly<{
  /** The template and the use case of every agent the fixture creates. */
  testData: TestData;
  /** `e2e <word> <stamp>`, the name of what the test creates. */
  uniqueName: (word: string) => string;
}>;

export class Agents {
  private readonly options: AgentsOptions;
  /** Recorded before the application is touched. */
  private readonly recorded: Removal[] = [];

  constructor(options: AgentsOptions) {
    this.options = options;
  }

  /**
   * Records the agent, then creates it as the user in the space's agents,
   * from the template and with the use case of the test data; the user must
   * be able to create agents there.
   */
  async create(user: User, space: Space, word: string): Promise<Agent> {
    const { testData, uniqueName } = this.options;
    const agent = this.record(user.account.name, space, uniqueName(word));
    await user.flows.openAgents(space);
    await user.pages.agents.create(
      testData.agentTemplate,
      agent.name,
      testData.agentUseCase,
    );
    return agent;
  }

  /** Records the duplicate, then duplicates an agent as the user in its space. */
  async duplicate(user: User, agent: Agent, word: string): Promise<Agent> {
    const duplicate = this.record(
      user.account.name,
      agent.space,
      this.options.uniqueName(word),
    );
    await user.flows.openAgents(agent.space);
    await user.pages.agents.duplicate(agent.name, duplicate.name);
    return duplicate;
  }

  /**
   * Records the copy, then copies an agent as the user from its space to
   * another one, where the application gives it the name the caller expects.
   */
  async copy(
    user: User,
    agent: Agent,
    space: Space,
    name: string = agent.name,
  ): Promise<Agent> {
    const copy = this.record(user.account.name, space, name);
    await user.flows.openAgents(agent.space);
    await user.pages.agents.copyTo(agent.name, space.name);
    return copy;
  }

  /**
   * Records the copy, then imports a published agent from the marketplace as
   * the user into a space, where the copy has the agent's name.
   */
  async importFromMarketplace(
    user: User,
    agent: Agent,
    space: Space,
  ): Promise<Agent> {
    const copy = this.record(user.account.name, space, agent.name);
    await user.pages.marketplace.browse("Agents");
    await user.pages.marketplace.importAgent(agent.name, space.name);
    return copy;
  }

  /**
   * Sorts a space's agents as the user, a preference of the account; the
   * order before is restored while the space still holds an agent, as "Sort"
   * shows only then.
   */
  async sort(user: User, space: Space, order: AgentOrder): Promise<void> {
    await user.flows.openAgents(space);
    const before = await user.pages.agents.readOrder();
    this.recorded.push({
      title: `Restore the order "${before}" of the agents`,
      account: user.account.name,
      remove: async (restoring) => {
        const { agents, prompts, space: navigation } = restoring.pages;
        await restoring.flows.openAgents(space);
        await agents.chooseOrder(before);
        // The application saves the order without a sign: another section of
        // the space keeps the page while it does.
        await navigation.goTo("Prompts");
        await prompts.expectShown();
        await restoring.flows.openAgents(space);
        await agents.expectOrder(before);
      },
    });
    await user.pages.agents.chooseOrder(order);
  }

  /**
   * The removals and restorations, newest first: each removal deletes its
   * agent as the account that created it, if the space's agents list it.
   */
  removals(): Removal[] {
    return this.recorded.toReversed();
  }

  private record(account: AccountName, space: Space, name: string): Agent {
    const agent: Agent = Object.freeze({ space, name });
    this.recorded.push({
      title: `Delete the agent "${name}" of "${space.name}"`,
      account,
      remove: async (user) => {
        await user.flows.openAgents(space);
        await user.pages.agents.deleteIfListed(name);
      },
    });
    return agent;
  }
}
