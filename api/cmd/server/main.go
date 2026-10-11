// Command server runs the Mini Manager API under /api/v1 and serves the built SPA.
// It refuses to start while migrations are pending and never applies them (ADR 0002).
package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/BarbieriM/MiniManager/api/internal/features/auth"
	"github.com/BarbieriM/MiniManager/api/internal/features/miniatures"
	"github.com/BarbieriM/MiniManager/api/internal/features/users"
	platformauth "github.com/BarbieriM/MiniManager/api/internal/platform/auth"
	"github.com/BarbieriM/MiniManager/api/internal/platform/config"
	"github.com/BarbieriM/MiniManager/api/internal/platform/db"
)

func main() {
	if err := run(); err != nil {
		log.Fatalf("server: %v", err)
	}
}

func run() error {
	// ctx is cancelled on Ctrl+C or on the SIGTERM Render sends before stopping the old version.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	cfg, err := config.Load(os.Getenv)
	if err != nil {
		return err
	}
	pool, err := db.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()
	if err := db.CheckMigrations(ctx, pool); err != nil {
		return err
	}

	userService := users.NewService(pool)
	accessTokens := platformauth.NewAccessTokens(cfg.JWTSecret, time.Now)
	authService, err := auth.NewService(pool, userService, accessTokens, time.Now)
	if err != nil {
		return err
	}

	server := &http.Server{
		Addr: ":" + cfg.Port,
		Handler: newHandler(handlerDeps{
			auth:         authService,
			users:        userService,
			miniatures:   miniatures.NewService(pool, userService, time.Now),
			accessTokens: accessTokens,
			webDir:       cfg.WebDir,
		}),
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	serverErr := make(chan error, 1)
	go func() {
		log.Printf("server: listening on :%s", cfg.Port)
		serverErr <- server.ListenAndServe()
	}()

	select {
	case err := <-serverErr:
		return fmt.Errorf("listen: %w", err)
	case <-ctx.Done():
	}

	log.Println("server: shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return fmt.Errorf("shutdown: %w", err)
	}
	return nil
}
