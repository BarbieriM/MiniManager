import { useEffect, useState } from 'react'

// useDebouncedValue returns value once it has stayed the same for delayMilliseconds, so a burst of changes (typing,
// ticking boxes) causes one request instead of one per change.
export function useDebouncedValue<Value>(value: Value, delayMilliseconds: number): Value {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMilliseconds)
    return () => clearTimeout(timer)
  }, [value, delayMilliseconds])
  return settled
}
