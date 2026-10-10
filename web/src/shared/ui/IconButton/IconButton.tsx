import type { ComponentProps, ReactElement } from 'react'
import { mergeClassNames } from '../../lib/mergeClassNames'
import { Icon, type IconName } from '../Icon/Icon'

type IconButtonProps = Omit<ComponentProps<'button'>, 'children'> & {
  icon: IconName
  // label is the accessible name; an icon alone says nothing to a screen reader.
  label: string
  variant?: 'outline' | 'quiet'
  destructive?: boolean
  // md is 44 x 44. sm (32) is for desktop table rows only. insideField sits inside a text control:
  // 44 px on phones, 32 px from md up.
  size?: 'md' | 'sm' | 'insideField'
}

const sizeClassNames = {
  md: 'size-11',
  sm: 'size-8',
  insideField: '-my-px -mr-3 size-11 md:my-0 md:mr-0 md:size-8',
}

// IconButton is a square button that shows only an icon.
export function IconButton({
  icon,
  label,
  variant = 'quiet',
  destructive = false,
  size = 'md',
  type = 'button',
  className,
  ...props
}: IconButtonProps): ReactElement {
  return (
    <button
      type={type}
      aria-label={label}
      className={mergeClassNames(
        'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-ds border',
        variant === 'outline' ? (destructive ? 'border-accent' : 'border-rule-strong') : 'border-transparent',
        destructive
          ? 'text-accent hover:bg-raised active:border-accent active:bg-accent active:text-on-accent'
          : 'text-ink hover:bg-sunken active:border-ink active:bg-ink active:text-page',
        'disabled:cursor-not-allowed disabled:bg-transparent disabled:text-ink-2',
        variant === 'outline' && 'disabled:border-rule',
        sizeClassNames[size],
        className,
      )}
      {...props}
    >
      <Icon name={icon} />
    </button>
  )
}
