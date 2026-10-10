import { useState, type ReactElement, type ReactNode } from 'react'

// WithState renders a controlled component with real state, so a test drives it like a form would.
export function WithState<T>({
  initialValue,
  children,
}: {
  initialValue: T
  children: (value: T, setValue: (nextValue: T) => void) => ReactNode
}): ReactElement {
  const [value, setValue] = useState(initialValue)
  return <>{children(value, setValue)}</>
}
