import { expect, it } from "vitest";
import { gameName } from "./games";

it("gameName falls back to the id for unknown games", () => {
  expect(gameName("mostlikely")).toBe("¿Quién es más probable?");
  expect(gameName("nope")).toBe("nope");
});
