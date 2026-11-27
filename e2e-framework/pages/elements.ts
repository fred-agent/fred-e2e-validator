import type { Locator, Page } from "@playwright/test";

/** A page's main heading, level 1, by its exact name, such as a console section's title. */
export function pageHeading(page: Page, name: string): Locator {
  return page.getByRole("heading", { level: 1, name, exact: true });
}
