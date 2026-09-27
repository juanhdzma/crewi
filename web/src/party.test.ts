import { describe, expect, it } from "vitest";
import { partyCodeFromPath, wsUrl } from "./party";

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
