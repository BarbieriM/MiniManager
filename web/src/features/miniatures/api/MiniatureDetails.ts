import type { Miniature } from './Miniature'
import type { Photo } from './Photo'

// MiniatureDetails is one Miniature as the details and edit pages load it: with its Photos in order, and whether
// Photos are set up on the server (Card 7; without Cloudinary they are off).
export type MiniatureDetails = Miniature & { photos: Photo[]; photosEnabled: boolean }
