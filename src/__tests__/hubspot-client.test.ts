import { beforeEach, describe, expect, it, vi } from "vitest";

import { HubspotApiClient } from "../hubspot/client.js";
import type { HubspotApiError } from "../hubspot/client.js";

describe("HubspotApiClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("retries rate-limited requests and returns parsed json", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "rate limited" }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ results: [{ id: "1" }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const client = new HubspotApiClient({
      accessToken: "token",
      fetch: fetchMock,
      retryDelayMs: 1,
    });

    const result = await client.listPages({ limit: 10 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.results[0]?.id).toBe("1");
  });

  it("extracts human-readable hubspot errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          message: "Validation failed",
          errors: [{ message: "slug already exists" }],
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const client = new HubspotApiClient({
      accessToken: "token",
      fetch: fetchMock,
      retryDelayMs: 1,
    });

    await expect(client.getPage("123")).rejects.toEqual(
      expect.objectContaining<Partial<HubspotApiError>>({
        message: "Validation failed: slug already exists",
        status: 400,
      }),
    );
  });
});
