import { useState, type ReactElement } from 'react'
import { isChallengeRatingRangeInvalid, type ChallengeRatingRangeValue } from '../../shared/lib/isChallengeRatingRangeInvalid'
import { ChallengeRatingRange, CheckboxList, FilterGroup, MultiCombobox, Segmented } from '../../shared/ui'
import type { FilterDefinition } from './FilterDefinition'
import { withParameterValues } from './withParameterValues'

type FilterControlsProps = {
  definitions: FilterDefinition[]
  // query holds the filter values (the URL on desktop, the pending copy in the phone sheet).
  query: URLSearchParams
  onChange: (query: URLSearchParams) => void
}

type FilterControlProps = Omit<FilterControlsProps, 'definitions'> & { definition: FilterDefinition }

// FilterControls draws one collapsible control per filter definition (Card 6 rule 10), except search, which sits
// above the results. Values inside one filter combine with OR; the server does the filtering (rules 2 and 9).
export function FilterControls({ definitions, query, onChange }: FilterControlsProps): ReactElement {
  return (
    <>
      {definitions
        .filter((definition) => definition.control !== 'search')
        .map((definition) => (
          <FilterGroup key={definition.key} label={definition.label}>
            <FilterControl definition={definition} query={query} onChange={onChange} />
          </FilterGroup>
        ))}
    </>
  )
}

function FilterControl({ definition, query, onChange }: FilterControlProps): ReactElement {
  if (definition.control === 'challengeRatingRange') return <ChallengeRatingFilter definition={definition} query={query} onChange={onChange} />
  if (definition.control === 'tags') return <TagsFilter definition={definition} query={query} onChange={onChange} />
  const [parameter] = definition.parameters
  return (
    <CheckboxList
      label={definition.label}
      options={definition.options ?? []}
      value={query.getAll(parameter)}
      onChange={(values) => onChange(withParameterValues(query, parameter, values))}
    />
  )
}

// TagsFilter picks tags and whether a mini needs any or all of them (Card 6 rule 3). Its parameters are the tags,
// then the match setting, which is left out of the URL for the default "any".
function TagsFilter({ definition, query, onChange }: FilterControlProps): ReactElement {
  const [tagsParameter, matchParameter] = definition.parameters
  return (
    <>
      <MultiCombobox
        label={definition.label}
        options={definition.options ?? []}
        value={query.getAll(tagsParameter)}
        onChange={(tags) => onChange(withParameterValues(query, tagsParameter, tags))}
        placeholder="Pick tags"
      />
      <Segmented
        label="Tags must match"
        options={[
          { value: 'any', label: 'Match any' },
          { value: 'all', label: 'Match all' },
        ]}
        value={query.get(matchParameter) === 'all' ? 'all' : 'any'}
        onChange={(match) => onChange(withParameterValues(query, matchParameter, match === 'all' ? ['all'] : []))}
        fullWidth
      />
    </>
  )
}

function readChallengeRating(text: string | null): number | null {
  return text ? Number(text) : null
}

// ChallengeRatingFilter keeps a backwards range ("Minimum CR cannot be higher than maximum CR.", Card 6 rule 5) in
// its own state and only puts a valid range in the query, so the list is never asked for an impossible range.
function ChallengeRatingFilter({ definition, query, onChange }: FilterControlProps): ReactElement {
  const [minimumParameter, maximumParameter] = definition.parameters
  const queryMinimum = query.get(minimumParameter)
  const queryMaximum = query.get(maximumParameter)
  const [range, setRange] = useState<ChallengeRatingRangeValue>({ min: readChallengeRating(queryMinimum), max: readChallengeRating(queryMaximum) })
  // The query's bounds as last seen, kept in state like SearchBox does, so a change made elsewhere (a removed chip,
  // "Clear all", Back) replaces what the selects show instead of being overwritten by it later.
  const queryBounds = `${queryMinimum ?? ''}..${queryMaximum ?? ''}`
  const [seenQueryBounds, setSeenQueryBounds] = useState(queryBounds)
  if (queryBounds !== seenQueryBounds) {
    setSeenQueryBounds(queryBounds)
    setRange({ min: readChallengeRating(queryMinimum), max: readChallengeRating(queryMaximum) })
  }

  function changeRange(next: ChallengeRatingRangeValue): void {
    setRange(next)
    if (isChallengeRatingRangeInvalid(next)) return
    const withMinimum = withParameterValues(query, minimumParameter, next.min === null ? [] : [String(next.min)])
    onChange(withParameterValues(withMinimum, maximumParameter, next.max === null ? [] : [String(next.max)]))
  }

  return <ChallengeRatingRange value={range} onChange={changeRange} />
}
