import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin as processStdin, stdout as processStdout } from "node:process";

import {
  resolveRuntimeConfig,
  writeStoredConfig,
  type ResolveRuntimeConfigOptions,
} from "./config.js";
import { HubspotApiClient } from "./hubspot/client.js";
import { createPageBuilder } from "./page-builder.js";
import type { ResultEnvelope } from "./types.js";

export interface CliIo {
  stdin?: string;
  stdout: (value: string) => void;
  stderr: (value: string) => void;
  prompt?: (label: string) => Promise<string>;
}

interface RunCliDependencies {
  resolveConfig?: (
    options: ResolveRuntimeConfigOptions,
  ) => Promise<{
    accessToken: string;
    portalId?: string;
    defaultTemplatePath?: string;
    configPath?: string;
  }>;
  createService?: (config: {
    accessToken: string;
    portalId?: string;
    defaultTemplatePath?: string;
  }) => ReturnType<typeof createPageBuilder>;
}

export async function runCli(
  argv: string[],
  io: CliIo,
  deps: RunCliDependencies = {},
): Promise<number> {
  const resolveConfigImpl = deps.resolveConfig ?? resolveRuntimeConfig;
  const createServiceImpl =
    deps.createService ??
    ((config) =>
      createPageBuilder({
        client: new HubspotApiClient({
          accessToken: config.accessToken,
        }),
        portalId: config.portalId,
        defaultTemplatePath: config.defaultTemplatePath,
      }));

  try {
    const parsed = parseArgs(argv);

    if (!parsed.command || parsed.command === "help" || parsed.flags.help) {
      io.stdout(`${JSON.stringify({ success: true, data: { usage: usageText } })}\n`);
      return 0;
    }

    if (parsed.command === "init") {
      const flags = parseGlobalFlags(parsed.flags);
      const config = await resolveConfigImpl({
        flags,
        requireToken: false,
      });
      const token =
        flags.accessToken ??
        config.accessToken ??
        (await prompt(io, "HubSpot access token: "));

      if (!token) {
        throw new Error("HUBSPOT_ACCESS_TOKEN is required.");
      }

      const portalId =
        flags.portalId ??
        config.portalId ??
        (await optionalPrompt(io, "HubSpot portal ID (optional): "));
      const defaultTemplatePath =
        flags.defaultTemplatePath ??
        config.defaultTemplatePath ??
        (await optionalPrompt(io, "Default template path (optional): "));
      const configPath = flags.configPath ?? config.configPath;

      await writeStoredConfig(configPath, {
        accessToken: token,
        portalId: portalId || undefined,
        defaultTemplatePath: defaultTemplatePath || undefined,
      });

      return writeResult(
        io,
        {
          success: true,
          data: {
            configPath,
            portalId: portalId || null,
            defaultTemplatePath: defaultTemplatePath || null,
          },
        },
        0,
      );
    }

    const config = await resolveConfigImpl({
      flags: parseGlobalFlags(parsed.flags),
    });
    const service = createServiceImpl(config);

    switch (parsed.command) {
      case "get-account-info":
        return writeResult(io, { success: true, data: await service.getAccountInfo() }, 0);
      case "list-templates":
        return writeResult(io, { success: true, data: await service.listTemplates() }, 0);
      case "list-pages":
        return writeResult(
          io,
          {
            success: true,
            data: await service.listPages({
              status: coerceString(parsed.flags.status) as
                | "draft"
                | "published"
                | "all"
                | undefined,
              search: coerceString(parsed.flags.search),
              limit: coerceNumber(parsed.flags.limit),
              sort: coerceString(parsed.flags.sort),
            }),
          },
          0,
        );
      case "get-page":
        return writeResult(
          io,
          {
            success: true,
            data: await service.getPage(resolvePageReference(parsed)),
          },
          0,
        );
      case "create-page":
        return writeResult(
          io,
          {
            success: true,
            data: await service.createPage(await readJsonInput(parsed.flags.input, io)),
          },
          0,
        );
      case "update-page":
        return writeResult(
          io,
          {
            success: true,
            data: await service.updatePage(
              normalizePageReferenceInput(
                await readJsonInput(parsed.flags.input, io),
              ),
            ),
          },
          0,
        );
      case "publish-page":
        return writeResult(
          io,
          {
            success: true,
            data: await service.publishPage({
              pageId: resolvePageReference(parsed),
            }),
          },
          0,
        );
      case "preview-url":
        return writeResult(
          io,
          {
            success: true,
            data: await service.previewUrl({
              pageId: resolvePageReference(parsed),
            }),
          },
          0,
        );
      default:
        throw new Error(`Unknown command: ${parsed.command}`);
    }
  } catch (error) {
    return writeResult(
      io,
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : String(error),
        },
      },
      1,
    );
  }
}

const usageText = [
  "hubspot-page-builder <command> [options]",
  "Commands: init, get-account-info, list-templates, list-pages, get-page, create-page, update-page, publish-page, preview-url",
].join("\n");

function parseArgs(argv: string[]) {
  const [command, ...rest] = argv;
  const flags: Record<string, string | boolean> = {};
  const positionals: string[] = [];

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];

    if (!token) {
      continue;
    }

    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }

    const trimmed = token.slice(2);

    if (trimmed.includes("=")) {
      const [key, value] = trimmed.split("=", 2);
      flags[key] = value;
      continue;
    }

    const next = rest[index + 1];

    if (!next || next.startsWith("--")) {
      flags[trimmed] = true;
      continue;
    }

    flags[trimmed] = next;
    index += 1;
  }

  return { command, flags, positionals };
}

function parseGlobalFlags(flags: Record<string, string | boolean>) {
  return {
    accessToken: coerceString(flags["access-token"]),
    portalId: coerceString(flags["portal-id"]),
    defaultTemplatePath: coerceString(flags["default-template-path"]),
    configPath: coerceString(flags.config),
  };
}

function resolvePageReference(parsed: ReturnType<typeof parseArgs>): string {
  const pageId = coerceString(parsed.flags["page-id"]) ?? parsed.positionals[0];

  if (pageId) {
    return pageId;
  }

  const pageUrl = coerceString(parsed.flags["page-url"]);

  if (!pageUrl) {
    throw new Error("Missing required option: --page-id or --page-url");
  }

  return extractPageIdFromHubspotUrl(pageUrl);
}

function normalizePageReferenceInput(
  input: Record<string, unknown>,
): Record<string, unknown> {
  const pageId =
    typeof input.pageId === "string" && input.pageId
      ? input.pageId
      : typeof input.pageUrl === "string" && input.pageUrl
        ? extractPageIdFromHubspotUrl(input.pageUrl)
        : undefined;

  if (!pageId) {
    throw new Error("Missing required field: pageId or pageUrl");
  }

  const normalized = { ...input };
  delete normalized.pageUrl;

  return {
    ...normalized,
    pageId,
  };
}

function extractPageIdFromHubspotUrl(pageUrl: string): string {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(pageUrl);
  } catch {
    throw new Error("Invalid HubSpot page URL.");
  }

  const match = parsedUrl.pathname.match(/\/editor\/(\d+)(?:\/|$)/);

  if (!match?.[1]) {
    throw new Error("Could not extract a HubSpot page ID from the URL.");
  }

  return match[1];
}

async function readJsonInput(
  inputFlag: string | boolean | undefined,
  io: CliIo,
): Promise<Record<string, unknown>> {
  if (!inputFlag || typeof inputFlag !== "string") {
    throw new Error("Missing required option: --input");
  }

  const raw =
    inputFlag === "-"
      ? await readStdin(io)
      : await readFile(inputFlag, "utf8");

  return JSON.parse(raw) as Record<string, unknown>;
}

async function readStdin(io: CliIo): Promise<string> {
  if (typeof io.stdin === "string") {
    return io.stdin;
  }

  const chunks: Uint8Array[] = [];

  for await (const chunk of processStdin) {
    chunks.push(
      Buffer.isBuffer(chunk) ? new Uint8Array(chunk) : Buffer.from(chunk),
    );
  }

  return Buffer.concat(chunks).toString("utf8");
}

function writeResult<T>(
  io: CliIo,
  result: ResultEnvelope<T>,
  exitCode: number,
): number {
  io.stdout(`${JSON.stringify(result)}\n`);
  return exitCode;
}

function coerceString(value: string | boolean | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function coerceNumber(value: string | boolean | undefined): number | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function prompt(io: CliIo, label: string): Promise<string> {
  if (io.prompt) {
    return io.prompt(label);
  }

  const rl = createInterface({
    input: processStdin,
    output: processStdout,
  });

  try {
    return await rl.question(label);
  } finally {
    rl.close();
  }
}

async function optionalPrompt(io: CliIo, label: string): Promise<string> {
  try {
    return await prompt(io, label);
  } catch {
    return "";
  }
}
