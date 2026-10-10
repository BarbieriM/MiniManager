import type { ReactElement, ReactNode } from 'react'
import { Icon, type IconName } from '../Icon/Icon'

type BannerProps = {
  icon: IconName
  children: ReactNode
  // showProgress shows the quiet moving rule along the bottom (waking server).
  showProgress?: boolean
  // isAlert is announced at once (offline); otherwise the banner is a polite status.
  isAlert?: boolean
}

// Banner is a full-width sunken strip between ink rules, for app-wide states:
// "Waking the server…" (with progress) and "You are offline…".
export function Banner({ icon, children, showProgress = false, isAlert = false }: BannerProps): ReactElement {
  return (
    <div role={isAlert ? 'alert' : 'status'} className="relative flex items-center gap-3 overflow-hidden border-y border-rule-strong bg-sunken px-4 py-3">
      <Icon name={icon} />
      <span>{children}</span>
      {showProgress && <span aria-hidden="true" className="absolute bottom-0 left-0 h-0.5 w-3/10 animate-progress-rule bg-ink motion-reduce:hidden" />}
    </div>
  )
}
