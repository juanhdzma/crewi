export type Player = {
  id: string;
  name: string;
  avatar: string;
  online: boolean;
};

export type PartyState = {
  code: string;
  leaderId: string;
  players: Player[];
};

export type ServerMessage =
  | { type: "welcome"; playerId: string; token: string }
  | { type: "state"; state: PartyState }
  | { type: "error"; message: string }
  | { type: "replaced" };

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

export async function fetchAvatars(code: string): Promise<string[] | null> {
  const res = await fetch(`/api/parties/${code}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("No se pudo cargar la party");
  const body = (await res.json()) as { avatars: string[] };
  return body.avatars;
}

export async function leaveParty(session: Session): Promise<void> {
  await fetch(`/api/parties/${session.code}/leave`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: session.token }),
  });
}
