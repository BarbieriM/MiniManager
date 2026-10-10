import type { ReactElement } from 'react'
import { challengeRatingRangeError, isChallengeRatingRangeInvalid, type ChallengeRatingRangeValue } from '../../lib/isChallengeRatingRangeInvalid'
import { challengeRatings } from '../../lib/challengeRatings'
import { formatChallengeRating } from '../../lib/formatChallengeRating'
import { controlBoxClassName } from '../internal/controlBoxClassName'
import { FieldError } from '../Field/FieldError'
import { useField } from '../Field/useField'
import { Icon } from '../Icon/Icon'

type ChallengeRatingRangeProps = {
  value: ChallengeRatingRangeValue
  onChange: (value: ChallengeRatingRangeValue) => void
}

function ChallengeRatingSelect({ label, value, onChange, invalid, describedBy }: {
  label: string
  value: number | null
  onChange: (value: number | null) => void
  invalid: boolean
  describedBy?: string
}): ReactElement {
  return (
    <div className={controlBoxClassName({ invalid }, 'relative flex-1 px-2')}>
      <select
        aria-label={label}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        value={value === null ? '' : String(value)}
        onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))}
        className="type-mono h-10.5 w-full min-w-0 cursor-pointer appearance-none bg-transparent pr-6 outline-none"
      >
        <option value="">Any</option>
        {challengeRatings.map((challengeRating) => (
          <option key={challengeRating} value={challengeRating}>
            {formatChallengeRating(challengeRating).replace('CR ', '')}
          </option>
        ))}
      </select>
      <Icon name="chevron-down" className="pointer-events-none absolute right-2" />
    </div>
  )
}

// ChallengeRatingRange is a minimum and maximum challenge rating from the official 5e list.
export function ChallengeRatingRange({ value, onChange }: ChallengeRatingRangeProps): ReactElement {
  const field = useField()
  const isInvalid = isChallengeRatingRangeInvalid(value)
  const errorId = field ? `${field.id}-range-error` : undefined
  const describedBy = [isInvalid ? errorId : null, field?.describedBy].filter(Boolean).join(' ') || undefined

  return (
    <div role="group" aria-labelledby={field?.labelId} aria-label={field ? undefined : 'Challenge rating'} className="grid gap-2">
      <div className="flex items-center gap-2">
        <ChallengeRatingSelect label="Minimum CR" value={value.min} invalid={isInvalid} describedBy={describedBy} onChange={(min) => onChange({ ...value, min })} />
        <span className="type-dense text-ink-2">to</span>
        <ChallengeRatingSelect label="Maximum CR" value={value.max} invalid={isInvalid} describedBy={describedBy} onChange={(max) => onChange({ ...value, max })} />
      </div>
      {isInvalid && <FieldError id={errorId}>{challengeRatingRangeError}</FieldError>}
    </div>
  )
}
