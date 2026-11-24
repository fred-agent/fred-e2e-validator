// Step titles format method arguments individually. Account objects contribute
// only the fixture name and synthetic username.
import { relative, sep } from "node:path";
import { PROJECT_ROOT } from "../config/environment.ts";

function isAccount(value: object): value is { name: string; username: string } {
  return (
    "name" in value &&
    typeof value.name === "string" &&
    "username" in value &&
    typeof value.username === "string" &&
    "password" in value
  );
}

// A path inside the project is shown from the project's folder, so a report
// does not carry the folders of the machine that ran it.
const fromProject = (text: string) =>
  text.startsWith(PROJECT_ROOT + sep) ? relative(PROJECT_ROOT, text) : text;

/**
 * One argument: text in quotes, a path inside the project from its folder, a
 * number or a boolean as written, an account by its name.
 */
export function showArgument(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(fromProject(value));
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (value === undefined || value === null) return String(value);
  if (typeof value === "object" && isAccount(value))
    return `${value.name} (${value.username})`;
  return "…";
}

export function stepTitle(method: string, args: readonly unknown[]): string {
  return `${method}(${args.map(showArgument).join(", ")})`;
}
