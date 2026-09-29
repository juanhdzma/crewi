import { Check, Copy, Play } from "lucide-react";
import { type CSSProperties, useState } from "react";
import { GameCopy, GameDemo, ScreenShare } from "./demos";
import { games } from "./games";
import type { PartyState } from "./party";
import { Avatar, HostChip, WaitingDots } from "./party-ui";
import { Button } from "./ui";

type Props = {
  state: PartyState;
  playerId: string;
  isLeader: boolean;
  send: (type: string, payload?: unknown) => void;
};

export function Lobby({ state, playerId, isLeader, send }: Props) {
  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="players-title">
        <h2 id="players-title" className="mb-4 text-lg font-bold">
          Jugadores ({state.players.length})
        </h2>
        <ul className="flex flex-wrap gap-x-5 gap-y-5">
          {state.players.map((p, i) => (
            <li key={p.id} className={`flex w-20 flex-col items-center gap-1.5 text-center anim-pop ${p.online ? "" : "opacity-40"}`} style={{ "--i": i } as CSSProperties}>
              <Avatar player={p} size="lg" />
              <span className="w-full truncate text-sm font-semibold">
                {p.name}
                {p.id === playerId && " (tú)"}
              </span>
              {p.id === state.leaderId ? <HostChip /> : !p.online && <span className="text-xs text-mute">desconectado</span>}
            </li>
          ))}
        </ul>
      </section>

      <InviteCard />

      <section aria-labelledby="games-title" className="flex flex-col gap-6">
        <h2 id="games-title" className="text-lg font-bold">
          Juegos
        </h2>
        {!isLeader && <WaitingDots text="Esperando a que el anfitrión elija un juego" />}
        {games.map((g) => (
          <ScreenShare key={g.id} label="Vista previa">
            <GameCopy
              name={g.name}
              scored={g.scored}
              text={g.pitch}
              action={
                isLeader && (
                  <Button size="lg" onClick={() => send("startGame", { game: g.id })}>
                    <Play className="size-5" aria-hidden />
                    Jugar
                  </Button>
                )
              }
            />
            <GameDemo id={g.id} />
          </ScreenShare>
        ))}
      </section>
    </div>
  );
}

function InviteCard() {
  const [copied, setCopied] = useState(false);
  const link = `${location.host}${location.pathname}`;

  async function copy() {
    await navigator.clipboard.writeText(location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-panel p-5">
      <div>
        <h2 className="font-bold">Invita a tu equipo</h2>
        <p className="text-sm text-mute">Pega el link en el chat de la llamada.</p>
      </div>
      <div className="flex min-w-0 basis-full items-center gap-2 sm:max-w-md sm:flex-1 sm:basis-auto">
        <span className="min-w-0 flex-1 truncate rounded-xl border-2 border-line bg-call px-4 py-2.5 font-semibold tabular-nums">{link}</span>
        <Button variant={copied ? "secondary" : "primary"} onClick={copy} className={copied ? "bg-ok! text-white! [--press-color:var(--color-ok)]" : ""}>
          {copied ? <Check className="size-5" aria-hidden /> : <Copy className="size-5" aria-hidden />}
          {copied ? "Copiado" : "Copiar"}
        </Button>
      </div>
    </section>
  );
}
