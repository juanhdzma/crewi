import { useCallback, useEffect, useRef, useState } from "react";
import { type PartyState, type ServerMessage, tokenKey, wsUrl } from "./party";

type Status = "idle" | "connecting" | "joined" | "reconnecting" | "error" | "left";

const maxRetries = 5;

function readToken(code: string): string | null {
  try {
    return sessionStorage.getItem(tokenKey(code));
  } catch {
    return null;
  }
}

function writeToken(code: string, token: string | null) {
  try {
    if (token) sessionStorage.setItem(tokenKey(code), token);
    else sessionStorage.removeItem(tokenKey(code));
  } catch {
    // Storage can be unavailable (private mode); the player just can't auto-reconnect.
  }
}

export function useParty(code: string) {
  const [status, setStatus] = useState<Status>("idle");
  const [state, setState] = useState<PartyState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const socket = useRef<WebSocket | null>(null);
  const retries = useRef(0);
  const leaving = useRef(false);

  const connect = useCallback(
    (name: string, avatar: string) => {
      leaving.current = false;
      setStatus((s) => (s === "joined" || s === "reconnecting" ? "reconnecting" : "connecting"));

      const ws = new WebSocket(wsUrl(code, location));
      socket.current = ws;
      let joinRejected = false;

      ws.onopen = () => {
        const token = readToken(code) ?? "";
        ws.send(JSON.stringify({ type: "join", payload: { name, avatar, token } }));
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data) as ServerMessage;
        if (msg.type === "welcome") {
          writeToken(code, msg.token);
          setPlayerId(msg.playerId);
          setStatus("joined");
          setError(null);
          retries.current = 0;
        } else if (msg.type === "state") {
          setState(msg.state);
        } else {
          joinRejected = true;
          writeToken(code, null);
          setError(msg.message);
          setStatus("error");
        }
      };

      ws.onclose = () => {
        if (socket.current !== ws || leaving.current || joinRejected) return;
        if (retries.current >= maxRetries) {
          setError("Se perdió la conexión con la party");
          setStatus("error");
          return;
        }
        const delay = Math.min(1000 * 2 ** retries.current, 10000);
        retries.current += 1;
        setStatus("reconnecting");
        setTimeout(() => connect(name, avatar), delay);
      };
    },
    [code],
  );

  const leave = useCallback(() => {
    leaving.current = true;
    socket.current?.send(JSON.stringify({ type: "leave" }));
    socket.current?.close();
    writeToken(code, null);
    setStatus("left");
    setState(null);
  }, [code]);

  useEffect(() => () => {
    leaving.current = true;
    socket.current?.close();
  }, []);

  return { status, state, playerId, error, connect, leave, hasToken: readToken(code) !== null };
}
