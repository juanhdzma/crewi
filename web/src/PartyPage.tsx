import { type FormEvent, useEffect, useRef, useState } from "react";
import { fetchAvatars, type PartyState, saveSession, tokenFor } from "./party";
import { gameName, games } from "./games";
import { MostLikely, type MostLikelyView } from "./MostLikely";
import { useParty } from "./useParty";

export function PartyPage({ code }: { code: string }) {
  const [avatars, setAvatars] = useState<string[] | null | undefined>(undefined);
  const party = useParty(code);
  const { connect, hasToken, status } = party;
  const autoJoined = useRef(false);

  useEffect(() => {
    fetchAvatars(code).then((avatars) => {
      if (avatars === null && tokenFor(code)) saveSession(null);
      setAvatars(avatars);
    }, () => setAvatars(null));
  }, [code]);

  useEffect(() => {
    if (avatars && hasToken && status === "idle" && !autoJoined.current) {
      autoJoined.current = true;
      connect("", "");
    }
  }, [avatars, hasToken, status, connect]);

  if (avatars === undefined) return <Shell>Cargando…</Shell>;
  if (avatars === null) {
    return (
      <Shell>
        <p>Esta party no existe o ya terminó.</p>
        <a href="/" className="underline">Crear una nueva</a>
      </Shell>
    );
  }
  if (party.status === "left") {
    return (
      <Shell>
        <p>Saliste de la party.</p>
        <a href="/" className="underline">Volver al inicio</a>
      </Shell>
    );
  }
  if (party.status === "replaced") {
    return (
      <Shell>
        <p>Abriste esta party en otra pestaña o ventana.</p>
        <button onClick={() => connect("", "")} className="self-start rounded-xl bg-stone-900 px-6 py-3 font-semibold text-white hover:bg-stone-700">
          Seguir acá
        </button>
      </Shell>
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
  if (party.status === "connecting" || (hasToken && party.status !== "error")) return <Shell>Conectando…</Shell>;
  return <JoinForm avatars={avatars} error={party.error} onJoin={connect} />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-4">{children}</main>;
}

function JoinForm({ avatars, error, onJoin }: { avatars: string[]; error: string | null; onJoin: (name: string, avatar: string) => void }) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(avatars[0]);

  function submit(e: FormEvent) {
    e.preventDefault();
    onJoin(name, avatar);
  }

  return (
    <Shell>
      <h1 className="text-3xl font-bold">Unite a la party</h1>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-stone-600">Tu nombre</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            required
            autoFocus
            className="rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-stone-600">Avatar</legend>
          <div className="grid grid-cols-8 gap-2">
            {avatars.map((a) => (
              <button
                key={a}
                type="button"
                aria-label={`Avatar ${a}`}
                aria-pressed={a === avatar}
                onClick={() => setAvatar(a)}
                className={`aspect-square rounded-lg text-2xl ${a === avatar ? "bg-stone-900 ring-2 ring-stone-900" : "bg-white hover:bg-stone-100"}`}
              >
                {a}
              </button>
            ))}
          </div>
        </fieldset>
        <button className="rounded-xl bg-stone-900 px-6 py-3 font-semibold text-white hover:bg-stone-700">Entrar</button>
        {error && <p className="text-red-600">{error}</p>}
      </form>
    </Shell>
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
  const [copied, setCopied] = useState(false);
  const isLeader = state.leaderId === playerId;

  async function copyLink() {
    await navigator.clipboard.writeText(location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-stone-500">{state.game ? gameName(state.game.id) : "Party"}</p>
          <h1 className="font-mono text-3xl font-bold">{state.code}</h1>
        </div>
        <div className="flex gap-2">
          {state.game && isLeader && (
            <button onClick={() => send("endGame")} className="rounded-lg border border-stone-300 bg-white px-4 py-2 font-medium hover:bg-stone-100">
              Volver al lobby
            </button>
          )}
          <button onClick={copyLink} className="rounded-lg border border-stone-300 bg-white px-4 py-2 font-medium hover:bg-stone-100">
            {copied ? "Link copiado" : "Copiar link"}
          </button>
          <button onClick={onLeave} className="rounded-lg px-4 py-2 font-medium text-stone-600 hover:bg-stone-100">
            Salir
          </button>
        </div>
      </header>

      {reconnecting && <p className="rounded-lg bg-amber-100 px-4 py-2 text-amber-900">Reconectando…</p>}
      {actionError && <p className="rounded-lg bg-red-100 px-4 py-2 text-red-900">{actionError}</p>}

      {state.game?.id === "mostlikely" ? (
        <MostLikely view={state.game.view as MostLikelyView} players={state.players} isLeader={isLeader} send={send} />
      ) : (
        <Lobby state={state} playerId={playerId} isLeader={isLeader} send={send} />
      )}
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
                  {p.id === playerId && " (vos)"}
                </span>
                <span className="text-xs text-stone-500">{p.id === state.leaderId ? "Leader" : p.online ? "Online" : "Offline"}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Juegos</h2>
        {!isLeader && <p className="mb-3 text-stone-500">Esperando a que el leader elija un juego.</p>}
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
