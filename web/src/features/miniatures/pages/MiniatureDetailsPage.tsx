import { useState, type ReactElement } from 'react'
import { useParams } from 'react-router'
import { creatureSizeLabels } from '../../../shared/lib/creatureSizes'
import { creatureTypeLabels } from '../../../shared/lib/creatureTypes'
import { photoAltText } from '../../../shared/lib/photoAltText'
import { formatChallengeRating } from '../../../shared/lib/formatChallengeRating'
import {
  BottomBar,
  Breadcrumbs,
  Button,
  ButtonLink,
  DefinitionList,
  MobileHeader,
  NotePanel,
  PageHeader,
  PaintMark,
  PhotoViewer,
  StickyActionBar,
  Tag,
} from '../../../shared/ui'
import { DeleteMiniatureDialog } from '../components/DeleteMiniatureDialog'
import type { MiniatureDetails } from '../api/MiniatureDetails'
import { MiniatureLoader } from '../components/MiniatureLoader'

// MiniatureDetailsPage shows every field of one Miniature (Card 5). Its Owner and Admins get Edit and Delete;
// everyone else gets a note saying who can (Card 4 acceptance criterion 1). canChange comes from the server.
export function MiniatureDetailsPage(): ReactElement {
  const { id = '' } = useParams()
  return <MiniatureLoader id={id}>{(details) => <MiniatureDetailsView details={details} />}</MiniatureLoader>
}

function MiniatureDetailsView({ details }: { details: MiniatureDetails }): ReactElement {
  const [isDeleting, setIsDeleting] = useState(false)
  const actions = (
    <>
      <ButtonLink to={`/minis/${details.id}/edit`} icon="edit">
        Edit
      </ButtonLink>
      <Button variant="destructive" icon="trash" onClick={() => setIsDeleting(true)}>
        Delete
      </Button>
    </>
  )

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <MobileHeader backLink={{ to: '/', label: 'Catalog' }} />
      <div className="flex-1 px-4 py-6 md:px-6">
        <div className="hidden md:block">
          <Breadcrumbs items={[{ label: 'Catalog', to: '/' }, { label: details.name }]} />
        </div>
        <PageHeader title={details.name} action={details.canChange && <div className="hidden gap-3 md:flex">{actions}</div>} />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="grid content-start gap-3">
            <PhotoViewer
              photos={details.photos.map((photo, index) => ({
                id: photo.id,
                url: photo.fullUrl,
                thumbnailUrl: photo.thumbnailUrl,
                alt: photoAltText(details.name, index),
                isCover: photo.isCover,
              }))}
              creatureSize={details.size}
            />
            {details.canChange && details.photosEnabled && (
              <div>
                <ButtonLink to={`/minis/${details.id}/edit#photos`} icon="plus">
                  Add photos
                </ButtonLink>
              </div>
            )}
          </div>
          <div className="grid content-start gap-4">
            <DefinitionList items={definitionItems(details)} />
            {!details.canChange && (
              <NotePanel>You can view this miniature. Only {details.owner.displayName} or an admin can edit or delete it.</NotePanel>
            )}
          </div>
        </div>
      </div>
      {/* Owners and Admins get Edit and Delete pinned at the bottom instead of the bottom bar (docs/context.md). */}
      {details.canChange ? (
        <StickyActionBar twoColumns>
          {actions}
        </StickyActionBar>
      ) : (
        <BottomBar className="sticky bottom-0" />
      )}
      <DeleteMiniatureDialog open={isDeleting} onClose={() => setIsDeleting(false)} miniature={details} />
    </div>
  )
}

function definitionItems(details: MiniatureDetails): { label: string; value: ReactElement | string }[] {
  const items: { label: string; value: ReactElement | string }[] = [
    { label: 'Owner', value: details.owner.displayName },
    { label: 'Type', value: creatureTypeLabels[details.creatureType] },
    { label: 'Size', value: creatureSizeLabels[details.size] },
    { label: 'Challenge Rating', value: formatChallengeRating(details.challengeRating) },
    { label: 'Quantity', value: String(details.quantity) },
    { label: 'Paint status', value: <PaintMark status={details.paintStatus} /> },
  ]
  if (details.tags.length > 0) {
    items.push({
      label: 'Tags',
      value: (
        <span className="flex flex-wrap gap-2">
          {details.tags.map((tag) => (
            <Tag key={tag} tag={tag} />
          ))}
        </span>
      ),
    })
  }
  if (details.storageLocation) items.push({ label: 'Storage location', value: details.storageLocation })
  if (details.manufacturer) items.push({ label: 'Manufacturer', value: details.manufacturer })
  if (details.notes) items.push({ label: 'Notes', value: details.notes })
  return items
}
