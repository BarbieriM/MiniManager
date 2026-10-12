import type { ReactElement, ReactNode } from 'react'

type SectionHeadingProps = {
  // id lets the section name itself with aria-labelledby.
  id: string
  children: ReactNode
}

// SectionHeading titles one section of a screen, such as Photos on the edit page or Invites on Members.
export function SectionHeading({ id, children }: SectionHeadingProps): ReactElement {
  return (
    <h2 id={id} className="type-title">
      {children}
    </h2>
  )
}
