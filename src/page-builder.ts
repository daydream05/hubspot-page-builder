import {
  DEFAULT_TEMPLATE_PATH,
  buildCreatePagePayload,
  buildUpdatePagePayload,
  isVerifiedRawHtmlTemplatePath,
  supportsRawHtmlTemplate,
} from "./hubspot/payloads.js";
import { HubspotApiError } from "./hubspot/client.js";
import type { HubspotApiClient } from "./hubspot/client.js";
import type {
  AccountInfoRecord,
  CreatePageInput,
  DomainRecord,
  ListPagesInput,
  PageRecord,
  PreviewUrlInput,
  PublishPageInput,
  TemplateRecord,
  UpdatePageInput,
} from "./types.js";

interface PageBuilderDependencies {
  client: Pick<
    HubspotApiClient,
    | "getAccountInfo"
    | "listDomains"
    | "listTemplates"
    | "getTemplateByPath"
    | "createPage"
    | "listPages"
    | "getPage"
    | "updatePageDraft"
    | "patchPageMetadata"
    | "pushLive"
  > & {
    getPageDraft?: HubspotApiClient["getPageDraft"];
  };
  portalId?: string;
  defaultTemplatePath?: string;
}

export function createPageBuilder({
  client,
  portalId,
  defaultTemplatePath,
}: PageBuilderDependencies) {
  return {
    async getAccountInfo() {
      const [accountInfo, domains] = await Promise.all([
        client.getAccountInfo(),
        client.listDomains(),
      ]);

      return normalizeAccountInfo(accountInfo, domains.results);
    },

    async listTemplates() {
      const templates = await client.listTemplates();

      return templates.map((template) => ({
        label: template.label ?? template.path,
        path: template.path,
        thumbnailUrl: template.thumbnailUrl ?? null,
        supportsRawHtml: supportsRawHtmlTemplate(template),
      }));
    },

    async listPages(input: ListPagesInput = {}) {
      const pages = await client.listPages({
        limit: input.limit,
        sort: input.sort,
      });

      const normalized = pages.results.map((page) => normalizePage(page));

      return normalized.filter((page) => {
        const statusMatches =
          !input.status ||
          input.status === "all" ||
          page.status === input.status;
        const searchMatches =
          !input.search ||
          `${page.name} ${page.slug}`.toLowerCase().includes(input.search.toLowerCase());

        return statusMatches && searchMatches;
      });
    },

    async getPage(pageId: string) {
      const page = await getDraftAwarePage(client, pageId);
      const normalized = normalizePage(page);

      return {
        ...page,
        ...normalized,
        previewUrl: extractPreviewUrl(page),
        editUrl: extractEditUrl(page, portalId),
      };
    },

    async createPage(input: CreatePageInput) {
      const warnings: string[] = [];
      const templatePath =
        input.templatePath ?? defaultTemplatePath ?? DEFAULT_TEMPLATE_PATH;

      const template = await client.getTemplateByPath(templatePath);
      ensureCompatibleTemplate(template, templatePath);

      const page = await client.createPage(
        buildCreatePagePayload({
          ...input,
          templatePath,
        }),
      );

      return {
        pageId: page.id,
        url: normalizeUrl(page),
        previewUrl: extractPreviewUrl(page),
        editUrl: extractEditUrl(page, portalId),
        warnings,
      };
    },

    async updatePage(input: UpdatePageInput) {
      if (input.templatePath) {
        const template = await client.getTemplateByPath(input.templatePath);
        ensureCompatibleTemplate(template, input.templatePath);
      }

      if (input.htmlContent) {
        const currentPage = await getDraftAwarePage(client, input.pageId);
        const targetTemplatePath = input.templatePath ?? currentPage.templatePath;

        if (!isVerifiedRawHtmlTemplatePath(targetTemplatePath)) {
          throw new Error(
            `Raw HTML body updates are only supported for the verified blank landing page template (${DEFAULT_TEMPLATE_PATH}). This page uses "${targetTemplatePath ?? "unknown"}".`,
          );
        }

        return client.updatePageDraft(
          input.pageId,
          buildUpdatePagePayload(input),
        );
      }

      return client.patchPageMetadata(
        input.pageId,
        buildUpdatePagePayload(input),
      );
    },

    async publishPage(input: PublishPageInput) {
      try {
        await client.pushLive(input.pageId);
      } catch (error) {
        if (!(error instanceof HubspotApiError)) {
          throw error;
        }

        await client.patchPageMetadata(input.pageId, {
          state: "PUBLISHED",
        });

        const fallbackPage = await getDraftAwarePage(client, input.pageId);

        return {
          pageId: input.pageId,
          url: normalizeUrl(fallbackPage),
          warnings: [
            "HubSpot draft publish failed; used metadata publish fallback.",
          ],
        };
      }

      const page = await getDraftAwarePage(client, input.pageId);

      return {
        pageId: input.pageId,
        url: normalizeUrl(page),
        warnings: [],
      };
    },

    async previewUrl(input: PreviewUrlInput) {
      const page = await getDraftAwarePage(client, input.pageId);
      const previewUrl = extractPreviewUrl(page);
      const warnings =
        previewUrl === null
          ? ["HubSpot did not expose a preview URL for this page."]
          : [];

      return {
        pageId: input.pageId,
        previewUrl,
        url: normalizeUrl(page),
        editUrl: extractEditUrl(page, portalId),
        warnings,
      };
    },
  };
}

async function getDraftAwarePage(
  client: Pick<HubspotApiClient, "getPage"> & {
    getPageDraft?: HubspotApiClient["getPageDraft"];
  },
  pageId: string,
): Promise<PageRecord> {
  if (!client.getPageDraft) {
    return client.getPage(pageId);
  }

  try {
    return await client.getPageDraft(pageId);
  } catch (error) {
    if (!(error instanceof HubspotApiError) || error.status !== 404) {
      throw error;
    }

    return client.getPage(pageId);
  }
}

function ensureCompatibleTemplate(
  template: TemplateRecord | undefined,
  templatePath: string,
): void {
  if (!isVerifiedRawHtmlTemplatePath(templatePath)) {
    throw new Error(
      `Raw HTML page creation is only supported for the verified blank landing page template (${DEFAULT_TEMPLATE_PATH}). Received "${templatePath}".`,
    );
  }

  if (template && !supportsRawHtmlTemplate(template)) {
    throw new Error(
      `Raw HTML page creation is only supported for the verified blank landing page template (${DEFAULT_TEMPLATE_PATH}). Received "${templatePath}".`,
    );
  }
}

function normalizeAccountInfo(
  accountInfo: AccountInfoRecord,
  domains: DomainRecord[],
) {
  const primaryDomain =
    domains.find((domain) => domain.isPrimary)?.domain ??
    accountInfo.primaryDomain ??
    null;

  return {
    portalId: String(accountInfo.portalId ?? ""),
    portalName: accountInfo.portalName ?? null,
    primaryDomain,
    domains: domains.map((domain) => domain.domain),
  };
}

function normalizePage(page: PageRecord) {
  return {
    id: page.id,
    name: page.name ?? "",
    slug: page.slug ?? "",
    status: normalizePageStatus(page),
    updatedAt: page.updatedAt ?? null,
    url: normalizeUrl(page),
    templatePath: (page as { templatePath?: string }).templatePath ?? null,
  };
}

function normalizePageStatus(page: PageRecord): "draft" | "published" {
  const state = (page.currentState ?? page.state ?? "").toUpperCase();

  if (state.includes("DRAFT")) {
    return "draft";
  }

  if (page.publishDate) {
    const publishTime = new Date(page.publishDate).getTime();

    if (Number.isFinite(publishTime) && publishTime > Date.now()) {
      return "draft";
    }
  }

  if (state.includes("PUBLISHED")) {
    return "published";
  }

  return page.url || page.absoluteUrl ? "published" : "draft";
}

function normalizeUrl(page: PageRecord): string | null {
  return page.url ?? page.absoluteUrl ?? null;
}

function extractPreviewUrl(page: PageRecord): string | null {
  return page.previewUrl ?? page.preview_url ?? null;
}

function extractEditUrl(page: PageRecord, portalId?: string): string | null {
  if (page.editUrl) {
    return page.editUrl;
  }

  if (!portalId) {
    return null;
  }

  return `https://app.hubspot.com/pages/${portalId}/editor/${page.id}`;
}
