import { get, set, del } from 'idb-keyval';

export async function savePdfBytes(bookId: string, bytes: ArrayBuffer) {
  await set(bookId, bytes);
}

export async function getPdfBytes(bookId: string): Promise<ArrayBuffer | undefined> {
  return await get(bookId);
}

export async function deletePdfBytes(bookId: string) {
  await del(bookId);
}