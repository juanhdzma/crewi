package main

import (
	"cmp"
	"context"
	"errors"
	"io/fs"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/juanhdzma/crewi/internal/party"
	"github.com/juanhdzma/crewi/internal/server"
	"github.com/juanhdzma/crewi/web"
)

const sweepInterval = 10 * time.Second

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	if err := run(log); err != nil {
		log.Error("server stopped", "error", err)
		os.Exit(1)
	}
}

func run(log *slog.Logger) error {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	static, err := fs.Sub(web.Dist, "dist")
	if err != nil {
		return err
	}
	parties := party.NewRegistry(time.Now)
	go sweep(ctx, parties, log)

	addr := ":" + cmp.Or(os.Getenv("PORT"), "8080")
	srv := &http.Server{Addr: addr, Handler: server.New(parties, log, static).Handler(), ReadHeaderTimeout: 10 * time.Second}
	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		srv.Shutdown(shutdownCtx)
	}()

	log.Info("listening", "addr", addr)
	if err := srv.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}

func sweep(ctx context.Context, parties *party.Registry, log *slog.Logger) {
	ticker := time.NewTicker(sweepInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			for _, code := range parties.Sweep() {
				log.Info("party expired", "party", code)
			}
		}
	}
}
