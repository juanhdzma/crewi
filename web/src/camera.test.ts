import { expect, it } from "vitest";
import { squareCrop } from "./camera";

it("crops the centered square of a frame", () => {
  expect(squareCrop(640, 480)).toEqual({ sx: 80, sy: 0, size: 480 });
  expect(squareCrop(480, 640)).toEqual({ sx: 0, sy: 80, size: 480 });
  expect(squareCrop(300, 300)).toEqual({ sx: 0, sy: 0, size: 300 });
});
