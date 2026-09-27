package party

import (
	"crypto/rand"
	"encoding/json"
	"errors"
	"slices"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/juanhdzma/crewi/internal/game"
	"github.com/juanhdzma/crewi/internal/game/mostlikely"
)

const (
	MaxPlayers     = 20
	maxNameLength  = 24
	LeaderGrace    = 30 * time.Second
	EmptyPartyTTL  = 30 * time.Minute
	partyCodeChars = 6
)

var Avatars = []string{"🦊", "🐼", "🐸", "🐙", "🦉", "🐯", "🐨", "🦄", "🐧", "🐢", "🦁", "🐝", "🐳", "🦜", "🐹", "🦖"}

var catalog = map[string]func() game.Game{
	"mostlikely": func() game.Game { return mostlikely.New(mostlikely.Bank) },
}

var (
	ErrUnknownGame   = errors.New("unknown game")
	ErrGameRunning   = errors.New("a game is already running")
	ErrNoGame        = errors.New("no game is running")
	ErrNotInParty    = errors.New("player is not in the party")
	ErrInvalidName   = errors.New("name must be between 1 and 24 characters")
	ErrInvalidAvatar = errors.New("unknown avatar")
	ErrFull          = errors.New("party is full")
)

type Sender interface {
	Send(msg any)
}

type Player struct {
	ID       string
	Token    string
	Name     string
	Avatar   string
	joinedAt time.Time
	lastSeen time.Time
	sender   Sender
}

func (p *Player) Online() bool { return p.sender != nil }

type PlayerView struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Avatar string `json:"avatar"`
	Online bool   `json:"online"`
}

type GameState struct {
	ID   string `json:"id"`
	View any    `json:"view"`
}

type State struct {
	Code     string       `json:"code"`
	LeaderID string       `json:"leaderId"`
	Players  []PlayerView `json:"players"`
	Game     *GameState   `json:"game"`
}

type ReplacedMessage struct {
	Type string `json:"type"`
}

type StateMessage struct {
	Type  string `json:"type"`
	State State  `json:"state"`
}

type Party struct {
	Code string

	mu         sync.Mutex
	now        func() time.Time
	players    []*Player
	leaderID   string
	emptySince time.Time
	game       game.Game
	gameID     string
}

func newParty(code string, now func() time.Time) *Party {
	return &Party{Code: code, now: now, emptySince: now()}
}

func (p *Party) Join(name, avatar, token string, s Sender) (*Player, error) {
	p.mu.Lock()
	defer p.mu.Unlock()

	if token != "" {
		if pl := p.byToken(token); pl != nil {
			if pl.sender != nil && pl.sender != s {
				pl.sender.Send(ReplacedMessage{Type: "replaced"})
			}
			pl.sender = s
			p.broadcast()
			return pl, nil
		}
	}

	name = strings.TrimSpace(name)
	if name == "" || utf8.RuneCountInString(name) > maxNameLength {
		return nil, ErrInvalidName
	}
	if !slices.Contains(Avatars, avatar) {
		return nil, ErrInvalidAvatar
	}
	if len(p.players) >= MaxPlayers {
		return nil, ErrFull
	}

	now := p.now()
	pl := &Player{ID: rand.Text(), Token: rand.Text(), Name: name, Avatar: avatar, joinedAt: now, lastSeen: now, sender: s}
	p.players = append(p.players, pl)
	if p.leaderID == "" {
		p.leaderID = pl.ID
	}
	p.broadcast()
	return pl, nil
}

// Disconnect ignores stale senders so a slow close from an old tab
// cannot mark a player offline after they already reconnected.
func (p *Party) Disconnect(playerID string, s Sender) {
	p.mu.Lock()
	defer p.mu.Unlock()

	pl := p.byID(playerID)
	if pl == nil || pl.sender != s {
		return
	}
	pl.sender = nil
	pl.lastSeen = p.now()
	if p.onlineCount() == 0 {
		p.emptySince = p.now()
	}
	p.broadcast()
}

func (p *Party) Leave(playerID string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.remove(playerID)
}

func (p *Party) LeaveWithToken(token string) bool {
	p.mu.Lock()
	defer p.mu.Unlock()

	pl := p.byToken(token)
	if pl == nil {
		return false
	}
	p.remove(pl.ID)
	return true
}

func (p *Party) remove(playerID string) {
	p.players = slices.DeleteFunc(p.players, func(pl *Player) bool { return pl.ID == playerID })
	if p.leaderID == playerID {
		p.leaderID = ""
		p.promoteLeader()
	}
	if p.onlineCount() == 0 {
		p.emptySince = p.now()
	}
	p.broadcast()
}

func (p *Party) Act(playerID, action string, payload json.RawMessage) error {
	p.mu.Lock()
	defer p.mu.Unlock()

	if p.byID(playerID) == nil {
		return ErrNotInParty
	}
	isLeader := playerID == p.leaderID
	switch action {
	case "startGame":
		if !isLeader {
			return game.ErrLeaderOnly
		}
		if p.game != nil {
			return ErrGameRunning
		}
		var req struct {
			Game string `json:"game"`
		}
		json.Unmarshal(payload, &req)
		newGame, ok := catalog[req.Game]
		if !ok {
			return ErrUnknownGame
		}
		p.game, p.gameID = newGame(), req.Game
	case "endGame":
		if !isLeader {
			return game.ErrLeaderOnly
		}
		p.game, p.gameID = nil, ""
	default:
		if p.game == nil {
			return ErrNoGame
		}
		if err := p.game.Act(p.table(), playerID, action, payload); err != nil {
			return err
		}
		if p.game.Finished() {
			p.game, p.gameID = nil, ""
		}
	}
	p.broadcast()
	return nil
}

func (p *Party) State(viewerID string) State {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.state(viewerID)
}

func (p *Party) table() game.Table {
	players := make([]game.Player, len(p.players))
	for i, pl := range p.players {
		players[i] = game.Player{ID: pl.ID}
	}
	return game.Table{Players: players, LeaderID: p.leaderID}
}

func (p *Party) sweep() (expired bool) {
	p.mu.Lock()
	defer p.mu.Unlock()

	now := p.now()
	if p.onlineCount() == 0 {
		return now.Sub(p.emptySince) >= EmptyPartyTTL
	}
	if leader := p.byID(p.leaderID); leader == nil || (!leader.Online() && now.Sub(leader.lastSeen) >= LeaderGrace) {
		p.promoteLeader()
		p.broadcast()
	}
	return false
}

func (p *Party) promoteLeader() {
	for _, pl := range p.players {
		if pl.Online() {
			p.leaderID = pl.ID
			return
		}
	}
}

func (p *Party) broadcast() {
	for _, pl := range p.players {
		if pl.sender != nil {
			pl.sender.Send(StateMessage{Type: "state", State: p.state(pl.ID)})
		}
	}
}

func (p *Party) state(viewerID string) State {
	players := make([]PlayerView, len(p.players))
	for i, pl := range p.players {
		players[i] = PlayerView{ID: pl.ID, Name: pl.Name, Avatar: pl.Avatar, Online: pl.Online()}
	}
	st := State{Code: p.Code, LeaderID: p.leaderID, Players: players}
	if p.game != nil {
		st.Game = &GameState{ID: p.gameID, View: p.game.View(p.table(), viewerID)}
	}
	return st
}

func (p *Party) byID(id string) *Player {
	for _, pl := range p.players {
		if pl.ID == id {
			return pl
		}
	}
	return nil
}

func (p *Party) byToken(token string) *Player {
	for _, pl := range p.players {
		if pl.Token == token {
			return pl
		}
	}
	return nil
}

func (p *Party) onlineCount() int {
	n := 0
	for _, pl := range p.players {
		if pl.Online() {
			n++
		}
	}
	return n
}

type Registry struct {
	mu      sync.Mutex
	now     func() time.Time
	parties map[string]*Party
}

func NewRegistry(now func() time.Time) *Registry {
	return &Registry{now: now, parties: map[string]*Party{}}
}

func (r *Registry) Create() *Party {
	r.mu.Lock()
	defer r.mu.Unlock()

	for {
		code := rand.Text()[:partyCodeChars]
		if _, taken := r.parties[code]; !taken {
			p := newParty(code, r.now)
			r.parties[code] = p
			return p
		}
	}
}

func (r *Registry) Get(code string) (*Party, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()
	p, ok := r.parties[strings.ToUpper(code)]
	return p, ok
}

func (r *Registry) Sweep() (deleted []string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for code, p := range r.parties {
		if p.sweep() {
			delete(r.parties, code)
			deleted = append(deleted, code)
		}
	}
	return deleted
}
