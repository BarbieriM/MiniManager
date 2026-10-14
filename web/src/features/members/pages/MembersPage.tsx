import { useState, type ReactElement } from 'react'
import { Navigate } from 'react-router'
import { initialsFromDisplayName } from '../../../shared/lib/initialsFromDisplayName'
import { roleLabels } from '../../../shared/lib/roleLabels'
import { Button, DataCell, DataRow, DataTable, MessageBox, MobileHeader, MobileListRow, PageBody, PageHeader, Person, SectionHeading, Skeleton } from '../../../shared/ui'
import { useSession } from '../../auth/lib/useSession'
import { InvitePanel } from '../../invites/components/InvitePanel'
import { InvitesSection } from '../../invites/components/InvitesSection'
import type { Member } from '../api/Member'
import { useMembers } from '../api/useMembers'
import { MemberActionDialog } from '../components/MemberActionDialog'
import { memberActions, type MemberAction } from '../lib/memberActions'

// summary is the line under the title, such as "6 people · 1 admin".
function summary(members: Member[]): string {
  const admins = members.filter((member) => member.active && member.role === 'admin').length
  return `${members.length} ${members.length === 1 ? 'person' : 'people'} · ${admins} ${admins === 1 ? 'admin' : 'admins'}`
}

// MembersPage is /admin/members, for Admins only (Card 4 rule 5; the API refuses everyone else too). A Member who
// opens it goes back to the Catalog before anything is loaded.
export function MembersPage(): ReactElement {
  const { user } = useSession()
  if (user.role !== 'admin') return <Navigate to="/" replace />
  return <AdminMembersPage currentUserId={user.id} />
}

// AdminMembersPage lists every User, with Role changes, deactivating and reactivating, and every Invite, with
// Invite, Resend and Cancel.
function AdminMembersPage({ currentUserId }: { currentUserId: string }): ReactElement {
  const members = useMembers()
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<MemberAction | null>(null)

  const actionButtons = (member: Member): ReactElement[] =>
    memberActions(member, currentUserId).map((action) => (
      <Button key={action.buttonLabel} size="sm" variant="quiet" aria-label={action.buttonLabel} onClick={() => setPendingAction(action)}>
        {action.shortLabel}
      </Button>
    ))

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <MobileHeader backLink={{ to: '/profile', label: 'Profile' }} />
      <PageBody>
        <PageHeader
          title="Members"
          metaLine={members.data && summary(members.data)}
          action={
            <Button variant="primary" icon="plus" onClick={() => setIsInviteOpen(true)}>
              Invite
            </Button>
          }
        />
        <section aria-labelledby="users-heading" className="grid gap-3">
          <SectionHeading id="users-heading">Users</SectionHeading>
          {members.isPending && <Skeleton variant="table" />}
          {members.isError && <MessageBox kind="error">The members could not be loaded. Try again.</MessageBox>}
          {members.data && (
            <>
              <div className="hidden md:block">
                <DataTable
                  label="Users"
                  gridTemplateColumns="minmax(200px,1fr) 90px 110px 220px"
                  headers={[{ label: 'Person' }, { label: 'Role' }, { label: 'Status' }, { label: '', align: 'end' }]}
                >
                  {members.data.map((member) => (
                    <DataRow key={member.id}>
                      <DataCell>
                        <Person
                          initials={initialsFromDisplayName(member.displayName)}
                          name={member.displayName}
                          email={member.email}
                          isCurrentUser={member.id === currentUserId}
                        />
                      </DataCell>
                      <DataCell>{roleLabels[member.role]}</DataCell>
                      <DataCell>{member.active ? 'Active' : 'Deactivated'}</DataCell>
                      <DataCell align="end">{actionButtons(member)}</DataCell>
                    </DataRow>
                  ))}
                </DataTable>
              </div>
              <div className="-mx-4 border-t border-rule-strong md:hidden">
                {members.data.map((member) => (
                  <MobileListRow
                    key={member.id}
                    initials={initialsFromDisplayName(member.displayName)}
                    name={member.displayName}
                    email={member.email}
                    isCurrentUser={member.id === currentUserId}
                    metaText={member.active ? roleLabels[member.role] : `${roleLabels[member.role]} · Deactivated`}
                    actions={actionButtons(member)}
                  />
                ))}
              </div>
            </>
          )}
        </section>
        <InvitesSection />
      </PageBody>
      <InvitePanel open={isInviteOpen} onClose={() => setIsInviteOpen(false)} />
      <MemberActionDialog action={pendingAction} onClose={() => setPendingAction(null)} />
    </div>
  )
}
