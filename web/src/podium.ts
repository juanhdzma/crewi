export type Ranked = { id: string; score: number };
export type PodiumStep = { place: number; ids: string[]; score: number };

export function podiumSteps(ranked: Ranked[], steps = 3): { podium: PodiumStep[]; rest: Ranked[] } {
  const sorted = [...ranked].sort((a, b) => b.score - a.score);
  const podium: PodiumStep[] = [];
  const rest: Ranked[] = [];
  for (const r of sorted) {
    const last = podium[podium.length - 1];
    if (last && last.score === r.score) last.ids.push(r.id);
    else if (podium.length < steps) podium.push({ place: podium.length + 1, ids: [r.id], score: r.score });
    else rest.push(r);
  }
  return { podium, rest };
}

export type Placed = Ranked & { place: number };

export function finalReveal(ranked: Ranked[], finalistIds: string[]): { finalists: Placed[]; rest: Placed[]; winners: string[] } {
  const placed = ranked.map((r, i) => ({ ...r, place: i + 1 }));
  const byId = new Map(placed.map((p) => [p.id, p]));
  const lineup = finalistIds.length ? finalistIds : placed.slice(0, 3).map((p) => p.id);
  const finalists = lineup.map((id) => byId.get(id)).filter((p): p is Placed => !!p);
  const chosen = new Set(finalists.map((p) => p.id));
  const top = placed[0]?.score;
  return {
    finalists,
    rest: placed.filter((p) => !chosen.has(p.id)),
    winners: placed.filter((p) => p.score === top).map((p) => p.id),
  };
}

export type Spotlight = "gone" | "lit" | "dimmed" | "idle";

export function spotlight(id: string, lit: string | null, gone: string[]): Spotlight {
  if (gone.includes(id)) return "gone";
  if (lit === null) return "idle";
  return lit === id ? "lit" : "dimmed";
}
