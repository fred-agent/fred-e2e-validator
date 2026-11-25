import { expect, type Locator, type Page } from "@playwright/test";
import { step } from "../pages/step.ts";
import { startingWith } from "./text-patterns.ts";

/** The sections of the agent form, in its "Form sections" radio group. */
type Section = "General" | "Prompts" | "Capabilities" | "Commitments";

/**
 * The capabilities a test turns on or looks for in the agent form, by the
 * title of their switch in the section "Capabilities".
 */
export type AgentCapability =
  | "Attachments"
  | "Team documents"
  | "Access to the team wiki"
  | "Generate a Word document"
  | "Generate a presentation"
  | "Generate a web page (HTML/CSS)";

/** A capability the "Advanced" view adds, by its title. */
export type AdvancedCapability = "Search documents by label";

/** What an agent may do in the wiki, by the labels of the choices. */
export type WikiMode = "Read only" | "Read and propose";

/** The capability whose options restrict an agent to chosen folders. */
const TEAM_DOCUMENTS: AgentCapability = "Team documents";

/** The models of an agent: the team's default, and those the team may use. */
const DEFAULT_MODEL = "Team default model";

/**
 * The agent form, a dialog for a new agent ("Create a new Agent") or for an
 * edit ("Edit <agent>"). Its template cards, capability switches and the
 * switch that restricts an agent to folders are named by their title
 * followed by their description, so they are matched by how their name
 * starts; a required field's label ends with " *". Every capability of a new
 * agent starts off.
 */
export class AgentForm {
  static readonly displayName = "Agent form";
  private readonly page: Page;
  private readonly dialog: Locator;
  private readonly sections: Locator;
  private readonly name: Locator;
  private readonly description: Locator;
  private readonly useCase: Locator;
  private readonly submit: Locator;
  private readonly cancel: Locator;
  private readonly incomplete: Locator;
  private readonly restrictToFolders: Locator;
  private readonly restrictToFoldersLabel: Locator;
  private readonly capabilitiesHeading: Locator;
  private readonly capabilitySwitches: Locator;
  // The options of "Access to the team wiki" and "Generate a presentation".
  private readonly wikiMode: Locator;
  private readonly planValidation: Locator;
  private readonly planValidationLabel: Locator;
  // A styled switch over a native checkbox, turned on through its label.
  private readonly advancedView: Locator;
  private readonly advancedViewLabel: Locator;
  private readonly recommendedModel: Locator;
  // What a select of the form opens.
  private readonly choices: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByRole("dialog", {
      name: /^(Create a new Agent|Edit .+)$/,
    });
    this.sections = this.dialog.getByRole("radiogroup", {
      name: "Form sections",
      exact: true,
    });
    this.name = this.dialog.getByRole("textbox", {
      name: "Name *",
      exact: true,
    });
    this.description = this.dialog.getByRole("textbox", {
      name: "Description",
      exact: true,
    });
    this.useCase = this.dialog.getByRole("textbox", {
      name: "Use case *",
      exact: true,
    });
    this.submit = this.dialog.getByRole("button", { name: /^(Create|Save)$/ });
    this.cancel = this.dialog.getByRole("button", {
      name: "Cancel",
      exact: true,
    });
    this.incomplete = this.dialog
      .getByRole("alert")
      .filter({ hasText: "Complete the fields marked with * before saving." });
    this.restrictToFolders = this.dialog.getByRole("checkbox", {
      name: startingWith("Restrict to specific folders"),
    });
    this.restrictToFoldersLabel = this.dialog.getByText(
      "Restrict to specific folders",
      { exact: true },
    );
    // The capability switches appear together after the selected template's
    // capabilities for the team load. The first visible switch signals that
    // the whole set is ready.
    this.capabilitiesHeading = this.dialog.getByRole("heading", {
      level: 2,
      name: "Turn on capabilities for your agent",
      exact: true,
    });
    this.capabilitySwitches = this.dialog.getByRole("switch");
    this.wikiMode = this.dialog.getByRole("button", {
      name: "What the agent may do",
      exact: true,
    });
    this.planValidation = this.dialog.getByRole("checkbox", {
      name: startingWith("Validate the plan before building"),
    });
    this.planValidationLabel = this.dialog.getByText(
      "Validate the plan before building",
      { exact: true },
    );
    this.advancedView = this.dialog.getByRole("checkbox", {
      name: "Advanced capabilities view",
      exact: true,
    });
    this.advancedViewLabel = this.dialog.getByText("Advanced", { exact: true });
    this.recommendedModel = this.dialog.getByRole("button", {
      name: "Recommended model",
      exact: true,
    });
    this.choices = page.getByRole("listbox");
  }

  /** A template card, named by its display name followed by its description. */
  private template(name: string): Locator {
    return this.dialog.getByRole("button", { name: startingWith(name) });
  }

  /** A capability's switch, named by its title followed by its description. */
  private capability(title: AgentCapability): Locator {
    return this.dialog.getByRole("switch", { name: startingWith(title) });
  }

  /**
   * A folder's checkbox in the folder list of "Team documents". It depends
   * on structure: the checkbox has no name of its own, so it is found in the
   * folder's own item, inside the list that the capability's item holds; the
   * inner locator of a filter is looked up inside each item, so it starts
   * from the page.
   */
  private folder(name: string): Locator {
    return this.dialog
      .getByRole("listitem")
      .filter({
        has: this.page.getByRole("switch", {
          name: startingWith(TEAM_DOCUMENTS),
        }),
      })
      .getByRole("list")
      .getByRole("listitem")
      .filter({ has: this.page.getByText(name, { exact: true }) })
      .getByRole("checkbox");
  }

  private async goTo(section: Section): Promise<void> {
    const choice = this.sections.getByRole("radio", {
      name: section,
      exact: true,
    });
    await choice.click();
    await expect(choice).toBeChecked();
  }

  /** Turns a capability on that is off, as every capability of a new agent starts. */
  private async turnOn(capability: AgentCapability): Promise<void> {
    const toggle = this.capability(capability);
    await expect(toggle).not.toBeChecked();
    await toggle.click();
    await expect(toggle).toBeChecked();
  }

  /** Chooses the template of a new agent; the form then shows its fields. */
  @step
  async chooseTemplate(template: string): Promise<void> {
    await this.template(template).click();
    await expect(this.name).toBeVisible();
  }

  /** Expects the form of an existing agent, filled in with its own name. */
  @step
  async expectEditing(agent: string): Promise<void> {
    await expect(this.dialog).toHaveAccessibleName(`Edit ${agent}`);
    await this.goTo("General");
    await expect(this.name).toHaveValue(agent);
  }

  @step
  async fillName(name: string): Promise<void> {
    await this.goTo("General");
    await this.name.fill(name);
  }

  @step
  async fillDescription(description: string): Promise<void> {
    await this.goTo("General");
    await this.description.fill(description);
  }

  @step
  async expectDescription(description: string): Promise<void> {
    await this.goTo("General");
    await expect(this.description).toHaveValue(description);
  }

  @step
  async fillUseCase(useCase: string): Promise<void> {
    await this.goTo("Commitments");
    await this.useCase.fill(useCase);
  }

  /** Clicks "Create" or "Save"; the caller waits for the form to close. */
  @step
  async save(): Promise<void> {
    await this.submit.click();
  }

  /** The form closes after the agent has been saved. */
  @step
  async expectSaved(): Promise<void> {
    await expect(this.dialog).toBeHidden();
  }

  /**
   * An incomplete use case keeps the form open after "Create". The field is
   * marked invalid and explains that the starred fields are required.
   */
  @step
  async expectUseCaseMissing(): Promise<void> {
    await expect(this.incomplete).toBeVisible();
    await expect(this.useCase).toHaveAttribute("aria-invalid", "true");
  }

  /**
   * Restricts "Team documents" to one folder: the capability on, then its
   * switch "Restrict to specific folders", a styled switch over a native
   * checkbox that is turned on through its visible label, then the folder.
   * Both start off.
   */
  @step
  async restrictTo(folder: string): Promise<void> {
    await this.turnOnCapability(TEAM_DOCUMENTS);
    await expect(this.restrictToFolders).not.toBeChecked();
    await this.restrictToFoldersLabel.click();
    await expect(this.restrictToFolders).toBeChecked();
    await this.folder(folder).check();
    await expect(this.folder(folder)).toBeChecked();
  }

  /** Expects "Team documents" on, restricted to no folder. */
  @step
  async expectNotRestricted(): Promise<void> {
    await this.openCapabilities();
    await expect(this.capability(TEAM_DOCUMENTS)).toBeChecked();
    await expect(this.restrictToFolders).not.toBeChecked();
  }

  /** Expects "Team documents" on, restricted to this folder. */
  @step
  async expectRestrictedTo(folder: string): Promise<void> {
    await this.openCapabilities();
    await expect(this.capability(TEAM_DOCUMENTS)).toBeChecked();
    await expect(this.restrictToFolders).toBeChecked();
    await expect(this.folder(folder)).toBeChecked();
  }

  /**
   * Opens "Capabilities" and waits for its heading and switches. The switches
   * appear together once the template's capabilities for the team load.
   */
  @step
  async openCapabilities(): Promise<void> {
    await this.goTo("Capabilities");
    await expect(this.capabilitiesHeading).toBeVisible();
    await expect(this.capabilitySwitches.first()).toBeVisible();
  }

  @step
  async expectCapabilityListed(capability: AgentCapability): Promise<void> {
    await this.openCapabilities();
    await expect(this.capability(capability)).toBeVisible();
  }

  /** Expects no switch for a capability once the section shows its switches. */
  @step
  async expectCapabilityNotListed(capability: AgentCapability): Promise<void> {
    await this.openCapabilities();
    await expect(this.capability(capability)).toHaveCount(0);
  }

  /** Turns on a capability that is off. */
  @step
  async turnOnCapability(capability: AgentCapability): Promise<void> {
    await this.openCapabilities();
    await this.turnOn(capability);
  }

  /** Turns off a capability that is on. */
  @step
  async turnOffCapability(capability: AgentCapability): Promise<void> {
    await this.openCapabilities();
    const toggle = this.capability(capability);
    await expect(toggle).toBeChecked();
    await toggle.click();
    await expect(toggle).not.toBeChecked();
  }

  @step
  async expectCapabilityOn(capability: AgentCapability): Promise<void> {
    await this.openCapabilities();
    await expect(this.capability(capability)).toBeChecked();
  }

  @step
  async expectCapabilityOff(capability: AgentCapability): Promise<void> {
    await this.openCapabilities();
    await expect(this.capability(capability)).not.toBeChecked();
  }

  /** Chooses what the agent may do in the wiki, an option that shows while its capability is on. */
  @step
  async chooseWikiMode(mode: WikiMode): Promise<void> {
    await this.openCapabilities();
    await expect(
      this.wikiMode,
      `The form shows "${mode}" already, so choosing it changes nothing`,
    ).not.toContainText(mode);
    await this.wikiMode.click();
    await this.choices.getByRole("option", { name: mode, exact: true }).click();
    await this.expectWikiMode(mode);
  }

  @step
  async expectWikiMode(mode: WikiMode): Promise<void> {
    await this.openCapabilities();
    await expect(this.wikiMode).toContainText(mode);
  }

  /** Turns on that an agent shows its plan of a presentation first, which is off. */
  @step
  async turnOnPlanValidation(): Promise<void> {
    await expect(this.planValidation).not.toBeChecked();
    await this.planValidationLabel.click();
    await this.expectPlanValidationOn();
  }

  @step
  async expectPlanValidationOn(): Promise<void> {
    await expect(this.planValidation).toBeChecked();
  }

  /** Turns on the "Advanced" view of the open section "Capabilities". */
  @step
  async showAdvancedView(): Promise<void> {
    await expect(this.advancedView).not.toBeChecked();
    await this.advancedViewLabel.click();
    await expect(this.advancedView).toBeChecked();
  }

  @step
  async expectAdvancedCapabilityListed(
    capability: AdvancedCapability,
  ): Promise<void> {
    await expect(
      this.dialog.getByRole("checkbox", { name: capability, exact: true }),
    ).toBeVisible();
  }

  /** Opens the recommended models, expects the team's default first and closes them. */
  @step
  async expectDefaultModelFirst(): Promise<void> {
    await this.goTo("General");
    await this.recommendedModel.click();
    await expect(this.choices.getByRole("option").first()).toHaveAccessibleName(
      startingWith(DEFAULT_MODEL),
    );
    await this.page.keyboard.press("Escape");
    await expect(this.choices).toBeHidden();
  }

  /** Closes the form without saving. */
  @step
  async close(): Promise<void> {
    await this.cancel.click();
    await expect(this.dialog).toBeHidden();
  }
}
