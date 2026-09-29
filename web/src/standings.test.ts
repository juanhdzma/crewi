import { expect, it } from "vitest";
import { standings } from "./standings";

it("combines the turn with totals and shows who moved", () => {
  const rows = standings(
    [
      { playerId: "ana", points: 9000 },
      { playerId: "beto", points: 8000 },
      { playerId: "caro", points: 3000 },
    ],
    [
      { playerId: "beto", distanceKm: 0, points: 5000 },
      { playerId: "ana", distanceKm: 40, points: 300 },
    ],
  );
  expect(rows.map((r) => [r.playerId, r.rank, r.move])).toEqual([
    ["ana", 1, 0],
    ["beto", 2, 0],
    ["caro", 3, -1],
  ]);
  expect(rows[1].turn).toEqual({ distanceKm: 0, points: 5000, medal: 1 });
  expect(rows[2].turn).toBeUndefined();
});

it("reports rank changes after the turn", () => {
  const rows = standings(
    [
      { playerId: "ana", points: 6000 },
      { playerId: "beto", points: 5500 },
    ],
    [{ playerId: "ana", distanceKm: 0, points: 5000 }],
  );
  expect(rows.map((r) => [r.playerId, r.move])).toEqual([
    ["ana", 1],
    ["beto", -1],
  ]);
});

it("gives tied totals the same rank", () => {
  const rows = standings(
    [
      { playerId: "a", points: 100 },
      { playerId: "b", points: 100 },
      { playerId: "c", points: 50 },
    ],
    [],
  );
  expect(rows.map((r) => r.rank)).toEqual([1, 1, 3]);
});
