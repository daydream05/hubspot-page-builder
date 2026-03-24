import { describe, expect, it, vi } from "vitest";

import { runCli } from "../cli.js";

function createIo(stdin = "") {
  const stdout: string[] = [];
  const stderr: string[] = [];

  return {
    io: {
      stdin,
      stdout: (value: string) => {
        stdout.push(value);
      },
      stderr: (value: string) => {
        stderr.push(value);
      },
    },
    stdout,
    stderr,
  };
}

describe("runCli", () => {
  it("reads stdin json for create-page and writes success json to stdout", async () => {
    const { io, stdout, stderr } = createIo(
      JSON.stringify({
        name: "Page",
        slug: "page",
        htmlContent: "<h1>Hello</h1>",
      }),
    );

    const exitCode = await runCli(["create-page", "--input", "-"], io, {
      resolveConfig: vi.fn().mockResolvedValue({ accessToken: "token" }),
      createService: () => ({
        createPage: vi.fn().mockResolvedValue({
          pageId: "1",
          url: null,
          previewUrl: null,
          editUrl: null,
          warnings: [],
        }),
      }),
    });

    expect(exitCode).toBe(0);
    expect(stderr).toHaveLength(0);
    expect(JSON.parse(stdout.join(""))).toEqual({
      success: true,
      data: {
        pageId: "1",
        url: null,
        previewUrl: null,
        editUrl: null,
        warnings: [],
      },
    });
  });

  it("accepts a HubSpot editor URL for get-page", async () => {
    const { io, stdout } = createIo();
    const getPage = vi.fn().mockResolvedValue({
      id: "327615359711",
      status: "draft",
    });

    const exitCode = await runCli(
      [
        "get-page",
        "--page-url",
        "https://app-na2.hubspot.com/pages/245654093/editor/327615359711/content",
      ],
      io,
      {
        resolveConfig: vi.fn().mockResolvedValue({ accessToken: "token" }),
        createService: () => ({
          getPage,
        }),
      },
    );

    expect(exitCode).toBe(0);
    expect(getPage).toHaveBeenCalledWith("327615359711");
    expect(JSON.parse(stdout.join(""))).toEqual({
      success: true,
      data: {
        id: "327615359711",
        status: "draft",
      },
    });
  });

  it("accepts pageUrl in update-page input and normalizes it to pageId", async () => {
    const { io, stdout } = createIo(
      JSON.stringify({
        pageUrl:
          "https://app-na2.hubspot.com/pages/245654093/editor/327615359711/content",
        htmlContent: "<h1>Updated</h1>",
      }),
    );
    const updatePage = vi.fn().mockResolvedValue({
      id: "327615359711",
      state: "DRAFT",
    });

    const exitCode = await runCli(["update-page", "--input", "-"], io, {
      resolveConfig: vi.fn().mockResolvedValue({ accessToken: "token" }),
      createService: () => ({
        updatePage,
      }),
    });

    expect(exitCode).toBe(0);
    expect(updatePage).toHaveBeenCalledWith({
      pageId: "327615359711",
      htmlContent: "<h1>Updated</h1>",
    });
    expect(JSON.parse(stdout.join(""))).toEqual({
      success: true,
      data: {
        id: "327615359711",
        state: "DRAFT",
      },
    });
  });

  it("returns non-zero exit codes and machine-readable errors", async () => {
    const { io, stdout } = createIo();

    const exitCode = await runCli(["list-pages"], io, {
      resolveConfig: vi.fn().mockRejectedValue(new Error("missing token")),
      createService: () => {
        throw new Error("not reached");
      },
    });

    expect(exitCode).toBe(1);
    expect(JSON.parse(stdout.join(""))).toEqual({
      success: false,
      error: {
        message: "missing token",
      },
    });
  });
});
