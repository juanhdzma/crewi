import { expect, it } from "vitest";
import { resolveTheme } from "./theme";

it("prefers the stored choice and falls back to the system", () => {
  expect(resolveTheme("light", true)).toBe("light");
  expect(resolveTheme("dark", false)).toBe("dark");
  expect(resolveTheme(null, true)).toBe("dark");
  expect(resolveTheme("garbage", false)).toBe("light");
});
