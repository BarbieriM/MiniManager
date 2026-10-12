import type { Role } from '../../../shared/api/Role'

// Member is one User as the Members page lists them (Card 4). The page's name is "Members", but it lists every
// User, Admins too (see Members page in GLOSSARY.md).
export type Member = { id: string; email: string; displayName: string; role: Role; active: boolean }
