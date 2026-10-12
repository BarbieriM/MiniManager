import { z } from 'zod'

// passwordSchema is Card 1's password rule, checked in the browser before the API checks it again.
export const passwordSchema = z.string().min(8, 'Password must be 8 to 72 characters.').max(72, 'Password must be 8 to 72 characters.')
