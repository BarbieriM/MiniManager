import type { ComponentProps, MouseEvent, ReactElement } from 'react'
import { mergeClassNames } from '../../lib/mergeClassNames'
import { Icon, type IconName } from '../Icon/Icon'

type ButtonProps = ComponentProps<'button'> & {
  variant?: 'primary' | 'secondary' | 'quiet' | 'destructive' | 'confirm'
  // sm is the compact desktop size; on phones it still grows to 44 px.
  size?: 'md' | 'sm'
  icon?: IconName
  isLoading?: boolean
  fullWidth?: boolean
}

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

// Button is the one button style source. Only one primary (vermilion) element belongs on a screen.
export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  isLoading = false,
  fullWidth = false,
  type = 'button',
  className,
  children,
  onClick,
  ...props
}: ButtonProps): ReactElement {
  // While loading the button keeps its look and width but ignores clicks.
  function handleClick(event: MouseEvent<HTMLButtonElement>): void {
    if (isLoading) {
      event.preventDefault()
      return
    }
    onClick?.(event)
  }

  return (
    <button
      type={type}
      aria-busy={isLoading || undefined}
      aria-disabled={isLoading || undefined}
      onClick={handleClick}
      className={mergeClassNames(
        'type-body-strong relative inline-flex cursor-pointer items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-ds border border-transparent text-ink',
        'disabled:cursor-not-allowed disabled:border-rule disabled:bg-transparent disabled:text-ink-2',
        variantClassNames[variant],
        sizeClassNames[size],
        variant === 'quiet' && 'px-4',
        fullWidth && 'w-full',
        isLoading && 'cursor-progress',
        className,
      )}
      {...props}
    >
      {icon && <Icon name={icon} />}
      {children}
      {isLoading && (
        <span aria-hidden="true" className="absolute bottom-0 left-0 h-0.5 w-2/5 animate-progress-rule bg-current motion-reduce:animate-none" />
      )}
    </button>
  )
}
