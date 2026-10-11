import type { ReactElement } from 'react'
import { useSearchParams } from 'react-router'
import {
  BottomBar,
  ButtonLink,
  CatalogCard,
  CatalogTable,
  EmptyState,
  MessageBox,
  MobileHeader,
  PageHeader,
  Pagination,
  ResultCount,
  Skeleton,
} from '../../shared/ui'
import { useSession } from '../auth/useSession'
import { catalogPageSize } from './catalogPageSize'
import { toCatalogItem } from './toCatalogItem'
import { useCatalogPage } from './useCatalogPage'

// readPage takes the page from the URL (docs/context.md: paging lives in the URL query), falling back to 1.
function readPage(text: string | null): number {
  const page = Number(text)
  return Number.isInteger(page) && page >= 1 ? page : 1
}

// CatalogPage is the home screen: every Miniature in the group, A to Z, 24 per page (Card 5 rule 10). Desktop
// shows the table; phones show cards. Filters and sorting arrive in build step 3.
export function CatalogPage(): ReactElement {
  const { user } = useSession()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = readPage(searchParams.get('page'))
  const catalog = useCatalogPage(page)

  function goToPage(nextPage: number): void {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.set('page', String(nextPage))
      return next
    })
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <MobileHeader />
      <div className="flex-1 px-4 py-6 md:px-6">
        <PageHeader
          title="Catalog"
          action={
            // Phones add from the bottom bar, which holds the screen's one vermilion element there.
            <ButtonLink to="/minis/new" variant="primary" icon="plus" className="hidden md:inline-flex">
              Add miniature
            </ButtonLink>
          }
        />
        {catalog.isPending && (
          <>
            <div className="hidden md:block">
              <Skeleton variant="table" />
            </div>
            <div className="md:hidden">
              <Skeleton variant="card" />
            </div>
          </>
        )}
        {catalog.isError && <MessageBox kind="error">The Catalog could not be loaded. Try again.</MessageBox>}
        {catalog.data && catalog.data.total === 0 && (
          <EmptyState title="No miniatures yet" action={<ButtonLink to="/minis/new">Add your first miniature</ButtonLink>}>
            Add the minis you own, and the whole group can see them.
          </EmptyState>
        )}
        {catalog.data && catalog.data.total > 0 && (
          <div className="grid gap-4">
            <ResultCount matchingCount={catalog.data.total} />
            <div className="hidden md:block">
              <CatalogTable items={catalog.data.items.map((miniature) => toCatalogItem(miniature, user.id))} />
            </div>
            <ul className="-mx-4 border-t border-rule-strong md:hidden">
              {catalog.data.items.map((miniature) => (
                <li key={miniature.id}>
                  <CatalogCard item={toCatalogItem(miniature, user.id)} />
                </li>
              ))}
            </ul>
            <Pagination page={page} pageSize={catalogPageSize} total={catalog.data.total} onPageChange={goToPage} />
          </div>
        )}
      </div>
      <BottomBar className="sticky bottom-0" />
    </div>
  )
}
