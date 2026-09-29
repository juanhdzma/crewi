import { expect, it } from "vitest";
import { podiumSteps } from "./podium";

it("puts the top three scores on the podium", () => {
  const { podium, rest } = podiumSteps([
    { id: "c", score: 1 },
    { id: "a", score: 4 },
    { id: "b", score: 2 },
    { id: "d", score: 0 },
  ]);
  expect(podium).toEqual([
    { place: 1, ids: ["a"], score: 4 },
    { place: 2, ids: ["b"], score: 2 },
    { place: 3, ids: ["c"], score: 1 },
  ]);
  expect(rest).toEqual([{ id: "d", score: 0 }]);
});

it("lets ties share a step", () => {
  const { podium } = podiumSteps([
    { id: "a", score: 3 },
    { id: "b", score: 3 },
    { id: "c", score: 1 },
  ]);
  expect(podium).toEqual([
    { place: 1, ids: ["a", "b"], score: 3 },
    { place: 2, ids: ["c"], score: 1 },
  ]);
});
