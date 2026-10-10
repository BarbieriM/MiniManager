// Photo rules from Card 7. The API checks the real file type; this copy gives instant feedback in the browser.

export const maxPhotos = 3
export const maxPhotoBytes = 5 * 1024 * 1024
export const photoTypes = ['image/jpeg', 'image/png', 'image/webp']

// getPhotoError returns the Card 7 message for a file that cannot be added, or null when it is fine.
export function getPhotoError(file: { type: string; size: number }, existingPhotoCount: number): string | null {
  if (existingPhotoCount >= maxPhotos) return 'A miniature can have up to 3 photos.'
  if (!photoTypes.includes(file.type)) return 'Use a JPEG, PNG or WebP image.'
  if (file.size > maxPhotoBytes) return 'Images must be 5 MB or smaller.'
  return null
}
