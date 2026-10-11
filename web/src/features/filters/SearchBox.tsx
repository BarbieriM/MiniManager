import { useEffect, useState, type ReactElement } from 'react'
import { SearchInput } from '../../shared/ui'
import { withParameterValues } from './withParameterValues'

// How long typing must pause before the search runs (Card 6, step 3 planning Q9).
const searchDelayMilliseconds = 300

type SearchBoxProps = {
  query: URLSearchParams
  onChange: (query: URLSearchParams) => void
}

// SearchBox is the name search above the results (Card 6 rule 4). It writes q to the URL once typing pauses, which
// also goes back to page 1, and follows q when it changes from outside, such as "Clear all".
export function SearchBox({ query, onChange }: SearchBoxProps): ReactElement {
  const queryText = query.get('q') ?? ''
  const [text, setText] = useState(queryText)
  // The URL's q as last seen, kept in state (React's pattern for following a value from outside), so a change made
  // elsewhere, such as "Clear all", replaces what is in the box.
  const [seenQueryText, setSeenQueryText] = useState(queryText)
  if (queryText !== seenQueryText) {
    setSeenQueryText(queryText)
    setText(queryText)
  }

  useEffect(() => {
    if (text === queryText) return
    const timer = setTimeout(() => onChange(withParameterValues(query, 'q', text ? [text] : [])), searchDelayMilliseconds)
    return () => clearTimeout(timer)
  }, [text, queryText, query, onChange])

  return <SearchInput label="Search miniatures" placeholder="Search by name" value={text} onValueChange={setText} />
}
