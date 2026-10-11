import { useState, type ReactElement, type ReactNode } from 'react'
import { creatureSizes } from '../../shared/lib/creatureSizes'
import { paintStatuses } from '../../shared/lib/paintStatuses'
import { getTheme, type Theme } from '../../shared/lib/getTheme'
import { setTheme } from '../../shared/lib/setTheme'
import { ControlsDemo } from './ControlsDemo'
import { FeedbackDemo } from './FeedbackDemo'
import { LayoutDemo } from './LayoutDemo'
import { BaseGlyph, ChallengeRatingStamp, Icon, OwnerStamp, PaintMark, Quantity, ToastProvider, Wordmark, type IconName } from '../../shared/ui'

// DevUiPage shows every shared/ui component in every state, to compare with docs/design/design-system.html.
// It exists only in development builds.

const iconNames: IconName[] = [
  'search', 'close', 'plus', 'minus', 'chevron-down', 'chevron-up', 'chevron-left', 'chevron-right',
  'edit', 'trash', 'user', 'list', 'sliders', 'check', 'eye', 'eye-off', 'alert', 'view-grid',
  'view-table', 'upload', 'clock', 'circle', 'info', 'star',
]

function GallerySection({ title, children }: { title: string; children: ReactNode }): ReactElement {
  return (
    <section className="border-t border-rule-strong pt-3">
      <h2 className="type-title mb-4">{title}</h2>
      <div className="flex flex-col gap-6">{children}</div>
    </section>
  )
}

function GalleryExample({ label, children }: { label: string; children: ReactNode }): ReactElement {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="type-label text-ink-2">{label}</h3>
      <div className="flex flex-wrap items-center gap-6">{children}</div>
    </div>
  )
}

export function DevUiPage(): ReactElement {
  const [theme, setThemeState] = useState<Theme>(getTheme)
  const [phone, setPhone] = useState(false)

  function switchTheme(nextTheme: Theme): void {
    setTheme(nextTheme)
    setThemeState(nextTheme)
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-page text-ink">
        <header className="flex h-14 items-center gap-6 border-b border-rule-strong px-4">
          <Wordmark />
          <span className="type-label text-ink-2">shared/ui</span>
          <div className="ml-auto flex gap-2">
            <button type="button" className="type-label h-8 border border-rule-strong px-3" onClick={() => switchTheme(theme === 'paper' ? 'lantern' : 'paper')}>
              Theme: {theme}
            </button>
            <button type="button" className="type-label h-8 border border-rule-strong px-3" onClick={() => setPhone(!phone)}>
              {phone ? 'Full width' : 'Phone 390'}
            </button>
          </div>
        </header>

        <main className={phone ? 'mx-auto max-w-97.5 border-x border-rule p-4' : 'mx-auto max-w-320 p-8'}>
          <div className="flex flex-col gap-12">
            <GallerySection title="Type">
              <p className="type-display">Display 32/36</p>
              <p className="type-display-m">Display mobile 26/30</p>
              <p className="type-title">Title 20/26</p>
              <p className="type-body">Body 15/22: the quartermaster's ledger.</p>
              <p className="type-body-strong">Body strong 15/22: Goblin Boss</p>
              <p className="type-dense">Dense 14/20: table cells and chips</p>
              <p className="type-label">Label 11/14</p>
              <p className="type-mono">Mono 13/18: CR 1/4 ×4 faction:drow</p>
              <p className="type-mono-lg">48 minis</p>
            </GallerySection>

            <GallerySection title="Colour">
              <GalleryExample label="Surfaces and ink">
                {['bg-page', 'bg-raised', 'bg-sunken', 'bg-ink', 'bg-ink-2', 'bg-rule', 'bg-rule-strong', 'bg-accent', 'bg-hand-painted', 'bg-pre-painted', 'bg-unpainted', 'bg-error', 'bg-success'].map((colorClass) => (
                  <span key={colorClass} className="flex items-center gap-2">
                    <span className={`size-6 border border-rule-strong ${colorClass}`} />
                    <span className="type-mono">{colorClass}</span>
                  </span>
                ))}
              </GalleryExample>
            </GallerySection>

            <GallerySection title="Signature glyphs">
              <GalleryExample label="Base glyph">
                {creatureSizes.map((creatureSize) => (
                  <span key={creatureSize} className="flex items-center gap-2">
                    <BaseGlyph creatureSize={creatureSize} />
                    <span className="type-dense">{creatureSize}</span>
                  </span>
                ))}
              </GalleryExample>
              <GalleryExample label="Base glyph, large placeholder">
                <BaseGlyph creatureSize="medium" size="placeholder" className="text-ink-2" />
                <BaseGlyph creatureSize="huge" size="placeholder" className="text-ink-2" />
              </GalleryExample>
              <GalleryExample label="CR stamp">
                <ChallengeRatingStamp challengeRating={0.125} />
                <ChallengeRatingStamp challengeRating={0.25} />
                <ChallengeRatingStamp challengeRating={0.5} />
                <ChallengeRatingStamp challengeRating={5} />
                <ChallengeRatingStamp challengeRating={null} />
              </GalleryExample>
              <GalleryExample label="Paint mark, labelled">
                {paintStatuses.map((paintStatus) => (
                  <PaintMark key={paintStatus} status={paintStatus} />
                ))}
              </GalleryExample>
              <GalleryExample label="Paint mark, tooltip only (hover or Tab)">
                {paintStatuses.map((paintStatus) => (
                  <PaintMark key={paintStatus} status={paintStatus} showLabel={false} />
                ))}
              </GalleryExample>
              <GalleryExample label="Owner stamp">
                <OwnerStamp initials="MA" isCurrentUser ownerName="Owner: Mateus (you)" />
                <OwnerStamp initials="RA" ownerName="Owner: Rafa" />
                <OwnerStamp initials="AS" ownerName="Owner: Ana Souza" />
                <OwnerStamp initials="MA" isCurrentUser size="lg" />
              </GalleryExample>
              <GalleryExample label="Quantity">
                <span className="flex flex-col">
                  <Quantity quantity={1} />
                  <Quantity quantity={4} />
                  <Quantity quantity={999} />
                </span>
              </GalleryExample>
              <GalleryExample label="Wordmark">
                <Wordmark />
                <Wordmark size="lg" />
              </GalleryExample>
            </GallerySection>

            <GallerySection title="Icons">
              <GalleryExample label="20 px">
                {iconNames.map((iconName) => (
                  <span key={iconName} title={iconName} className="flex flex-col items-center gap-1">
                    <Icon name={iconName} />
                    <span className="type-mono text-ink-2">{iconName}</span>
                  </span>
                ))}
              </GalleryExample>
              <GalleryExample label="16 px">
                {iconNames.map((iconName) => (
                  <Icon key={iconName} name={iconName} size={16} />
                ))}
              </GalleryExample>
            </GallerySection>

            <ControlsDemo />

            <FeedbackDemo />

            <LayoutDemo />
          </div>
        </main>
      </div>
    </ToastProvider>
  )
}
