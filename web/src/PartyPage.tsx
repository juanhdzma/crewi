import { useEffect, useRef, useState } from "react";
import { fetchParty, type PartyInfo, type PartyState, saveSession, tokenFor, uploadPhoto } from "./party";
import { Join } from "./Join";
import { gameName, games } from "./games";
import { MostLikely, type MostLikelyView } from "./MostLikely";
import { ActionError, Connecting, EndedScreen, PeoplePanel, RoomHeader } from "./party-ui";
import { presenceOf } from "./presence";
import { Button } from "./ui";
import { useParty } from "./useParty";
import { Ventana, type VentanaView } from "./Ventana";

export function PartyPage({ code }: { code: string }) {
  const [info, setInfo] = useState<PartyInfo | null | undefined>(undefined);
  const pendingPhoto = useRef<Blob | null>(null);
  const party = useParty(code);
  const { connect, hasToken, status } = party;
  const autoJoined = useRef(false);

  useEffect(() => {
    fetchParty(code).then((info) => {
      if (info === null && tokenFor(code)) saveSession(null);
      setInfo(info);
    }, () => setInfo(null));
  }, [code]);

  useEffect(() => {
    if (info && hasToken && status === "idle" && !autoJoined.current) {
      autoJoined.current = true;
      connect("", "");
    }
  }, [info, hasToken, status, connect]);

  useEffect(() => {
    const photo = pendingPhoto.current;
    const token = tokenFor(code);
    if (status !== "joined" || !photo || !token) return;
    pendingPhoto.current = null;
    uploadPhoto(code, token, photo).catch((e) => console.warn(e));
  }, [status, code]);

  function join(name: string, avatar: string, photo: Blob | null) {
    pendingPhoto.current = photo;
    connect(name, avatar);
  }

  if (info === undefined) return <Connecting code={code} step="found" />;
  if (info === null) {
    return <EndedScreen title="Esta party ya terminó" text="No queda nada guardado. Crea una nueva y pega el link en el chat." action={<HomeLink label="Crear una nueva" />} />;
  }
  if (party.status === "left") {
    return <EndedScreen title="Saliste de la party" text="Cuando todos se van, la party se borra sola." action={<HomeLink label="Volver al inicio" />} />;
  }
  if (party.status === "replaced") {
    return (
      <EndedScreen
        title="Abriste esta party en otra pestaña"
        text="Solo una pestaña puede estar conectada a la vez."
        action={<Button onClick={() => connect("", "")}>Seguir aquí</Button>}
      />
    );
  }
  if (party.state && party.playerId && party.status !== "error") {
    return (
      <Room
        state={party.state}
        playerId={party.playerId}
        reconnecting={party.status === "reconnecting"}
        actionError={party.actionError}
        send={party.send}
        onLeave={party.leave}
      />
    );
  }
  if (party.status === "connecting" || (hasToken && party.status !== "error")) return <Connecting code={code} step="connecting" />;
  return <Join info={info} error={party.error} onJoin={join} />;
}

function HomeLink({ label }: { label: string }) {
  return (
    <a href="/" className="inline-flex items-center gap-2 rounded-full bg-accent px-7 py-4 text-lg font-bold text-on-accent press hover:bg-accent/90">
      {label}
    </a>
  );
}

type RoomProps = {
  state: PartyState;
  playerId: string;
  reconnecting: boolean;
  actionError: string | null;
  send: (type: string, payload?: unknown) => void;
  onLeave: () => void;
};

function Room({ state, playerId, reconnecting, actionError, send, onLeave }: RoomProps) {
  const isLeader = state.leaderId === playerId;
  const game = state.game;

  let content: React.ReactNode;
  if (game?.id === "mostlikely") content = <MostLikely view={game.view as MostLikelyView} players={state.players} isLeader={isLeader} send={send} />;
  else if (game?.id === "ventana") content = <Ventana view={game.view as VentanaView} players={state.players} playerId={playerId} isLeader={isLeader} send={send} />;
  else content = <Lobby state={state} playerId={playerId} isLeader={isLeader} send={send} />;

  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-6 px-4 py-6">
      <RoomHeader
        code={state.code}
        players={state.players}
        label={game ? gameName(game.id) : "Lobby"}
        canGoToLobby={!!game && isLeader}
        reconnecting={reconnecting}
        onLobby={() => send("endGame")}
        onLeave={onLeave}
      />
      <div className={reconnecting ? "pointer-events-none opacity-45 grayscale" : ""}>
        {game ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
            <div className="flex min-w-0 flex-col gap-4">
              {content}
              <ActionError message={actionError} />
            </div>
            <PeoplePanel players={state.players} leaderId={state.leaderId} playerId={playerId} presence={(id) => presenceOf(game, id)} />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {content}
            <ActionError message={actionError} />
          </div>
        )}
      </div>
    </main>
  );
}

function Lobby({ state, playerId, isLeader, send }: { state: PartyState; playerId: string; isLeader: boolean; send: RoomProps["send"] }) {
  return (
    <>
      <section>
        <h2 className="mb-3 font-semibold">Jugadores ({state.players.length})</h2>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {state.players.map((p) => (
            <li key={p.id} className={`flex items-center gap-3 rounded-xl bg-white px-3 py-2 shadow-sm ${p.online ? "" : "opacity-40"}`}>
              <span className="text-3xl">{p.avatar}</span>
              <span className="min-w-0">
                <span className="block truncate font-medium">
                  {p.name}
                  {p.id === playerId && " (tú)"}
                </span>
                <span className="text-xs text-stone-500">{p.id === state.leaderId ? "Anfitrión" : p.online ? "Online" : "Offline"}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Juegos</h2>
        {!isLeader && <p className="mb-3 text-stone-500">Esperando a que el anfitrión elija un juego.</p>}
        <ul className="flex flex-col gap-2">
          {games.map((g) => (
            <li key={g.id} className="flex items-center justify-between gap-4 rounded-xl bg-white p-4 shadow-sm">
              <div>
                <p className="font-semibold">
                  {g.name} <span className="ml-1 text-xs font-normal text-stone-500">{g.scored ? "Con puntos" : "Sin puntos"}</span>
                </p>
                <p className="text-sm text-stone-600">{g.description}</p>
              </div>
              {isLeader && (
                <button
                  onClick={() => send("startGame", { game: g.id })}
                  className="shrink-0 rounded-lg bg-stone-900 px-4 py-2 font-semibold text-white hover:bg-stone-700"
                >
                  Jugar
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
