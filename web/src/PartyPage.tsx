import { type FormEvent, useEffect, useRef, useState } from "react";
import { fetchAvatars, type PartyState } from "./party";
import { useParty } from "./useParty";

export function PartyPage({ code }: { code: string }) {
  const [avatars, setAvatars] = useState<string[] | null | undefined>(undefined);
  const party = useParty(code);
  const { connect, hasToken, status } = party;
  const autoJoined = useRef(false);

  useEffect(() => {
    fetchAvatars(code).then(setAvatars, () => setAvatars(null));
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
  if (party.state && party.playerId && party.status !== "error") {
    return <Lobby state={party.state} playerId={party.playerId} reconnecting={party.status === "reconnecting"} onLeave={party.leave} />;
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

function Lobby({ state, playerId, reconnecting, onLeave }: { state: PartyState; playerId: string; reconnecting: boolean; onLeave: () => void }) {
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
          <p className="text-sm text-stone-500">Party</p>
          <h1 className="font-mono text-3xl font-bold">{state.code}</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={copyLink} className="rounded-lg border border-stone-300 bg-white px-4 py-2 font-medium hover:bg-stone-100">
            {copied ? "Link copiado" : "Copiar link"}
          </button>
          <button onClick={onLeave} className="rounded-lg px-4 py-2 font-medium text-stone-600 hover:bg-stone-100">
            Salir
          </button>
        </div>
      </header>

      {reconnecting && <p className="rounded-lg bg-amber-100 px-4 py-2 text-amber-900">Reconectando…</p>}

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

      <section className="rounded-xl border border-dashed border-stone-300 p-6 text-center text-stone-500">
        {isLeader ? "Pronto vas a poder elegir un juego acá." : "Esperando a que el leader elija un juego."}
      </section>
    </main>
  );
}
