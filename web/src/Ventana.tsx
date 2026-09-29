import "leaflet/dist/leaflet.css";
import { divIcon, type LatLngBoundsExpression } from "leaflet";
import { useEffect, useState } from "react";
import { Circle, MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { formatDistance, formatPoints } from "./format";
import type { Player } from "./party";

type Point = { lat: number; lng: number };
type Bounds = { south: number; west: number; north: number; east: number };
type Target = { center: Point; radiusM: number };

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
  results?: { playerId: string; guess: Point; distanceKm: number; points: number }[];
  scores?: { playerId: string; points: number }[];
};

type Props = {
  view: VentanaView;
  players: Player[];
  playerId: string;
  isLeader: boolean;
  send: (type: string, payload?: unknown) => void;
};

const primary = "rounded-xl bg-stone-900 px-6 py-3 font-semibold text-white hover:bg-stone-700 disabled:opacity-40";
const secondary = "rounded-lg border border-stone-300 bg-white px-4 py-2 font-medium hover:bg-stone-100 disabled:opacity-40";
const radiusOptions = [500, 1000, 2000];
const mapHeight = "h-[min(64vh,680px)] min-h-80";
const locateZoom = 15;
const flyDurationS = 1;

const tiles = {
  url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  attribution: "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
  maxZoom: 19,
};

export function Ventana({ view, players, playerId, isLeader, send }: Props) {
  const byId = new Map(players.map((p) => [p.id, p]));
  const [point, setPoint] = useState<Point | null>(null);
  const [locateTarget, setLocateTarget] = useState<Point | null>(null);
  const [radiusM, setRadiusM] = useState(0);
  const [pending, setPending] = useState<Point | null>(null);

  useEffect(() => setPending(null), [view.turn, view.phase]);

  if (view.phase === "podium") {
    return (
      <section className="flex max-w-2xl flex-col gap-4">
        <h2 className="text-2xl font-bold">Resultado final</h2>
        <Scoreboard scores={view.scores ?? []} byId={byId} highlight />
        {isLeader && (
          <button onClick={() => send("endGame")} className={`${primary} self-start`}>
            Volver al lobby
          </button>
        )}
      </section>
    );
  }

  const isMyTurn = view.turnPlayerId === playerId;
  const turnPlayer = byId.get(view.turnPlayerId ?? "");
  const canGuess = view.phase === "guessing" && !isMyTurn;
  const guessShown = pending ?? view.myGuess;

  function onMapClick(p: Point) {
    if (view.phase === "setup") setPoint(p);
    else if (canGuess) setPending(p);
  }

  return (
    <section className="flex flex-col gap-4">
      {view.phase !== "setup" && (
        <div>
          <p className="text-sm text-stone-500">
            Turno {view.turn + 1} de {view.turns}
          </p>
          <h2 className="text-2xl font-bold">
            {isMyTurn ? "Te toca: muestra tu ventana en la llamada" : `¿Dónde está la ventana de ${turnPlayer?.avatar ?? ""} ${turnPlayer?.name ?? "alguien"}?`}
          </h2>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className={`${mapHeight} relative overflow-hidden rounded-xl bg-stone-200 shadow-sm`}>
          <MapContainer center={[20, 0]} zoom={2} className="h-full w-full" worldCopyJump>
            <TileLayer url={tiles.url} attribution={tiles.attribution} maxZoom={tiles.maxZoom} />
            <ClickHandler onClick={onMapClick} />
            <Viewport bounds={view.phase === "setup" ? undefined : view.bounds} locateTarget={locateTarget} onArrive={setPoint} />
            {view.phase === "setup" && point && (
              <>
                {radiusM > 0 && <Circle center={point} radius={radiusM} pathOptions={{ color: "#ffffff", weight: 3, fillOpacity: 0.15 }} interactive={false} />}
                <Marker position={point} icon={dotIcon} interactive={false} />
              </>
            )}
            {view.phase === "guessing" && guessShown && <Marker position={guessShown} icon={dotIcon} interactive={false} />}
            {view.phase === "revealed" && view.target && <RevealLayers target={view.target} results={view.results ?? []} byId={byId} />}
          </MapContainer>
          {view.phase === "guessing" && isMyTurn && (
            <p className="absolute inset-x-4 top-4 rounded-xl bg-white/95 p-4 text-center text-stone-700 shadow">
              Comparte tu cámara apuntando afuera. El resto está adivinando en este mapa.
            </p>
          )}
        </div>

        <aside className="flex flex-col gap-5">
          {view.phase === "setup" ? (
            <SetupPanel
              view={view}
              players={players}
              byId={byId}
              isLeader={isLeader}
              send={send}
              point={point}
              radiusM={radiusM}
              setRadiusM={setRadiusM}
              onLocated={setLocateTarget}
            />
          ) : view.phase === "guessing" ? (
            <>
              {canGuess && (
                <div className="flex flex-col items-start gap-2">
                  <p className="text-stone-600">Haz clic en el mapa donde crees que está la ventana.</p>
                  <button
                    onClick={() => {
                      if (pending) send("guess", pending);
                      setPending(null);
                    }}
                    disabled={!pending}
                    className={primary}
                  >
                    {view.myGuess ? "Cambiar mi respuesta" : "Confirmar respuesta"}
                  </button>
                  {view.myGuess && !pending && <span className="text-sm text-green-700">✓ Respuesta enviada</span>}
                </div>
              )}
              <p className="text-stone-600">
                Adivinaron {(view.guessed ?? []).length}{" "}
                <span className="text-xl">{(view.guessed ?? []).map((id) => byId.get(id)?.avatar).join(" ")}</span>
              </p>
              {isLeader && (
                <button onClick={() => send("reveal")} className={`${secondary} self-start`}>
                  Revelar ya
                </button>
              )}
            </>
          ) : (
            <>
              <Results results={view.results ?? []} byId={byId} />
              {isLeader && (
                <button onClick={() => send("next")} className={`${primary} self-start`}>
                  {view.turn === view.turns - 1 ? "Ver resultado final" : "Siguiente turno"}
                </button>
              )}
            </>
          )}
          {view.phase !== "setup" && (
            <div>
              <h3 className="mb-2 font-semibold">Puntos</h3>
              <Scoreboard scores={view.scores ?? []} byId={byId} />
            </div>
          )}
        </aside>
      </div>
    </section>
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
function Viewport({ bounds, locateTarget, onArrive }: { bounds?: Bounds; locateTarget: Point | null; onArrive: (p: Point) => void }) {
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
    map.once("moveend", () => onArrive(locateTarget));
    map.flyTo(locateTarget, Math.max(map.getZoom(), locateZoom), { duration: flyDurationS });
  }, [map, locateTarget, onArrive]);

  return null;
}

const dotIcon = divIcon({
  className: "",
  html: '<span style="display:block;width:18px;height:18px;border-radius:9999px;background:#fff;border:4px solid #1c1917;box-shadow:0 0 0 2px #fff, 0 2px 6px rgb(0 0 0 / 0.5)"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const targetIcon = divIcon({
  className: "",
  html: '<span style="display:block;width:20px;height:20px;border-radius:9999px;background:#15803d;border:2px solid #fff;box-shadow:0 1px 4px rgb(0 0 0 / 0.4)"></span>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function avatarIcon(avatar: string) {
  return divIcon({
    className: "",
    html: `<span style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:9999px;background:#1c1917;border:2px solid #fff;font-size:18px;box-shadow:0 1px 4px rgb(0 0 0 / 0.4)">${avatar}</span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function RevealLayers({ target, results, byId }: { target: Target; results: NonNullable<VentanaView["results"]>; byId: Map<string, Player> }) {
  return (
    <>
      {target.radiusM > 0 ? (
        <Circle center={target.center} radius={target.radiusM} pathOptions={{ color: "#15803d", weight: 2, fillOpacity: 0.25 }} interactive={false} />
      ) : (
        <Marker position={target.center} icon={targetIcon} interactive={false} />
      )}
      {results.map((r) => (
        <Polyline key={`line-${r.playerId}`} positions={[r.guess, target.center]} pathOptions={{ color: "#44403c", opacity: 0.7, weight: 2, dashArray: "4 6" }} interactive={false} />
      ))}
      {results.map((r) => (
        <Marker key={r.playerId} position={r.guess} icon={avatarIcon(byId.get(r.playerId)?.avatar ?? "")} interactive={false} />
      ))}
    </>
  );
}

type SetupPanelProps = {
  view: VentanaView;
  players: Player[];
  byId: Map<string, Player>;
  isLeader: boolean;
  send: Props["send"];
  point: Point | null;
  radiusM: number;
  setRadiusM: (r: number) => void;
  onLocated: (p: Point) => void;
};

function SetupPanel({ view, players, byId, isLeader, send, point, radiusM, setRadiusM, onLocated }: SetupPanelProps) {
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
        onLocated({ lat: pos.coords.latitude, lng: pos.coords.longitude });
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
    <>
      <h2 className="text-xl font-bold">¿Dónde está tu ventana?</h2>
      <p className="text-stone-600">Usa tu ubicación o haz clic en el mapa. Nadie la ve hasta que sea tu turno.</p>
      <div className="flex flex-col items-start gap-2">
        <button onClick={locateMe} disabled={locating} className={secondary}>
          {locating ? "Buscando…" : "Usar mi ubicación"}
        </button>
        {geoError && <span className="text-sm text-red-600">{geoError}</span>}
      </div>
      <fieldset className="flex flex-wrap items-center gap-3">
        <legend className="mb-1 text-sm font-medium text-stone-600">¿Qué tan precisa?</legend>
        <label className="flex items-center gap-2">
          <input type="radio" checked={radiusM === 0} onChange={() => setRadiusM(0)} />
          Exacta
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" checked={radiusM > 0} onChange={() => setRadiusM(1000)} />
          Aproximada
        </label>
        {radiusM > 0 && (
          <select value={radiusM} onChange={(e) => setRadiusM(Number(e.target.value))} className="rounded-lg border border-stone-300 bg-white px-2 py-1">
            {radiusOptions.map((r) => (
              <option key={r} value={r}>
                Círculo de {formatDistance(r / 1000)}
              </option>
            ))}
          </select>
        )}
      </fieldset>
      {radiusM > 0 && <p className="text-sm text-stone-500">El círculo se corre al azar para que tu punto no quede en el centro. Tu ubicación exacta no se guarda.</p>}
      <div className="flex flex-col items-start gap-2">
        <button onClick={() => point && send("setLocation", { ...point, radiusM })} disabled={!point} className={primary}>
          {current ? "Actualizar ubicación" : "Confirmar ubicación"}
        </button>
        {current && <span className="text-sm text-green-700">✓ Ubicación guardada{current.radiusM ? ` (círculo de ${formatDistance(current.radiusM / 1000)})` : ""}</span>}
      </div>
      <div className="flex flex-col gap-3 border-t border-stone-200 pt-5">
        <p className="text-stone-600">
          Listos {ready.length} de {players.length}{" "}
          <span className="text-xl">{ready.map((id) => byId.get(id)?.avatar).join(" ")}</span>
        </p>
        {isLeader ? (
          <button onClick={() => send("start")} disabled={ready.length < 2} className={`${primary} self-start`}>
            Empezar ({ready.length} turnos)
          </button>
        ) : (
          <p className="text-stone-500">El anfitrión empieza cuando estén listos.</p>
        )}
      </div>
    </>
  );
}

function Results({ results, byId }: { results: NonNullable<VentanaView["results"]>; byId: Map<string, Player> }) {
  if (results.length === 0) return <p className="text-stone-500">Nadie adivinó en este turno.</p>;
  return (
    <ol className="flex flex-col gap-2">
      {results.map((r) => {
        const p = byId.get(r.playerId);
        return (
          <li key={r.playerId} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 shadow-sm">
            <span className="text-2xl">{p?.avatar}</span>
            <span className="flex-1 truncate font-medium">{p?.name}</span>
            <span className="whitespace-nowrap text-stone-500">{formatDistance(r.distanceKm)}</span>
            <span className="w-20 text-right font-semibold tabular-nums">+{formatPoints(r.points)}</span>
          </li>
        );
      })}
    </ol>
  );
}

function Scoreboard({ scores, byId, highlight }: { scores: NonNullable<VentanaView["scores"]>; byId: Map<string, Player>; highlight?: boolean }) {
  return (
    <ol className="flex flex-col gap-1">
      {scores.map((s, i) => {
        const p = byId.get(s.playerId);
        return (
          <li
            key={s.playerId}
            className={`flex items-center gap-3 rounded-lg px-3 py-1.5 ${highlight && i === 0 ? "bg-stone-900 text-white" : "bg-white shadow-sm"}`}
          >
            <span className="w-5 text-right tabular-nums text-stone-400">{i + 1}</span>
            <span className="text-xl">{p?.avatar}</span>
            <span className="flex-1 truncate">{p?.name}</span>
            <span className="font-semibold tabular-nums">{formatPoints(s.points)}</span>
          </li>
        );
      })}
    </ol>
  );
}
