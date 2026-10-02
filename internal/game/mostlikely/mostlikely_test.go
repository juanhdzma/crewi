package mostlikely

import (
	"encoding/json"
	"errors"
	"testing"

	"github.com/juanhdzma/crewi/internal/game"
)

var table = game.Table{Players: []game.Player{{ID: "ana", Online: true}, {ID: "beto", Online: true}, {ID: "caro", Online: true}}, LeaderID: "ana"}

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

func TestParseQuestionsSkipsCommentsAndBlanks(t *testing.T) {
	got := parseQuestions("# header\n\n  primera  \nsegunda\n# nope\n")
	if len(got) != 2 || got[0] != "primera" || got[1] != "segunda" {
		t.Fatalf("got %q", got)
	}
	if len(Bank) == 0 {
		t.Fatal("embedded bank is empty")
	}
}

func TestFullRound(t *testing.T) {
	g := New([]string{"q0", "q1", "q2"})

	if v := g.View(table, "beto").(View); v.Bank != nil {
		t.Fatal("non-leader sees the bank")
	}
	if !errors.Is(act(t, g, "beto", "begin", map[string]any{"questions": []int{0}}), game.ErrLeaderOnly) {
		t.Fatal("non-leader could begin")
	}
	must(t, act(t, g, "ana", "begin", map[string]any{"questions": []int{2, 0}}))

	must(t, act(t, g, "ana", "vote", map[string]string{"target": "beto"}))
	must(t, act(t, g, "beto", "vote", map[string]string{"target": "caro"}))

	v := g.View(table, "ana").(View)
	if v.Phase != phaseVoting || v.Question != "q2" || len(v.Voters) != 2 || v.MyVote != "beto" || v.Results != nil {
		t.Fatalf("voting view leaks or is wrong: %+v", v)
	}

	must(t, act(t, g, "caro", "vote", map[string]string{"target": "beto"}))
	v = g.View(table, "caro").(View)
	if v.Phase != phaseRevealed {
		t.Fatalf("not revealed after every online player voted: %+v", v)
	}
	if len(v.Results) != 2 || v.Results[0] != (Result{"beto", 2}) || v.Results[1] != (Result{"caro", 1}) {
		t.Fatalf("results = %+v", v.Results)
	}

	must(t, act(t, g, "ana", "next", nil))
	if v := g.View(table, "ana").(View); v.Question != "q0" || len(v.Voters) != 0 {
		t.Fatalf("second question view = %+v", v)
	}
	must(t, act(t, g, "ana", "reveal", nil))
	must(t, act(t, g, "ana", "next", nil))
	if !g.Finished() {
		t.Fatal("game not finished after last question")
	}
}

func TestInvalidActions(t *testing.T) {
	g := New([]string{"q0"})
	cases := []struct {
		player, action string
		payload        any
	}{
		{"ana", "begin", map[string]any{"questions": []int{}}},
		{"ana", "begin", map[string]any{"questions": []int{5}}},
		{"ana", "begin", map[string]any{"questions": []int{0, 0}}},
		{"beto", "vote", map[string]string{"target": "ana"}},
		{"ana", "reveal", nil},
	}
	for _, c := range cases {
		if err := act(t, g, c.player, c.action, c.payload); err == nil {
			t.Errorf("%s %s %v succeeded", c.player, c.action, c.payload)
		}
	}

	must(t, act(t, g, "ana", "begin", map[string]any{"questions": []int{0}}))
	if act(t, g, "beto", "vote", map[string]string{"target": "ghost"}) == nil {
		t.Error("vote for unknown player succeeded")
	}
}

func TestVotesFromPlayersWhoLeftAreIgnored(t *testing.T) {
	g := New([]string{"q0"})
	must(t, act(t, g, "ana", "begin", map[string]any{"questions": []int{0}}))
	must(t, act(t, g, "caro", "vote", map[string]string{"target": "beto"}))
	must(t, act(t, g, "ana", "reveal", nil))

	without := game.Table{Players: []game.Player{{ID: "ana"}, {ID: "beto"}}, LeaderID: "ana"}
	if v := g.View(without, "ana").(View); len(v.Results) != 0 || len(v.Voters) != 0 {
		t.Fatalf("view still counts departed voter: %+v", v)
	}
}
