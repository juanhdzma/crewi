import { expect, it } from "vitest";
import { presenceOf } from "./presence";

it("reports who already voted in most likely", () => {
  const game = { id: "mostlikely", view: { phase: "voting", voters: ["a"] } };
  expect(presenceOf(game, "a")).toBe("done");
  expect(presenceOf(game, "b")).toBe("waiting");
  expect(presenceOf({ id: "mostlikely", view: { phase: "revealed" } }, "a")).toBeNull();
});

it("reports ready, turn and guesses in ventana", () => {
  expect(presenceOf({ id: "ventana", view: { phase: "setup", ready: ["a"] } }, "a")).toBe("done");
  const guessing = { id: "ventana", view: { phase: "guessing", turnPlayerId: "t", guessed: ["a"] } };
  expect(presenceOf(guessing, "t")).toBe("turn");
  expect(presenceOf(guessing, "a")).toBe("done");
  expect(presenceOf(guessing, "b")).toBe("waiting");
});

it("is empty in the lobby", () => {
  expect(presenceOf(null, "a")).toBeNull();
});
