import type {
  AccountInfoRecord,
  DomainRecord,
  PageRecord,
  TemplateRecord,
} from "../types.js";

type FetchLike = typeof fetch;

interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
}

interface HubspotApiClientOptions {
  accessToken: string;
  fetch?: FetchLike;
  baseUrl?: string;
  retryDelayMs?: number;
  maxAttempts?: number;
}

export class HubspotApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "HubspotApiError";
    this.status = status;
    this.details = details;
  }
}

export class HubspotApiClient {
  private readonly accessToken: string;
  private readonly fetchImpl: FetchLike;
  private readonly baseUrl: string;
  private readonly retryDelayMs: number;
  private readonly maxAttempts: number;

  constructor({
    accessToken,
    fetch = globalThis.fetch,
    baseUrl = "https://api.hubapi.com",
    retryDelayMs = 250,
    maxAttempts = 2,
  }: HubspotApiClientOptions) {
    this.accessToken = accessToken;
    this.fetchImpl = fetch;
    this.baseUrl = baseUrl;
    this.retryDelayMs = retryDelayMs;
    this.maxAttempts = maxAttempts;
  }

  async listPages(options: {
    limit?: number;
    sort?: string;
  }): Promise<{ results: PageRecord[] }> {
    return this.request<{ results: PageRecord[] }>("/cms/v3/pages/landing-pages", {
      query: {
        limit: options.limit,
        sort: options.sort,
      },
    });
  }

  async getPage(pageId: string): Promise<PageRecord> {
    return this.request<PageRecord>(`/cms/v3/pages/landing-pages/${pageId}`);
  }

  async getPageDraft(pageId: string): Promise<PageRecord> {
    return this.request<PageRecord>(`/cms/v3/pages/landing-pages/${pageId}/draft`);
  }

  async createPage(payload: Record<string, unknown>): Promise<PageRecord> {
    return this.request<PageRecord>("/cms/v3/pages/landing-pages", {
      method: "POST",
      body: payload,
    });
  }

  async updatePageDraft(
    pageId: string,
    payload: Record<string, unknown>,
  ): Promise<PageRecord> {
    return this.request<PageRecord>(`/cms/v3/pages/landing-pages/${pageId}/draft`, {
      method: "PATCH",
      body: payload,
    });
  }

  async patchPageMetadata(
    pageId: string,
    payload: Record<string, unknown>,
  ): Promise<PageRecord> {
    return this.request<PageRecord>(`/cms/v3/pages/landing-pages/${pageId}`, {
      method: "PATCH",
      body: payload,
    });
  }

  async pushLive(pageId: string): Promise<unknown> {
    return this.request(`/cms/v3/pages/landing-pages/${pageId}/draft/push-live`, {
      method: "POST",
    });
  }

  async listTemplates(): Promise<TemplateRecord[]> {
    const result = await this.request<
      TemplateRecord[] | { objects?: TemplateRecord[]; templates?: TemplateRecord[] }
    >("/content/api/v2/templates", {
      query: {
        content_type: "landing_page",
      },
    });

    if (Array.isArray(result)) {
      return result;
    }

    return result.objects ?? result.templates ?? [];
  }

  async getTemplateByPath(path: string): Promise<TemplateRecord | undefined> {
    const templates = await this.listTemplates();
    return templates.find((template) => template.path === path);
  }

  async listDomains(): Promise<{ results: DomainRecord[] }> {
    return this.request<{ results: DomainRecord[] }>("/cms/v3/domains");
  }

  async getAccountInfo(): Promise<AccountInfoRecord> {
    return this.request<AccountInfoRecord>("/account-info/v3/details");
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const method = options.method ?? "GET";

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      const url = new URL(path, this.baseUrl);

      if (options.query) {
        for (const [key, value] of Object.entries(options.query)) {
          if (value !== undefined) {
            url.searchParams.set(key, String(value));
          }
        }
      }

      const response = await this.fetchImpl(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          Accept: "application/json",
          ...(options.body ? { "Content-Type": "application/json" } : {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      if (response.ok) {
        if (response.status === 204) {
          return {} as T;
        }

        return this.parseJson<T>(response);
      }

      const details = await this.parseErrorBody(response);

      if (this.shouldRetry(response.status, attempt)) {
        await delay(this.retryDelayMs * attempt);
        continue;
      }

      throw new HubspotApiError(
        extractErrorMessage(details),
        response.status,
        details,
      );
    }

    throw new HubspotApiError("HubSpot request failed after retries.", 500);
  }

  private async parseJson<T>(response: Response): Promise<T> {
    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.includes("application/json")) {
      return (await response.text()) as T;
    }

    return (await response.json()) as T;
  }

  private async parseErrorBody(response: Response): Promise<unknown> {
    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.includes("application/json")) {
      return await response.text();
    }

    return await response.json();
  }

  private shouldRetry(status: number, attempt: number): boolean {
    return attempt < this.maxAttempts && (status === 429 || status >= 500);
  }
}

function extractErrorMessage(details: unknown): string {
  if (typeof details === "string" && details.trim() !== "") {
    return details;
  }

  if (details && typeof details === "object") {
    const detailRecord = details as Record<string, unknown>;
    const message =
      typeof detailRecord.message === "string"
        ? detailRecord.message
        : "HubSpot request failed";
    const errors =
      Array.isArray(detailRecord.errors)
        ? detailRecord.errors
            .map((error) =>
              error && typeof error === "object" && "message" in error
                ? String((error as Record<string, unknown>).message)
                : "",
            )
            .filter(Boolean)
        : [];

    return errors.length > 0 ? `${message}: ${errors.join("; ")}` : message;
  }

  return "HubSpot request failed";
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
