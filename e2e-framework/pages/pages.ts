import type { Page } from "@playwright/test";
import { AccountMenu } from "../components/account-menu.ts";
import { AdminConsole } from "../components/admin-console.ts";
import { MainNavigation } from "../components/main-navigation.ts";
import { SpaceNavigation } from "../components/space-navigation.ts";
import { TeamSettings } from "../components/team-settings.ts";
import { AdminTeamsPage } from "./admin-teams-page.ts";
import { AgentsPage } from "./agents-page.ts";
import { AnnouncementsPage } from "./announcements-page.ts";
import { ChatPage } from "./chat-page.ts";
import { AnalyticsPage } from "./analytics-page.ts";
import { AppsPage } from "./apps-page.ts";
import {
  ActivityPage,
  CorpusAuditPage,
  PlatformPromptsPage,
} from "./console-views-pages.ts";
import { FeaturesPage } from "./features-page.ts";
import { HomePage } from "./home-page.ts";
import { JoinPage } from "./join-page.ts";
import { MarketplacePage } from "./marketplace-page.ts";
import { MarketplaceSettingsPage } from "./marketplace-settings-page.ts";
import type { PageObjectClass } from "./page-object.ts";
import { PlatformAccessPage } from "./platform-access-page.ts";
import { PlatformDataPage } from "./platform-data-page.ts";
import { PlatformRolesPage } from "./platform-roles-page.ts";
import { ProfilePage } from "./profile-page.ts";
import { PromptsPage } from "./prompts-page.ts";
import { ResourcesPage } from "./resources-page.ts";
import { SelfTestPage } from "./self-test-page.ts";
import { SignInPage } from "./sign-in-page.ts";
import { TeamMembersPage } from "./team-members-page.ts";
import {
  TeamActivityPage,
  TeamModelsPage,
  TeamParametersPage,
} from "./team-sections-pages.ts";
import { TermsPage } from "./terms-page.ts";
import { UserInterfacePage } from "./user-interface-page.ts";
import { WikiPage } from "./wiki-page.ts";

// Every page object and component the `pages` of one browser page hold, by
// name. Adding one is one entry here; nothing else changes.
const registry = {
  signIn: SignInPage,
  terms: TermsPage,
  home: HomePage,
  accountMenu: AccountMenu,
  profile: ProfilePage,
  navigation: MainNavigation,
  space: SpaceNavigation,
  resources: ResourcesPage,
  prompts: PromptsPage,
  agents: AgentsPage,
  chat: ChatPage,
  wiki: WikiPage,
  marketplace: MarketplacePage,
  apps: AppsPage,
  teamSettings: TeamSettings,
  teamMembers: TeamMembersPage,
  teamParameters: TeamParametersPage,
  teamActivity: TeamActivityPage,
  teamModels: TeamModelsPage,
  analytics: AnalyticsPage,
  adminConsole: AdminConsole,
  adminTeams: AdminTeamsPage,
  platformRoles: PlatformRolesPage,
  activity: ActivityPage,
  corpusAudit: CorpusAuditPage,
  platformPrompts: PlatformPromptsPage,
  userInterface: UserInterfacePage,
  join: JoinPage,
  announcements: AnnouncementsPage,
  features: FeaturesPage,
  marketplaceSettings: MarketplaceSettingsPage,
  platformData: PlatformDataPage,
  selfTest: SelfTestPage,
  platformAccess: PlatformAccessPage,
} satisfies Record<string, PageObjectClass>;

type Registry = typeof registry;

/** A page object's or component's name in the `pages` of one browser page. */
type PageName = keyof Registry;

/** The page objects and components of one browser page, by name. */
export type Pages = { readonly [N in PageName]: InstanceType<Registry[N]> };

/**
 * The page objects and components of one browser page: each a property,
 * created on first use and kept for the page.
 */
export function createPages(page: Page): Pages {
  const pages = {};
  for (const [name, PageObject] of Object.entries(registry)) {
    let created: object | undefined;
    Object.defineProperty(pages, name, {
      enumerable: true,
      get: () => (created ??= new PageObject(page)),
    });
  }
  return pages as Pages;
}
