import { useState, type ReactElement, type ReactNode } from 'react'
import { creatureSizeLabels } from '../../shared/lib/creatureSizes'
import { getPhotoError } from '../../shared/lib/getPhotoError'
import {
  AppBar,
  BaseGlyph,
  BottomBar,
  Breadcrumbs,
  Button,
  ChallengeRatingStamp,
  DataCell,
  DataRow,
  DataTable,
  DefinitionList,
  FileDrop,
  IconButton,
  MobileHeader,
  MobileListRow,
  OwnerStamp,
  PageHeader,
  PaintMark,
  Pagination,
  Person,
  PhotoSlot,
  PhotoViewer,
  Quantity,
  ResultCount,
  RowLinkList,
  StickyActionBar,
  useToast,
} from '../../shared/ui'

// LayoutDemo is batch 4 of the /dev/ui gallery: navigation, page pieces, data rows and photos.
// Phone-only pieces get "md:flex"/"md:grid" here so they also show on a desktop-width gallery.

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

function PhoneFrame({ children }: { children: ReactNode }): ReactElement {
  return <div className="w-97.5 max-w-full border border-rule-strong bg-page">{children}</div>
}

export function LayoutDemo(): ReactElement {
  const toast = useToast()
  const [page, setPage] = useState(1)

  // checkPickedPhotos runs the Card 7 checks as if the miniature already had 2 photos, and shows the result.
  function checkPickedPhotos(pickedFiles: File[]): void {
    const photoError = pickedFiles.map((file) => getPhotoError(file, 2)).find(Boolean)
    toast.show(photoError ? 'error' : 'ok', photoError ?? `${pickedFiles.length} photo ready to upload.`)
  }

  return (
    <>
      <GallerySection title="Navigation">
        <GalleryExample label="Desktop app bar (admin; open the profile menu)">
          <div className="w-full border border-rule-strong">
            <AppBar user={{ displayName: 'Mateus', initials: 'MA' }} isAdmin onLogout={() => toast.show('ok', 'Logged out.')} />
          </div>
        </GalleryExample>
        <GalleryExample label="Mobile header: top level, and a deeper screen with one action">
          <PhoneFrame>
            <MobileHeader className="md:flex" />
          </PhoneFrame>
          <PhoneFrame>
            <MobileHeader className="md:flex" backLink={{ to: '/dev/ui', label: 'Catalog' }} action={<IconButton icon="edit" label="Edit" />} />
          </PhoneFrame>
        </GalleryExample>
        <GalleryExample label="Mobile bottom bar, and with Add outlined">
          <PhoneFrame>
            <BottomBar className="md:grid" />
          </PhoneFrame>
          <PhoneFrame>
            <BottomBar className="md:grid" outlineAddButton />
          </PhoneFrame>
        </GalleryExample>
        <GalleryExample label="Pinned action bar: form, and details for owners">
          <PhoneFrame>
            <StickyActionBar className="md:grid">
              <Button variant="primary" fullWidth>
                Save miniature
              </Button>
            </StickyActionBar>
          </PhoneFrame>
          <PhoneFrame>
            <StickyActionBar className="md:grid" twoColumns>
              <Button icon="edit" fullWidth>
                Edit
              </Button>
              <Button variant="destructive" icon="trash" fullWidth>
                Delete
              </Button>
            </StickyActionBar>
          </PhoneFrame>
        </GalleryExample>
        <GalleryExample label="Row link list (Profile on a phone)">
          <PhoneFrame>
            <div className="px-4">
              <RowLinkList
                items={[
                  { label: 'Change password', to: '/dev/ui' },
                  { label: 'Members', to: '/dev/ui' },
                  { label: 'Log out', onClick: () => toast.show('ok', 'Logged out.') },
                ]}
              />
            </div>
          </PhoneFrame>
        </GalleryExample>
      </GallerySection>

      <GallerySection title="Page pieces">
        <GalleryExample label="Breadcrumbs and page header (desktop)">
          <div className="w-full max-w-240 border border-rule p-6">
            <Breadcrumbs items={[{ label: 'Members', to: '/dev/ui' }, { label: 'Invite person' }]} />
            <PageHeader title="Members" metaLine="6 people · 1 admin" action={<Button variant="primary" icon="plus">Invite person</Button>} />
          </div>
        </GalleryExample>
        <GalleryExample label="Result count and pagination">
          <div className="grid w-full max-w-240 gap-2">
            <ResultCount matchingCount={48} catalogTotal={312} />
            <Pagination page={page} pageSize={24} total={312} onPageChange={setPage} />
          </div>
        </GalleryExample>
        <GalleryExample label="Photo viewer and definition list (details page)">
          <div className="w-80">
            <PhotoViewer
              creatureSize="small"
              photos={[
                { id: '1', alt: 'Front', isCover: true },
                { id: '2', alt: 'Back', isCover: false },
                { id: '3', alt: 'Base', isCover: false },
              ]}
            />
          </div>
          <div className="w-80">
            <PhotoViewer creatureSize="large" photos={[]} />
          </div>
          <div className="w-105 max-w-full">
            <DefinitionList
              items={[
                { label: 'Type', value: 'Humanoid' },
                { label: 'Size', value: <><BaseGlyph creatureSize="small" />{creatureSizeLabels.small}</> },
                { label: 'Challenge rating', value: <ChallengeRatingStamp challengeRating={1} /> },
                { label: 'Paint status', value: <PaintMark status="hand_painted" /> },
                { label: 'Owner', value: <><OwnerStamp initials="MA" isCurrentUser />Mateus (you)</> },
                { label: 'Quantity', value: <Quantity quantity={1} /> },
              ]}
            />
          </div>
        </GalleryExample>
      </GallerySection>

      <GallerySection title="Data rows">
        <GalleryExample label="Admin data table (desktop) and mobile list row">
          <div className="w-160 max-w-full">
            <DataTable
              label="Members"
              gridTemplateColumns="minmax(150px,1fr) 80px 90px 150px"
              headers={[{ label: 'Person' }, { label: 'Role' }, { label: 'Minis', align: 'end' }, { label: '' }]}
            >
              {[
                ['AN', 'Ana', 'ana@example.com', 63],
                ['RA', 'Rafa', 'rafa@example.com', 52],
              ].map(([initials, name, email, minis]) => (
                <DataRow key={name}>
                  <DataCell>
                    <Person initials={String(initials)} name={String(name)} email={String(email)} />
                  </DataCell>
                  <DataCell>Member</DataCell>
                  <DataCell align="end">
                    <span className="type-mono">{minis}</span>
                  </DataCell>
                  <DataCell align="end">
                    <Button variant="quiet" size="sm">
                      Change role
                    </Button>
                  </DataCell>
                </DataRow>
              ))}
            </DataTable>
          </div>
          <PhoneFrame>
            <MobileListRow
              initials="AN"
              name="Ana"
              email="ana@example.com"
              metaText="Member"
              actions={
                <>
                  <Button>Change role</Button>
                  <Button>Deactivate</Button>
                </>
              }
            />
          </PhoneFrame>
        </GalleryExample>
      </GallerySection>

      <GallerySection title="Photos">
        <GalleryExample label="Photo slots: empty, uploading, cover, not cover, error">
          <PhotoSlot state="empty" creatureSize="small" onFiles={checkPickedPhotos} />
          <PhotoSlot state="uploading" creatureSize="small" progress={62} />
          <PhotoSlot state="uploaded" creatureSize="small" alt="Goblin Boss, front" isCover onRemove={() => {}} />
          <PhotoSlot state="uploaded" creatureSize="small" alt="Goblin Boss, back" isCover={false} onSetCover={() => {}} onRemove={() => {}} />
          <PhotoSlot state="error" message="Images must be 5 MB or smaller." />
        </GalleryExample>
        <GalleryExample label="File drop zone (checks Card 7 rules; result appears as a toast)">
          <FileDrop onFiles={checkPickedPhotos} />
        </GalleryExample>
      </GallerySection>
    </>
  )
}
