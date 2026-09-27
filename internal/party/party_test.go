package party

import (
	"errors"
	"strings"
	"testing"
	"time"
)

type fakeSender struct{ msgs []any }

func (f *fakeSender) Send(msg any) { f.msgs = append(f.msgs, msg) }

func (f *fakeSender) last() State { return f.msgs[len(f.msgs)-1].(StateMessage).State }

type clock struct{ t time.Time }

func (c *clock) now() time.Time { return c.t }

func setup() (*Registry, *Party, *clock) {
	c := &clock{t: time.Date(2026, 9, 27, 12, 0, 0, 0, time.UTC)}
	r := NewRegistry(c.now)
	return r, r.Create(), c
}

func TestFirstPlayerIsLeaderAndEveryoneGetsState(t *testing.T) {
	_, p, _ := setup()
	a, b := &fakeSender{}, &fakeSender{}

	ana, err := p.Join("Ana", Avatars[0], "", a)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := p.Join("Beto", Avatars[1], "", b); err != nil {
		t.Fatal(err)
	}

	st := a.last()
	if st.LeaderID != ana.ID || len(st.Players) != 2 || st.Players[1].Name != "Beto" {
		t.Fatalf("unexpected state %+v", st)
	}
	if len(b.msgs) != 1 {
		t.Fatalf("second player got %d messages, want 1", len(b.msgs))
	}
}

func TestJoinValidation(t *testing.T) {
	_, p, _ := setup()
	cases := []struct {
		name, avatar string
		want         error
	}{
		{"  ", Avatars[0], ErrInvalidName},
		{strings.Repeat("x", 25), Avatars[0], ErrInvalidName},
		{"Ana", "<script>", ErrInvalidAvatar},
	}
	for _, c := range cases {
		if _, err := p.Join(c.name, c.avatar, "", &fakeSender{}); !errors.Is(err, c.want) {
			t.Errorf("Join(%q, %q) = %v, want %v", c.name, c.avatar, err, c.want)
		}
	}
}

func TestPartyIsFull(t *testing.T) {
	_, p, _ := setup()
	for range MaxPlayers {
		if _, err := p.Join("x", Avatars[0], "", &fakeSender{}); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := p.Join("x", Avatars[0], "", &fakeSender{}); !errors.Is(err, ErrFull) {
		t.Fatalf("got %v, want ErrFull", err)
	}
}

func TestReconnectWithTokenKeepsIdentity(t *testing.T) {
	_, p, _ := setup()
	first := &fakeSender{}
	ana, _ := p.Join("Ana", Avatars[0], "", first)
	p.Disconnect(ana.ID, first)

	again, err := p.Join("", "", ana.Token, &fakeSender{})
	if err != nil {
		t.Fatal(err)
	}
	if again.ID != ana.ID || !p.State().Players[0].Online {
		t.Fatalf("reconnect did not restore player: %+v", p.State())
	}
}

func TestStaleDisconnectIsIgnored(t *testing.T) {
	_, p, _ := setup()
	oldTab, newTab := &fakeSender{}, &fakeSender{}
	ana, _ := p.Join("Ana", Avatars[0], "", oldTab)
	p.Join("", "", ana.Token, newTab)

	p.Disconnect(ana.ID, oldTab)

	if !p.State().Players[0].Online {
		t.Fatal("stale disconnect marked player offline")
	}
}

func TestLeaderPassesAfterGracePeriod(t *testing.T) {
	r, p, c := setup()
	a := &fakeSender{}
	ana, _ := p.Join("Ana", Avatars[0], "", a)
	beto, _ := p.Join("Beto", Avatars[1], "", &fakeSender{})
	p.Disconnect(ana.ID, a)

	c.t = c.t.Add(LeaderGrace - time.Second)
	r.Sweep()
	if p.State().LeaderID != ana.ID {
		t.Fatal("leader changed before grace period")
	}

	c.t = c.t.Add(time.Second)
	r.Sweep()
	if p.State().LeaderID != beto.ID {
		t.Fatal("leader did not pass to online player")
	}
}

func TestLeaderLeavingPromotesNext(t *testing.T) {
	_, p, _ := setup()
	ana, _ := p.Join("Ana", Avatars[0], "", &fakeSender{})
	beto, _ := p.Join("Beto", Avatars[1], "", &fakeSender{})

	p.Leave(ana.ID)

	if st := p.State(); st.LeaderID != beto.ID || len(st.Players) != 1 {
		t.Fatalf("unexpected state %+v", st)
	}
}

func TestEmptyPartyExpires(t *testing.T) {
	r, p, c := setup()
	s := &fakeSender{}
	ana, _ := p.Join("Ana", Avatars[0], "", s)
	p.Disconnect(ana.ID, s)

	c.t = c.t.Add(EmptyPartyTTL - time.Second)
	if len(r.Sweep()) != 0 {
		t.Fatal("party deleted too early")
	}
	c.t = c.t.Add(time.Second)
	if deleted := r.Sweep(); len(deleted) != 1 || deleted[0] != p.Code {
		t.Fatalf("deleted = %v", deleted)
	}
	if _, ok := r.Get(p.Code); ok {
		t.Fatal("party still reachable")
	}
}

func TestGetIsCaseInsensitive(t *testing.T) {
	r, p, _ := setup()
	if _, ok := r.Get(strings.ToLower(p.Code)); !ok {
		t.Fatal("lowercase code not found")
	}
}

func TestReconnectFromAnotherTabNotifiesOldTab(t *testing.T) {
	_, p, _ := setup()
	oldTab, newTab := &fakeSender{}, &fakeSender{}
	ana, _ := p.Join("Ana", Avatars[0], "", oldTab)

	p.Join("", "", ana.Token, newTab)

	if msg, ok := oldTab.msgs[len(oldTab.msgs)-1].(ReplacedMessage); !ok || msg.Type != "replaced" {
		t.Fatalf("old tab last message = %+v, want replaced", oldTab.msgs[len(oldTab.msgs)-1])
	}
}

func TestLeaveWithToken(t *testing.T) {
	_, p, _ := setup()
	ana, _ := p.Join("Ana", Avatars[0], "", &fakeSender{})

	if p.LeaveWithToken("wrong") {
		t.Fatal("left with unknown token")
	}
	if !p.LeaveWithToken(ana.Token) || len(p.State().Players) != 0 {
		t.Fatalf("player not removed: %+v", p.State())
	}
}
