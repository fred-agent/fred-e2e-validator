// Each parallel worker uses a separate set of synthetic accounts. The first
// set uses unsuffixed field names. Later sets append their set number.
import type { Environment } from "./environment.ts";
import { SettingsError } from "./settings-error.ts";

export const ACCOUNT_NAMES = [
  "admin",
  "member",
  "secondUser",
  "outsider",
] as const;
export type AccountName = (typeof ACCOUNT_NAMES)[number];

/** The account that administers the platform and creates temporary teams. */
export const PLATFORM_ADMIN: AccountName = "admin";

export type Account = Readonly<{
  name: AccountName;
  username: string;
  password: string;
  email: string;
}>;

const FIELDS = ["USERNAME", "PASSWORD", "EMAIL"] as const;
type Field = (typeof FIELDS)[number];

/** An account's name in upper snake case, as its variables carry it: SECOND_USER. */
const upperSnake = (name: AccountName) =>
  name.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase();

/** The variable of one field of one account in a set; sets count from 1. */
export function accountVariable(
  name: AccountName,
  field: Field,
  setNumber: number,
): string {
  const suffix = setNumber === 1 ? "" : `_${setNumber}`;
  return `ACCOUNT_${upperSnake(name)}_${field}${suffix}`;
}

const NAMES = ACCOUNT_NAMES.map(upperSnake).join("|");

const ACCOUNT_VARIABLE = new RegExp(
  `^ACCOUNT_(${NAMES})_(${FIELDS.join("|")})(_([2-9]|[1-9][0-9]+))?$`,
);

/** Whether a key is the variable of a field of an account in some set. */
export function isAccountVariable(key: string): boolean {
  return ACCOUNT_VARIABLE.test(key);
}

export const INCOMPLETE_ACCOUNTS = "A required test account is incomplete.";

export function hasCompleteAccountSets(
  workers: number,
  env: Environment,
): boolean {
  for (let set = 1; set <= workers; set++)
    for (const name of ACCOUNT_NAMES)
      if (
        FIELDS.some((field) => !env[accountVariable(name, field, set)]?.trim())
      )
        return false;
  return true;
}

/** The accounts of one account set, by the names tests use. */
export class AccountSet {
  readonly number: number;
  private readonly env: Environment;

  constructor(setNumber: number, env: Environment) {
    this.number = setNumber;
    this.env = env;
  }

  get(name: AccountName): Account {
    const read = (field: Field) =>
      this.env[accountVariable(name, field, this.number)]?.trim() ?? "";
    if (FIELDS.some((field) => !read(field)))
      throw new SettingsError([INCOMPLETE_ACCOUNTS]);
    return Object.freeze({
      name,
      username: read("USERNAME"),
      password: read("PASSWORD"),
      email: read("EMAIL"),
    });
  }
}
