package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHealthy(t *testing.T) {
	status := http.StatusOK
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(status)
	}))

	if !healthy(ts.URL) {
		t.Error("2xx response should be healthy")
	}
	status = http.StatusInternalServerError
	if healthy(ts.URL) {
		t.Error("non-2xx response should be unhealthy")
	}
	ts.Close()
	if healthy(ts.URL) {
		t.Error("closed server should be unhealthy")
	}
}

func TestPortDefaultsAndReadsEnv(t *testing.T) {
	t.Setenv("PORT", "")
	if got := port(); got != "8080" {
		t.Errorf("default port = %q, want 8080", got)
	}
	t.Setenv("PORT", "9999")
	if got := port(); got != "9999" {
		t.Errorf("port = %q, want 9999", got)
	}
}
