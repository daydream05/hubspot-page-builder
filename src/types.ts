export interface ResultEnvelope<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
  warnings?: string[];
}

export interface StoredConfig {
  accessToken?: string;
  portalId?: string;
  defaultTemplatePath?: string;
}

export interface RuntimeConfig extends StoredConfig {
  accessToken: string;
  configPath: string;
}

export interface TemplateRecord {
  id?: string | number;
  path: string;
  label?: string;
  thumbnailUrl?: string | null;
  isAvailableForNewContent?: boolean;
  templateType?: string;
  source?: string;
}

export interface PageRecord {
  id: string;
  name?: string;
  slug?: string;
  url?: string | null;
  absoluteUrl?: string | null;
  templatePath?: string;
  state?: string;
  currentState?: string;
  publishDate?: string | number | null;
  updatedAt?: string | number | null;
  previewUrl?: string | null;
  preview_url?: string | null;
  editUrl?: string | null;
}

export interface AccountInfoRecord {
  portalId?: string | number;
  portalName?: string;
  primaryDomain?: string | null;
}

export interface DomainRecord {
  id?: string | number;
  domain: string;
  isPrimary?: boolean;
}

export interface CreatePageInput {
  name: string;
  slug: string;
  templatePath?: string;
  htmlContent: string;
  htmlTitle?: string;
  metaDescription?: string;
  headHtml?: string;
  footerHtml?: string;
  domain?: string;
}

export interface UpdatePageInput {
  pageId: string;
  name?: string;
  slug?: string;
  templatePath?: string;
  htmlContent?: string;
  htmlTitle?: string;
  metaDescription?: string;
  headHtml?: string;
  footerHtml?: string;
  domain?: string;
}

export interface ListPagesInput {
  status?: "draft" | "published" | "all";
  search?: string;
  limit?: number;
  sort?: string;
}

export interface PublishPageInput {
  pageId: string;
}

export interface PreviewUrlInput {
  pageId: string;
}
