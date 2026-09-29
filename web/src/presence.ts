export type Presence = "done" | "waiting" | "turn" | null;

type GameRef = { id: string; view: unknown } | null;

type Views = {
  phase?: string;
  voters?: string[];
  ready?: string[];
  guessed?: string[];
  turnPlayerId?: string;
};

export function presenceOf(game: GameRef, playerId: string): Presence {
  if (!game) return null;
  const view = game.view as Views;
  if (game.id === "mostlikely" && view.phase === "voting") return view.voters?.includes(playerId) ? "done" : "waiting";
  if (game.id !== "ventana") return null;
  if (view.phase === "setup") return view.ready?.includes(playerId) ? "done" : "waiting";
  if (view.turnPlayerId === playerId && (view.phase === "guessing" || view.phase === "revealed")) return "turn";
  if (view.phase === "guessing") return view.guessed?.includes(playerId) ? "done" : "waiting";
  return null;
}
