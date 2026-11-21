import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messages from "@/i18n/messages/en.json";
import { makeCity } from "@/test/fixtures/trip";

import { AffiliateBlock } from "./affiliate-block";

const mocks = vi.hoisted(() => ({ affiliateLinks: vi.fn(), trackEvent: vi.fn() }));
vi.mock("@/lib/affiliate", () => ({ affiliateLinks: mocks.affiliateLinks }));
vi.mock("@/lib/analytics", () => ({ trackEvent: mocks.trackEvent }));

const renderBlock = () =>
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AffiliateBlock city={makeCity()} />
    </NextIntlClientProvider>,
  );

beforeEach(() => vi.clearAllMocks());

describe("AffiliateBlock", () => {
  it("renders nothing when no provider is configured", () => {
    mocks.affiliateLinks.mockReturnValue([]);
    const { container } = renderBlock();
    expect(container).toBeEmptyDOMElement();
  });

  it("lists sponsored links that open safely in a new tab, with a disclosure", async () => {
    mocks.affiliateLinks.mockReturnValue([
      { kind: "stay", href: "https://stays.test/?q=Vienna" },
      { kind: "esim", href: "https://esim.test/Austria" },
    ]);
    renderBlock();

    const stay = screen.getByRole("link", { name: /Find a stay in Vienna/ });
    expect(stay).toHaveAttribute("href", "https://stays.test/?q=Vienna");
    expect(stay).toHaveAttribute("target", "_blank");
    expect(stay).toHaveAttribute("rel", "sponsored noopener noreferrer");
    expect(screen.getByRole("link", { name: /eSIM for Austria/ })).toBeVisible();
    expect(screen.getByText(/affiliate links/)).toBeVisible();

    await userEvent.click(stay);
    expect(mocks.trackEvent).toHaveBeenCalledWith("affiliate_click");
  });
});
