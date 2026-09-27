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
  | { type: "error"; message: string };

export function partyCodeFromPath(path: string): string | null {
  const match = /^\/p\/([A-Za-z0-9]+)\/?$/.exec(path);
  return match ? match[1].toUpperCase() : null;
}

export function wsUrl(code: string, loc: Pick<Location, "protocol" | "host">): string {
  const scheme = loc.protocol === "https:" ? "wss" : "ws";
  return `${scheme}://${loc.host}/ws/${code}`;
}

export function tokenKey(code: string): string {
  return `crewi:token:${code}`;
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
