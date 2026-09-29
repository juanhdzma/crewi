import type { ReactNode } from "react";
import { formatPoints } from "./format";

export function ScreenShare({ label, id, children }: { label: string; id?: string; children: ReactNode }) {
  return (
    <article id={id} className="scroll-mt-6 overflow-hidden rounded-2xl bg-panel">
      <p className="flex items-center gap-2 bg-panel-2 px-4 py-2 text-sm text-mute" aria-hidden>
        <span className="size-2 rounded-full bg-danger" />
        {label}
      </p>
      <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center">{children}</div>
    </article>
  );
}

export function GameCopy({ name, scored, text, action }: { name: string; scored: boolean; text: string; action?: ReactNode }) {
  return (
    <div>
      <h3 className="font-display text-3xl font-extrabold tracking-[-0.02em]">{name}</h3>
      <p className={`mt-3 inline-block rounded-full px-3 py-1 text-sm font-semibold ${scored ? "bg-accent text-on-accent" : "bg-panel-2 text-ink"}`}>
        {scored ? "Con puntos" : "Sin puntos"}
      </p>
      <p className="mt-4 max-w-[46ch] text-lg text-mute">{text}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function MostLikelyDemo() {
  const votes = [
    { name: "Beto", avatar: "🐼", votes: 4 },
    { name: "Ana", avatar: "🦊", votes: 2 },
    { name: "Fer", avatar: "🐯", votes: 1 },
  ];
  return (
    <div className="rounded-xl bg-call p-5 sm:p-6" aria-label="Ejemplo de resultados de una pregunta">
      <p className="font-display text-2xl leading-tight font-bold text-balance">¿Quién es más probable que llegue tarde a la daily?</p>
      <ol className="mt-5 flex flex-col gap-2">
        {votes.map((v) => (
          <li key={v.name} className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden>
              {v.avatar}
            </span>
            <span className="w-12 font-medium">{v.name}</span>
            <span className="h-3 flex-1 overflow-hidden rounded-full bg-panel-2">
              <span className="block h-full rounded-full bg-accent" style={{ width: `${(v.votes / 4) * 100}%` }} />
            </span>
            <span className="w-16 text-right text-sm text-mute tabular-nums">
              {v.votes} {v.votes === 1 ? "voto" : "votos"}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function VentanaDemo() {
  const guesses = [
    { name: "Ana", avatar: "🦊", distance: "adentro", points: 5000, x: 318, y: 132 },
    { name: "Caro", avatar: "🐸", distance: "850 m", points: 4218, x: 392, y: 96 },
    { name: "Dani", avatar: "🐙", distance: "3,4 km", points: 2533, x: 190, y: 218 },
  ];
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_96px] items-start gap-3 sm:grid-cols-[minmax(0,1fr)_150px]" aria-label="Ejemplo de un turno de Ventana">
      <div className="overflow-hidden rounded-xl bg-call">
        <svg viewBox="0 0 520 300" className="block h-auto w-full" role="img" aria-label="Mapa con la zona real y tres respuestas">
          <rect width="520" height="300" fill="#23262e" />
          <path d="M-10 220 C 120 190, 200 260, 330 230 S 470 180, 530 200" fill="none" stroke="#3157e6" strokeWidth="16" opacity="0.55" />
          <path d="M270 40 h110 v70 h-110 z" fill="#139c80" opacity="0.45" />
          {["M0 70 L520 110", "M0 160 L520 150", "M90 0 L140 300", "M240 0 L230 300", "M410 0 L470 300", "M0 260 L520 290"].map((d) => (
            <path key={d} d={d} stroke="#3a3f4a" strokeWidth="6" />
          ))}
          <circle cx="330" cy="120" r="46" style={{ fill: "var(--color-accent)", stroke: "var(--color-accent)" }} fillOpacity="0.18" strokeWidth="2.5" strokeDasharray="6 6" />
          {guesses.map((g) => (
            <g key={g.name}>
              <line x1={g.x} y1={g.y} x2="330" y2="120" stroke="#a9adb8" strokeWidth="1.5" strokeDasharray="4 6" />
              <circle cx={g.x} cy={g.y} r="17" fill="#15171c" stroke="#f4f2ec" strokeWidth="2" />
              <text x={g.x} y={g.y + 6} textAnchor="middle" fontSize="17">
                {g.avatar}
              </text>
            </g>
          ))}
        </svg>
        <ol className="flex flex-col divide-y divide-panel-2 text-sm">
          {guesses.map((g) => (
            <li key={g.name} className="flex items-center gap-3 px-4 py-2">
              <span aria-hidden>{g.avatar}</span>
              <span className="flex-1 font-medium">{g.name}</span>
              <span className="whitespace-nowrap text-mute">{g.distance}</span>
              <span className="w-14 text-right font-semibold tabular-nums">+{formatPoints(g.points)}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="relative overflow-hidden rounded-xl bg-panel-2">
        <WindowView />
        <span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white">Eli · su turno</span>
      </div>
    </div>
  );
}

function WindowView() {
  return (
    <svg viewBox="0 0 150 190" className="block h-auto w-full" role="img" aria-label="Vista desde una ventana hacia un parque">
      <rect width="150" height="190" fill="#3a3f4a" />
      <rect x="14" y="14" width="122" height="150" fill="#7fa4ff" />
      <rect x="14" y="96" width="30" height="68" fill="#2a2e37" />
      <rect x="44" y="80" width="24" height="84" fill="#1f2229" />
      <rect x="104" y="88" width="32" height="76" fill="#2a2e37" />
      <circle cx="80" cy="128" r="22" fill="#139c80" />
      <circle cx="100" cy="136" r="18" fill="#0f7f68" />
      <rect x="14" y="146" width="122" height="18" fill="#0f7f68" />
      <circle cx="112" cy="40" r="10" fill="#ffd9a3" />
      <path d="M75 14 V164 M14 89 H136" stroke="#3a3f4a" strokeWidth="6" />
      <rect x="14" y="14" width="122" height="150" fill="none" stroke="#4a505c" strokeWidth="6" />
      <rect x="6" y="164" width="138" height="10" fill="#4a505c" />
    </svg>
  );
}


export function GameDemo({ id }: { id: string }) {
  return id === "ventana" ? <VentanaDemo /> : <MostLikelyDemo />;
}
