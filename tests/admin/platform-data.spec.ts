// Platform data: a platform admin exports the platform's data, imports it
// from a migration file, and resets it. Source: Help Center, "Platform
// administration", which presents the export and import of the platform's
// state; the reset of the platform's data comes from the technical
// console.
import { test } from "../../e2e-framework/fixtures/test.ts";

test.describe("Platform data", () => {
  test.describe("A platform admin sees the export and import of platform data", () => {
    test('A platform admin sees "Export" and the import of a migration file', async ({
      admin,
    }) => {
      await test.step('admin opens the console section "Platform data"', () =>
        admin.flows.openConsoleSection("Platform data"));
      await test.step('admin sees "Export"', () =>
        admin.pages.platformData.expectButtonVisible("Export"));
      await test.step('admin sees the import of a migration file with its drop zone, "Label (optional)" and "Launch migration"', () =>
        admin.pages.platformData.expectMigrationImport());
    });
  });

  test.describe("A platform admin moves platform data between environments", () => {
    test.fixme("An export can be imported", () => {
      // Planned: exports, imports or resets platform data.
      // admin opens the console section "Platform data" and exports the platform's data
      // admin imports the exported file as a migration with "Launch migration"
      // admin sees the migration completed
    });
  });

  test.describe("A platform admin resets the platform's data", () => {
    test.fixme("A reset platform holds no data of the reset kind", () => {
      // Planned: exports, imports or resets platform data.
      // admin opens the console section "Platform data" and resets the platform's agents
      // admin sees no agent in the platform's data
    });
  });
});
