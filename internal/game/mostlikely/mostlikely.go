package mostlikely

import (
	_ "embed"
	"encoding/json"
	"slices"
	"strings"

	"github.com/juanhdzma/crewi/internal/game"
)

//go:embed questions.txt
var questionsFile string

var Bank = parseQuestions(questionsFile)

func parseQuestions(raw string) []string {
	var questions []string
	for line := range strings.Lines(raw) {
		line = strings.TrimSpace(line)
		if line != "" && !strings.HasPrefix(line, "#") {
			questions = append(questions, line)
		}
	}
	return questions
}

const (
	phaseSetup    = "setup"
	phaseVoting   = "voting"
	phaseRevealed = "revealed"
)

type Game struct {
	bank      []string
	questions []string
	current   int
	phase     string
	votes     map[string]string
	finished  bool
}

func New(bank []string) *Game {
	return &Game{bank: bank, phase: phaseSetup, votes: map[string]string{}}
}

func (g *Game) Finished() bool { return g.finished }

func (g *Game) Act(t game.Table, playerID, action string, payload json.RawMessage) error {
	isLeader := playerID == t.LeaderID
	switch {
	case action == "vote" && g.phase == phaseVoting:
		var p struct {
			Target string `json:"target"`
		}
		if json.Unmarshal(payload, &p) != nil || !t.Has(p.Target) {
			return game.ErrInvalidAction
		}
		g.votes[playerID] = p.Target
		return nil
	case action == "vote":
		return game.ErrInvalidAction
	case !isLeader:
		return game.ErrLeaderOnly
	case action == "begin" && g.phase == phaseSetup:
		return g.begin(payload)
	case action == "reveal" && g.phase == phaseVoting:
		g.phase = phaseRevealed
		return nil
	case action == "next" && g.phase == phaseRevealed:
		g.current++
		clear(g.votes)
		if g.current == len(g.questions) {
			g.finished = true
		} else {
			g.phase = phaseVoting
		}
		return nil
	}
	return game.ErrInvalidAction
}

func (g *Game) begin(payload json.RawMessage) error {
	var p struct {
		Questions []int `json:"questions"`
	}
	if json.Unmarshal(payload, &p) != nil || len(p.Questions) == 0 {
		return game.ErrInvalidAction
	}
	seen := map[int]bool{}
	for _, i := range p.Questions {
		if i < 0 || i >= len(g.bank) || seen[i] {
			return game.ErrInvalidAction
		}
		seen[i] = true
		g.questions = append(g.questions, g.bank[i])
	}
	g.phase = phaseVoting
	return nil
}

type Result struct {
	PlayerID string `json:"playerId"`
	Votes    int    `json:"votes"`
}

type View struct {
	Phase    string   `json:"phase"`
	Bank     []string `json:"bank,omitempty"`
	Question string   `json:"question,omitempty"`
	Index    int      `json:"index"`
	Total    int      `json:"total"`
	Voters   []string `json:"voters"`
	MyVote   string   `json:"myVote,omitempty"`
	Results  []Result `json:"results,omitempty"`
}

func (g *Game) View(t game.Table, playerID string) any {
	v := View{Phase: g.phase, Index: g.current, Total: len(g.questions), Voters: []string{}}
	if g.phase == phaseSetup {
		if playerID == t.LeaderID {
			v.Bank = g.bank
		}
		return v
	}
	v.Question = g.questions[g.current]

	counts := map[string]int{}
	for voter, target := range g.votes {
		if t.Has(voter) && t.Has(target) {
			v.Voters = append(v.Voters, voter)
			counts[target]++
		}
	}
	slices.Sort(v.Voters)
	if t.Has(g.votes[playerID]) {
		v.MyVote = g.votes[playerID]
	}

	if g.phase == phaseRevealed {
		for target, n := range counts {
			v.Results = append(v.Results, Result{PlayerID: target, Votes: n})
		}
		slices.SortFunc(v.Results, func(a, b Result) int {
			if a.Votes != b.Votes {
				return b.Votes - a.Votes
			}
			return strings.Compare(a.PlayerID, b.PlayerID)
		})
	}
	return v
}
