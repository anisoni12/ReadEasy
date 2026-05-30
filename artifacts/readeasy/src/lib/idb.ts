import { get, set, del } from 'idb-keyval';

const PDF_PREFIX = 'pdf:';
const THUMB_PREFIX = 'thumb:';

export async function savePdfBytes(bookId: string, bytes: ArrayBuffer) {
  await set(PDF_PREFIX + bookId, bytes);
}

export async function getPdfBytes(bookId: string): Promise<ArrayBuffer | undefined> {
  // Backward-compat: older entries were keyed by raw bookId.
  const fresh = await get(PDF_PREFIX + bookId);
  if (fresh) return fresh as ArrayBuffer;
  return (await get(bookId)) as ArrayBuffer | undefined;
}

export async function deletePdfBytes(bookId: string) {
  await del(PDF_PREFIX + bookId);
  await del(bookId);
  await del(THUMB_PREFIX + bookId);
}

export async function saveThumbnail(bookId: string, dataUrl: string) {
  await set(THUMB_PREFIX + bookId, dataUrl);
}

export async function getThumbnail(bookId: string): Promise<string | undefined> {
  return (await get(THUMB_PREFIX + bookId)) as string | undefined;
}