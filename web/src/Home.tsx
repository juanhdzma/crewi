import { useState } from "react";
import { createParty } from "./party";

export function Home() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    try {
      location.assign(`/p/${await createParty()}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4">
      <h1 className="text-5xl font-bold tracking-tight">crewi</h1>
      <p className="text-lg text-stone-600">Juegos para tu equipo remoto. Creá una party y compartí el link.</p>
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
