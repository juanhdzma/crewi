import { Gamepad2, Link2, MessagesSquare, Mic, MicOff, MonitorUp, Plus, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { createParty, fetchParty, leaveParty, readSession, saveSession } from "./party";
import { GameCopy, GameDemo, ScreenShare } from "./demos";
import { games } from "./games";
import { ThemeToggle } from "./ui";

const people = [
  { name: "Ana", avatar: "🦊", tile: "bg-p0", line: "¿Y si jugamos algo antes de la retro?" },
  { name: "Beto", avatar: "🐼", tile: "bg-p1", line: "Les pego el link en el chat." },
  { name: "Caro", avatar: "🐸", tile: "bg-p2", line: "Ya entré. Solo puse mi nombre y un emoji." },
  { name: "Dani", avatar: "🐙", tile: "bg-p3", line: "¿Quién es más probable que llegue tarde a la daily?" },
  { name: "Eli", avatar: "🦉", tile: "bg-p4", line: "Mi ventana da a un parque. A ver si adivinan dónde." },
  { name: "Fer", avatar: "🐯", tile: "bg-p5", line: "Y cuando terminamos, no queda nada guardado." },
];

const presenterLine = { name: "crewi", line: "Crea una party y jueguen mientras hablan." };

const hopMs = 2800;

function useSpeaker() {
  const [speaker, setSpeaker] = useState(() => (matchMedia("(prefers-reduced-motion: reduce)").matches ? -1 : 0));
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setSpeaker((s) => (s + 1) % people.length), hopMs);
    return () => clearInterval(id);
  }, []);
  return speaker;
}

function useCreateParty() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function create() {
    setBusy(true);
    setError(null);
    try {
      location.assign(`/p/${await createParty()}`);
    } catch {
      setError("No pudimos crear la party. Intenta de nuevo.");
      setBusy(false);
    }
  }
  return { busy, error, create };
}

export function Home() {
  const speaker = useSpeaker();
  const party = useCreateParty();
  const [openParty, setOpenParty] = useState<string | null>(null);

  useEffect(() => {
    const session = readSession();
    if (!session) return;
    fetchParty(session.code).then(
      (avatars) => (avatars ? setOpenParty(session.code) : saveSession(null)),
      () => {},
    );
  }, []);

  async function leave() {
    const session = readSession();
    if (session) await leaveParty(session).catch(() => {});
    saveSession(null);
    setOpenParty(null);
  }

  return (
    <div className="min-h-dvh">
      <TopBar />

      {openParty && (
        <aside className="fixed top-16 right-4 left-4 z-30 flex flex-col gap-3 rounded-2xl bg-panel-2 p-4 shadow-[0_12px_32px_rgb(0_0_0/0.45)] sm:left-auto sm:w-80">
          <p>
            Sigues en la party <span className="font-bold tabular-nums tracking-wider">{openParty}</span>.
          </p>
          <div className="flex gap-2">
            <a href={`/p/${openParty}`} className="rounded-full bg-accent px-4 py-2 font-semibold text-on-accent hover:bg-accent/90">
              Volver
            </a>
            <button onClick={leave} className="rounded-full px-4 py-2 font-medium text-mute hover:bg-panel hover:text-ink">
              Salir de la party
            </button>
          </div>
        </aside>
      )}

      <main className="pb-28">
        <Hero speaker={speaker} onCreate={party.create} busy={party.busy} />
        <HowItWorks />
        <Games />
        <CallEnded onCreate={party.create} busy={party.busy} />
      </main>

      <ControlBar onCreate={party.create} busy={party.busy} />

      {party.error && (
        <p role="alert" className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full bg-danger px-5 py-2 font-semibold text-white shadow-[0_12px_32px_rgb(0_0_0/0.5)]">
          {party.error}
        </p>
      )}
    </div>
  );
}

function TopBar() {
  const [time] = useState(() => new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }));
  return (
    <header className="flex h-14 items-center justify-between px-4 sm:px-6">
      <a href="/" className="font-display text-2xl font-extrabold tracking-tight">
        crewi
      </a>
      <div className="flex items-center gap-2">
        <p className="hidden text-sm text-mute sm:block" aria-hidden>
          <span className="tabular-nums">{time}</span>
          <span className="mx-2">|</span>
          Retro del viernes
        </p>
        <ThemeToggle />
      </div>
    </header>
  );
}

function Caption({ speaker, className }: { speaker: number; className: string }) {
  const current = people[speaker] ?? presenterLine;
  return (
    <p className={className} aria-hidden>
      <span key={speaker} className="animate-[caption_400ms_var(--ease-out-expo)]">
        <span className="font-semibold text-accent-ink">{current.name}:</span> {current.line}
      </span>
    </p>
  );
}

function Hero({ speaker, onCreate, busy }: { speaker: number; onCreate: () => void; busy: boolean }) {
  return (
    <section aria-labelledby="hero-title" className="px-2 sm:px-4">
      <div className="grid gap-2 md:h-[calc(100dvh-10.5rem)] md:min-h-[560px] md:grid-cols-4 md:grid-rows-3">
        <div
          className={`flex flex-col justify-between gap-5 rounded-2xl bg-panel p-6 transition-shadow duration-300 sm:gap-10 sm:p-10 md:col-span-2 md:row-span-3 ${
            speaker === -1 ? "shadow-[inset_0_0_0_4px_var(--color-accent)]" : ""
          }`}
        >
          <p className="flex items-center gap-2 self-start rounded-full bg-black/40 px-3 py-1.5 text-sm font-medium" aria-hidden>
            <MonitorUp className="size-4 text-accent-ink" />
            crewi está compartiendo pantalla
          </p>
          <div className="hidden items-center gap-3 md:flex" aria-hidden>
            <ul className="flex -space-x-2">
              {people.map((p) => (
                <li key={p.name} className={`flex size-10 items-center justify-center rounded-full ${p.tile} text-xl ring-4 ring-panel`}>
                  {p.avatar}
                </li>
              ))}
            </ul>
            <p className="text-mute">
              <span className="font-semibold text-ink">{people.length} personas</span> ya entraron a la party
            </p>
          </div>
          <div className="flex flex-col gap-6">
          <h1 id="hero-title" className="max-w-[14ch] font-display text-5xl leading-[0.95] font-extrabold tracking-[-0.03em] text-balance sm:text-6xl lg:text-7xl">
            Juegos para la llamada en la que ya estás.
          </h1>
          <p className="max-w-[46ch] text-lg text-mute sm:text-xl">
            Crea una party, pega el link en el chat y jueguen juntos mientras hablan. Sin cuentas y sin instalar nada.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onCreate}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-7 py-4 text-lg font-bold text-on-accent press hover:bg-accent/90 disabled:opacity-60"
            >
              <Plus className="size-5" strokeWidth={2.5} aria-hidden />
              {busy ? "Creando…" : "Crear party"}
            </button>
            <a href="#como-funciona" className="hidden rounded-full px-5 py-4 font-semibold text-ink hover:bg-panel-2 sm:inline-block">
              Ver cómo funciona
            </a>
          </div>
          </div>
        </div>

        <Caption speaker={speaker} className="flex min-h-11 items-center justify-center px-2 text-center text-[15px] md:hidden" />

        <ul className="grid grid-cols-3 gap-2 md:col-span-2 md:row-span-3 md:grid-cols-2 md:grid-rows-3" aria-hidden>
          {people.map((p, i) => (
            <ParticipantTile key={p.name} person={p} speaking={i === speaker} />
          ))}
        </ul>
      </div>

      <Caption speaker={speaker} className="mx-auto mt-3 hidden min-h-12 max-w-2xl items-start justify-center px-4 text-center text-lg md:flex" />
    </section>
  );
}

function ParticipantTile({ person, speaking }: { person: (typeof people)[number]; speaking: boolean }) {
  return (
    <li
      className={`relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl sm:aspect-square md:aspect-auto ${person.tile} transition-shadow duration-300 ${
        speaking ? "shadow-[inset_0_0_0_4px_var(--color-accent)]" : ""
      }`}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-black/20 text-3xl sm:size-24 sm:text-6xl">{person.avatar}</span>
      {speaking && <SpeakingBars />}
      <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white sm:text-sm">
        {speaking ? <Mic className="size-3.5" aria-hidden /> : <MicOff className="size-3.5 opacity-70" aria-hidden />}
        {person.name}
      </span>
    </li>
  );
}

function SpeakingBars() {
  return (
    <span className="absolute top-2 right-2 flex size-8 items-center justify-center gap-[3px] rounded-full bg-accent">
      {[0, 180, 90].map((delay) => (
        <span key={delay} className="h-3.5 w-[3px] origin-center rounded-full bg-call animate-[speak_700ms_ease-in-out_infinite]" style={{ animationDelay: `${delay}ms` }} />
      ))}
    </span>
  );
}

function HowItWorks() {
  const steps = [
    "Crea la party y copia el link.",
    "Pégalo en el chat de la llamada.",
    "Cada quien entra con su nombre y un emoji.",
    "Quien creó la party elige el juego. Al terminar, eligen otro.",
  ];
  return (
    <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-6 px-4 pt-28 sm:px-6">
      <div className="grid gap-8 overflow-hidden rounded-3xl bg-panel pt-6 sm:pt-10 md:grid-cols-[1fr_minmax(0,380px)] md:items-stretch md:gap-10 md:pt-0 md:pl-10">
      <div className="px-6 sm:px-10 md:px-0 md:py-12">
        <h2 className="font-display text-4xl leading-none font-extrabold tracking-[-0.03em] text-balance sm:text-5xl">Una party es solo un link.</h2>
        <p className="mt-4 max-w-[52ch] text-lg text-mute">Nadie se registra ni descarga nada. La llamada sigue en Meet, Zoom o Teams; crewi pone el juego en la pantalla de cada uno.</p>
        <ol className="mt-8 flex flex-col gap-4">
          {steps.map((step, i) => (
            <li key={step} className="flex items-baseline gap-4 text-lg">
              <span className="font-display text-2xl font-extrabold text-accent-ink tabular-nums">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>
      <ChatPanel />
      </div>
    </section>
  );
}

function ChatPanel() {
  return (
    <figure className="bg-panel-2 p-6" aria-label="Ejemplo del chat de una llamada">
      <figcaption className="mb-4 flex items-center gap-2 border-b border-panel pb-3 font-semibold">
        <MessagesSquare className="size-4 text-mute" aria-hidden />
        Mensajes de la llamada
      </figcaption>
      <ol className="flex flex-col gap-4 text-[15px]">
        <ChatMessage from="Ana" avatar="🦊">
          <span className="mt-1 inline-flex items-center gap-2 rounded-lg bg-panel px-3 py-2 font-medium">
            <Link2 className="size-4 text-accent-ink" aria-hidden />
            <span className="tabular-nums">{location.host}/p/K7M2QX</span>
          </span>
        </ChatMessage>
        <ChatMessage from="Caro" avatar="🐸">
          ¿Tengo que crearme una cuenta?
        </ChatMessage>
        <ChatMessage from="Ana" avatar="🦊">
          No, solo tu nombre y un emoji.
        </ChatMessage>
        <li className="text-center text-sm text-mute">Beto, Caro y Dani entraron a la party</li>
      </ol>
    </figure>
  );
}

function ChatMessage({ from, avatar, children }: { from: string; avatar: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-panel text-lg" aria-hidden>
        {avatar}
      </span>
      <div>
        <p className="text-sm font-semibold">{from}</p>
        <div className="text-ink/90">{children}</div>
      </div>
    </li>
  );
}

function Games() {
  return (
    <section id="juegos" className="mx-auto max-w-6xl scroll-mt-6 px-4 pt-32 sm:px-6">
      <h2 className="font-display text-4xl leading-none font-extrabold tracking-[-0.03em] text-balance sm:text-5xl">Dos juegos para empezar.</h2>
      <p className="mt-4 max-w-[52ch] text-lg text-mute">Unos dan puntos, otros solo sacan conversación. Cada partida dura unos minutos y al terminar vuelven al lobby.</p>
      <div className="mt-12 flex flex-col gap-10">
        {games.map((g) => (
          <ScreenShare key={g.id} label={`${g.presenter} está presentando`} id={g.id === "ventana" ? "juego-ventana" : undefined}>
            <GameCopy name={g.name} scored={g.scored} text={g.pitch} />
            <GameDemo id={g.id} />
          </ScreenShare>
        ))}
      </div>
    </section>
  );
}

function CallEnded({ onCreate, busy }: { onCreate: () => void; busy: boolean }) {
  const facts = ["Sin cuentas", "Sin instalar nada", "Hasta 20 personas", "En el navegador"];
  return (
    <section id="privacidad" className="mx-auto max-w-6xl scroll-mt-6 px-4 pt-32 sm:px-6">
      <div className="flex flex-col items-center gap-6 rounded-3xl bg-panel px-6 py-16 text-center sm:py-24">
        <div className="flex flex-col items-center gap-3" aria-hidden>
          <ul className="flex -space-x-3">
            {people.map((p) => (
              <li key={p.name} className={`flex size-12 items-center justify-center rounded-full ${p.tile} text-2xl opacity-45 ring-4 ring-panel grayscale-[60%]`}>
                {p.avatar}
              </li>
            ))}
          </ul>
        </div>
        <h2 className="max-w-[18ch] font-display text-4xl leading-none font-extrabold tracking-[-0.03em] text-balance sm:text-6xl">Cuando se acaba, no queda nada.</h2>
        <p className="max-w-[54ch] text-lg text-mute">
          No guardamos nombres, votos ni ubicaciones. La party vive en memoria mientras juegan y se borra sola cuando todos se van.
        </p>
        <ul className="flex flex-wrap justify-center gap-2">
          {facts.map((f) => (
            <li key={f} className="rounded-full bg-panel-2 px-4 py-1.5 text-sm font-medium">
              {f}
            </li>
          ))}
        </ul>
        <button
          onClick={onCreate}
          disabled={busy}
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-accent px-7 py-4 text-lg font-bold text-on-accent press hover:bg-accent/90 disabled:opacity-60"
        >
          <Plus className="size-5" strokeWidth={2.5} aria-hidden />
          {busy ? "Creando…" : "Crear party"}
        </button>
      </div>
      <footer className="py-10 text-center text-sm text-mute">crewi · juegos para equipos remotos</footer>
    </section>
  );
}

function ControlBar({ onCreate, busy }: { onCreate: () => void; busy: boolean }) {
  const links = [
    { href: "#como-funciona", label: "Cómo funciona", Icon: MessagesSquare },
    { href: "#juegos", label: "Juegos", Icon: Gamepad2 },
    { href: "#privacidad", label: "Privacidad", Icon: ShieldCheck },
  ];
  return (
    <nav aria-label="Secciones" className="fixed inset-x-0 bottom-4 z-20 flex justify-center px-4">
      <div className="flex items-center gap-1 rounded-full bg-panel p-1.5 shadow-[0_12px_32px_rgb(0_0_0/0.5)]">
        {links.map(({ href, label, Icon }) => (
          <a key={href} href={href} aria-label={label} className="flex items-center gap-2 rounded-full px-3 py-2.5 text-sm font-medium text-ink hover:bg-panel-2 sm:px-4">
            <Icon className="size-5" aria-hidden />
            <span className="hidden sm:inline">{label}</span>
          </a>
        ))}
        <button
          onClick={onCreate}
          disabled={busy}
          className="ml-1 flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-bold text-on-accent press hover:bg-accent/90 disabled:opacity-60 sm:px-5"
        >
          <Plus className="size-5" strokeWidth={2.5} aria-hidden />
          {busy ? "Creando…" : "Crear party"}
        </button>
      </div>
    </nav>
  );
}
