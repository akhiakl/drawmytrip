import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { makeSuggestions } from "@/test/fixtures/suggest";

import { useSuggestions } from "./use-suggestions";

const jsonResponse = (body: unknown, status = 200) =>
  ({ ok: status < 300, status, json: () => Promise.resolve(body) }) as Response;

afterEach(() => vi.unstubAllGlobals());

describe("useSuggestions", () => {
  it("starts idle", () => {
    const { result } = renderHook(() => useSuggestions());
    expect(result.current.status).toBe("idle");
  });

  it("posts the destination and becomes ready with the suggestions", async () => {
    const suggestions = makeSuggestions("city");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(suggestions));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useSuggestions());

    await act(() => result.current.load("Toronto"));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/suggest");
    expect(JSON.parse(init.body)).toEqual({ destination: "Toronto" });
    expect(result.current.status).toBe("ready");
    expect(result.current.suggestions).toEqual(suggestions);
  });

  it("is loading while the request is open", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );
    const { result } = renderHook(() => useSuggestions());
    act(() => void result.current.load("Toronto"));
    expect(result.current.status).toBe("loading");
  });

  it.each([429, 502, 503])("fails on HTTP %i", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, status)));
    const { result } = renderHook(() => useSuggestions());
    await act(() => result.current.load("Toronto"));
    expect(result.current.status).toBe("failed");
  });

  it("fails on a network error or a body that breaks the contract", async () => {
    const { result } = renderHook(() => useSuggestions());
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await act(() => result.current.load("Toronto"));
    expect(result.current.status).toBe("failed");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ scope: "world" })),
    );
    await act(() => result.current.load("Toronto"));
    expect(result.current.status).toBe("failed");
  });

  it("keeps only the latest load when a new one starts", async () => {
    const first = makeSuggestions("city");
    const second = makeSuggestions("region");
    let release: (r: Response) => void = () => {};
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((resolve, reject) => {
            release = resolve;
            init.signal?.addEventListener("abort", () =>
              reject(new Error("aborted")),
            );
          }),
      )
      .mockResolvedValueOnce(jsonResponse(second));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useSuggestions());

    act(() => void result.current.load("Toronto"));
    await act(() => result.current.load("Austria"));
    release(jsonResponse(first));
    await act(async () => {});

    expect(result.current.suggestions).toEqual(second);
  });

  it("aborts the open request on unmount", () => {
    let signal: AbortSignal | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init: RequestInit) => {
        signal = init.signal ?? undefined;
        return new Promise(() => {});
      }),
    );
    const { result, unmount } = renderHook(() => useSuggestions());
    act(() => void result.current.load("Toronto"));
    unmount();
    expect(signal?.aborted).toBe(true);
  });
});
