package ventana

import (
	"encoding/json"
	"errors"
	"math"
	"math/rand/v2"
	"slices"
	"testing"

	"github.com/juanhdzma/crewi/internal/game"
)

var (
	bogota   = Point{Lat: 4.6533, Lng: -74.0836}
	medellin = Point{Lat: 6.2442, Lng: -75.5812}
	table    = game.Table{Players: []game.Player{{ID: "ana", Online: true}, {ID: "beto", Online: true}, {ID: "caro", Online: true}}, LeaderID: "ana"}
)

func act(t *testing.T, g *Game, playerID, action string, payload any) error {
	t.Helper()
	raw, _ := json.Marshal(payload)
	return g.Act(table, playerID, action, raw)
}

func must(t *testing.T, err error) {
	t.Helper()
	if err != nil {
		t.Fatal(err)
	}
}

func newGame(seed uint64) *Game { return New(rand.New(rand.NewPCG(seed, seed))) }

func TestDistanceKm(t *testing.T) {
	if d := distanceKm(bogota, medellin); math.Abs(d-240) > 5 {
		t.Fatalf("Bogotá-Medellín = %.1f km, want about 240", d)
	}
}

func TestPoints(t *testing.T) {
	if Points(0) != maxPoints {
		t.Fatal("exact guess is not max points")
	}
	if Points(1) <= Points(5) || Points(5) <= Points(50) {
		t.Fatal("points do not decrease with distance")
	}
}

func TestCircleHidesExactPointButContainsIt(t *testing.T) {
	for seed := range uint64(50) {
		g := newGame(seed)
		must(t, act(t, g, "ana", "setLocation", map[string]any{"lat": bogota.Lat, "lng": bogota.Lng, "radiusM": maxRadiusM}))
		target := g.targets["ana"]
		if distanceKm(target.Center, bogota) > float64(maxRadiusM)/1000 {
			t.Fatalf("seed %d: real point outside the circle", seed)
		}
		if !target.area.contains(bogota) {
			t.Fatalf("seed %d: real point outside the guess area", seed)
		}
		edge := offset(target.Center, float64(target.RadiusM)/1000, math.Pi/2)
		if !target.area.contains(edge) {
			t.Fatalf("seed %d: circle edge outside the guess area", seed)
		}
	}
}

func TestSetLocationValidation(t *testing.T) {
	g := newGame(1)
	for _, p := range []map[string]any{
		{"lat": 95, "lng": 0},
		{"lat": 0, "lng": 200},
		{"lat": 0, "lng": 0, "radiusM": 50},
		{"lat": 0, "lng": 0, "radiusM": 1000},
	} {
		if act(t, g, "beto", "setLocation", p) == nil {
			t.Errorf("accepted %v", p)
		}
	}
}

func TestFullGame(t *testing.T) {
	g := newGame(7)
	if err := act(t, g, "ana", "start", nil); err == nil {
		t.Fatal("started with no locations")
	}
	must(t, act(t, g, "ana", "setLocation", map[string]any{"lat": bogota.Lat, "lng": bogota.Lng}))
	must(t, act(t, g, "beto", "setLocation", map[string]any{"lat": medellin.Lat, "lng": medellin.Lng, "radiusM": 500}))
	if !errors.Is(act(t, g, "beto", "start", nil), game.ErrLeaderOnly) {
		t.Fatal("non-leader started the game")
	}
	must(t, act(t, g, "ana", "start", nil))

	for turn := range 2 {
		v := g.View(table, "caro").(View)
		turnPlayer := v.TurnPlayerID
		if v.Phase != phaseGuessing || v.Target != nil || v.Area == nil {
			t.Fatalf("turn %d: guessing view leaks target or lacks area: %+v", turn, v)
		}
		if act(t, g, turnPlayer, "guess", g.targets[turnPlayer].Center) == nil {
			t.Fatal("turn player could guess their own location")
		}
		if act(t, g, "caro", "guess", Point{Lat: -80, Lng: 0}) == nil {
			t.Fatal("guess outside the area was accepted")
		}

		for _, id := range []string{"ana", "beto", "caro"} {
			if id != turnPlayer {
				must(t, act(t, g, id, "guess", g.targets[turnPlayer].Center))
			}
		}
		v = g.View(table, "caro").(View)
		if v.Phase != phaseRevealed || v.Target == nil || len(v.Results) != 2 || v.Results[0].Points != maxPoints {
			t.Fatalf("turn %d: reveal view = %+v", turn, v)
		}
		must(t, act(t, g, "ana", "next", nil))
	}

	v := g.View(table, "ana").(View)
	if v.Phase != phasePodium || v.Scores[0].PlayerID != "caro" || v.Scores[0].Points != 2*maxPoints {
		t.Fatalf("podium = %+v", v)
	}
	if !slices.Equal(v.Finalists, g.View(table, "beto").(View).Finalists) {
		t.Fatal("players see different finalist lineups")
	}
	top := []string{v.Scores[0].PlayerID, v.Scores[1].PlayerID, v.Scores[2].PlayerID}
	if len(v.Finalists) != 3 || !slices.Equal(slices.Sorted(slices.Values(v.Finalists)), slices.Sorted(slices.Values(top))) {
		t.Fatalf("finalists %v are not the top three %v", v.Finalists, top)
	}
}

func TestLeaderCanRevealWithMissingGuesses(t *testing.T) {
	g := newGame(3)
	must(t, act(t, g, "ana", "setLocation", map[string]any{"lat": bogota.Lat, "lng": bogota.Lng}))
	must(t, act(t, g, "beto", "setLocation", map[string]any{"lat": medellin.Lat, "lng": medellin.Lng}))
	must(t, act(t, g, "ana", "start", nil))
	must(t, act(t, g, "ana", "reveal", nil))

	if v := g.View(table, "ana").(View); v.Phase != phaseRevealed || len(v.Results) != 0 {
		t.Fatalf("view = %+v", v)
	}
}
