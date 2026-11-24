// Team documents and roles: the Editor role decides who changes a team's
// documents; every member can read them. Source: Help Center,
// "Resources" and "Teams and permissions".
import { test, type TemporaryTeam } from "../../e2e-framework/fixtures/test.ts";

test.describe("Team documents and roles", () => {
  let team: TemporaryTeam;

  test.beforeEach(async ({ teams }) => {
    team =
      await test.step("admin creates a team in which admin also holds the Editor role, with secondUser as a member", () =>
        teams.create("documents", {
          members: ["secondUser"],
          roles: { admin: ["Editor"] },
        }));
  });

  test.describe("An editor adds documents to the team's resources", () => {
    test("A file stored by an editor is listed in a folder of the team", async ({
      admin,
      folders,
    }) => {
      const folder = await test.step("admin creates a folder in the team", () =>
        folders.create(admin, team, "team"));
      await test.step('admin uploads "e2e-sample.txt" into the folder without processing', async () => {
        await admin.flows.openFolder(folder);
        await admin.pages.resources.upload("e2e-sample.txt", "Upload only");
      });
      await test.step('admin sees "e2e-sample.txt" with the status "Pending"', () =>
        admin.pages.resources.expectStatus("e2e-sample.txt", "Pending"));
    });
  });

  test.describe("A member without the Editor role can only download the team's documents", () => {
    test('A reader sees only "Download" for a document', async ({
      admin,
      secondUser,
      folders,
    }) => {
      const folder = await test.step("admin creates a folder in the team", () =>
        folders.create(admin, team, "team"));
      await test.step('admin uploads "e2e-sample.txt" into the folder without processing', async () => {
        await admin.flows.openFolder(folder);
        await admin.pages.resources.upload("e2e-sample.txt", "Upload only");
      });
      await test.step("secondUser opens the resources of the team as a member", () =>
        secondUser.flows.openResourcesAsMember(team));
      await test.step('secondUser reloads the resources, opens the folder and sees only "Download" in the "More actions" of "e2e-sample.txt"', () =>
        secondUser.pages.resources.reloadAndExpectDocumentActions(
          folder.name,
          "e2e-sample.txt",
          ["Download"],
        ));
    });

    test('A reader does not see "New folder" or "Add files"', async ({
      secondUser,
    }) => {
      await test.step("secondUser opens the resources of the team as a member", () =>
        secondUser.flows.openResourcesAsMember(team));
      await test.step('secondUser reloads the resources and does not see "New folder"', () =>
        secondUser.pages.resources.reloadAndExpectButtonAbsent("New folder"));
      await test.step('secondUser reloads the resources and does not see "Add files"', () =>
        secondUser.pages.resources.reloadAndExpectButtonAbsent("Add files"));
    });
  });
});
