import type { Page } from "@playwright/test";

export async function describePage(page: Page): Promise<string> {
  const [heading, alert] = await Promise.all(
    (["heading", "alert"] as const).map(async (role) =>
      page.getByRole(role).filter({ visible: true }).first().isVisible(),
    ),
  );
  const parts = ["open page"];
  if (heading) parts.push("heading visible");
  if (alert) parts.push("alert visible");
  return parts.join(" · ");
}
