import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { readAiHandoff } from "@/lib/ai";
import { makeGeneratedDraft } from "@/test/fixtures/ai";
import { makeSuggestions } from "@/test/fixtures/suggest";

import { AiChat } from "./ai-chat";

const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const jsonResponse = (body: unknown, status: number) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as Response;

const fetchMock = vi.fn();

type Reply = Response | Error;
/** Routes by URL; suggestions fail by default, so the chat falls back. */
function mockApi({
  suggest = jsonResponse({ error: "suggestions_failed" }, 502),
  generate = jsonResponse(makeGeneratedDraft(), 200),
}: { suggest?: Reply | Promise<Response>; generate?: Reply | Response[] } = {}) {
  const generateReplies = Array.isArray(generate) ? [...generate] : [generate];
  fetchMock.mockImplementation(async (url: string) => {
    if (url === "/api/suggest") return suggest;
    return generateReplies.length > 1 ? generateReplies.shift() : generateReplies[0];
  });
}
const generateCalls = () =>
  fetchMock.mock.calls.filter(([url]) => url === "/api/generate");

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  router.push.mockReset();
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function answerAll() {
  const user = userEvent.setup();
  render(<AiChat />);
  await user.type(screen.getByLabelText("Destination"), "Austria");
  await user.click(screen.getByRole("button", { name: /next/i }));
  const days = screen.getByLabelText("Number of days");
  await user.clear(days);
  await user.type(days, "6");
  await user.click(screen.getByRole("button", { name: /next/i }));
  await user.click(screen.getByRole("button", { name: /balanced/i }));
  return user;
}

describe("AiChat", () => {
  it("skips the first question when a destination is passed in", () => {
    render(<AiChat initialDestination="Kyoto, Japan" />);
    expect(screen.getByText("Kyoto, Japan")).toBeInTheDocument();
    expect(screen.queryByLabelText("Destination")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Number of days")).toBeVisible();
  });

  it("answers the days question with one tap on a chip", async () => {
    render(<AiChat initialDestination="Kyoto, Japan" />);
    await userEvent.click(screen.getByRole("button", { name: "2 weeks" }));
    expect(screen.getByText("14 days")).toBeInTheDocument();
    expect(screen.queryByLabelText("Number of days")).not.toBeInTheDocument();
  });

  it("shows which of the four steps is open", async () => {
    render(<AiChat />);
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Destination"), "Austria");
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();
  });

  it("says up front that the planner is an AI", () => {
    render(<AiChat />);
    expect(screen.getByText("You're planning with an AI.")).toBeVisible();
  });

  it("builds straight away, like before, when suggestions fail to load", async () => {
    const draft = makeGeneratedDraft(["Ljubljana"]);
    mockApi({ generate: jsonResponse(draft, 200) });

    await answerAll();

    await vi.waitFor(() => expect(generateCalls()).toHaveLength(1));
    expect(
      screen.queryByRole("button", { name: "Build my route" }),
    ).not.toBeInTheDocument();
    expect(JSON.parse(generateCalls()[0][1].body)).toEqual({
      destination: "Austria",
      days: 6,
      vibe: "balanced",
    });
    expect(router.push).toHaveBeenCalledWith("/new?from=ai");
    expect(readAiHandoff()).toMatchObject({
      title: draft.trip.title,
      cities: draft.trip.cities,
      suggestedExtra: ["Ljubljana"],
      request: { destination: "Austria", days: 6, vibe: "balanced" },
    });
  });

  it("shows the rate-limit state on 429 and retries with the same answers", async () => {
    mockApi({
      generate: [
        jsonResponse({ error: "rate_limited" }, 429),
        jsonResponse(makeGeneratedDraft(), 200),
      ],
    });

    const user = await answerAll();

    expect(await screen.findByRole("alert")).toHaveTextContent("Too many requests");
    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(generateCalls()).toHaveLength(2);
    expect(generateCalls()[1][1].body).toBe(generateCalls()[0][1].body);
    expect(router.push).toHaveBeenCalledWith("/new?from=ai");
  });

  it("offers a blank editor when generation fails", async () => {
    mockApi({ generate: jsonResponse({ error: "generation_failed" }, 502) });

    await answerAll();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "didn't come together",
    );
    expect(screen.getByRole("link", { name: /build it by hand/i })).toHaveAttribute(
      "href",
      "/new",
    );
    expect(router.push).not.toHaveBeenCalled();
    // Focus moves to the way forward, not the page body.
    expect(screen.getByRole("button", { name: /try again/i })).toHaveFocus();
  });

  it("replaces the suggested day count when the guest types", async () => {
    const user = userEvent.setup();
    render(<AiChat />);
    await user.type(screen.getByLabelText("Destination"), "Austria{Enter}");

    await user.keyboard("10");
    expect(screen.getByLabelText("Number of days")).toHaveValue(10);
  });

  it("keeps Next disabled until the answer is valid", async () => {
    const user = userEvent.setup();
    render(<AiChat />);

    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
    await user.type(screen.getByLabelText("Destination"), "Austria{Enter}");

    const days = screen.getByLabelText("Number of days");
    await user.clear(days);
    await user.type(days, "45");
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });
  describe("place picker", () => {
    const toronto = makeSuggestions("city");

    async function toPicker(destination = "Toronto") {
      const user = userEvent.setup();
      render(<AiChat initialDestination={destination} />);
      await user.click(screen.getByRole("button", { name: "2 weeks" }));
      await user.click(screen.getByRole("button", { name: /balanced/i }));
      return user;
    }

    it("loads places as soon as the destination is known", async () => {
      mockApi({ suggest: jsonResponse(toronto, 200) });
      render(<AiChat initialDestination="Toronto" />);
      await vi.waitFor(() =>
        expect(fetchMock).toHaveBeenCalledWith("/api/suggest", expect.anything()),
      );
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
        destination: "Toronto",
      });
    });

    it("shows a placeholder while places load, then the picker", async () => {
      let release: (r: Response) => void = () => {};
      mockApi({ suggest: new Promise<Response>((resolve) => (release = resolve)) });
      await toPicker();
      expect(screen.getByText("Finding places to pick from…")).toBeInTheDocument();

      release(jsonResponse(toronto, 200));
      expect(
        await screen.findByRole("button", { name: "Build my route" }),
      ).toBeVisible();
      expect(
        screen.getByText("Pick what you want to see in Toronto."),
      ).toBeInTheDocument();
      expect(screen.getByText("Step 4 of 4")).toBeInTheDocument();
    });

    it("sends the picks and scope when the guest builds", async () => {
      mockApi({ suggest: jsonResponse(toronto, 200) });
      const user = await toPicker();
      // A two-week stay preselects everything; drop one to prove the toggle counts.
      await user.click(await screen.findByRole("button", { name: "CN Tower" }));
      await user.click(screen.getByRole("button", { name: "Build my route" }));

      await vi.waitFor(() => expect(generateCalls()).toHaveLength(1));
      const body = JSON.parse(generateCalls()[0][1].body);
      expect(body).toMatchObject({
        destination: "Toronto",
        days: 14,
        vibe: "balanced",
        scope: "city",
      });
      expect(body.picks).toContainEqual({ name: "Niagara Falls", kind: "daytrip" });
      expect(body.picks).not.toContainEqual({ name: "CN Tower", kind: "sight" });
      expect(screen.getByText("4 picks")).toBeInTheDocument();
      expect(router.push).toHaveBeenCalledWith("/new?from=ai");
      expect(readAiHandoff()?.request?.picks).toEqual(body.picks);
    });

    it("builds without picks on Surprise me", async () => {
      mockApi({ suggest: jsonResponse(toronto, 200) });
      const user = await toPicker();
      await user.click(await screen.findByRole("button", { name: "Surprise me" }));

      await vi.waitFor(() => expect(generateCalls()).toHaveLength(1));
      expect(JSON.parse(generateCalls()[0][1].body)).toEqual({
        destination: "Toronto",
        days: 14,
        vibe: "balanced",
      });
    });

    it("resends the same picks on retry", async () => {
      mockApi({
        suggest: jsonResponse(toronto, 200),
        generate: [
          jsonResponse({ error: "generation_failed" }, 502),
          jsonResponse(makeGeneratedDraft(), 200),
        ],
      });
      const user = await toPicker();
      await user.click(
        await screen.findByRole("button", { name: "Build my route" }),
      );
      await user.click(await screen.findByRole("button", { name: /try again/i }));

      expect(generateCalls()).toHaveLength(2);
      expect(generateCalls()[1][1].body).toBe(generateCalls()[0][1].body);
    });

    it("falls back to a plain build when suggestions fail after the pace answer", async () => {
      let fail: (r: Response) => void = () => {};
      mockApi({ suggest: new Promise<Response>((resolve) => (fail = resolve)) });
      await toPicker();
      expect(generateCalls()).toHaveLength(0);

      fail(jsonResponse({ error: "suggestions_failed" }, 502));
      await vi.waitFor(() => expect(generateCalls()).toHaveLength(1));
      expect(JSON.parse(generateCalls()[0][1].body)).not.toHaveProperty("picks");
    });
  });
});
