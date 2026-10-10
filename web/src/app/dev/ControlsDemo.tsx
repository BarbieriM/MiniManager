import { useState, type ReactElement, type ReactNode } from 'react'
import type { ChallengeRatingRangeValue } from '../../shared/lib/isChallengeRatingRangeInvalid'
import { creatureSizeLabels, creatureSizes } from '../../shared/lib/creatureSizes'
import type { PaintStatus } from '../../shared/lib/paintStatuses'
import {
  BaseGlyph,
  Button,
  Checkbox,
  CheckboxList,
  ChallengeRatingRange,
  Field,
  FilterChip,
  IconButton,
  MultiCombobox,
  NumberStepper,
  PasswordInput,
  SearchInput,
  Segmented,
  Select,
  Tabs,
  Tag,
  TagInput,
  Textarea,
  TextInput,
} from '../../shared/ui'

// ControlsDemo is batch 2 of the /dev/ui gallery: every control in every state.

const creatureTypes = ['Aberration', 'Beast', 'Celestial', 'Construct', 'Dragon', 'Elemental', 'Fey', 'Fiend', 'Giant', 'Humanoid', 'Monstrosity', 'Ooze', 'Plant', 'Undead']
const countByCreatureType: Record<string, number> = { Dragon: 21, Giant: 14, Humanoid: 96, Monstrosity: 22, Ooze: 5, Undead: 31 }
const typeOptions = creatureTypes.map((creatureType) => ({ value: creatureType.toLowerCase(), label: creatureType, count: countByCreatureType[creatureType] ?? 0 }))
const countBySizeIndex = [14, 62, 118, 71, 29, 18]
const tagsInUse = ['goblinoid', 'faction:zhentarim', 'faction:drow', 'weapon:bow', 'weapon:spear', 'armor:plate', 'undead']

function GallerySection({ title, children }: { title: string; children: ReactNode }): ReactElement {
  return (
    <section className="border-t border-rule-strong pt-3">
      <h2 className="type-title mb-4">{title}</h2>
      <div className="flex flex-col gap-8">{children}</div>
    </section>
  )
}

function GalleryExample({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }): ReactElement {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="type-label text-ink-2">{label}</h3>
      <div className={wide ? 'grid gap-6 md:grid-cols-2' : 'flex flex-wrap items-start gap-6'}>{children}</div>
    </div>
  )
}

function GalleryCell({ children }: { children: ReactNode }): ReactElement {
  return <div className="w-80 max-w-full">{children}</div>
}

export function ControlsDemo(): ReactElement {
  const [search, setSearch] = useState('goblin')
  const [quantityText, setQuantityText] = useState('1')
  const [invalidQuantityText, setInvalidQuantityText] = useState('0')
  const [creatureType, setCreatureType] = useState<string | null>('humanoid')
  const [pickedCreatureTypes, setPickedCreatureTypes] = useState<string[]>(['dragon'])
  const [challengeRatingRange, setChallengeRatingRange] = useState<ChallengeRatingRangeValue>({ min: 0.25, max: 3 })
  const [invalidChallengeRatingRange, setInvalidChallengeRatingRange] = useState<ChallengeRatingRangeValue>({ min: 5, max: 1 })
  const [tags, setTags] = useState(['goblinoid', 'faction:zhentarim'])
  const [pickedSizes, setPickedSizes] = useState<string[]>(['small', 'medium'])
  const [tagMatch, setTagMatch] = useState<'any' | 'all'>('any')
  const [paint, setPaint] = useState<PaintStatus>('not_painted')
  const [chips, setChips] = useState([
    ['Size', 'Small'],
    ['Size', 'Medium'],
    ['Type', 'Humanoid'],
    ['Tag', 'goblinoid'],
  ])

  return (
    <>
      <GallerySection title="Buttons">
        {(['primary', 'secondary', 'quiet', 'destructive', 'confirm'] as const).map((variant) => (
          <GalleryExample key={variant} label={variant}>
            <Button variant={variant}>Save miniature</Button>
            <Button variant={variant} icon="plus">
              Add
            </Button>
            <Button variant={variant} disabled>
              Disabled
            </Button>
            <Button variant={variant} isLoading>
              Saving
            </Button>
            <Button variant={variant} size="sm">
              Small
            </Button>
          </GalleryExample>
        ))}
        <GalleryExample label="Icon buttons: outline, quiet, destructive, disabled, sm (desktop rows)">
          <IconButton icon="edit" label="Edit" variant="outline" />
          <IconButton icon="edit" label="Edit" />
          <IconButton icon="trash" label="Delete" variant="outline" destructive />
          <IconButton icon="trash" label="Delete" destructive />
          <IconButton icon="edit" label="Edit" variant="outline" disabled />
          <IconButton icon="edit" label="Edit" size="sm" />
          <IconButton icon="trash" label="Delete" size="sm" destructive />
        </GalleryExample>
      </GallerySection>

      <GallerySection title="Inputs">
        <GalleryExample label="Text input states">
          <GalleryCell>
            <Field label="Name">
              <TextInput placeholder="Name of the miniature" />
            </Field>
          </GalleryCell>
          <GalleryCell>
            <Field label="Name">
              <TextInput defaultValue="Goblin Boss" />
            </Field>
          </GalleryCell>
          <GalleryCell>
            <Field label="Name" errorMessage="Name is required.">
              <TextInput />
            </Field>
          </GalleryCell>
          <GalleryCell>
            <Field label="Name">
              <TextInput defaultValue="Goblin Boss" disabled />
            </Field>
          </GalleryCell>
        </GalleryExample>
        <GalleryExample label="Read-only: not yours to change">
          <GalleryCell>
            <Field label="Email" helpText="Ask an admin to change your email.">
              <TextInput defaultValue="bea@example.com" readOnly />
            </Field>
          </GalleryCell>
          <GalleryCell>
            <Field label="Owner" helpText="Only admins can change the owner.">
              <TextInput defaultValue="Mateus (MA)" readOnly />
            </Field>
          </GalleryCell>
          <GalleryCell>
            <div className="grid gap-2">
              <span className="type-label">Tags, read-only</span>
              <div className="flex flex-wrap gap-2">
                <Tag tag="goblinoid" />
                <Tag tag="faction:zhentarim" />
              </div>
            </div>
          </GalleryCell>
        </GalleryExample>
        <GalleryExample label="Password and search">
          <GalleryCell>
            <Field label="Password">
              <PasswordInput defaultValue="correct horse" />
            </Field>
          </GalleryCell>
          <GalleryCell>
            <Field label="Password" errorMessage="Password must be 8 to 72 characters.">
              <PasswordInput defaultValue="short" />
            </Field>
          </GalleryCell>
          <GalleryCell>
            <SearchInput value={search} onValueChange={setSearch} placeholder="Search miniatures" />
          </GalleryCell>
        </GalleryExample>
        <GalleryExample label="Number stepper">
          <Field label="Quantity">
            <NumberStepper value={quantityText} onChange={setQuantityText} />
          </Field>
          <Field label="Quantity" errorMessage="Quantity must be a whole number from 1 to 999.">
            <NumberStepper value={invalidQuantityText} onChange={setInvalidQuantityText} />
          </Field>
          <Field label="Quantity">
            <NumberStepper value="1" onChange={() => {}} disabled />
          </Field>
        </GalleryExample>
        <GalleryExample label="Select, multi-select combobox, CR range">
          <GalleryCell>
            <Field label="Creature type">
              <Select options={typeOptions.map(({ value, label }) => ({ value, label }))} value={creatureType} onChange={setCreatureType} />
            </Field>
          </GalleryCell>
          <GalleryCell>
            <Field label="Creature type">
              <MultiCombobox options={typeOptions} value={pickedCreatureTypes} onChange={setPickedCreatureTypes} />
            </Field>
          </GalleryCell>
          <GalleryCell>
            <Field label="Challenge rating">
              <ChallengeRatingRange value={challengeRatingRange} onChange={setChallengeRatingRange} />
            </Field>
          </GalleryCell>
          <GalleryCell>
            <Field label="Challenge rating">
              <ChallengeRatingRange value={invalidChallengeRatingRange} onChange={setInvalidChallengeRatingRange} />
            </Field>
          </GalleryCell>
        </GalleryExample>
        <GalleryExample label="Tag input and textarea">
          <GalleryCell>
            <Field label="Tags">
              <TagInput value={tags} onChange={setTags} tagsInUse={tagsInUse} />
            </Field>
          </GalleryCell>
          <GalleryCell>
            <Field label="Notes">
              <Textarea maxLength={1000} placeholder="Paint recipe, missing parts, who borrowed it" />
            </Field>
          </GalleryCell>
        </GalleryExample>
      </GallerySection>

      <GallerySection title="Filter controls">
        <GalleryExample label="Checkbox list with counts, and a single checkbox">
          <div className="w-70">
            <CheckboxList
              label="Size"
              value={pickedSizes}
              onChange={setPickedSizes}
              options={creatureSizes.map((creatureSize, sizeIndex) => ({ value: creatureSize, label: creatureSizeLabels[creatureSize], count: countBySizeIndex[sizeIndex], icon: <BaseGlyph creatureSize={creatureSize} /> }))}
            />
          </div>
          <Checkbox label="Only my miniatures" />
          <Checkbox label="Disabled" disabled />
        </GalleryExample>
        <GalleryExample label="Segmented: match any or all, and paint status stretched to its column">
          <Segmented label="Tag matching" value={tagMatch} onChange={setTagMatch} options={[{ value: 'any', label: 'Match any' }, { value: 'all', label: 'Match all' }]} />
          <div className="w-90 max-w-full">
            <Segmented
              fullWidth
              label="Paint status"
              value={paint}
              onChange={setPaint}
              options={[
                { value: 'not_painted', label: 'Not painted' },
                { value: 'pre_painted', label: 'Pre-painted' },
                { value: 'hand_painted', label: 'Hand-painted' },
              ]}
            />
          </div>
        </GalleryExample>
        <GalleryExample label="Active-filter chips (click to remove) and Clear all">
          {chips.map(([filterName, filterValue]) => (
            <FilterChip key={filterName + filterValue} filterName={filterName} filterValue={filterValue} onRemove={() => setChips(chips.filter(([, chipValue]) => chipValue !== filterValue))} />
          ))}
          <Button variant="quiet" size="sm" onClick={() => setChips([])}>
            Clear all
          </Button>
        </GalleryExample>
        <GalleryExample label="Tabs">
          <div className="w-80">
            <Tabs label="Gallery tabs" items={[{ to: '/dev/ui', label: 'Components' }, { to: '/dev/ui/other', label: 'Other' }]} />
          </div>
        </GalleryExample>
      </GallerySection>
    </>
  )
}
