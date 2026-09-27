package server

import (
	"context"
	"encoding/json"
	"errors"
	"io/fs"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"

	"github.com/juanhdzma/crewi/internal/party"
)

const (
	joinTimeout  = 10 * time.Second
	writeTimeout = 5 * time.Second
	sendBuffer   = 16
)

type Server struct {
	parties *party.Registry
	log     *slog.Logger
	static  fs.FS
}

func New(parties *party.Registry, log *slog.Logger, static fs.FS) *Server {
	return &Server{parties: parties, log: log, static: static}
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/parties", s.createParty)
	mux.HandleFunc("GET /api/parties/{code}", s.getParty)
	mux.HandleFunc("POST /api/parties/{code}/leave", s.leaveParty)
	mux.HandleFunc("GET /ws/{code}", s.connect)
	mux.Handle("GET /", spa(s.static))
	return mux
}

func (s *Server) createParty(w http.ResponseWriter, r *http.Request) {
	p := s.parties.Create()
	s.log.Info("party created", "party", p.Code)
	writeJSON(w, http.StatusCreated, map[string]string{"code": p.Code})
}

func (s *Server) getParty(w http.ResponseWriter, r *http.Request) {
	p, ok := s.parties.Get(r.PathValue("code"))
	if !ok {
		http.Error(w, "party not found", http.StatusNotFound)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"code": p.Code, "avatars": party.Avatars})
}

func (s *Server) leaveParty(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Token string `json:"token"`
	}
	json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024)).Decode(&body)
	p, ok := s.parties.Get(r.PathValue("code"))
	if !ok || body.Token == "" || !p.LeaveWithToken(body.Token) {
		http.Error(w, "player not found", http.StatusNotFound)
		return
	}
	s.log.Info("player left", "party", p.Code)
	w.WriteHeader(http.StatusNoContent)
}

type clientMessage struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

type joinPayload struct {
	Name   string `json:"name"`
	Avatar string `json:"avatar"`
	Token  string `json:"token"`
}

type client struct {
	out    chan any
	cancel context.CancelFunc
}

// Send never blocks the party lock: a client that cannot keep up is dropped
// and recovers the full state when it reconnects.
func (c *client) Send(msg any) {
	select {
	case c.out <- msg:
	default:
		c.cancel()
	}
}

func (s *Server) connect(w http.ResponseWriter, r *http.Request) {
	p, ok := s.parties.Get(r.PathValue("code"))
	if !ok {
		http.Error(w, "party not found", http.StatusNotFound)
		return
	}
	conn, err := websocket.Accept(w, r, nil)
	if err != nil {
		return
	}
	defer conn.CloseNow()

	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()
	c := &client{out: make(chan any, sendBuffer), cancel: cancel}

	pl, err := s.join(ctx, conn, p, c)
	if err != nil {
		wsjson.Write(ctx, conn, map[string]string{"type": "error", "message": err.Error()})
		conn.Close(websocket.StatusPolicyViolation, "join failed")
		return
	}
	log := s.log.With("party", p.Code, "player", pl.ID)
	log.Info("player connected")

	go s.writeLoop(ctx, conn, c)
	s.readLoop(ctx, conn, p, pl)

	p.Disconnect(pl.ID, c)
	log.Info("player disconnected")
}

func (s *Server) join(ctx context.Context, conn *websocket.Conn, p *party.Party, c *client) (*party.Player, error) {
	joinCtx, cancel := context.WithTimeout(ctx, joinTimeout)
	defer cancel()

	var msg clientMessage
	if err := wsjson.Read(joinCtx, conn, &msg); err != nil {
		return nil, errors.New("expected join message")
	}
	var jp joinPayload
	if msg.Type != "join" || json.Unmarshal(msg.Payload, &jp) != nil {
		return nil, errors.New("expected join message")
	}

	pl, err := p.Join(jp.Name, jp.Avatar, jp.Token, c)
	if err != nil {
		return nil, err
	}
	if err := wsjson.Write(ctx, conn, map[string]string{"type": "welcome", "playerId": pl.ID, "token": pl.Token}); err != nil {
		p.Disconnect(pl.ID, c)
		return nil, err
	}
	return pl, nil
}

func (s *Server) readLoop(ctx context.Context, conn *websocket.Conn, p *party.Party, pl *party.Player) {
	for {
		var msg clientMessage
		if err := wsjson.Read(ctx, conn, &msg); err != nil {
			return
		}
		switch msg.Type {
		case "leave":
			p.Leave(pl.ID)
			conn.Close(websocket.StatusNormalClosure, "left")
			return
		}
	}
}

func (s *Server) writeLoop(ctx context.Context, conn *websocket.Conn, c *client) {
	for {
		select {
		case <-ctx.Done():
			conn.Close(websocket.StatusGoingAway, "")
			return
		case msg := <-c.out:
			wctx, cancel := context.WithTimeout(ctx, writeTimeout)
			err := wsjson.Write(wctx, conn, msg)
			cancel()
			if err != nil {
				c.cancel()
				return
			}
		}
	}
}

func spa(static fs.FS) http.Handler {
	files := http.FileServerFS(static)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, err := fs.Stat(static, strings.TrimPrefix(r.URL.Path, "/")); err != nil {
			r.URL.Path = "/"
		}
		files.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}
