export type Player = {
  id: string;
  name: string;
  avatar: string;
  online: boolean;
  photo?: number;
};

export type PartyState = {
  code: string;
  leaderId: string;
  players: Player[];
  game: { id: string; view: unknown } | null;
};

export type ServerMessage =
  | { type: "welcome"; playerId: string; token: string }
  | { type: "state"; state: PartyState }
  | { type: "error"; message: string }
  | { type: "replaced" }
  | { type: "actionError"; message: string };

export function partyCodeFromPath(path: string): string | null {
  const match = /^\/p\/([A-Za-z0-9]+)\/?$/.exec(path);
  return match ? match[1].toUpperCase() : null;
}

export function wsUrl(code: string, loc: Pick<Location, "protocol" | "host">): string {
  const scheme = loc.protocol === "https:" ? "wss" : "ws";
  return `${scheme}://${loc.host}/ws/${code}`;
}

export type Session = { code: string; token: string };

const sessionKey = "crewi:session";

export function readSession(storage: Storage = localStorage): Session | null {
  try {
    const raw = storage.getItem(sessionKey);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session | null, storage: Storage = localStorage) {
  try {
    if (session) storage.setItem(sessionKey, JSON.stringify(session));
    else storage.removeItem(sessionKey);
  } catch {
    // Storage can be unavailable (private mode); the player just can't rejoin after closing the browser.
  }
}

export function tokenFor(code: string, storage: Storage = localStorage): string | null {
  const session = readSession(storage);
  return session?.code === code ? session.token : null;
}

export async function createParty(): Promise<string> {
  const res = await fetch("/api/parties", { method: "POST" });
  if (!res.ok) throw new Error("No se pudo crear la party");
  const body = (await res.json()) as { code: string };
  return body.code;
}

export type PartyInfo = { avatars: string[]; players: Player[] };

export async function fetchParty(code: string): Promise<PartyInfo | null> {
  const res = await fetch(`/api/parties/${code}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("No se pudo cargar la party");
  const body = (await res.json()) as { avatars: string[]; players: Player[] | null };
  return { avatars: body.avatars, players: body.players ?? [] };
}

export async function uploadPhoto(code: string, token: string, photo: Blob): Promise<void> {
  const res = await fetch(`/api/parties/${code}/photo`, { method: "PUT", headers: { Authorization: `Bearer ${token}` }, body: photo });
  if (!res.ok) throw new Error("No se pudo subir la foto");
}

export function photoUrl(code: string, player: Pick<Player, "id" | "photo">): string | null {
  return player.photo ? `/api/parties/${code}/players/${player.id}/photo?v=${player.photo}` : null;
}

export function whoIsInside(names: string[]): string {
  if (names.length === 0) return "Eres la primera persona en entrar";
  if (names.length === 1) return `${names[0]} ya está adentro`;
  if (names.length === 2) return `${names[0]} y ${names[1]} ya están adentro`;
  const rest = names.length - 2;
  return `${names[0]}, ${names[1]} y ${rest} más ya están adentro`;
}

export async function leaveParty(session: Session): Promise<void> {
  await fetch(`/api/parties/${session.code}/leave`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: session.token }),
  });
}
