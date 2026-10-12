import type { Invite } from './Invite'

// SentInvite is an Invite just sent or resent: its link, shown only now, and whether the email went out.
export type SentInvite = Invite & { link: string; emailSent: boolean }
