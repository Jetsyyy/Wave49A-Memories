import { upload, uploadPresigned } from '@vercel/blob/client';
import { getToken } from './api.js';

// Big phone photos are shrunk to save Blob storage. Videos and GIFs are uploaded as-is.
export async function shrinkImage(file, maxSide = 2560) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.size < 1.5 * 1024 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.86));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file; // e.g. HEIC the browser can't decode
  }
}

let modePromise;
// Newer Blob stores only accept presigned uploads; the server says which kind it supports.
function uploadMode() {
  if (!modePromise) {
    modePromise = fetch('/api/health')
      .then((r) => r.json())
      .then((h) => h)
      .catch(() => ({}));
  }
  return modePromise;
}

// Uploads one file to Vercel Blob under `folder/` and returns its public URL.
export async function uploadFile(file, folder, onProgress) {
  const health = await uploadMode();
  const presigned = health.uploadMode === 'presigned';
  const ready = await shrinkImage(file);
  const safe = ready.name.replace(/[^\w.-]+/g, '_').slice(-80);
  const send = presigned ? uploadPresigned : upload;
  try {
    const blob = await send(`${folder}/${safe}`, ready, {
      access: 'public',
      handleUploadUrl: '/api/upload',
      headers: { Authorization: `Bearer ${getToken()}` },
      multipart: !presigned && ready.size > 20 * 1024 * 1024,
      contentType: ready.type,
      onUploadProgress: onProgress ? ({ percentage }) => onProgress(percentage) : undefined,
    });
    return blob.url;
  } catch (e) {
    let msg = e.message || 'Upload failed.';
    // The Blob client hides the server's reason behind a generic message.
    if (/client token|presigned/i.test(msg)) {
      msg = health.storage === false
        ? 'Photo storage is not connected yet. An admin needs to connect the Blob store in Vercel and redeploy.'
        : 'Could not start the upload. Try logging out and back in, then upload again.';
    }
    throw new Error(msg);
  }
}
