import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import messages from "@/i18n/messages/en.json";

import { Logo } from "./logo";

describe("Logo", () => {
  it("reads as the product name, with the mark hidden from assistive tech", () => {
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <Logo />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText(/DrawMy/)).toHaveTextContent("DrawMyTrip");
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
