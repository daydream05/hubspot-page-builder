import { homedir as defaultHomeDir } from "node:os";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { RuntimeConfig, StoredConfig } from "./types.js";

export interface ResolveRuntimeConfigOptions {
  flags: {
    accessToken?: string;
    portalId?: string;
    defaultTemplatePath?: string;
    configPath?: string;
  };
  env?: Record<string, string | undefined>;
  readConfigFile?: (path: string) => Promise<StoredConfig>;
  homedir?: string;
  requireToken?: boolean;
}

export const DEFAULT_CONFIG_PATH_SUFFIX = ".hubspot-page-builder/config.json";

export function getDefaultConfigPath(homeDir = defaultHomeDir()): string {
  return `${homeDir}/${DEFAULT_CONFIG_PATH_SUFFIX}`;
}

export async function readStoredConfig(path: string): Promise<StoredConfig> {
  try {
    const contents = await readFile(path, "utf8");
    return JSON.parse(contents) as StoredConfig;
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "ENOENT"
    ) {
      return {};
    }

    throw error;
  }
}

export async function writeStoredConfig(
  path: string,
  config: StoredConfig,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

export async function resolveRuntimeConfig({
  flags,
  env = process.env,
  readConfigFile = readStoredConfig,
  homedir = defaultHomeDir(),
  requireToken = true,
}: ResolveRuntimeConfigOptions): Promise<RuntimeConfig> {
  const configPath = flags.configPath ?? getDefaultConfigPath(homedir);
  const fileConfig = await readConfigFile(configPath);

  const accessToken =
    flags.accessToken ??
    env.HUBSPOT_ACCESS_TOKEN ??
    fileConfig.accessToken ??
    undefined;
  const portalId =
    flags.portalId ?? env.HUBSPOT_PORTAL_ID ?? fileConfig.portalId ?? undefined;
  const defaultTemplatePath =
    flags.defaultTemplatePath ??
    env.HUBSPOT_DEFAULT_TEMPLATE_PATH ??
    fileConfig.defaultTemplatePath ??
    undefined;

  if (requireToken && !accessToken) {
    throw new Error("HUBSPOT_ACCESS_TOKEN is required.");
  }

  return {
    accessToken: accessToken ?? "",
    portalId,
    defaultTemplatePath,
    configPath,
  };
}
