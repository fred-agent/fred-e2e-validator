import type { ConsoleSection } from "../components/admin-console.ts";
import type { SpaceSection } from "../components/space-navigation.ts";
import type { TeamSection } from "../components/team-settings.ts";
import type { Account } from "../config/accounts.ts";
import type { Space } from "../config/test-data.ts";
import type { Folder } from "../fixtures/folders.ts";
import type { TemporaryTeam } from "../fixtures/teams.ts";
import type { Pages } from "../pages/pages.ts";
import { flowStep } from "./flow-step.ts";

/** Routes through several pages, each one step in the report. */
export class Flows {
  private readonly pages: Pages;

  constructor(pages: Pages) {
    this.pages = pages;
  }

  /**
   * Follows the redirect from the home page, signs in, accepts the terms if
   * shown, and checks the account on the home page.
   */
  async signIn(account: Account): Promise<void> {
    await flowStep(`Sign in as ${account.name}`, async () => {
      const { home, signIn, terms } = this.pages;
      await home.open();
      await signIn.expectShown();
      await signIn.signIn(account);
      await terms.acceptIfShown();
      await home.expectSignedInAs(account);
    });
  }

  /** The resources of a space, as an editor, who is offered "New folder". */
  async openResources(space: Space): Promise<void> {
    await flowStep(`Open the resources of "${space.name}"`, async () => {
      await this.goToResources(space);
      await this.pages.resources.expectShown();
    });
  }

  /** The resources of a space, as any member opens them, once the folder list shows. */
  async openResourcesAsMember(space: Space): Promise<void> {
    await flowStep(
      `Open the resources of "${space.name}" as a member`,
      async () => {
        await this.goToResources(space);
      },
    );
  }

  /**
   * A section of a space other than its resources, such as "Prompts" or
   * "Apps", as any member opens it: the home page, the space and the space
   * navigation. The resources have their own route, which waits for the
   * folder list: `openResources`, `openResourcesAsMember` or `openFolder`.
   */
  async openSpaceSection(space: Space, section: SpaceSection): Promise<void> {
    await flowStep(`Open "${section}" of "${space.name}"`, async () => {
      await this.goToSpaceSection(space, section);
    });
  }

  /** A space's prompts, as any member opens them, once the page shows the prompt list. */
  async openPrompts(space: Space): Promise<void> {
    await flowStep(`Open the prompts of "${space.name}"`, async () => {
      await this.goToSpaceSection(space, "Prompts");
      await this.pages.prompts.expectShown();
    });
  }

  /** A folder of a space's resources, as any member opens it. */
  async openFolder(folder: Folder): Promise<void> {
    await flowStep(
      `Open the folder "${folder.name}" of "${folder.space.name}"`,
      async () => {
        await this.goToResources(folder.space);
        await this.pages.resources.openFolder(folder.name);
      },
    );
  }

  /**
   * A space's agents, as any member opens them: the home page, the space and
   * the space navigation's "Agents", once the page shows the agent list.
   */
  async openAgents(space: Space): Promise<void> {
    await flowStep(`Open the agents of "${space.name}"`, async () => {
      await this.goToAgents(space);
    });
  }

  /**
   * A new conversation with an agent of a space, from the "Chat" of its card
   * on the space's agents. Nothing is sent.
   */
  async openConversation(space: Space, agent: string): Promise<void> {
    await flowStep(
      `Open a conversation with "${agent}" of "${space.name}"`,
      async () => {
        await this.goToAgents(space);
        await this.pages.agents.startConversation(agent);
        await this.pages.chat.expectShown();
      },
    );
  }

  /**
   * A space's wiki, as any member opens it: the home page, the space and the
   * space navigation's wiki.
   */
  async openWiki(space: Space): Promise<void> {
    await flowStep(`Open the wiki of "${space.name}"`, async () => {
      await this.goToSpace(space);
      await this.pages.wiki.open();
    });
  }

  /** A section of a team's settings, through the home page, the team's space and its settings. */
  async openTeamSettings(
    team: TemporaryTeam,
    section: TeamSection,
  ): Promise<void> {
    await flowStep(
      `Open the settings section "${section}" of "${team.name}"`,
      async () => {
        await this.goToTeamSettings(team, section);
      },
    );
  }

  /** A team's members page, through the home page, the team's space and its settings. */
  async openTeamMembers(team: TemporaryTeam): Promise<void> {
    await flowStep(`Open the members of "${team.name}"`, async () => {
      await this.goToTeamSettings(team, "Members");
      await this.pages.teamMembers.expectShown();
    });
  }

  /**
   * The signed-in user's profile, from the account menu of the home page,
   * once the bootstrap response, which holds the profile picture, has loaded.
   */
  async openProfile(): Promise<void> {
    await flowStep("Open the profile", async () => {
      const { home, accountMenu, profile } = this.pages;
      await home.openWithSpaces();
      await accountMenu.openProfile();
      await profile.expectShown();
    });
  }

  /** A section of the technical console, from the main navigation, once its page shows. */
  async openConsoleSection(section: ConsoleSection): Promise<void> {
    await flowStep(`Open the console section "${section}"`, async () => {
      const adminConsole = this.pages.adminConsole;
      await adminConsole.open();
      await adminConsole.goTo(section);
      await adminConsole.expectSectionShown(section);
    });
  }

  /**
   * Opens the folder's space through the home page and navigates to its
   * resources to delete the folder. A folder whose creation was confirmed must
   * appear in the list.
   */
  async deleteFolder(
    folder: Folder,
    { expected }: Readonly<{ expected: boolean }>,
  ): Promise<void> {
    await flowStep(
      `Delete the folder "${folder.name}" of "${folder.space.name}"`,
      async () => {
        await this.goToResources(folder.space);
        const { resources } = this.pages;
        if (expected) await resources.deleteFolder(folder.name);
        else await resources.deleteFolderIfListed(folder.name);
      },
    );
  }

  /** A space, from the home page once its space list has loaded. */
  private async goToSpace(space: Space): Promise<void> {
    const home = this.pages.home;
    await home.openWithSpaces();
    await home.openSpace(space.name);
  }

  /** A space's resources, the one route to them: the space, then the space navigation's "Resources". */
  private async goToResources(space: Space): Promise<void> {
    await this.goToSpace(space);
    await this.pages.resources.open();
  }

  /**
   * A space's agents, the one route to them: the space, then the space
   * navigation's "Agents", once the page shows the agent list.
   */
  private async goToAgents(space: Space): Promise<void> {
    await this.goToSpaceSection(space, "Agents");
    await this.pages.agents.expectShown();
  }

  /** A section of a space other than its resources, such as "Prompts". */
  private async goToSpaceSection(
    space: Space,
    section: SpaceSection,
  ): Promise<void> {
    await this.goToSpace(space);
    await this.pages.space.goTo(section);
  }

  private async goToTeamSettings(
    team: TemporaryTeam,
    section: TeamSection,
  ): Promise<void> {
    await this.goToSpace(team);
    const settings = this.pages.teamSettings;
    await settings.open();
    await settings.goTo(section);
  }
}
