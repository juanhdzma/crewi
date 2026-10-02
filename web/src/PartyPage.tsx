import { useEffect, useRef, useState } from "react";
import { fetchParty, type PartyInfo, type PartyState, saveSession, tokenFor, uploadPhoto } from "./party";
import { Join } from "./Join";
import { gameName } from "./games";
import { Lobby } from "./Lobby";
import { MostLikely, type MostLikelyView } from "./MostLikely";
import { ActionError, Connecting, EndedScreen, PeoplePanel, RoomHeader } from "./party-ui";
import { presenceOf } from "./presence";
import { Button } from "./ui";
import { useParty } from "./useParty";
import { Ventana, VentanaStandings, type VentanaView } from "./Ventana";

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
            <div className="flex flex-col gap-6">
              <PeoplePanel players={state.players} leaderId={state.leaderId} playerId={playerId} presence={(id) => presenceOf(game, id)} />
              {game.id === "ventana" && <VentanaStandings view={game.view as VentanaView} players={state.players} playerId={playerId} />}
            </div>
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
