import { useState, type ReactElement } from 'react'
import { useSearchParams } from 'react-router'
import { ApiProblem } from '../../shared/api/ApiProblem'
import {
  BottomBar,
  Button,
  ButtonLink,
  CatalogCard,
  CatalogTable,
  EmptyState,
  FilterRail,
  MessageBox,
  MobileHeader,
  PageHeader,
  Pagination,
  ResultCount,
  Select,
  Skeleton,
  Toolbar,
} from '../../shared/ui'
import { useSession } from '../auth/useSession'
import { ActiveFilters } from '../filters/ActiveFilters'
import { FilterControls } from '../filters/FilterControls'
import { FilterSheet } from '../filters/FilterSheet'
import { SearchBox } from '../filters/SearchBox'
import { countActiveFilters } from '../filters/countActiveFilters'
import { hasActiveFilters } from '../filters/hasActiveFilters'
import { useFilterDefinitions } from '../filters/useFilterDefinitions'
import { withParameterValues } from '../filters/withParameterValues'
import { withoutFilters } from '../filters/withoutFilters'
import { catalogPageSize } from './catalogPageSize'
import { catalogSorts } from './catalogSorts'
import { toCatalogItem } from './toCatalogItem'
import { useCatalogPage } from './useCatalogPage'

// readPage takes the page from the URL (docs/context.md: paging lives in the URL query), falling back to 1.
function readPage(text: string | null): number {
  const page = Number(text)
  return Number.isInteger(page) && page >= 1 ? page : 1
}

// refusedFilters returns the API's messages when it refused the filters (400, Card 6 rule 8), as a hand-edited link
// can make it; any other failure returns none.
function refusedFilters(error: Error | null): string[] {
  if (!(error instanceof ApiProblem) || error.status !== 400) return []
  return error.fieldProblems.map((problem) => problem.message)
}

// CatalogPage is the home screen: the group's Miniatures, 24 per page (Card 5 rule 10), narrowed by the filters and
// sorted (Card 6). Filters, sort and page all live in the URL, so reload, back and a pasted link reproduce the list
// (Card 6 rule 6). Desktop shows the filter rail and the table; phones show cards.
export function CatalogPage(): ReactElement {
  const { user } = useSession()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = readPage(searchParams.get('page'))
  const catalog = useCatalogPage(searchParams)
  const definitions = useFilterDefinitions().data ?? []
  const isFiltering = hasActiveFilters(searchParams, definitions)
  const sort = searchParams.get('sort') ?? 'name'
  const activeFilterCount = countActiveFilters(searchParams, definitions)
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)
  const filterProblems = refusedFilters(catalog.error)
  const clearFiltersButton = <Button onClick={() => setSearchParams(withoutFilters(searchParams, definitions))}>Clear filters</Button>

  function changeSort(nextSort: string): void {
    setSearchParams(withParameterValues(searchParams, 'sort', nextSort === 'name' ? [] : [nextSort]))
  }

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
      <div className="flex flex-1">
        <FilterRail>
          <FilterControls definitions={definitions} query={searchParams} onChange={setSearchParams} />
        </FilterRail>
      <div className="min-w-0 flex-1 px-4 py-6 md:px-6">
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
        {catalog.isError && filterProblems.length === 0 && <MessageBox kind="error">The Catalog could not be loaded. Try again.</MessageBox>}
        <Toolbar
          search={<SearchBox query={searchParams} onChange={setSearchParams} />}
          phoneActions={
            <>
              <Button icon="sliders" onClick={() => setIsFilterSheetOpen(true)}>
                {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : 'Filters'}
              </Button>
              <Select label="Sort" options={catalogSorts} value={sort} onChange={changeSort} />
            </>
          }
        />
        <ActiveFilters definitions={definitions} query={searchParams} onChange={setSearchParams} />
        {filterProblems.length > 0 && (
          <EmptyState title="These filters cannot be used" action={clearFiltersButton}>
            {filterProblems.join(' ')}
          </EmptyState>
        )}
        {catalog.data && catalog.data.total === 0 && isFiltering && (
          <EmptyState title="No results" action={clearFiltersButton}>
            No miniatures match these filters.
          </EmptyState>
        )}
        {catalog.data && catalog.data.total === 0 && !isFiltering && (
          <EmptyState title="No miniatures yet" action={<ButtonLink to="/minis/new">Add your first miniature</ButtonLink>}>
            Add the minis you own, and the whole group can see them.
          </EmptyState>
        )}
        {catalog.data && catalog.data.total > 0 && (
          <div className="grid gap-4">
            <ResultCount matchingCount={catalog.data.total} catalogTotal={isFiltering ? catalog.data.catalogTotal : undefined} />
            <div className="hidden md:block">
              <CatalogTable
                items={catalog.data.items.map((miniature) => toCatalogItem(miniature, user.id))}
                sort={sort}
                onSortChange={changeSort}
              />
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
      </div>
      <FilterSheet
        open={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        definitions={definitions}
        query={searchParams}
        onApply={(query) => {
          setSearchParams(query)
          setIsFilterSheetOpen(false)
        }}
      />
      <BottomBar className="sticky bottom-0" />
    </div>
  )
}
