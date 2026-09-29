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
