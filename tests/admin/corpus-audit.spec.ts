// Corpus audit: a platform admin checks that the documents' records, the
// content store and the vector store agree, and repairs the documents whose
// processing status is stale. Source: Help Center, "Platform
// administration"; the audit's result, "Repair documents" and the repair of
// the corpus come from the technical console.
import { test } from "../../e2e-framework/fixtures/test.ts";

test.describe("Corpus audit", () => {
  test.describe("A platform admin sees the result of the corpus audit", () => {
    test('A platform admin sees the audit result and "Repair documents"', async ({
      admin,
    }) => {
      await test.step('admin opens the console section "Corpus audit"', () =>
        admin.flows.openConsoleSection("Corpus audit"));
      await test.step('admin sees that the audit found anomalies or that the stores are in sync, and "Repair documents"', () =>
        admin.pages.corpusAudit.expectResult());
    });
  });

  test.describe("A platform admin repairs the corpus", () => {
    test.fixme("Repaired documents pass the next audit", () => {
      // Planned: a repair of the corpus cannot be put back.
      // admin opens the console section "Corpus audit" and sees a document whose processing status is stale
      // admin repairs the documents with "Repair documents"
      // admin opens the console section "Corpus audit" again and sees that the audit finds no anomaly
    });
  });
});
