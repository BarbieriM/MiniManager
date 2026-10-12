import type { PhotoUpload } from './PhotoUpload'

// uploadPhotoFile sends file straight to Cloudinary with its signed fields, calling onProgress with the percentage
// sent. It uses XMLHttpRequest, because fetch cannot report upload progress; it is the only request that does.
export function uploadPhotoFile(upload: PhotoUpload, file: File, onProgress: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    for (const [name, value] of Object.entries(upload.fields)) form.append(name, value)
    form.append('file', file)
    const request = new XMLHttpRequest()
    request.open('POST', upload.url)
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress((event.loaded / event.total) * 100)
    }
    request.onload = () => (request.status >= 200 && request.status < 300 ? resolve() : reject(new Error(`upload answered ${request.status}`)))
    request.onerror = () => reject(new Error('upload failed'))
    request.send(form)
  })
}
