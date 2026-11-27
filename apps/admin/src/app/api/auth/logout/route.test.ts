// @vitest-environment node
import { expect, it } from "vitest";

import { POST } from "./route";

it("clears the session and goes to sign-in", async () => {
  const res = await POST(
    new Request("http://localhost/api/auth/logout", { method: "POST" }),
  );
  expect(res.status).toBe(303);
  expect(res.headers.get("location")).toBe("http://localhost/sign-in");
  expect(res.headers.get("set-cookie")).toMatch(/dmt_admin=;/);
});
