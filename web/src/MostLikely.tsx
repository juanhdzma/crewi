import { Check, CheckCheck, Play, X } from "lucide-react";
import { type CSSProperties, useEffect, useState } from "react";
import type { Player } from "./party";
import { AnswerProgress, Avatar, Confetti, Podium, ProgressDots, WaitingDots } from "./party-ui";
import { podiumSteps } from "./podium";
import { Button } from "./ui";

export type MostLikelyView = {
  phase: "setup" | "voting" | "revealed";
  bank?: string[];
  question?: string;
  index: number;
  total: number;
  voters: string[];
  myVote?: string;
  results?: { playerId: string; votes: number }[];
};

type Props = {
  view: MostLikelyView;
  players: Player[];
  isLeader: boolean;
  send: (type: string, payload?: unknown) => void;
};

const votesLabel = (n: number) => `${n} ${n === 1 ? "voto" : "votos"}`;

export function MostLikely({ view, players, isLeader, send }: Props) {
  if (view.phase === "setup") {
    return isLeader && view.bank ? (
      <QuestionDeck bank={view.bank} onBegin={(questions) => send("begin", { questions })} />
    ) : (
      <WaitingDots text="Esperando a que el anfitrión elija las preguntas" />
    );
  }

  const last = view.index === view.total - 1;
  const voting = view.phase === "voting";

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex min-h-12 flex-wrap items-center justify-between gap-3">
          <ProgressDots current={view.index} total={view.total} label="Pregunta" />
          {isLeader ? (
            <Button onClick={() => send(voting ? "reveal" : "next")}>{voting ? "Revelar votos" : last ? "Terminar juego" : "Siguiente pregunta"}</Button>
          ) : (
            !voting && <p className="text-sm text-mute">A debatir. El anfitrión pasa a la siguiente.</p>
          )}
        </div>
        <QuestionCard question={view.question ?? ""} more={!last} />
      </div>

      {voting ? (
        <>
          <VoteGrid players={players} myVote={view.myVote} onVote={(id) => send("vote", { target: id })} />
          <AnswerProgress people={players.filter((p) => p.online)} done={view.voters} verb="votaron" />
        </>
      ) : (
        <Results key={view.index} results={view.results ?? []} players={players} />
      )}
    </section>
  );
}

function QuestionCard({ question, more }: { question: string; more: boolean }) {
  return (
    <div className="relative">
      {more && <div className="absolute inset-x-4 -bottom-3 top-4 rotate-2 rounded-3xl bg-accent/35" aria-hidden />}
      <div key={question} className="relative rounded-3xl bg-accent p-6 text-on-accent shadow-[0_18px_40px_rgb(0_0_0/0.3)] anim-rise sm:p-9">
        <p className="text-sm font-bold opacity-70">¿Quién es más probable que…</p>
        <p className="mt-1 text-3xl leading-tight font-extrabold tracking-tight text-balance sm:text-4xl">{question}?</p>
      </div>
    </div>
  );
}

function VoteGrid({ players, myVote, onVote }: { players: Player[]; myVote?: string; onVote: (id: string) => void }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {players.map((p, i) => {
        const mine = p.id === myVote;
        return (
          <li key={p.id} className="anim-pop" style={{ "--i": i } as CSSProperties}>
            <button
              onClick={() => onVote(p.id)}
              aria-pressed={mine}
              className={`flex w-full flex-col items-center gap-2 rounded-2xl px-3 py-4 transition-[translate,box-shadow,background-color] duration-300 ${
                mine
                  ? "-translate-y-1.5 bg-accent text-on-accent shadow-[0_10px_0_color-mix(in_srgb,var(--color-accent)_45%,black),0_18px_30px_rgb(0_0_0/.35)]"
                  : "bg-panel hover:bg-panel-2"
              }`}
            >
              <Avatar player={p} size="lg" />
              <span className="w-full truncate font-bold">{p.name}</span>
              <span className={`text-xs font-extrabold tracking-wide ${mine ? "" : "invisible"}`}>✓ TU VOTO</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Results({ results, players }: { results: { playerId: string; votes: number }[]; players: Player[] }) {
  const { podium, rest } = podiumSteps(results.map((r) => ({ id: r.playerId, score: r.votes })));
  const [revealed, setRevealed] = useState(0);
  const [drum, setDrum] = useState(false);
  const byId = new Map(players.map((p) => [p.id, p]));
  const steps = podium.length;

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(steps);
      return;
    }
    const timers: number[] = [];
    let at = 600;
    for (let k = 1; k < steps; k++, at += 800) timers.push(window.setTimeout(() => setRevealed(k), at));
    timers.push(window.setTimeout(() => setDrum(true), at));
    timers.push(
      window.setTimeout(() => {
        setDrum(false);
        setRevealed(steps);
      }, at + 1400),
    );
    return () => timers.forEach(clearTimeout);
  }, [steps]);

  if (results.length === 0) return <p className="text-mute">Nadie votó en esta pregunta.</p>;
  const done = revealed === steps;
  const winners = podium[0].ids.map((id) => byId.get(id)?.name ?? "?").join(" y ");
  return (
    <div className="relative flex flex-col gap-4">
      {done && (
        <>
          <span className="pointer-events-none absolute -inset-6 z-10 rounded-3xl bg-white anim-flash" aria-hidden />
          <Confetti />
        </>
      )}
      <div className="flex min-h-12 items-center justify-center text-center" aria-live="polite">
        {drum && <p className="text-xl font-extrabold animate-[pulse-soft_0.9s_ease-in-out_infinite]">Y el más probable es…</p>}
        {done && <p className="text-4xl font-extrabold tracking-tight text-accent anim-party">¡{winners}!</p>}
      </div>
      <Podium steps={podium} players={players} scoreLabel={votesLabel} shown={(place) => place > steps - revealed} />
      {done && rest.length > 0 && (
        <p className="text-center text-sm text-mute anim-rise">
          También: {rest.map((r) => `${byId.get(r.id)?.name ?? "?"} (${votesLabel(r.score)})`).join(", ")}
        </p>
      )}
    </div>
  );
}

function QuestionDeck({ bank, onBegin }: { bank: string[]; onBegin: (questions: number[]) => void }) {
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number[]>([]);
  const done = index >= bank.length;

  function decide(keep: boolean) {
    if (keep) setChosen((c) => [...c, index]);
    setIndex((i) => i + 1);
  }

  function approveRest() {
    setChosen((c) => [...c, ...Array.from({ length: bank.length - index }, (_, i) => index + i)]);
    setIndex(bank.length);
  }

  const start = (
    <Button size="lg" variant={done ? "primary" : "secondary"} onClick={() => onBegin(chosen)} disabled={chosen.length === 0}>
      <Play className="size-5" aria-hidden />
      Empezar con {chosen.length} {chosen.length === 1 ? "pregunta" : "preguntas"}
    </Button>
  );

  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-2xl font-extrabold">{done ? "Listo el mazo" : "¿Esta va?"}</h2>
        <span className="text-sm text-mute tabular-nums">
          {Math.min(index + 1, bank.length)} de {bank.length} · {chosen.length} {chosen.length === 1 ? "elegida" : "elegidas"}
        </span>
      </div>
      {done ? (
        <div className="flex flex-col items-start gap-4 rounded-3xl bg-panel p-6">
          <p className="text-mute">Revisaste todas las preguntas.</p>
          <div className="flex flex-wrap gap-2">
            {start}
            <Button
              variant="ghost"
              onClick={() => {
                setIndex(0);
                setChosen([]);
              }}
            >
              Volver a empezar
            </Button>
          </div>
        </div>
      ) : (
        <>
          <QuestionCard question={bank[index]} more={index < bank.length - 1} />
          <div className="flex justify-center gap-3 pt-6">
            <Button variant="secondary" size="lg" onClick={() => decide(false)}>
              <X className="size-5" aria-hidden />
              Saltar
            </Button>
            <Button size="lg" onClick={() => decide(true)}>
              <Check className="size-5" aria-hidden />
              Esta va
            </Button>
          </div>
          <div className="flex justify-center">
            <Button variant="ghost" onClick={approveRest}>
              <CheckCheck className="size-5" aria-hidden />
              Aprobar {index === 0 ? "todas" : "las que faltan"}
            </Button>
          </div>
          {chosen.length > 0 && <div className="flex justify-center">{start}</div>}
        </>
      )}
    </section>
  );
}
