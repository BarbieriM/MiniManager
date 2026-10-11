# 0003. golang.org/x/text for accent-free name search

Date: 2026-10-11 · Status: accepted

## Context

CLAUDE.md says `name_search` is "lower-cased, accents removed" and "written by the service on every save", so
that sorting and step 3's name search treat "Éttercap" and "ettercap" as the same name. Go's standard library can
lower-case text but cannot remove accents: that needs Unicode normalization, which splits "é" into "e" plus a
combining accent mark that can then be dropped.

## Decision

Use `golang.org/x/text/unicode/norm` (NFD) in `features/miniatures`, and drop the combining marks (Unicode
category Mn) with the standard `unicode` package. It became a direct dependency in build step 2 and is listed in
the plan's library table. Mateus approved it during step 2 planning (Q4).

## Alternatives

- **Postgres's `unaccent` extension**, in a generated column or in the queries. It needs no Go library, but it
  moves a rule CLAUDE.md puts in the service into SQL, and the extension's rules file can differ between Postgres
  installs.
- **A hand-written table of accented letters.** No dependency, but it is incomplete by nature and becomes one more
  thing to maintain.

## Consequences

- `golang.org/x/text` is maintained by the Go team and was already in `go.sum` through the tools, so it adds no
  new trust.
- Any other Unicode text handling (for example a future search on tags) can reuse the same package.
