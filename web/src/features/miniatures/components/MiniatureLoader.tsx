import type { ReactElement } from 'react'
import { ApiProblem } from '../../../shared/api/ApiProblem'
import { MessageBox, Skeleton } from '../../../shared/ui'
import type { Miniature } from '../api/Miniature'
import { MiniatureNotFound } from './MiniatureNotFound'
import { useMiniature } from '../api/useMiniature'

type MiniatureLoaderProps = {
  id: string
  // children draws the screen once the Miniature has loaded; reload fetches it again.
  children: (miniature: Miniature, reload: () => void) => ReactElement
}

// MiniatureLoader loads one Miniature and shows the shared loading, not-found and error states, so the details and
// edit screens only draw the loaded case.
export function MiniatureLoader({ id, children }: MiniatureLoaderProps): ReactElement {
  const miniature = useMiniature(id)

  if (miniature.isPending) {
    return (
      <div className="px-4 py-6 md:px-6">
        <Skeleton variant="card" rowCount={1} />
      </div>
    )
  }
  if (miniature.error instanceof ApiProblem && miniature.error.status === 404) return <MiniatureNotFound />
  if (miniature.isError) {
    return (
      <div className="px-4 py-6 md:px-6">
        <MessageBox kind="error">This miniature could not be loaded. Try again.</MessageBox>
      </div>
    )
  }
  return children(miniature.data, () => void miniature.refetch())
}
