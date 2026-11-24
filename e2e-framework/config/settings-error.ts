// The error of a setting that is missing or wrong, in .env, env-config.json,
// test-data/test-data.json or the service's environment.

/** A setting that is missing or wrong; its message lists every problem. */
export class SettingsError extends Error {
  override name = "SettingsError";

  constructor(problems: readonly string[]) {
    super(problems.join("\n"));
  }
}
