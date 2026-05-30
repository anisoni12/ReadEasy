import { useState, useEffect, useCallback } from 'react';
import { savePdfBytes, deletePdfBytes, saveThumbnail, getThumbnail } from '../lib/idb';

export interface Book {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  lastPage: number;
  addedAt: number;
  lastReadAt: number;
  /** @deprecated Stored in IndexedDB now via {@link useThumbnail}. Kept for migration. */
  coverImage?: string;
}

/**
 * Loads a book's cover thumbnail from IndexedDB.
 * Falls back to the legacy `coverImage` field on the book record.
 */
export function useThumbnail(bookId: string | undefined, fallback?: string): string | undefined {
  const [src, setSrc] = useState<string | undefined>(fallback);

  useEffect(() => {
    let cancelled = false;
    if (!bookId) {
      setSrc(undefined);
      return;
    }
    getThumbnail(bookId)
      .then((value) => {
        if (cancelled) return;
        setSrc(value || fallback);
      })
      .catch(() => {
        if (!cancelled) setSrc(fallback);
      });
    return () => {
      cancelled = true;
    };
  }, [bookId, fallback]);

  return src;
}

const BOOKS_KEY = 'readeasy:books';

function readBooksFromStorage(): Book[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(BOOKS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to parse books', e);
    return [];
  }
}

const persist = (next: Book[]) => {
  try {
    localStorage.setItem(BOOKS_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event('readeasy:books-updated'));
  } catch (e) {
    console.error('Failed to persist books', e);
  }
};

export function useBooks() {
  const [books, setBooks] = useState<Book[]>(() => readBooksFromStorage());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === BOOKS_KEY) {
        setBooks(readBooksFromStorage());
      }
    };
    const onLocalUpdate = () => setBooks(readBooksFromStorage());
    window.addEventListener('storage', onStorage);
    window.addEventListener('readeasy:books-updated', onLocalUpdate);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('readeasy:books-updated', onLocalUpdate);
    };
  }, []);

  const addBook = useCallback(async (
    id: string,
    file: File,
    metadata: Omit<Book, 'id' | 'addedAt' | 'lastReadAt'>
  ) => {
    const buffer = await file.arrayBuffer();
    await savePdfBytes(id, buffer);

    // Persist thumbnail to IndexedDB to avoid bloating localStorage.
    const { coverImage, ...rest } = metadata;
    if (coverImage) {
      try {
        await saveThumbnail(id, coverImage);
      } catch (err) {
        console.warn('Failed to persist thumbnail', err);
      }
    }

    const newBook: Book = {
      ...rest,
      id,
      addedAt: Date.now(),
      lastReadAt: Date.now(),
    };
    const current = readBooksFromStorage();
    const updated = [newBook, ...current.filter((b) => b.id !== id)];
    persist(updated);
    setBooks(updated);
    return newBook;
  }, []);

  const updateBookProgress = useCallback((id: string, lastPage: number) => {
    const current = readBooksFromStorage();
    const target = current.find((b) => b.id === id);
    if (!target || target.lastPage === lastPage) return; // skip redundant writes
    const updated = current.map((b) =>
      b.id === id ? { ...b, lastPage, lastReadAt: Date.now() } : b
    );
    persist(updated);
    setBooks(updated);
  }, []);

  const updateBookMetadata = useCallback((id: string, updates: Partial<Book>) => {
    const current = readBooksFromStorage();
    const updated = current.map((b) => (b.id === id ? { ...b, ...updates } : b));
    persist(updated);
    setBooks(updated);
  }, []);

  const deleteBook = useCallback(async (id: string) => {
    await deletePdfBytes(id);
    const current = readBooksFromStorage();
    const updated = current.filter((b) => b.id !== id);
    persist(updated);
    setBooks(updated);
  }, []);

  const getBook = useCallback((id: string) => {
    return books.find(b => b.id === id);
  }, [books]);

  return {
    books,
    addBook,
    updateBookProgress,
    updateBookMetadata,
    deleteBook,
    getBook,
  };
}