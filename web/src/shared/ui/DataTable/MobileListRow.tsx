import type { ReactElement, ReactNode } from 'react'
import { StackedRow } from '../StackedRow/StackedRow'
import { Person, type PersonProps } from './Person'

type MobileListRowProps = PersonProps & {
  // metaText sits on the right of the name line, e.g. the role.
  metaText?: ReactNode
  // actions are full-width buttons under the person.
  actions?: ReactNode
}

// MobileListRow is the phone version of a DataRow about a person: the person on top, full-width actions below.
export function MobileListRow({ metaText, actions, ...person }: MobileListRowProps): ReactElement {
  return <StackedRow heading={<Person {...person} />} metaText={metaText} actions={actions} />
}
