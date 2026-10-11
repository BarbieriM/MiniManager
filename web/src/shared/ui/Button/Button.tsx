import type { ComponentProps, MouseEvent, ReactElement } from 'react'
import { Icon, type IconName } from '../Icon/Icon'
import { buttonClassName, type ButtonVariant } from '../internal/buttonClassName'

type ButtonProps = ComponentProps<'button'> & {
  variant?: ButtonVariant
  // sm is the compact desktop size; on phones it still grows to 44 px.
  size?: 'md' | 'sm'
  icon?: IconName
  isLoading?: boolean
  fullWidth?: boolean
}

// Button is a <button> in one of the shared button styles (internal/buttonClassName). Only one primary (vermilion) element belongs on a screen.
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
      className={buttonClassName({ variant, size, fullWidth, isLoading }, className)}
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
