import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SettingsError } from "../../e2e-framework/config/settings-error.ts";
import type { EnvConfig } from "../../e2e-framework/config/settings.ts";
import { loadServiceConfig } from "./config.ts";

const valid = {
  CONTROL_PLANE_URL: "http://control-plane.example.test:8222/",
};

const envConfig: EnvConfig = {
  fredBaseUrl: "http://fred.example.test",
  workers: 1,
  browser: "chromium",
  testTimeout: 120_000,
  expectTimeout: 15_000,
  factoryFixtureTimeout: 120_000,
  excludeTags: [],
};

describe("service settings", () => {
  it("reads the settings with their defaults", () => {
    assert.deepEqual(loadServiceConfig(valid, envConfig), {
      controlPlaneUrl: "http://control-plane.example.test:8222",
      fredUrl: "http://fred.example.test",
      runsDir: "/runs",
      keepRuns: 10,
      port: 8080,
      workers: { default: 1, max: 2 },
      stopGraceMs: 750_000,
    });
  });

  it("takes the workers' default and the stop grace from env-config.json", () => {
    const config = loadServiceConfig(
      { ...valid, RUNS_DIR: "/data/runs" },
      { ...envConfig, workers: 2, factoryFixtureTimeout: 60_000 },
    );
    assert.deepEqual(config.workers, { default: 2, max: 2 });
    assert.equal(config.stopGraceMs, 570_000);
    assert.equal(config.runsDir, "/data/runs");
  });

  it("names every missing or wrong variable in one error, and no value", () => {
    assert.throws(
      () =>
        loadServiceConfig(
          {
            KEEP_RUNS: "value-0",
            PORT: "70000",
          },
          { ...envConfig, workers: 3 },
        ),
      (error: unknown) => {
        assert.ok(error instanceof SettingsError);
        for (const name of [
          "CONTROL_PLANE_URL",
          "env-config.json",
          "KEEP_RUNS",
          "PORT",
        ])
          assert.match(error.message, new RegExp(name));
        assert.doesNotMatch(error.message, /value-0|70000/);
        return true;
      },
    );
  });

  it("needs an http control plane", () => {
    assert.throws(
      () =>
        loadServiceConfig(
          { CONTROL_PLANE_URL: "ftp://control-plane" },
          envConfig,
        ),
      /^SettingsError: CONTROL_PLANE_URL must be a full http or https address\.$/,
    );
  });
});
