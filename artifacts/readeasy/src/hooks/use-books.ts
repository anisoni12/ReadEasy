import { useState, useEffect, useCallback } from 'react';
import { savePdfBytes, getPdfBytes, deletePdfBytes } from '../lib/idb';

export interface Book {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  lastPage: number;
  addedAt: number;
  lastReadAt: number;
  coverImage?: string; // base64 data url of first page
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

export function useBooks() {
  const [books, setBooks] = useState<Book[]>(() => readBooksFromStorage());

  // Sync across tabs / hooks
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === BOOKS_KEY) {
        setBooks(readBooksFromStorage());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const persist = (next: Book[]) => {
    try {
      localStorage.setItem(BOOKS_KEY, JSON.stringify(next));
    } catch (e) {
      console.error('Failed to persist books', e);
    }
  };

  const addBook = useCallback(async (
    id: string,
    file: File,
    metadata: Omit<Book, 'id' | 'addedAt' | 'lastReadAt'>
  ) => {
    const buffer = await file.arrayBuffer();
    await savePdfBytes(id, buffer);

    const newBook: Book = {
      ...metadata,
      id,
      addedAt: Date.now(),
      lastReadAt: Date.now(),
    };

    // Write to localStorage SYNCHRONOUSLY first so navigation can read it immediately,
    // even if this component unmounts before React flushes the state updater.
    const current = readBooksFromStorage();
    const updated = [newBook, ...current.filter((b) => b.id !== id)];
    persist(updated);
    setBooks(updated);
    return newBook;
  }, []);

  const updateBookProgress = useCallback((id: string, lastPage: number) => {
    const current = readBooksFromStorage();
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