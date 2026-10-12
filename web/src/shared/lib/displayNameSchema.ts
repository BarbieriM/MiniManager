import { z } from 'zod'

// displayNameSchema is Card 3's name rule, checked in the browser before the API checks it again (with uniqueness).
export const displayNameSchema = z.string().trim().min(2, 'Name must be 2 to 40 characters.').max(40, 'Name must be 2 to 40 characters.')
