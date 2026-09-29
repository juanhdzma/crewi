import { expect, it } from "vitest";
import { formatDistance, formatPoints } from "./format";

it("formats distances for humans", () => {
  expect(formatDistance(0)).toBe("adentro");
  expect(formatDistance(0.4321)).toBe("432 m");
  expect(formatDistance(3.14159)).toBe("3,1 km");
  expect(formatDistance(240.7)).toBe("241 km");
  expect(formatDistance(1234.5)).toBe("1.235 km");
});

it("groups thousands in points", () => {
  expect(formatPoints(5000)).toBe("5.000");
  expect(formatPoints(210)).toBe("210");
});
