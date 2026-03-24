import { access } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

describe("skill bundle", () => {
  it("includes the expected skill files", async () => {
    await expect(
      access("skills/hubspot-page-builder/SKILL.md"),
    ).resolves.toBeUndefined();
    await expect(
      access("skills/hubspot-page-builder/references/cli-contract.md"),
    ).resolves.toBeUndefined();
    await expect(
      access("skills/hubspot-page-builder/scripts/doctor.sh"),
    ).resolves.toBeUndefined();
  });

  it("doctor.sh fails with a readable message when the command is unavailable", async () => {
    try {
      await execFileAsync("bash", ["skills/hubspot-page-builder/scripts/doctor.sh"], {
        env: {
          HOME: process.cwd(),
          PATH: "/usr/bin:/bin",
        },
      });
      throw new Error("Expected doctor.sh to fail");
    } catch (error) {
      expect(isExecResult(error)).toBe(true);
      if (!isExecResult(error)) {
        throw error;
      }

      expect(error.stdout).toContain("hubspot-page-builder command not found");
    }
  });
});

function isExecResult(
  value: unknown,
): value is { stdout: string; stderr: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "stdout" in value &&
    typeof value.stdout === "string" &&
    "stderr" in value &&
    typeof value.stderr === "string"
  );
}
