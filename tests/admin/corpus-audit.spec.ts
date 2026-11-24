// Corpus audit: a platform admin checks that the documents' records, the
// content store and the vector store agree, and repairs the documents whose
// processing status is stale. Source: Help Center, "Platform
// administration"; the audit's result, "Repair documents" and the repair of
// the corpus come from the technical console.
import { test } from "../../e2e-framework/fixtures/test.ts";

test.describe("Corpus audit", () => {
  test.describe("A platform admin sees the result of the corpus audit", () => {
    test.fixme('A platform admin sees the audit result and "Repair documents"', () => {
      // Planned: these UI tests cannot independently read the stored records for comparison.
      // admin opens the console section "Corpus audit"
      // admin sees the anomalies the audit found, or that the stores are in sync, and "Repair documents"
    });
  });

  test.describe("A platform admin repairs the corpus", () => {
    test.fixme("Repaired documents pass the next audit", () => {
      // Planned: repairs the corpus.
      // admin opens the console section "Corpus audit" and sees a document whose processing status is stale
      // admin repairs the documents with "Repair documents"
      // admin opens the console section "Corpus audit" again and sees that the audit finds no anomaly
    });
  });
});
