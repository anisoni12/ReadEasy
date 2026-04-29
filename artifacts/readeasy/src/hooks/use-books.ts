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

export function useBooks() {
  const [books, setBooks] = useState<Book[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(BOOKS_KEY);
    if (stored) {
      try {
        setBooks(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse books', e);
      }
    }
  }, []);

  const saveBooks = (newBooks: Book[]) => {
    setBooks(newBooks);
    localStorage.setItem(BOOKS_KEY, JSON.stringify(newBooks));
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
    
    setBooks(prev => {
      const updated = [newBook, ...prev.filter(b => b.id !== id)];
      localStorage.setItem(BOOKS_KEY, JSON.stringify(updated));
      return updated;
    });
    return newBook;
  }, []);

  const updateBookProgress = useCallback((id: string, lastPage: number) => {
    setBooks(prev => {
      const updated = prev.map(b => 
        b.id === id ? { ...b, lastPage, lastReadAt: Date.now() } : b
      );
      localStorage.setItem(BOOKS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateBookMetadata = useCallback((id: string, updates: Partial<Book>) => {
    setBooks(prev => {
      const updated = prev.map(b => 
        b.id === id ? { ...b, ...updates } : b
      );
      localStorage.setItem(BOOKS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deleteBook = useCallback(async (id: string) => {
    await deletePdfBytes(id);
    setBooks(prev => {
      const updated = prev.filter(b => b.id !== id);
      localStorage.setItem(BOOKS_KEY, JSON.stringify(updated));
      return updated;
    });
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