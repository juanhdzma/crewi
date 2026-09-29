import { ArrowLeft, Check, CircleAlert, Link2, LogOut, WifiOff } from "lucide-react";
import { useState } from "react";
import { partyCodeFromPath, photoUrl, type Player } from "./party";
import { personColor } from "./people";
import { type Presence } from "./presence";
import { ThemeToggle } from "./ui";

const avatarSizes = {
  sm: "size-8 text-base",
  md: "size-10 text-xl",
  lg: "size-16 text-4xl",
  xl: "size-24 text-5xl",
};

export function Avatar({ player, size = "md", className = "" }: { player: Pick<Player, "id" | "avatar" | "photo">; size?: keyof typeof avatarSizes; className?: string }) {
  const code = partyCodeFromPath(location.pathname);
  const photo = code ? photoUrl(code, player) : null;
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full leading-none ${avatarSizes[size]} ${className}`}
      style={{ background: personColor(player.id) }}
      aria-hidden
    >
      {photo ? <img src={photo} alt="" className="size-full object-cover" /> : player.avatar}
    </span>
  );
}

export function AvatarStack({ players, max = 5 }: { players: Player[]; max?: number }) {
  return (
    <span className="flex">
      {players.slice(0, max).map((p) => (
        <Avatar key={p.id} player={p} size="sm" className="-ml-2 ring-3 ring-panel first:ml-0" />
      ))}
    </span>
  );
}

export function HostChip() {
  return <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-on-accent">Anfitrión</span>;
}

type RoomHeaderProps = {
  code: string;
  players: Player[];
  label: string;
  canGoToLobby: boolean;
  reconnecting: boolean;
  onLobby: () => void;
  onLeave: () => void;
};

export function RoomHeader({ code, players, label, canGoToLobby, reconnecting, onLobby, onLeave }: RoomHeaderProps) {
  const [copied, setCopied] = useState(false);
  const online = players.filter((p) => p.online);

  async function copyLink() {
    await navigator.clipboard.writeText(location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl bg-panel px-4 py-3">
      <span className="hidden sm:flex">
        <AvatarStack players={online} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold tracking-wider tabular-nums">{code}</p>
        <p className="truncate text-sm text-mute">
          {online.length} {online.length === 1 ? "persona" : "personas"} · {label}
        </p>
      </div>
      {reconnecting && (
        <p className="flex items-center gap-2 rounded-full bg-panel-2 px-3 py-1.5 text-sm font-semibold" role="status">
          <WifiOff className="size-4" aria-hidden />
          Reconectando
        </p>
      )}
      <ThemeToggle />
      <div className="flex items-center gap-1 rounded-full bg-panel-2 p-1">
        <button
          onClick={copyLink}
          aria-label={copied ? "Link copiado" : "Copiar link"}
          title="Copiar link"
          className={`flex size-10 items-center justify-center rounded-full transition-colors ${copied ? "bg-ok text-white" : "hover:bg-panel"}`}
        >
          {copied ? <Check className="size-5" aria-hidden /> : <Link2 className="size-5" aria-hidden />}
        </button>
        {canGoToLobby && (
          <button onClick={onLobby} aria-label="Volver al lobby" title="Volver al lobby" className="flex size-10 items-center justify-center rounded-full hover:bg-panel">
            <ArrowLeft className="size-5" aria-hidden />
          </button>
        )}
        <button
          onClick={onLeave}
          aria-label="Salir de la party"
          title="Salir"
          className="flex size-10 items-center justify-center rounded-full text-accent-ink ring-2 ring-accent ring-inset hover:bg-accent hover:text-on-accent"
        >
          <LogOut className="size-5" aria-hidden />
        </button>
      </div>
    </header>
  );
}

const presenceLabel: Record<Exclude<Presence, null>, string> = { done: "✓ listo", waiting: "pensando…", turn: "su turno" };
const presenceColor: Record<Exclude<Presence, null>, string> = { done: "text-ok", waiting: "text-mute", turn: "text-accent-ink" };

export function PeoplePanel({ players, leaderId, playerId, presence }: { players: Player[]; leaderId: string; playerId: string; presence: (id: string) => Presence }) {
  const online = players.filter((p) => p.online);
  return (
    <aside className="rounded-2xl bg-panel p-4" aria-label="Personas en la party">
      <h2 className="mb-1 font-bold">Personas ({online.length})</h2>
      <ul className="divide-y divide-line">
        {online.map((p) => {
          const status = presence(p.id);
          return (
            <li key={p.id} className="flex items-center gap-3 py-2">
              <Avatar player={p} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                {p.name}
                {p.id === playerId && " (tú)"}
              </span>
              {p.id === leaderId && <HostChip />}
              {status && <span className={`text-xs whitespace-nowrap ${presenceColor[status]}`}>{presenceLabel[status]}</span>}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

export function ProgressDots({ current, total, label }: { current: number; total: number; label: string }) {
  return (
    <div className="flex gap-1.5" role="img" aria-label={`${label} ${current + 1} de ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-2.5 rounded-full transition-all ${i === current ? "w-7 bg-accent" : i < current ? "w-2.5 bg-accent/45" : "w-2.5 bg-panel-2"}`}
        />
      ))}
    </div>
  );
}

export function ActionError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-center gap-2 text-sm font-semibold text-danger">
      <CircleAlert className="size-4 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

export function Spinner({ className = "size-8" }: { className?: string }) {
  return <span className={`inline-block animate-spin rounded-full border-4 border-panel-2 border-t-accent ${className}`} aria-hidden />;
}

type Step = "found" | "connecting";

export function Connecting({ code, step }: { code: string; step: Step }) {
  const steps = [
    { label: "Party encontrada", state: step === "found" ? "now" : "done" },
    { label: "Conectando con los demás", state: step === "connecting" ? "now" : "todo" },
    { label: "Entrando al lobby", state: "todo" },
  ] as const;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 px-4" aria-live="polite">
      <div className="flex items-center gap-4">
        <Spinner />
        <p className="text-lg font-bold">
          Conectando a <span className="tracking-wider tabular-nums">{code}</span>
        </p>
      </div>
      <ol className="flex flex-col gap-2 pl-1">
        {steps.map((s) => (
          <li key={s.label} className={`flex items-center gap-3 text-sm ${s.state === "todo" ? "opacity-45" : ""}`}>
            <span className={`flex size-6 items-center justify-center rounded-full ${s.state === "done" ? "bg-ok text-white" : "bg-panel-2"}`}>
              {s.state === "done" ? <Check className="size-3.5" aria-hidden /> : s.state === "now" ? <Spinner className="size-3.5 border-2" /> : null}
            </span>
            {s.label}
          </li>
        ))}
      </ol>
    </main>
  );
}

const endedAvatars = ["🦊", "🐼", "🐸", "🐙", "🦉"];

export function EndedScreen({ title, text, action }: { title: string; text: string; action: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="flex opacity-45 grayscale-[70%]" aria-hidden>
        {endedAvatars.map((a, i) => (
          <span key={a} className="-ml-3 flex size-14 items-center justify-center rounded-full text-3xl ring-4 ring-call first:ml-0" style={{ background: `var(--color-p${i})` }}>
            {a}
          </span>
        ))}
      </span>
      <h1 className="text-4xl font-extrabold tracking-tight text-balance">{title}</h1>
      <p className="text-mute">{text}</p>
      {action}
    </main>
  );
}

export function Confetti() {
  const pieces = Array.from({ length: 28 }, (_, i) => ({
    left: (i * 37) % 100,
    delay: ((i * 53) % 50) / 100,
    color: i % 5 === 0 ? "var(--color-accent)" : `var(--color-p${i % 8})`,
  }));
  return (
    <span className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute -top-3 h-3 w-2 rounded-sm animate-[fall_1.8s_cubic-bezier(.3,.6,.4,1)_both]"
          style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s` }}
        />
      ))}
    </span>
  );
}
