// PhotoUpload is a signed upload for one new Photo: its id, and where and what the browser sends to Cloudinary
// (ADR 0005).
export type PhotoUpload = { photoId: string; url: string; fields: Record<string, string> }
