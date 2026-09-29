import { describe, expect, it } from "vitest";
import { partyCodeFromPath, photoUrl, readSession, saveSession, tokenFor, whoIsInside, wsUrl } from "./party";

describe("partyCodeFromPath", () => {
  it("extracts and uppercases the code", () => {
    expect(partyCodeFromPath("/p/abc234")).toBe("ABC234");
    expect(partyCodeFromPath("/p/ABC234/")).toBe("ABC234");
  });

  it("returns null for other paths", () => {
    expect(partyCodeFromPath("/")).toBeNull();
    expect(partyCodeFromPath("/p/")).toBeNull();
    expect(partyCodeFromPath("/p/abc/extra")).toBeNull();
  });
});

describe("wsUrl", () => {
  it("uses wss behind https", () => {
    expect(wsUrl("ABC234", { protocol: "https:", host: "crewi.example" })).toBe("wss://crewi.example/ws/ABC234");
    expect(wsUrl("ABC234", { protocol: "http:", host: "localhost:5173" })).toBe("ws://localhost:5173/ws/ABC234");
  });
});

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, v),
  };
}

describe("session", () => {
  it("returns the token only for the stored party", () => {
    const storage = memoryStorage();
    saveSession({ code: "ABC234", token: "t1" }, storage);
    expect(tokenFor("ABC234", storage)).toBe("t1");
    expect(tokenFor("XYZ999", storage)).toBeNull();
    saveSession(null, storage);
    expect(readSession(storage)).toBeNull();
  });

  it("ignores corrupted storage", () => {
    const storage = memoryStorage();
    storage.setItem("crewi:session", "{not json");
    expect(readSession(storage)).toBeNull();
  });
});

describe("whoIsInside", () => {
  it("summarizes who already joined", () => {
    expect(whoIsInside([])).toBe("Eres la primera persona en entrar");
    expect(whoIsInside(["Ana"])).toBe("Ana ya está adentro");
    expect(whoIsInside(["Ana", "Beto"])).toBe("Ana y Beto ya están adentro");
    expect(whoIsInside(["Ana", "Beto", "Caro", "Dani"])).toBe("Ana, Beto y 2 más ya están adentro");
  });
});

describe("photoUrl", () => {
  it("is null without a photo and busts the cache per revision", () => {
    expect(photoUrl("ABC", { id: "p1" })).toBeNull();
    expect(photoUrl("ABC", { id: "p1", photo: 3 })).toBe("/api/parties/ABC/players/p1/photo?v=3");
  });
});
