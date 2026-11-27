// The files the tests upload: those of `test-data/uploads/`, each named in
// the union `UploadFile` or `PictureFile`, whose paths are resolved from the
// project's folder. `changed/` holds a file of the same name and another size
// for each document.
import { statSync } from "node:fs";
import { join } from "node:path";
import { PROJECT_ROOT } from "./environment.ts";

/** A document. The document list uses the uploaded file's original name. */
export type UploadFile = "e2e-sample.txt" | "e2e-table.csv";

/** A document's content: the original one or the one that replaces it. */
export type UploadVersion = "original" | "changed";

/** A profile picture. */
export type PictureFile = "e2e-picture.png";

const UPLOADS_FOLDER = join(PROJECT_ROOT, "test-data", "uploads");

/** The path of a document the tests upload. */
export function uploadPath(
  file: UploadFile,
  version: UploadVersion = "original",
): string {
  return version === "original"
    ? join(UPLOADS_FOLDER, file)
    : join(UPLOADS_FOLDER, "changed", file);
}

/** The size of a document in bytes. */
export function uploadSize(file: UploadFile, version: UploadVersion): number {
  return statSync(uploadPath(file, version)).size;
}

/** The path of a picture the tests import. */
export function picturePath(file: PictureFile): string {
  return join(UPLOADS_FOLDER, file);
}
