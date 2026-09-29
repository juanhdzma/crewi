import { expect, it } from "vitest";
import { personColor } from "./people";

it("gives each player a stable color from the palette", () => {
  expect(personColor("ABC")).toBe(personColor("ABC"));
  const colors = new Set(["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"].map(personColor));
  expect(colors.size).toBeGreaterThan(3);
  for (const c of colors) expect(c).toMatch(/^var\(--color-p[0-7]\)$/);
});
