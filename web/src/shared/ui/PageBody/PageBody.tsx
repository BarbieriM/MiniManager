import type { ReactElement, ReactNode } from 'react'

// PageBody is the padded column under a logged-in screen's header: its sections stacked 24 px apart, 16 px from
// the edges on phones and 24 px on desktop.
export function PageBody({ children }: { children: ReactNode }): ReactElement {
  return <div className="grid flex-1 content-start gap-6 px-4 py-6 md:px-6">{children}</div>
}
