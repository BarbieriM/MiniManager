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
	"github.com/BarbieriM/MiniManager/api/internal/features/filters"
	"github.com/BarbieriM/MiniManager/api/internal/features/invites"
	"github.com/BarbieriM/MiniManager/api/internal/features/members"
	"github.com/BarbieriM/MiniManager/api/internal/features/miniatures"
	"github.com/BarbieriM/MiniManager/api/internal/features/photos"
	"github.com/BarbieriM/MiniManager/api/internal/features/users"
	platformauth "github.com/BarbieriM/MiniManager/api/internal/platform/auth"
	"github.com/BarbieriM/MiniManager/api/internal/platform/config"
	"github.com/BarbieriM/MiniManager/api/internal/platform/db"
	"github.com/BarbieriM/MiniManager/api/internal/platform/email"
	"github.com/BarbieriM/MiniManager/api/internal/platform/images"
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
	sender := email.New(cfg.Email)
	links := email.Links{BaseURL: cfg.AppBaseURL}
	authService, err := auth.NewService(pool, userService, accessTokens, sender, links, time.Now)
	if err != nil {
		return err
	}

	filterService := filters.NewService(pool, userService)
	// Photos are off unless a Cloudinary account is configured (step 5 planning, Q8).
	var imageStore photos.ImageStore
	if cfg.PhotosEnabled() {
		imageStore = images.NewCloudinary(cfg.Cloudinary)
	}
	gallery := photos.NewGallery(pool, imageStore)
	miniatureService := miniatures.NewService(pool, userService, filterService, gallery, time.Now)

	server := &http.Server{
		Addr: ":" + cfg.Port,
		Handler: newHandler(handlerDeps{
			auth:         authService,
			users:        userService,
			filters:      filterService,
			miniatures:   miniatureService,
			photos:       photos.NewService(gallery, miniatureService),
			invites:      invites.NewService(pool, userService, authService, sender, links, time.Now),
			members:      members.NewService(pool, userService, authService),
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
	// Reset emails are sent after their request was answered; let the ones under way finish.
	authService.WaitForEmails()
	return nil
}
