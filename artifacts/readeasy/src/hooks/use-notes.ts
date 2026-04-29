import { useState, useEffect, useCallback } from 'react';

export type NoteColor = 'amber' | 'green' | 'blue' | 'pink' | 'plain';

export interface Note {
  id: string;
  bookId: string;
  page: number;
  highlight?: string;
  text: string;
  color: NoteColor;
  createdAt: number;
}

const NOTES_KEY = 'readeasy:notes';

function readAll(): Note[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(NOTES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeAll(notes: Note[]) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

export function useNotes(bookId: string | undefined) {
  const [allNotes, setAllNotes] = useState<Note[]>(() => readAll());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === NOTES_KEY) setAllNotes(readAll());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const notes = bookId
    ? allNotes.filter((n) => n.bookId === bookId).sort((a, b) => a.page - b.page || a.createdAt - b.createdAt)
    : [];

  const addNote = useCallback(
    (note: Omit<Note, 'id' | 'createdAt' | 'bookId'>) => {
      if (!bookId) return;
      const newNote: Note = {
        ...note,
        bookId,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      };
      setAllNotes((prev) => {
        const next = [...prev, newNote];
        writeAll(next);
        return next;
      });
    },
    [bookId]
  );

  const deleteNote = useCallback((noteId: string) => {
    setAllNotes((prev) => {
      const next = prev.filter((n) => n.id !== noteId);
      writeAll(next);
      return next;
    });
  }, []);

  const updateNote = useCallback((noteId: string, updates: Partial<Pick<Note, 'text' | 'color'>>) => {
    setAllNotes((prev) => {
      const next = prev.map((n) => (n.id === noteId ? { ...n, ...updates } : n));
      writeAll(next);
      return next;
    });
  }, []);

  const deleteAllForBook = useCallback(() => {
    if (!bookId) return;
    setAllNotes((prev) => {
      const next = prev.filter((n) => n.bookId !== bookId);
      writeAll(next);
      return next;
    });
  }, [bookId]);

  return { notes, addNote, deleteNote, updateNote, deleteAllForBook };
}
