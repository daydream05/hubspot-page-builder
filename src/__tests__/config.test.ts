import { describe, expect, it } from "vitest";

import { resolveRuntimeConfig } from "../config.js";

describe("resolveRuntimeConfig", () => {
  it("prefers flags over env and config file", async () => {
    const config = await resolveRuntimeConfig({
      flags: {
        accessToken: "flag-token",
        portalId: "flag-portal",
        defaultTemplatePath: "flag-template",
        configPath: "/tmp/config.json",
      },
      env: {
        HUBSPOT_ACCESS_TOKEN: "env-token",
        HUBSPOT_PORTAL_ID: "env-portal",
        HUBSPOT_DEFAULT_TEMPLATE_PATH: "env-template",
      },
      readConfigFile: async () => ({
        accessToken: "file-token",
        portalId: "file-portal",
        defaultTemplatePath: "file-template",
      }),
      homedir: "/Users/tester",
    });

    expect(config.accessToken).toBe("flag-token");
    expect(config.portalId).toBe("flag-portal");
    expect(config.defaultTemplatePath).toBe("flag-template");
    expect(config.configPath).toBe("/tmp/config.json");
  });

  it("falls back to the default config path and requires a token", async () => {
    await expect(
      resolveRuntimeConfig({
        flags: {},
        env: {},
        readConfigFile: async () => ({}),
        homedir: "/Users/tester",
      }),
    ).rejects.toThrow("HUBSPOT_ACCESS_TOKEN is required");
  });
});
