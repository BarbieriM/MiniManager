import { mergeClassNames } from '../../lib/mergeClassNames'

// ButtonVariant is the look of a Button or ButtonLink (docs/context.md, Controls).
export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'destructive' | 'confirm'

const pressedClassNames = 'active:border-ink active:bg-ink active:text-page'

const variantClassNames = {
  primary: `bg-accent text-on-accent hover:border-rule-strong ${pressedClassNames} disabled:bg-sunken`,
  confirm: `bg-accent text-on-accent hover:border-rule-strong ${pressedClassNames} disabled:bg-sunken`,
  secondary: `border-rule-strong hover:bg-sunken ${pressedClassNames}`,
  quiet: `underline underline-offset-3 hover:bg-sunken ${pressedClassNames} disabled:border-transparent`,
  destructive: 'border-accent text-accent hover:bg-raised active:bg-accent active:text-on-accent',
}

const sizeClassNames = {
  md: 'h-11 px-6',
  sm: 'h-11 px-4 md:h-8',
}

// buttonClassName is the one source of button styles, shared by Button (a <button>) and ButtonLink (a link).
export function buttonClassName(
  { variant, size, fullWidth = false, isLoading = false }: { variant: ButtonVariant; size: 'md' | 'sm'; fullWidth?: boolean; isLoading?: boolean },
  className?: string,
): string {
  return mergeClassNames(
    'type-body-strong relative inline-flex cursor-pointer items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-ds border border-transparent text-ink',
    'disabled:cursor-not-allowed disabled:border-rule disabled:bg-transparent disabled:text-ink-2',
    variantClassNames[variant],
    sizeClassNames[size],
    variant === 'quiet' && 'px-4',
    fullWidth && 'w-full',
    isLoading && 'cursor-progress',
    className,
  )
}
