import { zodResolver } from '@hookform/resolvers/zod'
import { useState, type ReactElement } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { z } from 'zod'
import { ApiProblem } from '../../../shared/api/ApiProblem'
import { challengeRatings } from '../../../shared/lib/challengeRatings'
import { creatureSizeLabels, creatureSizes } from '../../../shared/lib/creatureSizes'
import { creatureTypeLabels, creatureTypes } from '../../../shared/lib/creatureTypes'
import { formatChallengeRating } from '../../../shared/lib/formatChallengeRating'
import { paintStatusLabels, paintStatuses, type PaintStatus } from '../../../shared/lib/paintStatuses'
import { Button, Dialog, Field, MessageBox, NumberStepper, Segmented, Select, StickyActionBar, TagInput, Textarea, TextInput } from '../../../shared/ui'
import { useSession } from '../../auth/lib/useSession'
import { useTagsInUse } from '../../filters/api/useTagsInUse'
import { DeleteMiniatureDialog } from './DeleteMiniatureDialog'
import type { Miniature } from '../api/Miniature'
import type { MiniatureRequest } from '../api/MiniatureRequest'
import { useOwnerOptions } from '../api/useOwnerOptions'
import { useSaveMiniature } from '../api/useSaveMiniature'

// Card 5 messages; the API answers with the same ones.
const quantityMessage = 'Quantity must be a whole number from 1 to 999.'

const miniatureSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(100, 'Name must be at most 100 characters.'),
  creatureType: z.string().refine((value) => (creatureTypes as readonly string[]).includes(value), 'Pick a creature type.'),
  size: z.string().refine((value) => (creatureSizes as readonly string[]).includes(value), 'Pick a size.'),
  challengeRating: z.string(),
  quantity: z.string().refine((value) => /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 999, quantityMessage),
  paintStatus: z.enum(paintStatuses),
  tags: z.array(z.string()),
  storageLocation: z.string().trim().max(60, 'Storage location must be at most 60 characters.'),
  manufacturer: z.string().trim().max(60, 'Manufacturer must be at most 60 characters.'),
  notes: z.string().trim().max(1000, 'Notes must be at most 1000 characters.'),
  ownerId: z.string(),
})

type MiniatureValues = z.infer<typeof miniatureSchema>
type FieldName = keyof MiniatureValues

const typeOptions = creatureTypes.map((value) => ({ value, label: creatureTypeLabels[value] }))
const sizeOptions = creatureSizes.map((value) => ({ value, label: creatureSizeLabels[value] }))
const challengeRatingOptions = [
  { value: '', label: 'None' },
  ...challengeRatings.map((rating) => ({ value: String(rating), label: formatChallengeRating(rating) })),
]
const paintOptions = paintStatuses.map((value: PaintStatus) => ({ value, label: paintStatusLabels[value] }))

type MiniatureFormProps = {
  // miniature is the one being edited; without it the form adds a new Miniature.
  miniature?: Miniature
  // onReload fetches the latest saved version after a conflict, which remounts the form with it. Only editing can
  // conflict, so adding leaves it out.
  onReload?: () => void
}

function initialValues(miniature: Miniature | undefined, currentUserId: string): MiniatureValues {
  return {
    name: miniature?.name ?? '',
    creatureType: miniature?.creatureType ?? '',
    size: miniature?.size ?? '',
    challengeRating: miniature?.challengeRating === null || miniature === undefined ? '' : String(miniature.challengeRating),
    quantity: String(miniature?.quantity ?? 1),
    paintStatus: miniature?.paintStatus ?? 'unpainted',
    tags: miniature?.tags ?? [],
    storageLocation: miniature?.storageLocation ?? '',
    manufacturer: miniature?.manufacturer ?? '',
    notes: miniature?.notes ?? '',
    ownerId: miniature?.owner.id ?? currentUserId,
  }
}

// MiniatureForm adds or edits a Miniature: name, type and size first, then the rest with Card 5's defaults.
// Only Admins see the owner picker (Card 4 rule 4); Members get no owner field at all.
export function MiniatureForm({ miniature, onReload = () => {} }: MiniatureFormProps): ReactElement {
  const { user } = useSession()
  const isAdmin = user.role === 'admin'
  const owners = useOwnerOptions()
  const tagsInUse = useTagsInUse()
  const navigate = useNavigate()
  const save = useSaveMiniature(miniature?.id)
  const [formProblem, setFormProblem] = useState<string | null>(null)
  const [conflictMessage, setConflictMessage] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MiniatureValues>({ resolver: zodResolver(miniatureSchema), defaultValues: initialValues(miniature, user.id) })

  async function saveMiniature(values: MiniatureValues): Promise<void> {
    setFormProblem(null)
    const body: MiniatureRequest = {
      name: values.name,
      creatureType: values.creatureType,
      size: values.size,
      challengeRating: values.challengeRating === '' ? null : Number(values.challengeRating),
      quantity: Number(values.quantity),
      paintStatus: values.paintStatus,
      tags: values.tags,
      storageLocation: values.storageLocation,
      manufacturer: values.manufacturer,
      notes: values.notes,
      ...(isAdmin && { ownerId: values.ownerId }),
      ...(miniature && { version: miniature.version }),
    }
    try {
      const saved = await save.mutateAsync(body)
      navigate(`/minis/${saved.id}`, { replace: Boolean(miniature) })
    } catch (error) {
      if (!(error instanceof ApiProblem)) {
        setFormProblem('The miniature could not be saved. Try again.')
      } else if (error.status === 409) {
        setConflictMessage(error.detail)
      } else if (error.fieldProblems.length > 0) {
        for (const problem of error.fieldProblems) setError(problem.field as FieldName, { message: problem.message })
      } else {
        setFormProblem(error.detail)
      }
    }
  }

  const quantity = useWatch({ control, name: 'quantity' })
  const isZeroQuantity = miniature !== undefined && quantity === '0'
  const saveLabel = miniature ? 'Save changes' : 'Save miniature'
  // An open dialog owns the screen's one vermilion element, so Save goes outlined behind it (docs/context.md).
  const saveVariant = conflictMessage !== null || isDeleting ? 'secondary' : 'primary'

  return (
    <form noValidate onSubmit={handleSubmit(saveMiniature)} className="grid max-w-160 gap-6">
      {formProblem && <MessageBox kind="error">{formProblem}</MessageBox>}
      <Field label="Name" errorMessage={errors.name?.message}>
        <TextInput autoComplete="off" {...register('name')} />
      </Field>
      <div className="grid gap-6 md:grid-cols-2">
        <Field label="Type" errorMessage={errors.creatureType?.message}>
          <Controller
            control={control}
            name="creatureType"
            render={({ field }) => <Select options={typeOptions} value={field.value || null} onChange={field.onChange} placeholder="Pick a type" />}
          />
        </Field>
        <Field label="Size" errorMessage={errors.size?.message}>
          <Controller
            control={control}
            name="size"
            render={({ field }) => <Select options={sizeOptions} value={field.value || null} onChange={field.onChange} placeholder="Pick a size" />}
          />
        </Field>
      </div>
      {isAdmin && (
        <Field label="Owner" errorMessage={errors.ownerId?.message}>
          <Controller
            control={control}
            name="ownerId"
            render={({ field }) => (
              <Select
                options={(owners.data ?? []).map((owner) => ({ value: owner.id, label: owner.displayName }))}
                value={field.value || null}
                onChange={field.onChange}
              />
            )}
          />
        </Field>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        <Field label="Challenge Rating" errorMessage={errors.challengeRating?.message}>
          <Controller
            control={control}
            name="challengeRating"
            render={({ field }) => <Select options={challengeRatingOptions} value={field.value} onChange={field.onChange} />}
          />
        </Field>
        <Field label="Quantity" errorMessage={errors.quantity?.message}>
          <Controller
            control={control}
            name="quantity"
            render={({ field }) => <NumberStepper value={field.value} onChange={field.onChange} min={1} max={999} invalid={Boolean(errors.quantity)} />}
          />
        </Field>
      </div>
      {isZeroQuantity && (
        // Card 5 rule 1: a mini with none left is deleted, not set to 0.
        <div>
          <Button variant="quiet" onClick={() => setIsDeleting(true)}>
            Delete this miniature instead
          </Button>
        </div>
      )}
      <Controller
        control={control}
        name="paintStatus"
        render={({ field }) => <Segmented label="Paint status" options={paintOptions} value={field.value} onChange={field.onChange} fullWidth />}
      />
      <Field label="Tags" errorMessage={errors.tags?.message}>
        <Controller
          control={control}
          name="tags"
          render={({ field }) => <TagInput value={field.value} onChange={field.onChange} tagsInUse={tagsInUse.data ?? []} />}
        />
      </Field>
      <div className="grid gap-6 md:grid-cols-2">
        <Field label="Storage location" errorMessage={errors.storageLocation?.message}>
          <TextInput {...register('storageLocation')} />
        </Field>
        <Field label="Manufacturer" errorMessage={errors.manufacturer?.message}>
          <TextInput {...register('manufacturer')} />
        </Field>
      </div>
      <Field label="Notes" errorMessage={errors.notes?.message}>
        <Textarea maxLength={1000} rows={4} {...register('notes')} />
      </Field>
      <div className="hidden md:block">
        <Button type="submit" variant={saveVariant} isLoading={isSubmitting}>
          {saveLabel}
        </Button>
      </div>
      {/* Pinned to the bottom on phones, edge to edge, so Save lines up with the fields and stays in reach. */}
      <StickyActionBar className="-mx-4">
        <Button type="submit" variant={saveVariant} fullWidth isLoading={isSubmitting}>
          {saveLabel}
        </Button>
      </StickyActionBar>
      <Dialog
        open={conflictMessage !== null}
        onClose={onReload}
        title="This miniature changed"
        actions={
          <Button variant="primary" onClick={onReload}>
            Reload
          </Button>
        }
      >
        <p>{conflictMessage}</p>
      </Dialog>
      {miniature && <DeleteMiniatureDialog open={isDeleting} onClose={() => setIsDeleting(false)} miniature={miniature} />}
    </form>
  )
}
