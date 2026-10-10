import { useState, type ReactElement, type ReactNode } from 'react'
import { creatureSizeLabels, creatureSizes } from '../../shared/lib/creatureSizes'
import { BaseGlyph, Banner, Button, CheckboxList, Dialog, EmptyState, LinkBox, MessageBox, NotePanel, Sheet, Skeleton, StatusPill, Toast, useToast } from '../../shared/ui'

// FeedbackDemo is batch 3 of the /dev/ui gallery: messages, overlays and loading states.

function GallerySection({ title, children }: { title: string; children: ReactNode }): ReactElement {
  return (
    <section className="border-t border-rule-strong pt-3">
      <h2 className="type-title mb-4">{title}</h2>
      <div className="flex flex-col gap-8">{children}</div>
    </section>
  )
}

function GalleryExample({ label, children }: { label: string; children: ReactNode }): ReactElement {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="type-label text-ink-2">{label}</h3>
      <div className="flex flex-wrap items-start gap-6">{children}</div>
    </div>
  )
}

export function FeedbackDemo(): ReactElement {
  const toast = useToast()
  const [openDialog, setOpenDialog] = useState<'delete' | 'conflict' | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [pickedSizes, setPickedSizes] = useState<string[]>(['small', 'medium'])

  function confirmDelete(): void {
    setIsDeleting(true)
    setTimeout(() => {
      setIsDeleting(false)
      setOpenDialog(null)
      toast.show('ok', 'Miniature deleted.')
    }, 1500)
  }

  return (
    <>
      <GallerySection title="Messages">
        <GalleryExample label="Toast (static, then live from the buttons)">
          <Toast kind="ok" message="Changes saved." onDismiss={() => {}} />
          <Toast kind="error" message="Could not save. Try again." onDismiss={() => {}} />
        </GalleryExample>
        <GalleryExample label="Live toasts: success leaves after 5 s, error stays">
          <Button onClick={() => toast.show('ok', 'Changes saved.')}>Show success</Button>
          <Button onClick={() => toast.show('error', 'Could not save. Try again.')}>Show error</Button>
        </GalleryExample>
        <GalleryExample label="Banner">
          <div className="grid w-full max-w-180 gap-4">
            <Banner icon="clock" showProgress>
              Waking the server. This can take up to a minute.
            </Banner>
            <Banner icon="alert" isAlert>
              You are offline. Showing the last loaded list; changes cannot be saved.
            </Banner>
          </div>
        </GalleryExample>
        <GalleryExample label="Message box and note panel">
          <div className="grid w-full max-w-140 gap-4">
            <MessageBox kind="error">Email or password is incorrect.</MessageBox>
            <MessageBox kind="ok">If that email exists, we sent a link to set a new password.</MessageBox>
            <MessageBox kind="info">The invitation was saved, but the email service is not responding. Copy the link and send it yourself.</MessageBox>
            <NotePanel>You can view this miniature. Only Rafa or an admin can edit or delete it.</NotePanel>
          </div>
        </GalleryExample>
        <GalleryExample label="Link box">
          <div className="w-full max-w-140">
            <LinkBox url="https://mini-manager.example/invite/7Hq2xk9TnPz4Vw8c" />
          </div>
        </GalleryExample>
        <GalleryExample label="Status pills (invites)">
          <StatusPill status="pending" />
          <StatusPill status="accepted" />
          <StatusPill status="expired" />
          <StatusPill status="cancelled" />
        </GalleryExample>
      </GallerySection>

      <GallerySection title="Overlays">
        <GalleryExample label="Dialogs (Esc closes, except while deleting)">
          <Button variant="destructive" icon="trash" onClick={() => setOpenDialog('delete')}>
            Delete
          </Button>
          <Button onClick={() => setOpenDialog('conflict')}>Show version conflict</Button>
        </GalleryExample>
        <GalleryExample label="Bottom sheet (mobile filters)">
          <Button icon="sliders" onClick={() => setIsSheetOpen(true)}>
            Filters
          </Button>
        </GalleryExample>
      </GallerySection>

      <GallerySection title="Loading and empty">
        <GalleryExample label="Skeleton, table rows (desktop)">
          <div className="w-full max-w-160">
            <Skeleton variant="table" rowCount={4} />
          </div>
        </GalleryExample>
        <GalleryExample label="Skeleton, cards (mobile)">
          <div className="w-full max-w-97.5">
            <Skeleton variant="card" rowCount={3} />
          </div>
        </GalleryExample>
        <GalleryExample label="Empty states">
          <EmptyState title="No miniatures yet" action={<Button variant="primary">Add your first miniature</Button>}>
            Add the first one, with a photo if you have it, and it shows up here for everyone in the group.
          </EmptyState>
          <EmptyState title="No miniatures match these filters." action={<Button>Clear filters</Button>}>
            Remove a filter or clear them all to see the whole catalog again.
          </EmptyState>
        </GalleryExample>
      </GallerySection>

      <Dialog
        open={openDialog === 'delete'}
        onClose={() => setOpenDialog(null)}
        isSaving={isDeleting}
        title="Delete Goblin Boss?"
        actions={
          <>
            <Button onClick={() => setOpenDialog(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="confirm" isLoading={isDeleting} onClick={confirmDelete}>
              Delete miniature
            </Button>
          </>
        }
      >
        <p>This also deletes its 2 photos. This cannot be undone.</p>
      </Dialog>
      <Dialog
        open={openDialog === 'conflict'}
        onClose={() => setOpenDialog(null)}
        title="This miniature changed"
        actions={
          <Button variant="primary" onClick={() => setOpenDialog(null)}>
            Reload
          </Button>
        }
      >
        <p>Someone changed this miniature while you were editing. Reload to see their changes.</p>
      </Dialog>
      <Sheet
        open={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title="Filters"
        headerActions={
          <Button variant="quiet" size="sm" onClick={() => setPickedSizes([])}>
            Clear all
          </Button>
        }
        footer={
          <Button variant="primary" fullWidth onClick={() => setIsSheetOpen(false)}>
            Show 48 minis
          </Button>
        }
      >
        <div className="py-4">
          <CheckboxList
            label="Size"
            value={pickedSizes}
            onChange={setPickedSizes}
            options={creatureSizes.map((creatureSize) => ({ value: creatureSize, label: creatureSizeLabels[creatureSize], icon: <BaseGlyph creatureSize={creatureSize} /> }))}
          />
        </div>
      </Sheet>
    </>
  )
}
