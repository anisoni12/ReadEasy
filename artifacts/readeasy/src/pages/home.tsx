import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Dropzone } from '@/components/Upload/dropzone';
import { useBooks } from '@/hooks/use-books';
import { generatePdfThumbnail } from '@/lib/pdf-utils';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { BookOpen, Moon, Sun, Coffee, Plus, Trash2, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Progress } from '@/components/ui/progress';

export default function Home() {
  const [, setLocation] = useLocation();
  const { books, addBook, deleteBook } = useBooks();
  const { theme, cycleTheme } = useTheme();
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (file: File) => {
    setIsUploading(true);
    try {
      const id = crypto.randomUUID();
      const thumbnail = await generatePdfThumbnail(file);
      
      await addBook(id, file, {
        title: file.name.replace('.pdf', ''),
        author: 'Unknown Author', // Will be updated by AI later
        totalPages: 1, // Will be updated when actually opened
        lastPage: 1,
        coverImage: thumbnail,
      });
      
      setLocation(`/read/${id}`);
    } catch (error) {
      console.error('Failed to process PDF', error);
      alert('Failed to process PDF. Please try another file.');
    } finally {
      setIsUploading(false);
    }
  };

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Coffee;

  return (
    <div className="min-h-[100dvh] w-full flex flex-col max-w-md mx-auto relative md:max-w-4xl shadow-2xl bg-background">
      <header className="px-6 py-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
            <BookOpen size={24} className="stroke-[1.5]" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-2xl tracking-tight text-foreground">ReadEasy</h1>
            <p className="text-xs text-muted-foreground font-medium tracking-wide uppercase">Your Quiet Place</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={cycleTheme} className="rounded-full w-10 h-10">
          <ThemeIcon size={20} className="text-foreground/70" />
        </Button>
      </header>

      <main className="flex-1 px-6 pb-24 flex flex-col gap-10">
        <section>
          {isUploading ? (
            <div className="border-2 border-dashed border-primary/20 rounded-xl p-12 text-center bg-primary/5 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin"></div>
              <p className="text-sm font-medium text-primary">Preparing your book...</p>
            </div>
          ) : (
            <Dropzone onFileSelect={handleFileSelect} />
          )}
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-serif text-xl font-semibold text-foreground/90">Continue Reading</h2>
          
          {books.length === 0 ? (
            <div className="rounded-xl border border-border bg-card/50 p-8 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                <BookOpen size={24} />
              </div>
              <div>
                <p className="text-foreground font-medium">Your library is empty</p>
                <p className="text-sm text-muted-foreground mt-1">Upload a PDF to start reading</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {books.map(book => {
                const progress = book.totalPages > 1 ? Math.round((book.lastPage / book.totalPages) * 100) : 0;
                
                return (
                  <div key={book.id} className="group relative flex gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all cursor-pointer overflow-hidden" onClick={() => setLocation(`/read/${book.id}`)}>
                    <div className="w-20 h-28 bg-secondary rounded-md overflow-hidden flex-shrink-0 shadow-sm relative">
                      {book.coverImage ? (
                        <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <FileText size={24} />
                        </div>
                      )}
                      {progress === 100 && (
                        <div className="absolute inset-0 bg-primary/80 flex items-center justify-center">
                          <span className="text-white text-xs font-bold px-2 py-1 bg-black/20 rounded-full">Finished</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col py-1 flex-1 min-w-0">
                      <h3 className="font-serif font-medium text-base text-foreground line-clamp-2 leading-snug">{book.title}</h3>
                      <p className="text-sm text-muted-foreground truncate mt-1">{book.author}</p>
                      
                      <div className="mt-auto pt-4 flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{progress}% complete</span>
                          <span>{book.lastPage} of {book.totalPages}</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                      </div>
                    </div>
                    
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      className="absolute top-2 right-2 w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Remove this book from your device?')) {
                          deleteBook(book.id);
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}