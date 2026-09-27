package game

import (
	"encoding/json"
	"errors"
	"slices"
)

var (
	ErrLeaderOnly    = errors.New("only the leader can do that")
	ErrInvalidAction = errors.New("invalid action")
)

type Player struct {
	ID string
}

type Table struct {
	Players  []Player
	LeaderID string
}

func (t Table) Has(playerID string) bool {
	return slices.ContainsFunc(t.Players, func(p Player) bool { return p.ID == playerID })
}

type Game interface {
	Act(t Table, playerID, action string, payload json.RawMessage) error
	View(t Table, playerID string) any
	Finished() bool
}
