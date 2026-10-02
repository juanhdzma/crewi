import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { formatNames, formatPoints } from "./format";
import type { Player } from "./party";
import { Avatar, Confetti } from "./party-ui";
import { finalReveal, spotlight, type Placed, type Ranked, type Spotlight } from "./podium";

type Props = { ranked: Ranked[]; finalistIds: string[]; players: Player[]; header: React.ReactNode };
type Seat = { id: string; from?: DOMRect };

const stepHeights: Record<number, string> = { 1: "h-32", 2: "h-24", 3: "h-16" };
const stepColumns: Record<number, string> = { 1: "col-start-2", 2: "col-start-1", 3: "col-start-3" };
const candidateClasses: Record<Spotlight, string> = {
  gone: "w-0 opacity-0",
  lit: "w-28 scale-115",
  dimmed: "w-28 scale-90 opacity-35 saturate-50",
  idle: "w-28",
};
const flyEasing = "transform 1s cubic-bezier(.5,-.3,.3,1.3)";

export function FinalReveal({ ranked, finalistIds, players, header }: Props) {
  const byId = new Map(players.map((p) => [p.id, p]));
  const { finalists, rest, winners } = finalReveal(ranked, finalistIds);
  const [restShown, setRestShown] = useState(0);
  const [lineupOn, setLineupOn] = useState(false);
  const [gone, setGone] = useState<string[]>([]);
  const [lit, setLit] = useState<string | null>(null);
  const [seats, setSeats] = useState<Record<number, Seat>>({});
  const [caption, setCaption] = useState("");
  const [party, setParty] = useState(false);
  const [bursts, setBursts] = useState(0);
  const faces = useRef(new Map<string, HTMLElement>());
  const runKey = `${finalists.map((f) => f.id).join()}|${rest.length}`;

  useEffect(() => {
    let alive = true;
    const wait = (ms: number) => new Promise<boolean>((resolve) => setTimeout(() => resolve(alive), ms));
    const byPlace = new Map(finalists.map((f) => [f.place, f]));

    function seat(place: number) {
      const f = byPlace.get(place);
      if (!f) return;
      const from = faces.current.get(f.id)?.getBoundingClientRect();
      setSeats((s) => ({ ...s, [place]: { id: f.id, from } }));
      setGone((g) => [...g, f.id]);
    }

    async function roulette(candidates: Placed[], target: Placed) {
      const n = candidates.length;
      const steps = 14 + (((candidates.indexOf(target) - 14) % n) + n) % n;
      let delay = 70;
      for (let i = 0; i <= steps; i++) {
        setLit(candidates[i % n].id);
        if (!(await wait(delay))) return false;
        delay = Math.min(560, delay * 1.18);
      }
      return true;
    }

    async function run() {
      if (!(await wait(500))) return;
      for (let i = 1; i <= rest.length; i++) {
        setRestShown(i);
        if (!(await wait(900))) return;
      }
      setLineupOn(true);
      setCaption("Los finalistas");
      if (!(await wait(1100))) return;

      let remaining = finalists;
      for (const place of [3, 2]) {
        const target = byPlace.get(place);
        if (!target || remaining.length < 2) continue;
        setCaption(`¿Quién queda ${place}º?`);
        if (!(await roulette(remaining, target))) return;
        if (!(await wait(place === 3 ? 700 : 400))) return;
        setLit(null);
        seat(place);
        remaining = remaining.filter((f) => f !== target);
        if (!(await wait(place === 3 ? 1100 : 150))) return;
      }
      seat(1);
      if (!(await wait(1000))) return;
      setParty(true);
      for (const [burst, gap] of [[1, 700], [2, 900], [3, 0]]) {
        setBursts(burst);
        if (!(await wait(gap))) return;
      }
    }

    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRestShown(rest.length);
      setSeats(Object.fromEntries(finalists.map((f) => [f.place, { id: f.id }])));
      setParty(true);
    } else run();
    return () => {
      alive = false;
    };
  }, [runKey]);

  const winnerNames = winners.map((id) => byId.get(id)?.name ?? "?");
  const winnerPoints = finalists.find((f) => f.place === 1)?.score ?? 0;

  return (
    <section className="relative flex flex-col gap-4 overflow-hidden rounded-3xl bg-panel p-6 sm:p-10">
      <span className={`pointer-events-none absolute inset-0 z-10 bg-black/55 transition-opacity duration-500 ${lit ? "opacity-100" : "opacity-0"}`} aria-hidden />
      {party && <span className="pointer-events-none absolute inset-0 z-30 bg-white anim-flash" aria-hidden />}
      {Array.from({ length: bursts }, (_, i) => (
        <Confetti key={i} seed={i} />
      ))}

      <div className="flex justify-end">{header}</div>

      <div className="relative z-20 flex min-h-8 flex-col items-center text-center" aria-live="polite">
        {party ? (
          <>
            <p className="text-5xl leading-tight font-extrabold tracking-tight text-accent text-shadow-[0_0_30px_color-mix(in_srgb,var(--color-accent)_55%,transparent)] anim-party sm:text-6xl">
              {winners.length > 1 ? `¡Empate! ${formatNames(winnerNames)}` : `¡${winnerNames[0]} gana!`}
            </p>
            <p className="text-mute anim-rise">{formatPoints(winnerPoints)} puntos</p>
          </>
        ) : (
          <p className="text-xl font-extrabold tracking-tight">{caption}</p>
        )}
      </div>

      {lineupOn && (
        <div className={`relative z-20 grid transition-[grid-template-rows] duration-500 ${party ? "grid-rows-[0fr]" : "grid-rows-[1fr]"}`}>
          <ul className={`flex min-h-0 justify-center pt-2 ${party ? "overflow-hidden" : ""}`}>
            {finalists.map((f) => {
              const p = byId.get(f.id);
              const state = spotlight(f.id, lit, gone);
              return (
                <li
                  key={f.id}
                  className={`flex flex-col items-center gap-1.5 transition-all duration-300 anim-pop ${candidateClasses[state]}`}
                >
                  <span
                    ref={(el) => {
                      if (el) faces.current.set(f.id, el);
                    }}
                    className={`rounded-full transition-shadow duration-300 ${state === "lit" ? "shadow-[0_0_0_4px_#fff,0_0_0_10px_rgb(255_236_210/.25),0_0_60px_22px_rgb(255_236_210/.5)]" : ""}`}
                  >
                    {p && <Avatar player={p} size="lg" />}
                  </span>
                  <span className="max-w-full truncate font-bold">{p?.name}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mx-auto grid w-full max-w-xl grid-cols-3 items-end gap-3">
        {[1, 2, 3]
          .filter((place) => finalists.some((f) => f.place === place))
          .map((place) => {
            const s = seats[place];
            const p = s && byId.get(s.id);
            const score = finalists.find((f) => f.place === place)?.score ?? 0;
            return (
              <div key={place} className={`row-start-1 flex flex-col items-center gap-2 text-center ${stepColumns[place]}`}>
                <div className="flex min-h-30 flex-col items-center justify-end gap-1">
                  {p && (
                    <>
                      <span className={party && place === 1 ? "anim-hop" : ""}>
                        <FlyingFace from={s.from}>
                          <Avatar player={p} size="lg" className={place === 1 ? "ring-4 ring-accent" : ""} />
                        </FlyingFace>
                      </span>
                      <span className="line-clamp-2 text-sm font-bold anim-rise [--i:12]">{p.name}</span>
                      <span className="text-sm text-mute tabular-nums anim-rise [--i:13]">{formatPoints(score)} pts</span>
                    </>
                  )}
                </div>
                <span
                  className={`flex w-full items-start justify-center rounded-t-xl pt-2 text-3xl font-extrabold transition-colors duration-500 ${stepHeights[place]} ${
                    p ? (place === 1 ? "bg-accent text-on-accent" : "bg-panel-2 text-ink") : "bg-panel-2 text-mute"
                  }`}
                >
                  {place}
                </span>
              </div>
            );
          })}
      </div>

      {rest.length > 0 && (
        <ol className="mx-auto flex w-full max-w-xl flex-col gap-1.5">
          {rest.map((r, i) => {
            const p = byId.get(r.id);
            const shown = i >= rest.length - restShown;
            return (
              <li key={r.id} className={`flex items-center gap-3 rounded-xl bg-panel-2 px-3 py-2 ${shown ? "anim-rise" : "invisible"}`}>
                <span className="w-6 font-extrabold text-mute tabular-nums">{r.place}º</span>
                {p && <Avatar player={p} size="sm" />}
                <span className="flex-1 truncate font-bold">{p?.name}</span>
                <span className="font-bold tabular-nums">{formatPoints(r.score)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function FlyingFace({ from, children }: { from?: DOMRect; children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !from) return;
    const to = el.getBoundingClientRect();
    el.style.transition = "none";
    el.style.transform = `translate(${from.left + from.width / 2 - (to.left + to.width / 2)}px, ${from.top + from.height / 2 - (to.top + to.height / 2)}px)`;
    el.getBoundingClientRect();
    el.style.transition = flyEasing;
    el.style.transform = "";
  }, [from]);

  return (
    <span ref={ref} className="relative z-20 block">
      {children}
    </span>
  );
}
