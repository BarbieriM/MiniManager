import type { ReactElement, ReactNode } from 'react'
import { Wordmark } from '../Wordmark/Wordmark'

type AuthLayoutProps = {
  title: string
  // intro is the line under the title.
  intro?: ReactNode
  children: ReactNode
}

// AuthLayout frames the logged-out screens (log in, accept an invite, reset a password): the wordmark panel on
// desktop, then a single 420 px column with the title, the intro and the content.
export function AuthLayout({ title, intro, children }: AuthLayoutProps): ReactElement {
  return (
    <main className="grid min-h-dvh md:grid-cols-2">
      <aside className="hidden border-r border-rule-strong bg-sunken p-12 md:block">
        <Wordmark size="lg" />
      </aside>
      <div className="flex flex-col gap-8 px-4 py-8 md:justify-center md:px-12">
        <div className="md:hidden">
          <Wordmark size="lg" />
        </div>
        <div className="grid w-full max-w-105 gap-6">
          <div className="grid gap-2">
            <h1 className="type-display-m md:type-display">{title}</h1>
            {intro && <p className="text-ink-2">{intro}</p>}
          </div>
          {children}
        </div>
      </div>
    </main>
  )
}
