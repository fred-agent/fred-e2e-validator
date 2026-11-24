// Announcements: a platform admin writes the banners shown at the top of the
// app and the patch notes that announce an update, and reviews their
// activations. Source: Help Center, "Platform administration", which
// says that a saved banner is shown to users, and "First steps", whose
// "What's new" presents the announced patch notes; the new banner form,
// whose "Save" needs a title and a short description, a banner turned off,
// edited or deleted, the order of the announced patch notes and a withdrawn
// announcement come from the technical console.
import { test } from "../../e2e-framework/fixtures/test.ts";

test.describe("Announcements", () => {
  test.describe("A platform admin reviews patch notes, their history and banners", () => {
    for (const kind of ["Patch notes", "History", "Banners"] as const) {
      test.fixme(`A platform admin sees the announcements of the kind "${kind}"`, () => {
        // Planned: these UI tests cannot independently read the stored records for comparison.
        // admin opens the console section "Announcements" and chooses the view of the kind
        // admin sees one entry for each announcement of the kind, or the text for none
      });
    }
  });

  test.describe("A banner needs content before it can be saved", () => {
    test("A platform admin cannot save an empty banner", async ({ admin }) => {
      await test.step('admin opens the console section "Announcements"', () =>
        admin.flows.openConsoleSection("Announcements"));
      await test.step('admin opens "New banner", sees the empty form with "Save" disabled and cancels it', () =>
        admin.pages.announcements.openExpectEmptyBannerAndCancel());
    });
  });

  test.describe("A saved banner is shown to users", () => {
    test.fixme("A user sees a banner a platform admin saved", () => {
      // Planned: shows a change to every user.
      // admin saves a banner in the console section "Announcements" and shows it to users
      // secondUser loads the home page and sees the banner
    });
  });

  test.describe("Announced patch notes are shown to users", () => {
    test.fixme("A user sees the patch notes of the last announcement", () => {
      // Planned: shows a change to every user.
      // admin includes a patch note in the next announcement in the console section "Announcements"
      // admin announces the update
      // secondUser opens "What's new" and sees the patch note
    });
  });

  test.describe("A banner turned off is no longer shown to users", () => {
    test.fixme("A user no longer sees a banner a platform admin turned off", () => {
      // Planned: shows a change to every user.
      // admin saves a banner in the console section "Announcements" and shows it to users
      // admin turns the banner off
      // secondUser loads the home page and does not see the banner
    });
  });

  test.describe("An edited banner shows its new text to users", () => {
    test.fixme("A user sees the new text of an edited banner", () => {
      // Planned: shows a change to every user.
      // admin saves a banner in the console section "Announcements" and shows it to users
      // admin changes the short description of the banner
      // secondUser loads the home page and sees the new short description in the banner
    });
  });

  test.describe("A deleted banner is no longer shown to users", () => {
    test.fixme("A user no longer sees a deleted banner", () => {
      // Planned: shows a change to every user.
      // admin saves a banner in the console section "Announcements" and shows it to users
      // admin deletes the banner
      // secondUser loads the home page and does not see the banner
    });
  });

  test.describe("Users see the announced patch notes in the order the platform admin set", () => {
    test.fixme("A patch note moved to the top is shown first", () => {
      // Planned: shows a change to every user.
      // admin includes two patch notes in the next announcement in the console section "Announcements"
      // admin moves the second patch note to the top
      // admin announces the update
      // secondUser opens "What's new" and sees the second patch note first
    });
  });

  test.describe("A withdrawn announcement leaves What's new empty", () => {
    test.fixme("A user sees no patch note once the announcement is withdrawn", () => {
      // Planned: shows a change to every user.
      // admin announces a patch note in the console section "Announcements"
      // admin withdraws the current announcement
      // secondUser opens "What's new" and sees no patch note
    });
  });
});
