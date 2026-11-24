// Each page object maps the visible button labels to private locators. Both
// visibility checks use that same map.
import { expect, type Locator } from "@playwright/test";

/** Expects a button to show. */
export async function expectButtonVisible(button: Locator): Promise<void> {
  await expect(button).toBeVisible();
}

/**
 * Runs a wait that ends once the part of the page that would hold the button
 * has loaded, then expects the button to be absent: a negated check on a page
 * that has not drawn its buttons yet would pass.
 */
export async function waitThenExpectButtonAbsent(
  button: Locator,
  wait: () => Promise<void>,
): Promise<void> {
  await wait();
  await expect(button).toHaveCount(0);
}
