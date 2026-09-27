import { useEffect, useState } from "react";
import { createParty, fetchAvatars, leaveParty, readSession, saveSession } from "./party";

export function Home() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openParty, setOpenParty] = useState<string | null>(null);

  useEffect(() => {
    const session = readSession();
    if (!session) return;
    fetchAvatars(session.code).then(
      (avatars) => (avatars ? setOpenParty(session.code) : saveSession(null)),
      () => {},
    );
  }, []);

  async function create() {
    setBusy(true);
    try {
      location.assign(`/p/${await createParty()}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  async function leave() {
    const session = readSession();
    if (session) await leaveParty(session).catch(() => {});
    saveSession(null);
    setOpenParty(null);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4">
      <h1 className="text-5xl font-bold tracking-tight">crewi</h1>
      <p className="text-lg text-stone-600">Juegos para tu equipo remoto. Creá una party y compartí el link.</p>
      {openParty && (
        <div className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm">
          <p>
            Seguís en la party <span className="font-mono font-bold">{openParty}</span>.
          </p>
          <div className="flex gap-2">
            <a href={`/p/${openParty}`} className="rounded-lg bg-stone-900 px-4 py-2 font-semibold text-white hover:bg-stone-700">
              Volver
            </a>
            <button onClick={leave} className="rounded-lg px-4 py-2 font-medium text-stone-600 hover:bg-stone-100">
              Salir de la party
            </button>
          </div>
        </div>
      )}
      <button
        onClick={create}
        disabled={busy}
        className="rounded-xl bg-stone-900 px-6 py-3 font-semibold text-white hover:bg-stone-700 disabled:opacity-50"
      >
        Crear party
      </button>
      {error && <p className="text-red-600">{error}</p>}
    </main>
  );
}
