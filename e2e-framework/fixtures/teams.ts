// The platform administrator creates each temporary team through the console.
// Teardown deletes each team through the API in a separate browser context.
import {
  PLATFORM_ADMIN,
  type AccountName,
  type AccountSet,
} from "../config/accounts.ts";
import type { TeamId } from "../fred-api/fred-api.ts";
import type { FeatureAccess, TeamCapability } from "../pages/features-page.ts";
import type { TeamRole } from "../pages/team-members-page.ts";
import type { Removal } from "./test.ts";
import type { TestUsers } from "./users.ts";

/** The unique name of a team created by a test. */
export type TemporaryTeam = Readonly<{ name: string }>;

/** A capability that Admin › Features enables or disables for a team. */
export type CapabilityAccess = Readonly<{
  capability: TeamCapability;
  access: FeatureAccess;
}>;

/**
 * How a team is set up. The platform administrator administers every
 * temporary team; `admins` administer it too from its creation, `members`
 * are added to it, `roles` given to the platform administrator or to
 * members, `agentTemplate` enabled for the team, and each of `capabilities`
 * set for the team in Admin › Features.
 */
export type TeamOptions = Readonly<{
  admins?: readonly AccountName[];
  members?: readonly AccountName[];
  roles?: Readonly<Partial<Record<AccountName, readonly TeamRole[]>>>;
  agentTemplate?: string;
  capabilities?: readonly CapabilityAccess[];
}>;

/** A new team requires a description between 20 and 500 characters. */
const DESCRIPTION =
  "A temporary team that an end-to-end test creates and removes.";

/** Teardown keeps the ID from creation even when the team's name changes. */
type RecordedTeam = {
  team: TemporaryTeam;
  readonly id: TeamId;
};

/** The accounts a team's options give roles to, each with its roles. */
function roleEntries(
  roles: TeamOptions["roles"],
): [AccountName, readonly TeamRole[]][] {
  return Object.entries(roles ?? {}).flatMap(([account, given]) =>
    given === undefined ? [] : [[account as AccountName, given]],
  );
}

/** Checks member and role options before creating the team. */
function checkOptions(word: string, options: TeamOptions): void {
  const members = options.members ?? [];
  const admins = options.admins ?? [];
  if (admins.includes(PLATFORM_ADMIN))
    throw new Error(
      `teams.create("${word}"): ${PLATFORM_ADMIN} administers every temporary team, so it is not one of its other admins.`,
    );
  if (admins.some((account) => members.includes(account)))
    throw new Error(
      `teams.create("${word}"): an admin of the team is not one of the members it adds.`,
    );
  if (members.includes(PLATFORM_ADMIN))
    throw new Error(
      `teams.create("${word}"): ${PLATFORM_ADMIN} administers every temporary team, so it is not one of its members.`,
    );
  for (const [account, roles] of roleEntries(options.roles))
    if (account !== PLATFORM_ADMIN && !members.includes(account))
      throw new Error(
        `teams.create("${word}"): ${account} is given the role ${roles.join(", ")} but is not one of the members.`,
      );
}

export type TeamsOptions = Readonly<{
  users: TestUsers;
  accounts: AccountSet;
  /** `e2e <word> <stamp>`, the name of what the test creates. */
  uniqueName: (word: string) => string;
}>;

export class Teams {
  private readonly options: TeamsOptions;
  private readonly recorded: RecordedTeam[] = [];

  constructor(options: TeamsOptions) {
    this.options = options;
  }

  /** Creates a team with its administrators, then configures members, roles and access. */
  async create(
    word: string,
    options: TeamOptions = {},
  ): Promise<TemporaryTeam> {
    checkOptions(word, options);
    const { users, accounts, uniqueName } = this.options;
    const team: TemporaryTeam = Object.freeze({ name: uniqueName(word) });
    const admin = await users.user(PLATFORM_ADMIN);
    const { adminTeams, teamMembers, features } = admin.pages;
    await adminTeams.open();
    const admins = [
      admin.account,
      ...(options.admins ?? []).map((name) => accounts.get(name)),
    ];
    await admin.api.recordTeamCreation(
      team.name,
      () => adminTeams.createTeam(team.name, DESCRIPTION, admins),
      (id) => this.recorded.push({ team, id }),
    );
    const members = options.members ?? [];
    const roles = roleEntries(options.roles);
    if (members.length > 0 || roles.length > 0)
      await admin.flows.openTeamMembers(team);
    for (const member of members)
      await teamMembers.addMember(accounts.get(member), team.name);
    for (const [account, given] of roles)
      for (const role of given)
        await teamMembers.grant(accounts.get(account), role);
    const { agentTemplate, capabilities = [] } = options;
    if (agentTemplate !== undefined || capabilities.length > 0)
      await admin.flows.openConsoleSection("Features");
    if (agentTemplate !== undefined)
      await features.setAgentTemplateAccess(agentTemplate, team.name, "Enable");
    for (const { capability, access } of capabilities)
      await features.setCapabilityAccess(capability, team.name, access);
    return team;
  }

  /** Renames a team created by this fixture and returns it under its new name. */
  async rename(team: TemporaryTeam, word: string): Promise<TemporaryTeam> {
    const recorded = this.recorded.find((entry) => entry.team === team);
    if (recorded === undefined)
      throw new Error(
        `teams.rename: the team "${team.name}" is not one of the test's.`,
      );
    const renamed: TemporaryTeam = Object.freeze({
      name: this.options.uniqueName(word),
    });
    const admin = await this.options.users.user(PLATFORM_ADMIN);
    await admin.flows.openConsoleSection("Teams");
    await admin.pages.adminTeams.rename(team.name, renamed.name);
    recorded.team = renamed;
    return renamed;
  }

  /** Teardown deletes confirmed teams newest first by their original IDs. */
  removals(): Removal[] {
    return this.recorded.toReversed().map((recorded) => ({
      title: `Delete the team "${recorded.team.name}"`,
      account: PLATFORM_ADMIN,
      remove: (user) => user.api.deleteTeam(recorded.id, recorded.team.name),
    }));
  }
}
