type Score = { playerId: string; points: number };
type TurnResult = { playerId: string; distanceKm: number; points: number };

export type Standing = {
  playerId: string;
  rank: number;
  total: number;
  move: number;
  turn?: { distanceKm: number; points: number; medal?: number };
};

function ranks(entries: { id: string; points: number }[]): Map<string, number> {
  const sorted = [...entries].sort((a, b) => b.points - a.points);
  const out = new Map<string, number>();
  sorted.forEach((e, i) => out.set(e.id, i > 0 && sorted[i - 1].points === e.points ? out.get(sorted[i - 1].id)! : i + 1));
  return out;
}

export function standings(scores: Score[], results: TurnResult[]): Standing[] {
  const turn = new Map(results.map((r) => [r.playerId, r]));
  const medals = new Map([...results].sort((a, b) => b.points - a.points).filter((r) => r.points > 0).slice(0, 3).map((r, i) => [r.playerId, i + 1]));
  const now = ranks(scores.map((s) => ({ id: s.playerId, points: s.points })));
  const before = ranks(scores.map((s) => ({ id: s.playerId, points: s.points - (turn.get(s.playerId)?.points ?? 0) })));
  return [...scores]
    .sort((a, b) => b.points - a.points)
    .map((s) => {
      const r = turn.get(s.playerId);
      return {
        playerId: s.playerId,
        rank: now.get(s.playerId)!,
        total: s.points,
        move: before.get(s.playerId)! - now.get(s.playerId)!,
        turn: r && { distanceKm: r.distanceKm, points: r.points, medal: medals.get(s.playerId) },
      };
    });
}
