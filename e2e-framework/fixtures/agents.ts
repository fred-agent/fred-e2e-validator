// The agents of one test. `create` makes an agent of a temporary team
// through the agents page, from the template and with the use case of the
// test data; the fixture's teardown deletes each agent in a browser context
// of its own opened as the account that created it.
import type { AccountName } from "../config/accounts.ts";
import type { TestData } from "../config/test-data.ts";
import type { TemporaryTeam } from "./teams.ts";
import type { Removal } from "./test.ts";
import type { User } from "./users.ts";

/** The team and unique name of an agent created by a test. */
export type Agent = Readonly<{ team: TemporaryTeam; name: string }>;

/** The fixture records the agent and its creator before starting creation. */
type RecordedAgent = Readonly<{ agent: Agent; account: AccountName }>;

export type AgentsOptions = Readonly<{
  /** The template and the use case of every agent the fixture creates. */
  testData: TestData;
  /** `e2e <word> <stamp>`, the name of what the test creates. */
  uniqueName: (word: string) => string;
}>;

export class Agents {
  private readonly options: AgentsOptions;
  private readonly recorded: RecordedAgent[] = [];

  constructor(options: AgentsOptions) {
    this.options = options;
  }

  /**
   * Records the agent, then creates it as the user in the team's agents,
   * from the template and with the use case of the test data; the user must
   * be able to create agents there.
   */
  async create(user: User, team: TemporaryTeam, word: string): Promise<Agent> {
    const { testData, uniqueName } = this.options;
    const agent: Agent = Object.freeze({ team, name: uniqueName(word) });
    this.recorded.push({ agent, account: user.account.name });
    await user.flows.openAgents(team);
    await user.pages.agents.create(
      testData.agentTemplate,
      agent.name,
      testData.agentUseCase,
    );
    return agent;
  }

  /**
   * The removals of the agents the test created, newest first: each deletes
   * its agent as the account that created it, if the team's agents list it.
   */
  removals(): Removal[] {
    return this.recorded.toReversed().map(({ agent, account }) => ({
      title: `Delete the agent "${agent.name}" of "${agent.team.name}"`,
      account,
      remove: async (user) => {
        await user.flows.openAgents(agent.team);
        await user.pages.agents.deleteIfListed(agent.name);
      },
    }));
  }
}
