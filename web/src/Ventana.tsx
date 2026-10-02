import "leaflet/dist/leaflet.css";
import { divIcon, latLng } from "leaflet";
import { Check, ChevronRight, LocateFixed } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Circle, MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { FinalReveal } from "./FinalReveal";
import { formatDistance, formatPoints } from "./format";
import { escapeHtml } from "./html";
import { partyCodeFromPath, photoUrl, type Player } from "./party";
import { AnswerProgress, Avatar, ProgressDots } from "./party-ui";
import { personColor } from "./people";
import { standings } from "./standings";
import { Button } from "./ui";

type Point = { lat: number; lng: number };
type Area = { center: Point; radiusKm: number };
type Target = { center: Point; radiusM: number };
type Result = { playerId: string; guess: Point; distanceKm: number; points: number };

export type VentanaView = {
  phase: "setup" | "guessing" | "revealed" | "podium";
  ready?: string[];
  myLocation?: Target;
  turnPlayerId?: string;
  turn: number;
  turns: number;
  area?: Area;
  guessed?: string[];
  myGuess?: Point;
  target?: Target;
  results?: Result[];
  scores?: { playerId: string; points: number }[];
  finalists?: string[];
};

type Props = {
  view: VentanaView;
  players: Player[];
  playerId: string;
  isLeader: boolean;
  send: (type: string, payload?: unknown) => void;
};

const radiusOptions = [100, 200, 500];
const mapHeight = "h-[min(70vh,720px)] min-h-80";
const locateZoom = 15;
const flyDurationS = 1;

const tiles = {
  url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  attribution: "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
  maxZoom: 19,
};

const hints = [
  "Describe lo primero que ves al asomarte.",
  "¿En qué piso estás? ¿Qué tan lejos alcanzas a ver?",
  "¿Hay montañas, mar o edificios a lo lejos?",
  "¿Hacia dónde da tu ventana: montañas, centro, aeropuerto…?",
  "¿Es una zona residencial, comercial o de oficinas?",
  "Si caminaras 5 minutos desde tu casa, ¿qué encontrarías?",
];

export function Ventana({ view, players, playerId, isLeader, send }: Props) {
  const byId = new Map(players.map((p) => [p.id, p]));
  const [pending, setPending] = useState<Point | null>(null);

  useEffect(() => setPending(null), [view.turn, view.phase]);

  if (view.phase === "podium") return <FinalPodium view={view} players={players} isLeader={isLeader} send={send} />;
  if (view.phase === "setup") return <Setup view={view} isLeader={isLeader} send={send} />;

  const isMyTurn = view.turnPlayerId === playerId;
  const turnPlayer = byId.get(view.turnPlayerId ?? "");
  const me = byId.get(playerId);
  const guessers = players.filter((p) => p.online && p.id !== view.turnPlayerId);
  const guess = pending ?? view.myGuess;
  const area = view.area;
  const title = isMyTurn ? "Te toca: muestra tu ventana en la llamada" : `¿Dónde está la ventana de ${turnPlayer?.name ?? "alguien"}?`;
  const nextButton = isLeader && view.phase === "revealed" && (
    <Button onClick={() => send("next")}>{view.turn === view.turns - 1 ? "Ver resultado final" : "Siguiente turno"}</Button>
  );

  function pick(p: Point) {
    if (area && latLng(area.center).distanceTo(p) <= area.radiusKm * 1000) setPending(p);
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-3">
          <ProgressDots current={view.turn} total={view.turns} label="Turno" />
          <h2 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-balance sm:text-3xl">
            {!isMyTurn && turnPlayer && <Avatar player={turnPlayer} />}
            {title}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {isLeader && view.phase === "guessing" && (
            <Button variant="secondary" onClick={() => send("reveal")}>
              Revelar ya
            </Button>
          )}
          {nextButton}
        </div>
      </div>

      {view.phase === "guessing" && isMyTurn ? (
        <HintCard>
          <AnswerProgress people={guessers} done={view.guessed ?? []} verb="adivinaron" />
        </HintCard>
      ) : (
        <>
          {view.phase === "guessing" && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <p className="text-mute">Toca dentro del círculo donde crees que está la ventana.</p>
              <Button
                onClick={() => {
                  if (pending) send("guess", pending);
                  setPending(null);
                }}
                disabled={!pending}
              >
                {view.myGuess ? "Cambiar mi respuesta" : "Confirmar respuesta"}
              </Button>
              {view.myGuess && !pending && (
                <span className="flex items-center gap-1 text-sm font-semibold text-ok">
                  <Check className="size-4" aria-hidden />
                  Respuesta enviada
                </span>
              )}
            </div>
          )}
          <GameMap area={area} onClick={view.phase === "guessing" ? pick : undefined}>
            {area && <Circle center={area.center} radius={area.radiusKm * 1000} pathOptions={{ color: "#ffffff", weight: 2, dashArray: "8 8", fill: false }} interactive={false} />}
            {view.phase === "guessing" && guess && me && <Marker position={guess} icon={playerPin(me, "Tú")} interactive={false} />}
            {view.phase === "revealed" && view.target && <RevealLayers target={view.target} results={view.results ?? []} byId={byId} playerId={playerId} />}
          </GameMap>
        </>
      )}

    </section>
  );
}

function HintCard({ children }: { children: React.ReactNode }) {
  const [hint, setHint] = useState(0);
  return (
    <div className="flex flex-col items-center gap-6 rounded-3xl bg-panel px-6 py-10 text-center sm:py-14">
      <p className="text-sm font-extrabold tracking-wider text-accent-ink uppercase">
        Pista {hint + 1} de {hints.length}
      </p>
      <p key={hint} className="max-w-[22ch] text-3xl leading-tight font-extrabold tracking-tight text-balance anim-rise sm:text-4xl">
        {hints[hint]}
      </p>
      <Button variant="secondary" onClick={() => setHint((h) => (h + 1) % hints.length)}>
        Siguiente pista
        <ChevronRight className="size-5" aria-hidden />
      </Button>
      <p className="text-sm text-mute">Apunta tu cámara a la ventana. Las pistas son solo para ti.</p>
      <div className="flex flex-col items-center gap-4">{children}</div>
    </div>
  );
}

const standingRowPx = 56;
const countUpMs = 1100;

export function VentanaStandings({ view, players, playerId }: { view: VentanaView; players: Player[]; playerId: string }) {
  if (view.phase !== "revealed") return null;
  if (view.turn === view.turns - 1) {
    return (
      <aside className="rounded-2xl bg-panel p-4" aria-label="Puntajes">
        <h2 className="mb-1 font-bold">Puntajes</h2>
        <p className="text-sm text-mute">Se guardan para la revelación final.</p>
      </aside>
    );
  }
  return <TurnStandings key={view.turn} view={view} players={players} playerId={playerId} />;
}

function TurnStandings({ view, players, playerId }: { view: VentanaView; players: Player[]; playerId: string }) {
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setSettled(true));
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const byId = new Map(players.map((p) => [p.id, p]));
  const scores = view.scores ?? [];
  const rows = standings(scores, view.results ?? []);
  const gained = new Map(rows.map((r) => [r.playerId, r.turn?.points ?? 0]));
  const before = standings(scores.map((s) => ({ ...s, points: s.points - gained.get(s.playerId)! })), []);
  const position = new Map((settled ? rows : before).map((r, i) => [r.playerId, i]));
  return (
    <aside className="rounded-2xl bg-panel p-4" aria-label="Puntajes">
      <h2 className="mb-1 font-bold">Puntajes del turno</h2>
      {/* Rows keep a stable DOM order and move by `top`, so the overtakes animate. */}
      <ol className="relative" style={{ height: rows.length * standingRowPx }}>
        {[...rows]
          .sort((x, y) => x.playerId.localeCompare(y.playerId))
          .map((r) => {
            const p = byId.get(r.playerId);
            const overtake = r.move !== 0 ? (r.move > 0 ? "z-10 anim-overtake-up" : "anim-overtake-down") : "";
            return (
              <li
                key={r.playerId}
                className={`absolute inset-x-0 flex items-center gap-2 rounded-xl px-1 text-sm ${overtake} ${r.playerId === playerId ? "font-bold" : ""}`}
                style={{ top: position.get(r.playerId)! * standingRowPx, height: standingRowPx, transition: "top 700ms var(--ease-spring) 450ms" }}
              >
                <span className="w-4 text-right text-mute tabular-nums">{r.rank}</span>
                <Move move={r.move} />
                {p && <Avatar player={p} size="sm" />}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">{p?.name ?? "?"}</span>
                  {r.playerId === view.turnPlayerId ? (
                    <span className="text-xs text-accent-ink">presentó</span>
                  ) : r.turn ? (
                    <span className="text-xs font-normal text-mute">
                      {formatDistance(r.turn.distanceKm)} <span className="font-bold text-ok">+{formatPoints(r.turn.points)}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-mute">sin respuesta</span>
                  )}
                </span>
                <span className="font-bold tabular-nums">
                  <CountUp from={r.total - gained.get(r.playerId)!} value={r.total} />
                </span>
              </li>
            );
          })}
      </ol>
    </aside>
  );
}

function CountUp({ from: initial, value }: { from: number; value: number }) {
  const [shown, setShown] = useState(initial);
  const from = useRef(initial);

  useEffect(() => {
    const start = from.current;
    if (start === value || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      from.current = value;
      setShown(value);
      return;
    }
    const t0 = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / countUpMs);
      from.current = Math.round(start + (value - start) * (1 - (1 - k) ** 3));
      setShown(from.current);
      if (k < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return formatPoints(shown);
}

function Move({ move }: { move: number }) {
  if (move === 0) return <span className="w-7 text-center text-xs text-mute" aria-hidden>–</span>;
  const up = move > 0;
  return (
    <span className={`w-7 text-xs font-extrabold tabular-nums ${up ? "text-ok" : "text-danger"}`} aria-label={up ? `Subió ${move}` : `Bajó ${-move}`}>
      {up ? `▲${move}` : `▼${-move}`}
    </span>
  );
}

type SetupStep = "choose" | "pin" | "precision" | "done";

function Setup({ view, isLeader, send }: Omit<Props, "playerId" | "players">) {
  const current = view.myLocation;
  const [step, setStep] = useState<SetupStep>(current ? "done" : "choose");
  const [point, setPoint] = useState<Point | null>(null);
  const [locateTarget, setLocateTarget] = useState<Point | null>(null);
  const [radiusM, setRadiusM] = useState(0);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [flying, setFlying] = useState(false);
  const landed = useCallback(() => setFlying(false), []);
  const ready = view.ready ?? [];

  function locateMe() {
    if (!navigator.geolocation) {
      setGeoError("Tu navegador no soporta ubicación. Márcala en el mapa.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocateTarget(p);
        setFlying(true);
        setGeoError(null);
        setLocating(false);
        place(p);
      },
      () => {
        setGeoError("No pudimos obtener tu ubicación. Márcala en el mapa.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function place(p: Point) {
    setPoint(p);
    setStep("precision");
  }

  function restart() {
    setPoint(null);
    setLocateTarget(null);
    setGeoError(null);
    setStep("choose");
  }

  const shown = step === "done" ? current && { point: current.center, radiusM: current.radiusM } : point && { point, radiusM: step === "pin" ? 0 : radiusM };

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{step === "done" ? "Tu ventana está lista" : "¿Dónde está tu ventana?"}</h2>
          {step === "pin" && <p className="text-mute">Toca el mapa donde está tu ventana.</p>}
          {step === "done" && current && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1 text-sm font-semibold text-ok">
                <Check className="size-4" aria-hidden />
                Ubicación guardada{current.radiusM ? ` (zona de ${formatDistance(current.radiusM / 1000)})` : " (exacta)"}
              </span>
              <Button variant="secondary" size="sm" onClick={restart}>
                Cambiar
              </Button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {isLeader ? (
            <Button size="lg" onClick={() => send("start")} disabled={ready.length < 2}>
              Empezar ({ready.length} turnos)
            </Button>
          ) : (
            <p className="text-sm text-mute">El anfitrión empieza cuando estén listos.</p>
          )}
        </div>
      </div>

      <GameMap locateTarget={locateTarget} onArrive={landed} onClick={step === "pin" ? place : undefined}>
        {shown && (
          <>
            {shown.radiusM > 0 && !flying && <Circle center={shown.point} radius={shown.radiusM} pathOptions={{ color: "#ffffff", weight: 3, fillOpacity: 0.15 }} interactive={false} />}
            <Marker position={shown.point} icon={targetIcon} interactive={false} />
          </>
        )}
      </GameMap>

      <LockedModal open={step === "choose"} title="¿Dónde está tu ventana?">
        <p className="text-mute">Nadie la ve hasta que sea tu turno.</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={locateMe} disabled={locating}>
            <LocateFixed className="size-5" aria-hidden />
            {locating ? "Buscando…" : "Usar mi ubicación"}
          </Button>
          <Button variant="secondary" onClick={() => setStep("pin")} disabled={locating}>
            Marcarla en el mapa
          </Button>
        </div>
        {geoError && <p className="text-sm font-semibold text-danger">{geoError}</p>}
      </LockedModal>

      <LockedModal open={step === "precision"} title="¿Qué tan precisa?">
        <PrecisionOption selected={radiusM === 0} title="Exacta" text="Más difícil de adivinar, más puntos en juego." onSelect={() => setRadiusM(0)} />
        <PrecisionOption
          selected={radiusM > 0}
          title="Zona aproximada"
          text="Nadie ve tu punto exacto: el círculo se corre al azar y tu ubicación exacta no se guarda."
          onSelect={() => setRadiusM((r) => r || 200)}
        >
          {radiusM > 0 && (
            <span className="mt-2 flex flex-wrap gap-2">
              {radiusOptions.map((r) => (
                <button
                  key={r}
                  onClick={(e) => {
                    e.stopPropagation();
                    setRadiusM(r);
                  }}
                  aria-pressed={radiusM === r}
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${radiusM === r ? "bg-accent text-on-accent" : "bg-panel-2"}`}
                >
                  {formatDistance(r / 1000)}
                </button>
              ))}
            </span>
          )}
        </PrecisionOption>
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={() => setStep("pin")}>
            Atrás
          </Button>
          <Button
            onClick={() => {
              if (!point) return;
              send("setLocation", { ...point, radiusM });
              setStep("done");
            }}
          >
            Confirmar
          </Button>
        </div>
      </LockedModal>
    </section>
  );
}

// Browsers may close a modal dialog on a repeated Escape even when cancel is
// prevented, so it is reopened while it should stay open.
function LockedModal({ open, title, children }: { open: boolean; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => e.preventDefault()}
      onClose={() => open && ref.current?.showModal()}
      className="m-auto w-[min(100%-2rem,32rem)] rounded-3xl bg-panel p-0 text-ink backdrop:bg-black/60"
    >
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <h3 className="text-2xl font-extrabold tracking-tight">{title}</h3>
        {children}
      </div>
    </dialog>
  );
}

type PrecisionProps = { selected: boolean; title: string; text: string; onSelect: () => void; children?: React.ReactNode };

function PrecisionOption({ selected, title, text, onSelect, children }: PrecisionProps) {
  return (
    <div
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`flex cursor-pointer gap-3 rounded-2xl bg-panel p-4 ${selected ? "ring-2 ring-accent" : "hover:bg-panel-2"}`}
    >
      <span className={`mt-0.5 size-5 shrink-0 rounded-full ${selected ? "border-[6px] border-accent" : "border-2 border-mute"}`} aria-hidden />
      <span className="flex flex-col">
        <span className="font-bold">{title}</span>
        <span className="text-sm text-mute">{text}</span>
        {children}
      </span>
    </div>
  );
}

function FinalPodium({ view, players, isLeader, send }: Omit<Props, "playerId">) {
  return (
    <FinalReveal
      ranked={(view.scores ?? []).map((s) => ({ id: s.playerId, score: s.points }))}
      finalistIds={view.finalists ?? []}
      players={players}
      header={
        isLeader ? (
          <Button size="lg" onClick={() => send("endGame")}>
            Volver al lobby
          </Button>
        ) : (
          <p className="text-mute">Esperando al anfitrión…</p>
        )
      }
    />
  );
}

type GameMapProps = {
  area?: Area;
  locateTarget?: Point | null;
  onArrive?: () => void;
  onClick?: (p: Point) => void;
  children: React.ReactNode;
};

function GameMap({ area, locateTarget = null, onArrive, onClick, children }: GameMapProps) {
  return (
    <div className={`${mapHeight} relative overflow-hidden rounded-2xl bg-panel-2`}>
      <MapContainer center={[20, 0]} zoom={2} className="h-full w-full" worldCopyJump>
        <TileLayer url={tiles.url} attribution={tiles.attribution} maxZoom={tiles.maxZoom} />
        {onClick && <ClickHandler onClick={onClick} />}
        <Viewport area={area} locateTarget={locateTarget} onArrive={onArrive} />
        {children}
      </MapContainer>
    </div>
  );
}

function ClickHandler({ onClick }: { onClick: (p: Point) => void }) {
  useMapEvents({ click: (e) => onClick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

// Vector layers added mid-flight get an SVG renderer created during the zoom
// animation, which keeps the animation's scale and paints the whole map; the
// precision circle is only drawn once the flight ends.
function Viewport({ area, locateTarget, onArrive }: { area?: Area; locateTarget: Point | null; onArrive?: () => void }) {
  const map = useMap();
  const key = area ? `${area.center.lat},${area.center.lng},${area.radiusKm}` : "";

  useEffect(() => {
    if (area) map.fitBounds(latLng(area.center).toBounds(area.radiusKm * 2000), { animate: false });
  }, [map, key]);

  useEffect(() => {
    if (!locateTarget) return;
    map.once("moveend", () => onArrive?.());
    map.flyTo(locateTarget, Math.max(map.getZoom(), locateZoom), { duration: flyDurationS });
  }, [map, locateTarget, onArrive]);

  return null;
}

const targetIcon = divIcon({ className: "", html: '<span class="crewi-target"></span>', iconSize: [20, 20], iconAnchor: [10, 10] });

function playerPin(p: Player, label: string) {
  const code = partyCodeFromPath(location.pathname);
  const photo = code ? photoUrl(code, p) : null;
  const face = photo ? `<img src="${escapeHtml(photo)}" alt="">` : escapeHtml(p.avatar);
  return divIcon({
    className: "",
    html: `<span class="crewi-pin"><span class="crewi-pin-face" style="background:${personColor(p.id)}">${face}</span><span class="crewi-pin-name">${escapeHtml(label)}</span></span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function distanceLabel(km: number) {
  return divIcon({ className: "", html: `<span class="crewi-dist">${escapeHtml(formatDistance(km))}</span>`, iconSize: [0, 0] });
}

function accentColor() {
  return getComputedStyle(document.documentElement).getPropertyValue("--color-accent").trim() || "#ff7a59";
}

function RevealLayers({ target, results, byId, playerId }: { target: Target; results: Result[]; byId: Map<string, Player>; playerId: string }) {
  const accent = accentColor();
  return (
    <>
      {target.radiusM > 0 ? (
        <Circle center={target.center} radius={target.radiusM} pathOptions={{ color: accent, weight: 2.5, dashArray: "6 6", fillOpacity: 0.22 }} interactive={false} />
      ) : (
        <Marker position={target.center} icon={targetIcon} interactive={false} />
      )}
      {results.map((r) => (
        <Polyline key={`line-${r.playerId}`} positions={[r.guess, target.center]} pathOptions={{ color: "#ffffff", opacity: 0.75, weight: 2, dashArray: "4 6" }} interactive={false} />
      ))}
      {results
        .filter((r) => r.distanceKm > 0)
        .map((r) => (
          <Marker
            key={`dist-${r.playerId}`}
            position={{ lat: (r.guess.lat + target.center.lat) / 2, lng: (r.guess.lng + target.center.lng) / 2 }}
            icon={distanceLabel(r.distanceKm)}
            interactive={false}
          />
        ))}
      {results.map((r) => {
        const p = byId.get(r.playerId);
        return p ? <Marker key={r.playerId} position={r.guess} icon={playerPin(p, r.playerId === playerId ? "Tú" : p.name)} interactive={false} /> : null;
      })}
    </>
  );
}
