import { describe, expect, it } from "vitest";

import {
  buildCreatePagePayload,
  buildLayoutSectionsFromHtml,
  supportsRawHtmlTemplate,
} from "../hubspot/payloads.js";

describe("buildLayoutSectionsFromHtml", () => {
  it("wraps raw html in the nested dnd cell/module structure HubSpot expects", () => {
    const sections = buildLayoutSectionsFromHtml("<h1>Hello</h1>");

    expect(sections.dnd_area.label).toBe("Main section");
    expect(sections.dnd_area.rowMetaData[0]?.cssClass).toContain("hubspot-page-builder-full-width");
    expect(sections.dnd_area.rows).toHaveLength(1);
    expect(sections.dnd_area.rows[0]?.["0"]?.params?.css_class).toContain(
      "hubspot-page-builder-full-width-column",
    );
    expect(
      sections.dnd_area.rows[0]?.["0"]?.rows?.[0]?.["0"]?.params?.path,
    ).toBe("@hubspot/rich_text");
    expect(
      sections.dnd_area.rows[0]?.["0"]?.rows?.[0]?.["0"]?.params?.html,
    ).toBe("<h1>Hello</h1>");
    expect(sections.dnd_area.rows[0]?.["0"]?.type).toBe("cell");
    expect(sections.dnd_area.rows[0]?.["0"]?.rows?.[0]?.["0"]?.type).toBe(
      "custom_widget",
    );
  });
});

describe("buildCreatePagePayload", () => {
  it("uses the verified blank landing page template by default", () => {
    const payload = buildCreatePagePayload({
      name: "Test page",
      slug: "test-page",
      htmlContent: "<p>Hello</p>",
    });

    expect(payload.state).toBe("DRAFT");
    expect(payload.templatePath).toBe("@hubspot/elevate/templates/blank.hubl.html");
    expect(payload.useFeaturedImage).toBe(false);
  });
});

describe("supportsRawHtmlTemplate", () => {
  it("accepts available drag and drop templates", () => {
    expect(
      supportsRawHtmlTemplate({
        path: "@hubspot/elevate/templates/blank.hubl.html",
        label: "Blank",
        isAvailableForNewContent: true,
        templateType: "DND",
      }),
    ).toBe(true);
  });

  it("rejects scaffolded drag and drop templates for raw html mode", () => {
    expect(
      supportsRawHtmlTemplate({
        path: "@hubspot/elevate/templates/lp-event-signup-one.hubl.html",
        label: "Landing page - event signup 1",
        isAvailableForNewContent: true,
        templateType: "DND",
      }),
    ).toBe(false);
  });

  it("rejects unavailable or coded templates", () => {
    expect(
      supportsRawHtmlTemplate({
        path: "custom/coded.html",
        label: "Legacy coded template",
        isAvailableForNewContent: false,
        templateType: "CODED",
      }),
    ).toBe(false);
  });
});
