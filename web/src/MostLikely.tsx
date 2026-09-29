import { useState } from "react";
import type { Player } from "./party";

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

const primary = "rounded-xl bg-stone-900 px-6 py-3 font-semibold text-white hover:bg-stone-700 disabled:opacity-40";

export function MostLikely({ view, players, isLeader, send }: Props) {
  if (view.phase === "setup") {
    return isLeader && view.bank ? (
      <QuestionPicker bank={view.bank} onBegin={(questions) => send("begin", { questions })} />
    ) : (
      <p className="py-10 text-center text-stone-500">El anfitrión está eligiendo las preguntas…</p>
    );
  }

  const byId = new Map(players.map((p) => [p.id, p]));
  const last = view.index === view.total - 1;

  return (
    <section className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-stone-500">
          Pregunta {view.index + 1} de {view.total}
        </p>
        <h2 className="text-2xl font-bold sm:text-3xl">¿Quién es más probable que {view.question}?</h2>
      </div>

      {view.phase === "voting" ? (
        <>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {players.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => send("vote", { target: p.id })}
                  aria-pressed={view.myVote === p.id}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left shadow-sm ${
                    view.myVote === p.id ? "bg-stone-900 text-white" : "bg-white hover:bg-stone-100"
                  }`}
                >
                  <span className="text-3xl">{p.avatar}</span>
                  <span className="truncate font-medium">{p.name}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="text-stone-600">
            Votaron {view.voters.length} de {players.filter((p) => p.online).length}{" "}
            <span className="text-xl">{view.voters.map((id) => byId.get(id)?.avatar).join(" ")}</span>
          </p>
          {isLeader && (
            <button onClick={() => send("reveal")} className={`${primary} self-start`}>
              Revelar votos
            </button>
          )}
        </>
      ) : (
        <>
          <ResultsList results={view.results ?? []} byId={byId} />
          {isLeader ? (
            <div className="flex gap-2">
              <button onClick={() => send("next")} className={primary}>
                {last ? "Terminar juego" : "Siguiente pregunta"}
              </button>
            </div>
          ) : (
            <p className="text-stone-500">A debatir. El anfitrión pasa a la siguiente cuando estén listos.</p>
          )}
        </>
      )}
    </section>
  );
}

function ResultsList({ results, byId }: { results: { playerId: string; votes: number }[]; byId: Map<string, Player> }) {
  if (results.length === 0) return <p className="text-stone-500">Nadie votó en esta pregunta.</p>;
  const max = results[0].votes;
  return (
    <ol className="flex flex-col gap-2">
      {results.map((r) => {
        const p = byId.get(r.playerId);
        return (
          <li key={r.playerId} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 shadow-sm">
            <span className="text-3xl">{p?.avatar}</span>
            <span className="w-32 truncate font-medium">{p?.name}</span>
            <span className="h-3 flex-1 overflow-hidden rounded-full bg-stone-100">
              <span className="block h-full rounded-full bg-stone-900" style={{ width: `${(r.votes / max) * 100}%` }} />
            </span>
            <span className="w-16 text-right tabular-nums">
              {r.votes} {r.votes === 1 ? "voto" : "votos"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function QuestionPicker({ bank, onBegin }: { bank: string[]; onBegin: (questions: number[]) => void }) {
  const [selected, setSelected] = useState<number[]>(() => bank.map((_, i) => i));
  const all = selected.length === bank.length;

  function toggle(i: number) {
    setSelected((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i].sort((a, b) => a - b)));
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Elige las preguntas</h2>
        <button onClick={() => setSelected(all ? [] : bank.map((_, i) => i))} className="text-sm font-medium text-stone-600 underline">
          {all ? "Quitar todas" : "Elegir todas"}
        </button>
      </div>
      <ul className="flex flex-col gap-1">
        {bank.map((q, i) => (
          <li key={i}>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg bg-white px-3 py-2 shadow-sm">
              <input type="checkbox" checked={selected.includes(i)} onChange={() => toggle(i)} className="size-4" />
              <span>¿Quién es más probable que {q}?</span>
            </label>
          </li>
        ))}
      </ul>
      <button onClick={() => onBegin(selected)} disabled={selected.length === 0} className={`${primary} self-start`}>
        Empezar ({selected.length})
      </button>
    </section>
  );
}
