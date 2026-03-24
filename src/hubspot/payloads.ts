import type {
  CreatePageInput,
  TemplateRecord,
  UpdatePageInput,
} from "../types.js";

export const DEFAULT_TEMPLATE_PATH =
  "@hubspot/elevate/templates/blank.hubl.html";

export function isVerifiedRawHtmlTemplatePath(
  templatePath: string | undefined,
): boolean {
  return templatePath === DEFAULT_TEMPLATE_PATH;
}

export function supportsRawHtmlTemplate(template: TemplateRecord): boolean {
  if (!template.isAvailableForNewContent) {
    return false;
  }

  return isVerifiedRawHtmlTemplatePath(template.path);
}

export function buildLayoutSectionsFromHtml(htmlContent: string) {
  return {
    dnd_area: {
      cells: [],
      cssClass: "",
      cssId: "",
      cssStyle: "",
      label: "Main section",
      name: "dnd_area",
      params: {},
      rowMetaData: [
        {
          cssClass: "dnd-section hubspot-page-builder-full-width",
        },
      ],
      rows: [
        {
          "0": {
            cells: [],
            cssClass: "",
            cssId: "",
            cssStyle: "",
            name: "dnd_area-column-1",
            params: {
              css_class: "dnd-column hubspot-page-builder-full-width-column",
            },
            rowMetaData: [
              {
                cssClass: "dnd-row",
              },
            ],
            rows: [
              {
                "0": {
                  cells: [],
                  cssClass: "",
                  cssId: "",
                  cssStyle: "",
                  name: "dnd_area-module-1",
                  params: {
                    child_css: {},
                    css: {},
                    css_class: "dnd-module",
                    extra_classes: "widget-type-rich_text",
                    html: htmlContent,
                    path: "@hubspot/rich_text",
                    schema_version: 2,
                    smart_objects: [],
                    smart_type: "NOT_SMART",
                    wrap_field_tag: "div",
                  },
                  rowMetaData: [],
                  rows: [],
                  type: "custom_widget",
                  w: 12,
                  x: 0,
                },
              },
            ],
            type: "cell",
            w: 12,
            x: 0,
          },
        },
      ],
    },
  };
}

export function buildCreatePagePayload(input: CreatePageInput) {
  const payload: Record<string, unknown> = {
    name: input.name,
    slug: input.slug,
    state: "DRAFT",
    templatePath: input.templatePath ?? DEFAULT_TEMPLATE_PATH,
    useFeaturedImage: false,
    layoutSections: buildLayoutSectionsFromHtml(input.htmlContent),
  };

  if (input.htmlTitle) {
    payload.htmlTitle = input.htmlTitle;
  }
  if (input.metaDescription) {
    payload.metaDescription = input.metaDescription;
  }
  if (input.headHtml) {
    payload.headHtml = input.headHtml;
  }
  if (input.footerHtml) {
    payload.footerHtml = input.footerHtml;
  }
  if (input.domain) {
    payload.domain = input.domain;
  }

  return payload;
}

export function buildUpdatePagePayload(input: UpdatePageInput) {
  const payload: Record<string, unknown> = {};

  if (input.name) {
    payload.name = input.name;
  }
  if (input.slug) {
    payload.slug = input.slug;
  }
  if (input.templatePath) {
    payload.templatePath = input.templatePath;
  }
  if (input.htmlTitle) {
    payload.htmlTitle = input.htmlTitle;
  }
  if (input.metaDescription) {
    payload.metaDescription = input.metaDescription;
  }
  if (input.headHtml) {
    payload.headHtml = input.headHtml;
  }
  if (input.footerHtml) {
    payload.footerHtml = input.footerHtml;
  }
  if (input.domain) {
    payload.domain = input.domain;
  }
  if (input.htmlContent) {
    payload.layoutSections = buildLayoutSectionsFromHtml(input.htmlContent);
  }

  return payload;
}
