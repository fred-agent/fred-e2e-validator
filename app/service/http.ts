import { createReadStream, statSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { pipeline } from "node:stream";

const MAX_BODY_BYTES = 16 * 1024;

/** A refusal: its status, a stable code and a message a user can act on. */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function notFound(
  what = "Nothing is served at this address.",
): HttpError {
  return new HttpError(404, "not_found", what);
}

export function sendJson(
  res: ServerResponse,
  status: number,
  body: unknown,
): void {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(body));
}

export function sendError(res: ServerResponse, error: HttpError): void {
  sendJson(res, error.status, {
    detail: { code: error.code, message: error.message },
  });
}

export function sendText(res: ServerResponse, text: string): void {
  res.writeHead(200, {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(text);
}

/** Streams a file that exists; the caller has checked it. */
export function sendFile(
  res: ServerResponse,
  file: string,
  headers: Readonly<Record<string, string>>,
): void {
  // A client that left while its access was checked gets nothing.
  if (res.destroyed) return;
  res.writeHead(200, {
    ...headers,
    "content-length": String(statSync(file).size),
  });
  // Closes the file too when the client goes away.
  pipeline(createReadStream(file), res, (error) => {
    if (error && error.code !== "ERR_STREAM_PREMATURE_CLOSE")
      console.error("The file transfer failed.");
  });
}

/** The request's JSON body, at most 16 KiB; an empty body is `{}`. */
export async function readJson(req: IncomingMessage): Promise<unknown> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req as AsyncIterable<Buffer>) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES)
      throw new HttpError(413, "body_too_large", "The request is too large.");
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (text === "") return {};
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    throw new HttpError(400, "invalid_json", "The request is not valid JSON.");
  }
}
