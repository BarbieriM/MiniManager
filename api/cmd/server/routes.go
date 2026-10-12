package main

import (
	"errors"
	"io/fs"
	"net/http"
	"os"
	"path"
	"strings"

	"github.com/BarbieriM/MiniManager/api/internal/features/auth"
	"github.com/BarbieriM/MiniManager/api/internal/features/filters"
	"github.com/BarbieriM/MiniManager/api/internal/features/invites"
	"github.com/BarbieriM/MiniManager/api/internal/features/members"
	"github.com/BarbieriM/MiniManager/api/internal/features/miniatures"
	"github.com/BarbieriM/MiniManager/api/internal/features/photos"
	"github.com/BarbieriM/MiniManager/api/internal/features/users"
	platformauth "github.com/BarbieriM/MiniManager/api/internal/platform/auth"
	"github.com/BarbieriM/MiniManager/api/internal/platform/httpx"
)

// handlerDeps is everything the routes need, built in main and in tests.
type handlerDeps struct {
	auth         *auth.Service
	users        *users.Service
	filters      *filters.Service
	miniatures   *miniatures.Service
	photos       *photos.Service
	invites      *invites.Service
	members      *members.Service
	accessTokens *platformauth.AccessTokens
	// webDir holds the built SPA (web/dist). Empty means the API runs alone, as in `make dev`.
	webDir string
}

// newHandler returns the whole app: the API under /api/v1 and the SPA everywhere else.
func newHandler(deps handlerDeps) http.Handler {
	mux := http.NewServeMux()
	requireUser := deps.users.RequireUser(deps.accessTokens)
	auth.NewHandler(deps.auth).Register(mux, requireUser)
	users.NewHandler(deps.users).Register(mux, requireUser)
	invites.NewHandler(deps.invites).Register(mux, requireUser)
	members.NewHandler(deps.members).Register(mux, requireUser)
	miniatures.NewHandler(deps.miniatures).Register(mux, requireUser)
	filters.NewHandler(deps.filters).Register(mux, requireUser)
	photos.NewHandler(deps.photos).Register(mux, requireUser)

	mux.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) {
		httpx.WriteProblem(w, http.StatusNotFound, "There is no API endpoint at this path.")
	})
	if deps.webDir != "" {
		mux.Handle("/", spaHandler(deps.webDir))
	}
	return mux
}

// spaHandler serves files from the built SPA and answers every other path with index.html, so React Router can
// handle client routes such as /minis/123 on a full page load.
func spaHandler(webDir string) http.Handler {
	files := os.DirFS(webDir)
	fileServer := http.FileServerFS(files)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		name := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
		if name != "" && name != "index.html" {
			if info, err := fs.Stat(files, name); err == nil && !info.IsDir() {
				// Vite puts a content hash in every asset name, so assets can be cached for good.
				if strings.HasPrefix(name, "assets/") {
					w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
				}
				fileServer.ServeHTTP(w, r)
				return
			} else if err != nil && !errors.Is(err, fs.ErrNotExist) {
				httpx.WriteInternalError(w, r, err)
				return
			}
		}
		// index.html must never be cached, or a deploy would keep serving old asset names.
		w.Header().Set("Cache-Control", "no-cache")
		http.ServeFileFS(w, r, files, "index.html")
	})
}
