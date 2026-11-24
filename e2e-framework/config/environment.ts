import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";
import { isAccountVariable } from "./accounts.ts";
import { SettingsError } from "./settings-error.ts";

export type Environment = Readonly<Record<string, string | undefined>>;

/** The repository's root folder, where `.env` and `env-config.json` live. */
export const PROJECT_ROOT = join(import.meta.dirname, "..", "..");

export function loadDotEnv(root: string = PROJECT_ROOT): void {
  const file = join(root, ".env");
  if (!existsSync(file)) return;
  let values: ReturnType<typeof parseEnv>;
  try {
    values = parseEnv(readFileSync(file, "utf8"));
  } catch {
    throw new SettingsError(["Account configuration could not be read."]);
  }
  if (Object.keys(values).some((key) => !isAccountVariable(key)))
    throw new SettingsError([
      "Account configuration contains an unsupported setting.",
    ]);
  for (const [key, value] of Object.entries(values))
    if (process.env[key] === undefined) process.env[key] = value;
}
