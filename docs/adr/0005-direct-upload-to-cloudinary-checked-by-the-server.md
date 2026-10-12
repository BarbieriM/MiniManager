# 0005. Photos upload straight to Cloudinary and the server checks them afterwards

Date: 2026-10-12 · Status: accepted

## Context

Card 7 asks for up to 3 Photos per Miniature, JPEG, PNG or WebP, at most 5 MB each, "checked by real file type,
not by extension", with location data removed and sideways phone photos turned upright. The plan chose Cloudinary's
free plan with signed direct upload, so 5 MB files never pass through the free Render server. The API then never
sees a Photo's bytes, so it cannot check them while they arrive.

## Decision

- The API signs each upload for one exact name it chooses, `minis/{miniatureId}/{photoId}`, that may not replace
  an existing file (`overwrite=false`), so a signature cannot be reused to swap a Photo after it was checked. The
  browser uploads the file straight to Cloudinary with that signature.
- Registering the Photo afterwards is the real check: the API asks Cloudinary for the stored image's format, size
  and dimensions, deletes the file and refuses it when it breaks Card 7, and counts the limit of 3 under a lock on
  the Miniature. Only the name it signed can be registered.
- Cloudinary stores the original exactly as uploaded, so the size and format the server checks are the real ones
  (resizing on upload would hide a 10 MB file behind its smaller copy). The thumbnail and the full size are made
  from it on delivery, turned upright and without location data. Links are public but unguessable.
- The original keeps the phone's location data, so the Cloudinary account must have **strict transformations**
  on: only the two sizes the API builds can be delivered, never the untouched original. (Decided 2026-10-12, after
  the code review found the first design checked the resized copy.)
- Cloudinary is called with plain `net/http` in `platform/images`, with no SDK. Without its settings the server
  still starts and Photos are off.

## Alternatives

- **Upload through the Go API**, which checks the bytes itself. It is simpler to reason about, but every Photo
  crosses the free server, which is slow to wake and short on memory.
- **Trust the browser's check alone.** A renamed file or a crafted request would get through.
- **Private photos with signed, expiring links.** Safer, but every Catalog page would need fresh links and more
  Cloudinary credits, for photos of painted miniatures.

## Consequences

- A file can reach Cloudinary and never be registered (a failed or abandoned upload). It stays invisible and is
  removed with its Miniature's folder.
- Tests use a fake image store for the services, and a fake HTTP server for the Cloudinary client.
- Moving to another image service means rewriting `platform/images` and the browser's upload helper only.
- Storage holds originals up to 5 MB instead of 1600 px copies, which uses more of the free plan's storage.
- Strict transformations is an account setting outside the code; setting up a Cloudinary account must include
  turning it on (`.env.example` says so).
