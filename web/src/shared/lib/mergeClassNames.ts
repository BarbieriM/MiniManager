import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// mergeClassNames joins class names, skipping falsy ones (clsx), and lets a later Tailwind class override an
// earlier one of the same kind (twMerge), so mergeClassNames('px-6', 'px-4') gives 'px-4'.
export function mergeClassNames(...classNames: ClassValue[]): string {
  return twMerge(clsx(classNames))
}
