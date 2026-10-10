import { createContext } from 'react'

export type FieldContextValue = {
  id: string
  labelId: string
  describedBy: string | undefined
  invalid: boolean
}

// FieldContext carries a Field's ids to the control inside it; read it with useField.
export const FieldContext = createContext<FieldContextValue | null>(null)
