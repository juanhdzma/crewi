import { CalendarDays, Gamepad2, Link2, MessagesSquare, Plus, ShieldCheck } from "lucide-react";
import { type MouseEvent, useEffect, useState } from "react";
import { createParty, fetchParty, leaveParty, readSession, saveSession } from "./party";
import { GameCopy, GameDemo, ScreenShare } from "./demos";
import { games } from "./games";
import { ThemeToggle } from "./ui";

const people = [
  { name: "Ana", avatar: "🦊", tile: "bg-p0" },
  { name: "Beto", avatar: "🐼", tile: "bg-p1" },
  { name: "Caro", avatar: "🐸", tile: "bg-p2" },
  { name: "Dani", avatar: "🐙", tile: "bg-p3" },
  { name: "Eli", avatar: "🦉", tile: "bg-p4" },
  { name: "Fer", avatar: "🐯", tile: "bg-p5" },
];

function scrollToSection(e: MouseEvent<HTMLAnchorElement>) {
  e.preventDefault();
  document.querySelector(e.currentTarget.hash)?.scrollIntoView();
}

function useCreateParty() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const restored = (e: PageTransitionEvent) => e.persisted && setBusy(false);
    addEventListener("pageshow", restored);
    return () => removeEventListener("pageshow", restored);
  }, []);

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
        <aside className="mx-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-panel-2 px-4 py-3 sm:mx-6">
          <p>
            Sigues en la party <span className="font-bold tracking-wider tabular-nums">{openParty}</span>.
          </p>
          <div className="flex gap-2">
            <a href={`/p/${openParty}`} className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-on-accent press hover:bg-accent/90">
              Volver
            </a>
            <button onClick={leave} className="rounded-full px-4 py-2 text-sm font-semibold text-mute hover:bg-panel hover:text-ink">
              Salir de la party
            </button>
          </div>
        </aside>
      )}

      <main className="pb-28">
        <Hero onCreate={party.create} busy={party.busy} />
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

const agenda = ["Qué salió bien", "Qué mejorar"];

function Hero({ onCreate, busy }: { onCreate: () => void; busy: boolean }) {
  return (
    <section aria-labelledby="hero-title" className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-10 sm:px-6 md:min-h-[calc(100dvh-10rem)] md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:pt-0">
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
          <a href="#como-funciona" onClick={scrollToSection} className="hidden rounded-full px-5 py-4 font-semibold text-ink hover:bg-panel-2 sm:inline-block">
            Ver cómo funciona
          </a>
        </div>
      </div>

      <figure className="flex -rotate-1 flex-col gap-4 rounded-3xl bg-panel p-6 shadow-[0_24px_60px_rgb(0_0_0/0.35)] anim-rise" aria-label="Ejemplo de invitación a una reunión">
        <figcaption className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-full bg-accent text-on-accent">
            <CalendarDays className="size-5" aria-hidden />
          </span>
          <span>
            <span className="block font-bold">Retro del viernes</span>
            <span className="block text-sm text-mute">Hoy · 10:30 – 11:00 · Meet</span>
          </span>
        </figcaption>
        <div className="rounded-2xl bg-call p-4">
          <p className="mb-2 text-sm text-mute">Agenda</p>
          <ol className="flex flex-col gap-1.5">
            {agenda.map((item, i) => (
              <li key={item}>
                {i + 1}. <span className="text-mute">{item}</span>
              </li>
            ))}
            <li className="flex flex-wrap items-center gap-2 font-bold">
              3. 10 min de crewi
              <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-on-accent">Nuevo</span>
            </li>
          </ol>
        </div>
        <div className="flex items-center gap-3" aria-hidden>
          <ul className="flex -space-x-2">
            {people.map((p) => (
              <li key={p.name} className={`flex size-8 items-center justify-center rounded-full ${p.tile} text-base ring-3 ring-panel`}>
                {p.avatar}
              </li>
            ))}
          </ul>
          <span className="text-sm text-mute">{people.length} invitados</span>
        </div>
      </figure>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    "Crea la party y copia el link.",
    "Pégalo en el chat de la llamada.",
    "Cada quien entra con su nombre y una foto o un emoji.",
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
          No, solo tu nombre y una foto o un emoji.
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
          No guardamos nombres, fotos, votos ni ubicaciones. La party vive en memoria mientras juegan y se borra sola cuando todos se van.
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
          <a key={href} href={href} onClick={scrollToSection} aria-label={label} className="flex items-center gap-2 rounded-full px-3 py-2.5 text-sm font-medium text-ink hover:bg-panel-2 sm:px-4">
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
