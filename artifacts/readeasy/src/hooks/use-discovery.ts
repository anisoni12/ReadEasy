import { useState, useCallback } from 'react';

export interface RecommendedBook {
  title: string;
  author: string;
  coverUrl: string;
}

export function useDiscovery() {
  const [books, setBooks] = useState<RecommendedBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const discoverBooks = useCallback(async (title: string) => {
    if (!title) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&limit=6`);
      if (!response.ok) throw new Error('Failed to fetch recommendations');
      const data = await response.json();
      
      const recommendations: RecommendedBook[] = data.docs
        .filter((doc: any) => doc.title && doc.author_name?.[0])
        .map((doc: any) => ({
          title: doc.title,
          author: doc.author_name[0],
          coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : '',
        }));
        
      setBooks(recommendations);
    } catch (err) {
      console.error('Discovery error:', err);
      setError('Could not load recommendations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { books, isLoading, error, discoverBooks };
}