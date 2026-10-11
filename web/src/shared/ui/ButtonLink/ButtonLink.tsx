import type { ReactElement, ReactNode } from 'react'
import { Link } from 'react-router'
import { Icon, type IconName } from '../Icon/Icon'
import { buttonClassName, type ButtonVariant } from '../internal/buttonClassName'

type ButtonLinkProps = {
  to: string
  children: ReactNode
  variant?: ButtonVariant
  size?: 'md' | 'sm'
  icon?: IconName
  fullWidth?: boolean
  className?: string
}

// ButtonLink is navigation that looks like a Button, such as "Add miniature". It stays a link, so it opens in a
// new tab and reads as a link to screen readers.
export function ButtonLink({ to, children, variant = 'secondary', size = 'md', icon, fullWidth = false, className }: ButtonLinkProps): ReactElement {
  return (
    <Link to={to} className={buttonClassName({ variant, size, fullWidth }, className)}>
      {icon && <Icon name={icon} />}
      {children}
    </Link>
  )
}
