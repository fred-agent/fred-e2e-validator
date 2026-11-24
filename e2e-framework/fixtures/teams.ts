// The platform administrator creates each temporary team through the console.
// Teardown deletes each team through the API in a separate browser context.
import {
  PLATFORM_ADMIN,
  type AccountName,
  type AccountSet,
} from "../config/accounts.ts";
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
 * temporary team; `members` are added to it, `roles` given to the platform
 * administrator or to members, `agentTemplate` enabled for the team, and
 * each of `capabilities` set for the team in Admin › Features.
 */
export type TeamOptions = Readonly<{
  members?: readonly AccountName[];
  roles?: Readonly<Partial<Record<AccountName, readonly TeamRole[]>>>;
  agentTemplate?: string;
  capabilities?: readonly CapabilityAccess[];
}>;

/** A new team requires a description between 20 and 500 characters. */
const DESCRIPTION =
  "A temporary team that an end-to-end test creates and removes.";

/**
 * The fixture records the team before creation and tracks whether creation was
 * confirmed.
 */
type RecordedTeam = { readonly team: TemporaryTeam; inFred: boolean };

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

  /**
   * Records the team, creates it in the console as the platform
   * administrator, its only administrator, adds the members, grants the
   * roles, then enables the agent template and sets each capability for the
   * team in Admin › Features: in that order, in the platform administrator's
   * own user, which it opens here.
   */
  async create(
    word: string,
    options: TeamOptions = {},
  ): Promise<TemporaryTeam> {
    checkOptions(word, options);
    const { users, accounts, uniqueName } = this.options;
    const team: TemporaryTeam = Object.freeze({ name: uniqueName(word) });
    const recorded: RecordedTeam = { team, inFred: false };
    this.recorded.push(recorded);
    const admin = await users.user(PLATFORM_ADMIN);
    const { adminTeams, teamMembers, features } = admin.pages;
    await adminTeams.open();
    await adminTeams.createTeam(team.name, DESCRIPTION, admin.account);
    recorded.inFred = true;
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

  /**
   * Teardown deletes teams newest first as the platform administrator. A
   * missing team is an error only after creation was confirmed.
   */
  removals(): Removal[] {
    return this.recorded.toReversed().map((recorded) => ({
      title: `Delete the team "${recorded.team.name}"`,
      account: PLATFORM_ADMIN,
      remove: async (user) =>
        user.api.deleteTeam(recorded.team.name, {
          expected: recorded.inFred,
        }),
    }));
  }
}
