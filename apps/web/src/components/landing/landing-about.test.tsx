import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import messages from "@/i18n/messages/en.json";
import { GUEST_MAX_CITIES, SHARE_TTL_DAYS } from "@/lib/trip";

import { LandingAbout } from "./landing-about";

const renderAbout = () =>
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <LandingAbout />
    </NextIntlClientProvider>,
  );

describe("LandingAbout", () => {
  it("explains the product in paragraphs with real limits", () => {
    renderAbout();
    expect(screen.getByRole("heading", { level: 2 })).toBeVisible();
    expect(
      screen.getByText(new RegExp(`up to ${GUEST_MAX_CITIES} stops`)),
    ).toBeVisible();
    expect(screen.getByText(new RegExp(`${SHARE_TTL_DAYS} days`))).toBeVisible();
  });

  it("links to the main pages and credits OpenStreetMap", () => {
    renderAbout();
    expect(screen.getByRole("link", { name: "plan it with AI" })).toHaveAttribute(
      "href",
      "/plan",
    );
    expect(screen.getByRole("link", { name: "build it by hand" })).toHaveAttribute(
      "href",
      "/new",
    );
    expect(screen.getByRole("link", { name: "Read how it works" })).toHaveAttribute(
      "href",
      "/about",
    );
    const osm = screen.getByRole("link", { name: "OpenStreetMap contributors" });
    expect(osm).toHaveAttribute("href", "https://www.openstreetmap.org/copyright");
    expect(osm).toHaveAttribute("rel", "noopener noreferrer");
  });
});
