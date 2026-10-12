import type { Member } from '../api/Member'
import type { MemberChange } from '../api/MemberChange'

// MemberAction is one change the Admin can make to a User, with the words its button and confirmation use.
export type MemberAction = {
  // buttonLabel names the User, so each row's buttons are told apart by screen readers.
  buttonLabel: string
  shortLabel: string
  title: string
  explanation: string
  confirmLabel: string
  change: MemberChange
}

// memberActions lists what the Admin can do to member: change their Role, and deactivate or reactivate them.
// Nobody is offered deactivating themself (Card 4, clarified 2026-10-11).
export function memberActions(member: Member, currentUserId: string): MemberAction[] {
  const name = member.displayName
  const roleAction: MemberAction =
    member.role === 'admin'
      ? {
          buttonLabel: `Make ${name} a member`,
          shortLabel: 'Make member',
          title: `Make ${name} a member?`,
          explanation: `${name} will be able to change only the minis they own.`,
          confirmLabel: 'Make member',
          change: { id: member.id, role: 'member' },
        }
      : {
          buttonLabel: `Make ${name} an admin`,
          shortLabel: 'Make admin',
          title: `Make ${name} an admin?`,
          explanation: `${name} will be able to change any mini, invite people and manage members.`,
          confirmLabel: 'Make admin',
          change: { id: member.id, role: 'admin' },
        }
  if (!member.active) {
    return [
      roleAction,
      {
        buttonLabel: `Reactivate ${name}`,
        shortLabel: 'Reactivate',
        title: `Reactivate ${name}?`,
        explanation: `${name} can log in again with their old password, or reset it.`,
        confirmLabel: 'Reactivate',
        change: { id: member.id, active: true },
      },
    ]
  }
  if (member.id === currentUserId) return [roleAction]
  return [
    roleAction,
    {
      buttonLabel: `Deactivate ${name}`,
      shortLabel: 'Deactivate',
      title: `Deactivate ${name}?`,
      explanation: `${name} is logged out and can no longer log in. Their minis stay in the Catalog, still theirs.`,
      confirmLabel: 'Deactivate',
      change: { id: member.id, active: false },
    },
  ]
}
