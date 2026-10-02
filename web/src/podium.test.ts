import { expect, it } from "vitest";
import { finalReveal, podiumSteps, spotlight } from "./podium";

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

it("keeps the server lineup order and places finalists by rank", () => {
  const ranked = [
    { id: "a", score: 9 },
    { id: "b", score: 5 },
    { id: "c", score: 3 },
    { id: "d", score: 1 },
  ];
  const { finalists, rest, winners } = finalReveal(ranked, ["c", "a", "b"]);
  expect(finalists.map((f) => [f.id, f.place])).toEqual([
    ["c", 3],
    ["a", 1],
    ["b", 2],
  ]);
  expect(rest).toEqual([{ id: "d", score: 1, place: 4 }]);
  expect(winners).toEqual(["a"]);
});

it("reports every player tied for first as a winner", () => {
  expect(finalReveal([{ id: "a", score: 4 }, { id: "b", score: 4 }], ["b", "a"]).winners).toEqual(["a", "b"]);
});

it("keeps a finalist who already left the lineup hidden while the spotlight moves on", () => {
  expect(spotlight("c", "a", ["c"])).toBe("gone");
  expect(spotlight("a", "a", ["c"])).toBe("lit");
  expect(spotlight("b", "a", ["c"])).toBe("dimmed");
  expect(spotlight("b", null, [])).toBe("idle");
});
