import type { ReactElement } from 'react'
import { useParams } from 'react-router'
import { ButtonLink, MobileHeader, NotePanel, PageHeader } from '../../../shared/ui'
import { PhotosSection } from '../../photos/components/PhotosSection'
import { MiniatureForm } from '../components/MiniatureForm'
import { MiniatureLoader } from '../components/MiniatureLoader'

// MiniatureFormPage is /minis/new (add) and /minis/:id/edit (edit).
export function MiniatureFormPage(): ReactElement {
  const { id } = useParams()
  return id ? <EditMiniature id={id} /> : <AddMiniature />
}

function AddMiniature(): ReactElement {
  return (
    <>
      <MobileHeader backLink={{ to: '/', label: 'Catalog' }} />
      <div className="px-4 py-6 md:px-6">
        <PageHeader title="Add miniature" />
        <MiniatureForm />
      </div>
    </>
  )
}

function EditMiniature({ id }: { id: string }): ReactElement {
  return (
    <MiniatureLoader id={id}>
      {(details, reload) => (
        <>
          <MobileHeader backLink={{ to: `/minis/${details.id}`, label: details.name }} />
          <div className="px-4 py-6 md:px-6">
            <PageHeader title={`Edit ${details.name}`} />
            {details.canChange ? (
              <div className="grid gap-8">
                {/* The key remounts the form with the saved values when Reload fetches a newer version. */}
                <MiniatureForm key={details.version} miniature={details} onReload={reload} />
                {details.photosEnabled && <PhotosSection miniature={details} />}
              </div>
            ) : (
              <div className="grid max-w-160 gap-4">
                <NotePanel>Only {details.owner.displayName} or an admin can edit this miniature.</NotePanel>
                <div>
                  <ButtonLink to={`/minis/${details.id}`}>Back to the miniature</ButtonLink>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </MiniatureLoader>
  )
}
