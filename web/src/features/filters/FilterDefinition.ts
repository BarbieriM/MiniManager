import type { Option } from '../../shared/ui'

// FilterDefinition is one Catalog filter as GET /filters describes it (Card 6 rule 10): the UI draws its control from
// control, and reads and writes the URL parameters in parameters.
export type FilterDefinition = {
  key: string
  label: string
  control: 'search' | 'multiSelect' | 'challengeRatingRange' | 'tags'
  parameters: string[]
  // options are the choices with how many Miniatures in the whole Catalog have each.
  options?: Option[]
}
