import "leaflet/dist/leaflet.css";
import { divIcon, type LatLngBoundsExpression } from "leaflet";
import { Check, ChevronRight, LocateFixed } from "lucide-react";
import { useEffect, useState } from "react";
import { Circle, MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { formatDistance, formatPoints } from "./format";
import { escapeHtml } from "./html";
import { partyCodeFromPath, photoUrl, type Player } from "./party";
import { AnswerProgress, Avatar, Confetti, Podium, ProgressDots } from "./party-ui";
import { personColor } from "./people";
import { podiumSteps } from "./podium";
import { standings } from "./standings";
import { Button } from "./ui";

type Point = { lat: number; lng: number };
type Bounds = { south: number; west: number; north: number; east: number };
type Target = { center: Point; radiusM: number };
type Result = { playerId: string; guess: Point; distanceKm: number; points: number };

export type VentanaView = {
  phase: "setup" | "guessing" | "revealed" | "podium";
  ready?: string[];
  myLocation?: Target;
  turnPlayerId?: string;
  turn: number;
  turns: number;
  bounds?: Bounds;
  guessed?: string[];
  myGuess?: Point;
  target?: Target;
  results?: Result[];
  scores?: { playerId: string; points: number }[];
};

type Props = {
  view: VentanaView;
  players: Player[];
  playerId: string;
  isLeader: boolean;
  send: (type: string, payload?: unknown) => void;
};

const radiusOptions = [500, 1000, 2000];
const mapHeight = "h-[min(64vh,640px)] min-h-80";
const locateZoom = 15;
const flyDurationS = 1;

const tiles = {
  url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  attribution: "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
  maxZoom: 19,
};

const hints = [
  "Describe lo primero que ves al asomarte.",
  "¿Qué se escucha afuera ahora mismo?",
  "Da una pista del clima sin decir la ciudad.",
  "Nombra algo típico de tu barrio, sin decir su nombre.",
  "¿En qué piso estás? ¿Qué tan lejos alcanzas a ver?",
  "¿Hay montañas, mar o edificios a lo lejos?",
];

export function Ventana({ view, players, playerId, isLeader, send }: Props) {
  const byId = new Map(players.map((p) => [p.id, p]));
  const [pending, setPending] = useState<Point | null>(null);

  useEffect(() => setPending(null), [view.turn, view.phase]);

  if (view.phase === "podium") return <FinalPodium view={view} players={players} isLeader={isLeader} send={send} />;
  if (view.phase === "setup") return <Setup view={view} players={players} isLeader={isLeader} send={send} />;

  const isMyTurn = view.turnPlayerId === playerId;
  const turnPlayer = byId.get(view.turnPlayerId ?? "");
  const me = byId.get(playerId);
  const guessers = players.filter((p) => p.online && p.id !== view.turnPlayerId);
  const guess = pending ?? view.myGuess;
  const title = isMyTurn ? "Te toca: muestra tu ventana en la llamada" : `¿Dónde está la ventana de ${turnPlayer?.name ?? "alguien"}?`;
  const revealButton = isLeader && view.phase === "guessing" && (
    <div>
      <Button variant="secondary" onClick={() => send("reveal")}>
        Revelar ya
      </Button>
    </div>
  );

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <ProgressDots current={view.turn} total={view.turns} label="Turno" />
        <h2 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-balance sm:text-3xl">
          {!isMyTurn && turnPlayer && <Avatar player={turnPlayer} />}
          {title}
        </h2>
      </div>

      {view.phase === "guessing" && isMyTurn ? (
        <HintCard>
          <AnswerProgress people={guessers} done={view.guessed ?? []} verb="adivinaron" />
          {revealButton}
        </HintCard>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
          <GameMap bounds={view.bounds} onClick={view.phase === "guessing" ? setPending : undefined}>
            {view.phase === "guessing" && guess && me && <Marker position={guess} icon={playerPin(me, "Tú")} interactive={false} />}
            {view.phase === "revealed" && view.target && <RevealLayers target={view.target} results={view.results ?? []} byId={byId} playerId={playerId} />}
          </GameMap>
          <aside className="flex flex-col gap-5">
            {view.phase === "guessing" ? (
              <>
                <div className="flex flex-col items-start gap-2">
                  <p className="text-mute">Toca el mapa donde crees que está la ventana.</p>
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
                <AnswerProgress people={guessers} done={view.guessed ?? []} verb="adivinaron" />
                {revealButton}
              </>
            ) : (
              isLeader && (
                <div>
                  <Button size="lg" onClick={() => send("next")}>
                    {view.turn === view.turns - 1 ? "Ver resultado final" : "Siguiente turno"}
                  </Button>
                </div>
              )
            )}
            <StandingsTable view={view} byId={byId} playerId={playerId} />
          </aside>
        </div>
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

function StandingsTable({ view, byId, playerId }: { view: VentanaView; byId: Map<string, Player>; playerId: string }) {
  const revealed = view.phase === "revealed";
  const rows = standings(view.scores ?? [], revealed ? (view.results ?? []) : []);
  return (
    <div className="rounded-2xl bg-panel p-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-mute">
            <th className="pb-2 font-semibold">#</th>
            <th className="pb-2 font-semibold">Jugador</th>
            {revealed && <th className="pb-2 text-right font-semibold">Este turno</th>}
            <th className="pb-2 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => {
            const p = byId.get(r.playerId);
            return (
              <tr key={r.playerId} className={r.playerId === playerId ? "font-bold" : ""}>
                <td className="py-2 pr-2 whitespace-nowrap tabular-nums">
                  <span className="text-mute">{r.rank}</span>
                  {revealed && r.move !== 0 && (
                    <span className={`ml-1 text-xs font-extrabold ${r.move > 0 ? "text-ok" : "text-danger"}`}>
                      {r.move > 0 ? `▲${r.move}` : `▼${-r.move}`}
                    </span>
                  )}
                </td>
                <td className="py-2">
                  <span className="flex min-w-0 items-center gap-2">
                    {p && <Avatar player={p} size="sm" />}
                    <span className="truncate">{p?.name ?? "?"}</span>
                    {r.playerId === view.turnPlayerId && <span className="text-xs text-accent-ink">presentó</span>}
                  </span>
                </td>
                {revealed && (
                  <td className="py-2 text-right whitespace-nowrap">
                    {r.turn ? (
                      <>
                        {r.turn.medal && <span aria-label={`Puesto ${r.turn.medal} del turno`}>{["🥇", "🥈", "🥉"][r.turn.medal - 1]} </span>}
                        <span className="text-mute">{formatDistance(r.turn.distanceKm)}</span>{" "}
                        <span className="font-bold text-ok tabular-nums">+{formatPoints(r.turn.points)}</span>
                      </>
                    ) : (
                      <span className="text-mute">–</span>
                    )}
                  </td>
                )}
                <td className="py-2 text-right font-bold tabular-nums">{formatPoints(r.total)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Setup({ view, players, isLeader, send }: Omit<Props, "playerId">) {
  const [step, setStep] = useState<1 | 2>(1);
  const [point, setPoint] = useState<Point | null>(null);
  const [locateTarget, setLocateTarget] = useState<Point | null>(null);
  const [radiusM, setRadiusM] = useState(1000);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const ready = view.ready ?? [];
  const current = view.myLocation;

  function locateMe() {
    if (!navigator.geolocation) {
      setGeoError("Tu navegador no soporta ubicación. Márcala en el mapa.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocateTarget({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoError(null);
        setLocating(false);
      },
      () => {
        setGeoError("No pudimos obtener tu ubicación. Márcala en el mapa.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
      <GameMap locateTarget={locateTarget} onArrive={setPoint} onClick={step === 1 ? setPoint : undefined}>
        {point && (
          <>
            {step === 2 && radiusM > 0 && <Circle center={point} radius={radiusM} pathOptions={{ color: "#ffffff", weight: 3, fillOpacity: 0.15 }} interactive={false} />}
            <Marker position={point} icon={targetIcon} interactive={false} />
          </>
        )}
      </GameMap>
      <aside className="flex flex-col gap-5">
        <ol className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          <li className={`flex items-center gap-1.5 rounded-full px-3 py-1 ${step === 1 ? "bg-accent text-on-accent" : "bg-panel-2"}`}>
            {step === 2 ? <Check className="size-4" aria-hidden /> : "1"} Marca tu ventana
          </li>
          <li className={`rounded-full px-3 py-1 ${step === 2 ? "bg-accent text-on-accent" : "bg-panel-2 text-mute"}`}>2 Precisión</li>
        </ol>

        {step === 1 ? (
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-extrabold tracking-tight">¿Dónde está tu ventana?</h2>
            <p className="text-mute">Usa tu ubicación o toca el mapa. Nadie la ve hasta que sea tu turno.</p>
            <div>
              <Button variant="secondary" onClick={locateMe} disabled={locating}>
                <LocateFixed className="size-5" aria-hidden />
                {locating ? "Buscando…" : "Usar mi ubicación"}
              </Button>
            </div>
            {geoError && <p className="text-sm font-semibold text-danger">{geoError}</p>}
            <div>
              <Button onClick={() => setStep(2)} disabled={!point}>
                Siguiente
                <ChevronRight className="size-5" aria-hidden />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <h2 className="text-2xl font-extrabold tracking-tight">¿Qué tan precisa?</h2>
            <PrecisionOption selected={radiusM === 0} title="Exacta" text="Más difícil de adivinar, más puntos en juego." onSelect={() => setRadiusM(0)} />
            <PrecisionOption
              selected={radiusM > 0}
              title="Zona aproximada"
              text="Nadie ve tu punto exacto: el círculo se corre al azar y tu ubicación exacta no se guarda."
              onSelect={() => setRadiusM((r) => r || 1000)}
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
            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="ghost" onClick={() => setStep(1)}>
                Atrás
              </Button>
              <Button onClick={() => point && send("setLocation", { ...point, radiusM })}>{current ? "Actualizar ubicación" : "Confirmar"}</Button>
            </div>
            {current && (
              <span className="flex items-center gap-1 text-sm font-semibold text-ok">
                <Check className="size-4" aria-hidden />
                Ubicación guardada{current.radiusM ? ` (zona de ${formatDistance(current.radiusM / 1000)})` : ""}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-col gap-4 border-t border-line pt-5">
          <AnswerProgress people={players.filter((p) => p.online)} done={ready} verb="listos" />
          {isLeader ? (
            <div>
              <Button size="lg" onClick={() => send("start")} disabled={ready.length < 2}>
                Empezar ({ready.length} turnos)
              </Button>
            </div>
          ) : (
            <p className="text-sm text-mute">El anfitrión empieza cuando estén listos.</p>
          )}
        </div>
      </aside>
    </section>
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
  const byId = new Map(players.map((p) => [p.id, p]));
  const { podium, rest } = podiumSteps((view.scores ?? []).map((s) => ({ id: s.playerId, score: s.points })));
  return (
    <section className="relative flex flex-col gap-6 overflow-hidden rounded-3xl bg-panel p-6 sm:p-10">
      <Confetti />
      <h2 className="text-3xl font-extrabold tracking-tight">Resultado final</h2>
      <Podium steps={podium} players={players} scoreLabel={(n) => `${formatPoints(n)} pts`} />
      {rest.length > 0 && (
        <ol className="flex max-w-xl flex-col divide-y divide-line">
          {rest.map((r, i) => {
            const p = byId.get(r.id);
            return (
              <li key={r.id} className="flex items-center gap-3 py-2">
                <span className="w-5 text-right text-mute tabular-nums">{podium.length + i + 1}</span>
                {p && <Avatar player={p} size="sm" />}
                <span className="flex-1 truncate">{p?.name}</span>
                <span className="font-bold tabular-nums">{formatPoints(r.score)}</span>
              </li>
            );
          })}
        </ol>
      )}
      {isLeader && (
        <div>
          <Button size="lg" onClick={() => send("endGame")}>
            Volver al lobby
          </Button>
        </div>
      )}
    </section>
  );
}

type GameMapProps = {
  bounds?: Bounds;
  locateTarget?: Point | null;
  onArrive?: (p: Point) => void;
  onClick?: (p: Point) => void;
  children: React.ReactNode;
};

function GameMap({ bounds, locateTarget = null, onArrive, onClick, children }: GameMapProps) {
  return (
    <div className={`${mapHeight} relative overflow-hidden rounded-2xl bg-panel-2`}>
      <MapContainer center={[20, 0]} zoom={2} className="h-full w-full" worldCopyJump>
        <TileLayer url={tiles.url} attribution={tiles.attribution} maxZoom={tiles.maxZoom} />
        {onClick && <ClickHandler onClick={onClick} />}
        <Viewport bounds={bounds} locateTarget={locateTarget} onArrive={onArrive} />
        {children}
      </MapContainer>
    </div>
  );
}

function ClickHandler({ onClick }: { onClick: (p: Point) => void }) {
  useMapEvents({ click: (e) => onClick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

function toLeaflet(b: Bounds): LatLngBoundsExpression {
  return [
    [b.south, b.west],
    [b.north, b.east],
  ];
}

// Vector layers added mid-flight get an SVG renderer created during the zoom
// animation, which keeps the animation's scale and paints the whole map; the
// located pin is only placed once the flight ends.
function Viewport({ bounds, locateTarget, onArrive }: { bounds?: Bounds; locateTarget: Point | null; onArrive?: (p: Point) => void }) {
  const map = useMap();
  const key = bounds ? `${bounds.south},${bounds.west},${bounds.north},${bounds.east}` : "";

  useEffect(() => {
    if (!bounds) {
      // Leaflet clears max bounds when given none; its typings omit that case.
      map.setMaxBounds(undefined as unknown as LatLngBoundsExpression);
      map.setMinZoom(0);
      return;
    }
    const lb = toLeaflet(bounds);
    map.options.maxBoundsViscosity = 1;
    map.setMaxBounds(lb);
    map.fitBounds(lb, { animate: false });
    map.setMinZoom(map.getBoundsZoom(lb));
  }, [map, key]);

  useEffect(() => {
    if (!locateTarget) return;
    map.once("moveend", () => onArrive?.(locateTarget));
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
