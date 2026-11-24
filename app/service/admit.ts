// The control plane verifies the caller's bearer token and returns the
// applications available to the requested team on each request.
import { APP_ID } from "../app-id.ts";

/** Why a call is refused: its HTTP status, a stable code and a message. */
export type Refusal = Readonly<{
  status: number;
  code: string;
  message: string;
}>;

/** Resolves to undefined when the call is admitted. */
export type Admit = (
  authorization: string | undefined,
  team: string,
) => Promise<Refusal | undefined>;

/** This alias identifies the caller's personal space. Only teams can receive grants. */
const PERSONAL_TEAM = "personal";
const TIMEOUT_MS = 10_000;

const AUTHENTICATION_REQUIRED: Refusal = {
  status: 401,
  code: "authentication_required",
  message: "A valid Authorization Bearer token is required.",
};
const NOT_GRANTED: Refusal = {
  status: 403,
  code: "application_not_granted",
  message:
    "Your team does not have access to the end-to-end tests application.",
};
const UNAVAILABLE: Refusal = {
  status: 503,
  code: "control_plane_unavailable",
  message: "The Control Plane is temporarily unavailable. Try again later.",
};
const INVALID_RESPONSE: Refusal = {
  status: 502,
  code: "control_plane_invalid_response",
  message: "The Control Plane returned an unexpected response.",
};
const UPSTREAM: Readonly<Record<number, Refusal>> = {
  401: {
    status: 401,
    code: "control_plane_authentication_failed",
    message: "Your session could not be verified. Please sign in again.",
  },
  403: {
    status: 403,
    code: "target_forbidden",
    message: "You do not have permission to use this application in this team.",
  },
  404: {
    status: 404,
    code: "target_not_found",
    message: "This team or its application no longer exists.",
  },
  409: {
    status: 409,
    code: "target_unavailable",
    message: "This application is currently disabled or unavailable.",
  },
  422: {
    status: 422,
    code: "target_invalid",
    message: "The request for this application could not be prepared.",
  },
};

const BEARER = /^Bearer \S+$/i;

/** A status that is not a success: mapped, a 5xx, or anything else (a 3xx too). */
function refusalFor(status: number): Refusal {
  return (
    UPSTREAM[status] ??
    (status >= 500 && status < 600 ? UNAVAILABLE : INVALID_RESPONSE)
  );
}

/** The ids of `{ items: [{ id }] }`, or undefined for any other shape. */
function grantedIds(body: unknown): string[] | undefined {
  if (typeof body !== "object" || body === null || !("items" in body))
    return undefined;
  const { items } = body;
  if (!Array.isArray(items)) return undefined;
  const ids: string[] = [];
  for (const item of items as unknown[]) {
    if (typeof item !== "object" || item === null || !("id" in item))
      return undefined;
    ids.push(String(item.id));
  }
  return ids;
}

/**
 * fetch rejects with a TypeError when no connection is made, and with a
 * TimeoutError when the signal's time is up; both mean no answer.
 */
function noAnswer(error: unknown): boolean {
  return (
    error instanceof TypeError ||
    (error instanceof DOMException && error.name === "TimeoutError")
  );
}

export function createAdmit(
  controlPlaneUrl: string,
  timeoutMs: number = TIMEOUT_MS,
): Admit {
  return async (authorization, team) => {
    if (authorization === undefined || !BEARER.test(authorization))
      return AUTHENTICATION_REQUIRED;
    if (team === PERSONAL_TEAM) return NOT_GRANTED;
    const address = `${controlPlaneUrl}/control-plane/v1/teams/${encodeURIComponent(team)}/applications`;
    try {
      const response = await fetch(address, {
        headers: { authorization },
        redirect: "manual",
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.status < 200 || response.status > 299) {
        await response.body?.cancel();
        return refusalFor(response.status);
      }
      const ids = grantedIds(await response.json());
      if (!ids) return INVALID_RESPONSE;
      return ids.includes(APP_ID) ? undefined : NOT_GRANTED;
    } catch (error) {
      if (noAnswer(error)) return UNAVAILABLE;
      if (error instanceof SyntaxError) return INVALID_RESPONSE;
      throw error;
    }
  };
}
