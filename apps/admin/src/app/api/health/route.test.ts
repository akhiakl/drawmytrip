// @vitest-environment node
import { expect, it } from "vitest";

import { GET } from "./route";

it("answers ok", async () => {
  expect(await GET().json()).toEqual({ ok: true });
});
