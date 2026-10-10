// Icons redrawn from docs/design/design-system.html: 20 x 20 grid, 1.5 px square-cap stroke.
import type { ReactElement, SVGProps } from 'react'
import { mergeClassNames } from '../../lib/mergeClassNames'

const paths = {
  search: <><circle cx="8.5" cy="8.5" r="5.5"/><path d="M12.5 12.5L17.5 17.5"/></>,
  close: <><path d="M4.5 4.5L15.5 15.5M15.5 4.5L4.5 15.5"/></>,
  plus: <><path d="M10 4V16M4 10H16"/></>,
  minus: <><path d="M4 10H16"/></>,
  'chevron-down': <><path d="M5 8L10 13L15 8"/></>,
  'chevron-up': <><path d="M5 12L10 7L15 12"/></>,
  'chevron-left': <><path d="M12 5L7 10L12 15"/></>,
  'chevron-right': <><path d="M8 5L13 10L8 15"/></>,
  edit: <><path d="M3.5 16.5L4.5 12.5L13.5 3.5L16.5 6.5L7.5 15.5L3.5 16.5Z"/><path d="M11.5 5.5L14.5 8.5"/></>,
  trash: <><path d="M4 6H16M8 6V3.5H12V6M5.5 6L6.5 17H13.5L14.5 6M8.5 9V14M11.5 9V14"/></>,
  user: <><circle cx="10" cy="7" r="3.5"/><path d="M3.5 17C3.5 13.5 6.5 12 10 12C13.5 12 16.5 13.5 16.5 17"/></>,
  list: <><path d="M3.5 5H16.5M3.5 10H16.5M3.5 15H16.5"/></>,
  sliders: <><path d="M3 6H17M3 14H17"/><rect x="11" y="3.5" width="3" height="5"/><rect x="6" y="11.5" width="3" height="5"/></>,
  check: <><path d="M4.5 10.5L8.5 14.5L15.5 6"/></>,
  eye: <><path d="M2 10C4 6 7 4.5 10 4.5C13 4.5 16 6 18 10C16 14 13 15.5 10 15.5C7 15.5 4 14 2 10Z"/><circle cx="10" cy="10" r="2.5"/></>,
  'eye-off': <><path d="M2 10C4 6 7 4.5 10 4.5C13 4.5 16 6 18 10C16 14 13 15.5 10 15.5C7 15.5 4 14 2 10Z"/><circle cx="10" cy="10" r="2.5"/><path d="M3.5 3.5L16.5 16.5"/></>,
  alert: <><path d="M10 3L18 17H2L10 3Z"/><path d="M10 8.5V12.5M10 14.5V15"/></>,
  'view-grid': <><rect x="3.5" y="3.5" width="5" height="5"/><rect x="11.5" y="3.5" width="5" height="5"/><rect x="3.5" y="11.5" width="5" height="5"/><rect x="11.5" y="11.5" width="5" height="5"/></>,
  'view-table': <><rect x="3.5" y="4.5" width="13" height="11"/><path d="M3.5 8.5H16.5M3.5 12H16.5M8.5 8.5V15.5"/></>,
  upload: <><path d="M10 13V3.5M6 7L10 3L14 7M3.5 13V16.5H16.5V13"/></>,
  clock: <><circle cx="10" cy="10" r="7"/><path d="M10 6V10L13 12"/></>,
  circle: <><circle cx="10" cy="10" r="5"/></>,
  info: <><circle cx="10" cy="10" r="7"/><path d="M10 9V14M10 6V6.6"/></>,
  star: <><path d="M10 3L12.2 7.8L17.5 8.4L13.6 12L14.7 17.2L10 14.6L5.3 17.2L6.4 12L2.5 8.4L7.8 7.8Z"/></>,
}

export type IconName = keyof typeof paths

type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & {
  name: IconName
  size?: 16 | 20
}

// Icon is decorative: the button or text next to it carries the accessible name.
export function Icon({ name, size = 20, className, ...props }: IconProps): ReactElement {
  return (
    <svg
      viewBox="0 0 20 20"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
      {...props}
      className={mergeClassNames('shrink-0', className)}
    >
      {paths[name]}
    </svg>
  )
}
