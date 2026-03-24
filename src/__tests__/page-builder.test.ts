import { describe, expect, it, vi } from "vitest";

import { HubspotApiError } from "../hubspot/client.js";
import { createPageBuilder } from "../page-builder.js";

describe("createPageBuilder", () => {
  it("rejects incompatible templates before creating a page", async () => {
    const client = {
      getTemplateByPath: vi.fn().mockResolvedValue({
        path: "custom/coded.html",
        label: "Legacy coded template",
        isAvailableForNewContent: false,
        templateType: "CODED",
      }),
      createPage: vi.fn(),
    };

    const service = createPageBuilder({
      client,
      portalId: "123",
    });

    await expect(
      service.createPage({
        name: "Webinar Page",
        slug: "webinar-page",
        templatePath: "custom/coded.html",
        htmlContent: "<h1>Hi</h1>",
      }),
    ).rejects.toThrow("Raw HTML page creation is only supported");
    expect(client.createPage).not.toHaveBeenCalled();
  });

  it("rejects scaffolded templates even when they are dnd-capable", async () => {
    const client = {
      getTemplateByPath: vi.fn().mockResolvedValue({
        path: "@hubspot/elevate/templates/lp-event-signup-one.hubl.html",
        label: "Landing page - event signup 1",
        isAvailableForNewContent: true,
        templateType: "DND",
      }),
      createPage: vi.fn(),
    };

    const service = createPageBuilder({
      client,
      portalId: "123",
    });

    await expect(
      service.createPage({
        name: "Event Page",
        slug: "event-page",
        templatePath: "@hubspot/elevate/templates/lp-event-signup-one.hubl.html",
        htmlContent: "<h1>Hi</h1>",
      }),
    ).rejects.toThrow("Raw HTML page creation is only supported");
    expect(client.createPage).not.toHaveBeenCalled();
  });

  it("creates pages with the corrected layout payload and fallback template", async () => {
    const createPage = vi
      .fn<
        (payload: Record<string, unknown>) => Promise<{ id: string; url: string }>
      >()
      .mockResolvedValue({
        id: "1",
        url: "https://example.com/test-page",
      });
    const client = {
      getTemplateByPath: vi.fn().mockResolvedValue(undefined),
      createPage,
    };

    const service = createPageBuilder({
      client,
      portalId: "123",
      defaultTemplatePath: "@hubspot/elevate/templates/blank.hubl.html",
    });

    await service.createPage({
      name: "Webinar Page",
      slug: "webinar-page",
      htmlContent: "<h1>Hi</h1>",
    });

    const payload = createPage.mock.calls[0]?.[0];

    expect(payload).toMatchObject({
      state: "DRAFT",
      templatePath: "@hubspot/elevate/templates/blank.hubl.html",
      useFeaturedImage: false,
    });
    expect(
      (payload as { layoutSections?: { dnd_area?: { rows?: unknown[] } } } | undefined)
        ?.layoutSections?.dnd_area?.rows,
    ).toEqual(expect.any(Array));
  });

  it("regenerates layout sections when html content changes", async () => {
    const updatePageDraft = vi
      .fn<(pageId: string, payload: Record<string, unknown>) => Promise<{ id: string; name: string; slug: string }>>()
      .mockResolvedValue({
        id: "1",
        name: "Updated",
        slug: "updated",
      });
    const client = {
      getPageDraft: vi.fn().mockResolvedValue({
        id: "1",
        templatePath: "@hubspot/elevate/templates/blank.hubl.html",
        state: "DRAFT",
        currentState: "DRAFT",
      }),
      updatePageDraft,
    };

    const service = createPageBuilder({
      client,
      portalId: "123",
    });

    await service.updatePage({
      pageId: "1",
      htmlContent: "<p>Updated</p>",
      metaDescription: "Meta",
    });

    const payload = updatePageDraft.mock.calls[0]?.[1];

    expect(payload).toMatchObject({
      metaDescription: "Meta",
    });
    expect(
      (payload as { layoutSections?: { dnd_area?: unknown } } | undefined)
        ?.layoutSections?.dnd_area,
    ).toEqual(expect.any(Object));
  });

  it("refuses raw html updates on scaffolded templates", async () => {
    const client = {
      getPageDraft: vi.fn().mockResolvedValue({
        id: "1",
        templatePath: "@hubspot/elevate/templates/lp-event-signup-one.hubl.html",
        state: "DRAFT",
        currentState: "DRAFT",
      }),
      updatePageDraft: vi.fn(),
    };

    const service = createPageBuilder({
      client,
      portalId: "123",
    });

    await expect(
      service.updatePage({
        pageId: "1",
        htmlContent: "<p>Updated</p>",
      }),
    ).rejects.toThrow("Raw HTML body updates are only supported");
    expect(client.updatePageDraft).not.toHaveBeenCalled();
  });

  it("falls back when push-live fails on initial publish", async () => {
    const client = {
      pushLive: vi
        .fn()
        .mockRejectedValue(new HubspotApiError("Draft push failed", 400)),
      patchPageMetadata: vi.fn().mockResolvedValue({
        id: "1",
      }),
      getPage: vi.fn().mockResolvedValue({
        id: "1",
        slug: "welcome",
        url: "https://example.com/welcome",
      }),
    };

    const service = createPageBuilder({
      client,
      portalId: "123",
    });

    const result = await service.publishPage({
      pageId: "1",
    });

    expect(client.patchPageMetadata).toHaveBeenCalledWith("1", {
      state: "PUBLISHED",
    });
    expect(result.warnings).toContain(
      "HubSpot draft publish failed; used metadata publish fallback.",
    );
    expect(result.url).toBe("https://example.com/welcome");
  });

  it("prefers the draft endpoint when fetching a drafted page", async () => {
    const client = {
      getPageDraft: vi.fn().mockResolvedValue({
        id: "1",
        state: "DRAFT",
        currentState: "DRAFT",
        slug: "welcome",
        url: "https://example.com/welcome",
        layoutSections: {
          dnd_area: {
            rows: [
              {
                "0": {
                  rows: [
                    {
                      "0": {
                        params: {
                          html: "<h1>Draft</h1>",
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      }),
      getPage: vi.fn().mockResolvedValue({
        id: "1",
        state: "DRAFT",
        currentState: "DRAFT",
        slug: "welcome",
        url: "https://example.com/welcome",
      }),
    };

    const service = createPageBuilder({
      client,
      portalId: "123",
    });

    const result = await service.getPage("1");

    expect(client.getPageDraft).toHaveBeenCalledWith("1");
    expect(
      (result.layoutSections as { dnd_area?: unknown } | undefined)?.dnd_area,
    ).toBeDefined();
  });
});
