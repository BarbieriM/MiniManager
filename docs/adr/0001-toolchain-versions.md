# 0001. Toolchain versions: React 19, Yarn 4, oxlint, Go 1.26 with pinned tools

Date: 2026-10-09 · Status: accepted

## Context

When the repo was scaffolded, the current releases differed from what `docs/context.md` and CLAUDE.md assumed.
The Vite React-TS template ships React 19 and oxlint, not React 18 and ESLint. React Router's current major
version is 8. The current versions of sqlc, goose, staticcheck and air all need Go 1.26, while the plan said
"Go 1.23+". The globally installed Yarn was 1.x, which only gets maintenance fixes.

## Decision

- **React 19 and React Router v8**: they are the current versions, and every library in the stack supports them.
- **Yarn 4**, pinned in `web/package.json` (`packageManager`) and run through corepack, with
  `nodeLinker: node-modules`. That linker gives a normal `node_modules`, so Vite, Tailwind and Playwright work
  without extra setup.
- **oxlint** instead of ESLint: the Vite template's default, with React hooks rules built in and no plugins to
  manage. `yarn lint` runs `oxlint` and then `tsc -b --noEmit`.
- **Node 22** (`.nvmrc`, `engines` in `web/package.json`): Vitest 5 and jsdom 30 need Node 22.12 or newer,
  and Node 20 reached end of life in April 2026.
- **Go 1.26**, set by `api/go.mod`. `sqlc`, `goose`, `staticcheck` and `air` are pinned as Go tools
  (`go get -tool`) and run as `go tool <name>`, so local runs and CI use the same versions without global
  installs.

## Alternatives

- Stay on React 18 and ESLint as the docs said. That means downgrading the template and maintaining four more
  ESLint packages for no real gain.
- Yarn 1, or Yarn 4 with Plug'n'Play. Yarn 1 is in maintenance mode, and Plug'n'Play adds friction with editors
  and some tools.
- Install the Go tools with Homebrew, or pin older tool versions that still support Go 1.24. Homebrew versions
  drift between machines and CI, and older tools stop getting fixes.

## Consequences

- Developers need Node 22 (`nvm use`) and `corepack enable` under it, with no global npm Yarn installed. Go downloads the 1.26 toolchain
  automatically if the local Go is older.
- `api/go.mod` lists many indirect modules that come from the tools (air alone pulls in much of Hugo). They are
  not compiled into the server binary.
- If oxlint misses a rule we need, ESLint can be added back without touching the code.
