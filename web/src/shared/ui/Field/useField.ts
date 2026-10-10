import { useContext } from 'react'
import { FieldContext, type FieldContextValue } from './FieldContext'

// useField gives a control the ids that connect it to its Field's label, help and error.
// Outside a Field it returns null and the control must be labelled some other way.
export function useField(): FieldContextValue | null {
  return useContext(FieldContext)
}
