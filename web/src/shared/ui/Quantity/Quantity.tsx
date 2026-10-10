import type { ReactElement } from 'react'
type QuantityProps = {
  quantity: number
}

// Quantity shows a quantity as "×4", right-aligned with a 48 px minimum so ×999 lines up with ×1.
export function Quantity({ quantity }: QuantityProps): ReactElement {
  return <span className="type-mono inline-block min-w-12 text-right">×{quantity}</span>
}
