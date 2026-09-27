package server

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"
	"time"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"

	"github.com/juanhdzma/crewi/internal/party"
)

func newTestServer(t *testing.T) *httptest.Server {
	static := fstest.MapFS{"index.html": {Data: []byte("app")}}
	srv := New(party.NewRegistry(time.Now), slog.New(slog.NewTextHandler(io.Discard, nil)), static)
	ts := httptest.NewServer(srv.Handler())
	t.Cleanup(ts.Close)
	return ts
}

func createParty(t *testing.T, ts *httptest.Server) string {
	res, err := http.Post(ts.URL+"/api/parties", "", nil)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	var body struct{ Code string }
	json.NewDecoder(res.Body).Decode(&body)
	return body.Code
}

func dial(t *testing.T, ctx context.Context, ts *httptest.Server, code string) *websocket.Conn {
	conn, _, err := websocket.Dial(ctx, "ws"+strings.TrimPrefix(ts.URL, "http")+"/ws/"+code, nil)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { conn.CloseNow() })
	return conn
}

type serverMessage struct {
	Type     string
	PlayerID string
	Token    string
	Message  string
	State    party.State
}

func read(t *testing.T, ctx context.Context, conn *websocket.Conn) serverMessage {
	var msg serverMessage
	if err := wsjson.Read(ctx, conn, &msg); err != nil {
		t.Fatal(err)
	}
	return msg
}

func join(t *testing.T, ctx context.Context, conn *websocket.Conn, name, token string) {
	payload := map[string]string{"name": name, "avatar": party.Avatars[0], "token": token}
	if err := wsjson.Write(ctx, conn, map[string]any{"type": "join", "payload": payload}); err != nil {
		t.Fatal(err)
	}
}

func TestJoinLobbyOverWebSocket(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	ts := newTestServer(t)
	code := createParty(t, ts)

	ana := dial(t, ctx, ts, code)
	join(t, ctx, ana, "Ana", "")
	welcome := read(t, ctx, ana)
	if welcome.Type != "welcome" || welcome.Token == "" {
		t.Fatalf("got %+v, want welcome", welcome)
	}
	if st := read(t, ctx, ana).State; st.LeaderID != welcome.PlayerID {
		t.Fatalf("ana is not leader: %+v", st)
	}

	beto := dial(t, ctx, ts, code)
	join(t, ctx, beto, "Beto", "")
	read(t, ctx, beto)
	read(t, ctx, beto)

	if st := read(t, ctx, ana).State; len(st.Players) != 2 {
		t.Fatalf("ana sees %d players, want 2", len(st.Players))
	}

	ana.Close(websocket.StatusNormalClosure, "")
	if st := read(t, ctx, beto).State; st.Players[0].Online {
		t.Fatal("ana still online after closing")
	}

	again := dial(t, ctx, ts, code)
	join(t, ctx, again, "", welcome.Token)
	if msg := read(t, ctx, again); msg.PlayerID != welcome.PlayerID {
		t.Fatalf("reconnected as %s, want %s", msg.PlayerID, welcome.PlayerID)
	}
}

func TestInvalidJoinReturnsError(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	ts := newTestServer(t)

	conn := dial(t, ctx, ts, createParty(t, ts))
	join(t, ctx, conn, "", "")
	if msg := read(t, ctx, conn); msg.Type != "error" || msg.Message != party.ErrInvalidName.Error() {
		t.Fatalf("got %+v", msg)
	}
}

func TestUnknownPartyIs404(t *testing.T) {
	ts := newTestServer(t)
	res, err := http.Get(ts.URL + "/api/parties/NOPE00")
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	if res.StatusCode != http.StatusNotFound {
		t.Fatalf("status %d, want 404", res.StatusCode)
	}
}

func TestSPAFallbackServesIndex(t *testing.T) {
	ts := newTestServer(t)
	res, err := http.Get(ts.URL + "/p/ABC123")
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	if string(body) != "app" {
		t.Fatalf("body %q, want index.html", body)
	}
}

func TestLeaveEndpointRemovesPlayer(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	ts := newTestServer(t)
	code := createParty(t, ts)

	conn := dial(t, ctx, ts, code)
	join(t, ctx, conn, "Ana", "")
	welcome := read(t, ctx, conn)
	read(t, ctx, conn)
	conn.Close(websocket.StatusNormalClosure, "")

	leave := func() int {
		res, err := http.Post(ts.URL+"/api/parties/"+code+"/leave", "application/json", strings.NewReader(`{"token":"`+welcome.Token+`"}`))
		if err != nil {
			t.Fatal(err)
		}
		res.Body.Close()
		return res.StatusCode
	}
	if status := leave(); status != http.StatusNoContent {
		t.Fatalf("status %d, want 204", status)
	}
	if status := leave(); status != http.StatusNotFound {
		t.Fatalf("second leave status %d, want 404", status)
	}
}
