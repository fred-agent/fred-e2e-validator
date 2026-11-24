// The files the tests upload: those of `test-data/uploads/`, each named in
// the union `UploadFile`, whose path `uploadPath` resolves from the
// project's folder.
import { join } from "node:path";
import { PROJECT_ROOT } from "./environment.ts";

/** The document list uses the uploaded file's original name. */
export type UploadFile = "e2e-sample.txt" | "e2e-table.csv";

const UPLOADS_FOLDER = join(PROJECT_ROOT, "test-data", "uploads");

/** The path of a file the tests upload. */
export function uploadPath(file: UploadFile): string {
  return join(UPLOADS_FOLDER, file);
}
