package ventana

import (
	"cmp"
	"encoding/json"
	"math"
	"math/rand/v2"
	"slices"

	"github.com/juanhdzma/crewi/internal/game"
)

const (
	boxHalfSizeKm  = 6.0
	boxMaxOffsetKm = 3.5
	boxMarginKm    = 0.5
	scoreScaleKm   = 2.0
	maxPoints      = 5000
	minRadiusM     = 250
	maxRadiusM     = 2000

	phaseSetup    = "setup"
	phaseGuessing = "guessing"
	phaseRevealed = "revealed"
	phasePodium   = "podium"
)

type Target struct {
	Center  Point `json:"center"`
	RadiusM int   `json:"radiusM"`
	bounds  Bounds
}

type Result struct {
	PlayerID   string  `json:"playerId"`
	Guess      Point   `json:"guess"`
	DistanceKm float64 `json:"distanceKm"`
	Points     int     `json:"points"`
}

type Score struct {
	PlayerID string `json:"playerId"`
	Points   int    `json:"points"`
}

type Game struct {
	rng     *rand.Rand
	phase   string
	targets map[string]*Target
	order   []string
	turn    int
	guesses map[string]Point
	results []Result
	scores  map[string]int
}

func New(rng *rand.Rand) *Game {
	return &Game{rng: rng, phase: phaseSetup, targets: map[string]*Target{}, guesses: map[string]Point{}, scores: map[string]int{}}
}

func (g *Game) Finished() bool { return false }

func (g *Game) Act(t game.Table, playerID, action string, payload json.RawMessage) error {
	isLeader := playerID == t.LeaderID
	switch {
	case action == "setLocation" && g.phase == phaseSetup:
		return g.setLocation(playerID, payload)
	case action == "guess" && g.phase == phaseGuessing:
		return g.guess(t, playerID, payload)
	case action == "setLocation" || action == "guess":
		return game.ErrInvalidAction
	case !isLeader:
		return game.ErrLeaderOnly
	case action == "start" && g.phase == phaseSetup:
		return g.start(t)
	case action == "reveal" && g.phase == phaseGuessing:
		g.reveal()
		return nil
	case action == "next" && g.phase == phaseRevealed:
		g.next(t)
		return nil
	}
	return game.ErrInvalidAction
}

// With a circle the exact point is discarded right away: only the randomly
// offset circle is kept, so the server never holds the precise location.
func (g *Game) setLocation(playerID string, payload json.RawMessage) error {
	var req struct {
		Point
		RadiusM int `json:"radiusM"`
	}
	if json.Unmarshal(payload, &req) != nil || !req.Point.valid() {
		return game.ErrInvalidAction
	}
	if req.RadiusM != 0 && (req.RadiusM < minRadiusM || req.RadiusM > maxRadiusM) {
		return game.ErrInvalidAction
	}

	center := req.Point
	if req.RadiusM > 0 {
		center = offset(center, g.rng.Float64()*0.9*float64(req.RadiusM)/1000, g.bearing())
	}
	maxOffset := min(boxMaxOffsetKm, boxHalfSizeKm-float64(req.RadiusM)/1000-boxMarginKm)
	boxCenter := offset(center, g.rng.Float64()*maxOffset, g.bearing())
	g.targets[playerID] = &Target{Center: center, RadiusM: req.RadiusM, bounds: boxAround(boxCenter, boxHalfSizeKm)}
	return nil
}

func (g *Game) start(t game.Table) error {
	for id := range g.targets {
		if t.Has(id) {
			g.order = append(g.order, id)
		}
	}
	if len(g.order) < 2 {
		g.order = nil
		return game.ErrInvalidAction
	}
	slices.Sort(g.order)
	g.rng.Shuffle(len(g.order), func(i, j int) { g.order[i], g.order[j] = g.order[j], g.order[i] })
	g.phase = phaseGuessing
	return nil
}

func (g *Game) guess(t game.Table, playerID string, payload json.RawMessage) error {
	var p Point
	target := g.targets[g.order[g.turn]]
	if playerID == g.order[g.turn] || json.Unmarshal(payload, &p) != nil || !target.bounds.contains(p) {
		return game.ErrInvalidAction
	}
	g.guesses[playerID] = p
	if g.everyoneGuessed(t) {
		g.reveal()
	}
	return nil
}

func (g *Game) everyoneGuessed(t game.Table) bool {
	for _, pl := range t.Players {
		if _, ok := g.guesses[pl.ID]; pl.Online && pl.ID != g.order[g.turn] && !ok {
			return false
		}
	}
	return true
}

func (g *Game) reveal() {
	target := g.targets[g.order[g.turn]]
	g.results = g.results[:0]
	for id, p := range g.guesses {
		d := max(0, distanceKm(p, target.Center)-float64(target.RadiusM)/1000)
		pts := Points(d)
		g.results = append(g.results, Result{PlayerID: id, Guess: p, DistanceKm: d, Points: pts})
		g.scores[id] += pts
	}
	slices.SortFunc(g.results, func(a, b Result) int { return cmp.Compare(a.DistanceKm, b.DistanceKm) })
	g.phase = phaseRevealed
}

func (g *Game) next(t game.Table) {
	clear(g.guesses)
	g.results = nil
	for g.turn++; g.turn < len(g.order) && !t.Has(g.order[g.turn]); g.turn++ {
	}
	if g.turn == len(g.order) {
		g.phase = phasePodium
		return
	}
	g.phase = phaseGuessing
}

func (g *Game) bearing() float64 { return g.rng.Float64() * 2 * math.Pi }

func Points(distanceKm float64) int {
	return int(math.Round(maxPoints * math.Exp(-distanceKm/scoreScaleKm)))
}

type View struct {
	Phase        string   `json:"phase"`
	Ready        []string `json:"ready,omitempty"`
	MyLocation   *Target  `json:"myLocation,omitempty"`
	TurnPlayerID string   `json:"turnPlayerId,omitempty"`
	Turn         int      `json:"turn"`
	Turns        int      `json:"turns"`
	Bounds       *Bounds  `json:"bounds,omitempty"`
	Guessed      []string `json:"guessed,omitempty"`
	MyGuess      *Point   `json:"myGuess,omitempty"`
	Target       *Target  `json:"target,omitempty"`
	Results      []Result `json:"results,omitempty"`
	Scores       []Score  `json:"scores,omitempty"`
}

func (g *Game) View(t game.Table, playerID string) any {
	v := View{Phase: g.phase, Turn: g.turn, Turns: len(g.order)}
	if g.phase == phaseSetup {
		for _, pl := range t.Players {
			if g.targets[pl.ID] != nil {
				v.Ready = append(v.Ready, pl.ID)
			}
		}
		v.MyLocation = g.targets[playerID]
		return v
	}

	for _, pl := range t.Players {
		v.Scores = append(v.Scores, Score{PlayerID: pl.ID, Points: g.scores[pl.ID]})
	}
	slices.SortStableFunc(v.Scores, func(a, b Score) int { return b.Points - a.Points })
	if g.phase == phasePodium {
		return v
	}

	target := g.targets[g.order[g.turn]]
	v.TurnPlayerID = g.order[g.turn]
	v.Bounds = &target.bounds
	for _, pl := range t.Players {
		if _, ok := g.guesses[pl.ID]; ok {
			v.Guessed = append(v.Guessed, pl.ID)
		}
	}
	if p, ok := g.guesses[playerID]; ok {
		v.MyGuess = &p
	}
	if g.phase == phaseRevealed {
		v.Target = target
		v.Results = g.results
	}
	return v
}
