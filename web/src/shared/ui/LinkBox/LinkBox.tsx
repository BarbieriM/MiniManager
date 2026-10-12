import { useState, type ReactElement } from 'react'
import { Button } from '../Button/Button'

type LinkBoxProps = {
  url: string
}

// How many characters stay visible at the end when the link is shortened in the middle.
const visibleEndLength = 10

// LinkBox shows a link to copy (an invite link when email is down), shortened in the middle,
// with the Copy button inside the box so it cannot be separated from what it copies.
export function LinkBox({ url }: LinkBoxProps): ReactElement {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const linkStart = url.slice(0, -visibleEndLength)
  const linkEnd = url.slice(-visibleEndLength)

  async function copyLinkToClipboard(): Promise<void> {
    try {
      await navigator.clipboard.writeText(url)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
  }

  return (
    <div className="flex min-h-13 min-w-0 items-center gap-2 border border-rule-strong bg-sunken py-0.75 pr-0.75 pl-3">
      <code className="type-mono flex min-w-0 flex-1" title={url}>
        <span className="truncate">{linkStart}</span>
        <span className="shrink-0">{linkEnd}</span>
      </code>
      <Button variant="secondary" icon={copyState === 'copied' ? 'check' : undefined} onClick={copyLinkToClipboard} className="shrink-0 px-4">
        {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy link'}
      </Button>
      <span aria-live="polite" className="sr-only">
        {copyState === 'copied' ? 'Link copied.' : copyState === 'failed' ? 'Could not copy. Select the link and copy it yourself.' : ''}
      </span>
    </div>
  )
}
