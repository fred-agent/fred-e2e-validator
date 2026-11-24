// The host loads the embedded page before it can authorize API requests.
import { existsSync } from "node:fs";
import type { ServerResponse } from "node:http";
import { extname, join } from "node:path";
import { notFound, sendFile } from "./http.ts";

const ASSET = /^\/assets\/[A-Za-z0-9._-]+$/;
const TYPES: Readonly<Record<string, string>> = {
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

/** Serves the entry page at the mount point and built assets beneath it. */
export function servePage(
  uiDir: string,
  rest: string,
  res: ServerResponse,
): void {
  if (rest === "" || rest === "/") {
    const index = join(uiDir, "index.html");
    if (!existsSync(index)) throw notFound("The page is not built.");
    return sendFile(res, index, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    });
  }
  const type = TYPES[extname(rest)];
  const file = join(uiDir, rest);
  if (!ASSET.test(rest) || !type || !existsSync(file)) throw notFound();
  sendFile(res, file, {
    "content-type": type,
    // A file named by its content never changes.
    "cache-control": "public, max-age=31536000, immutable",
  });
}
