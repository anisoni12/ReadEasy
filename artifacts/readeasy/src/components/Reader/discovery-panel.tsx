import React, { useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useDiscovery } from '@/hooks/use-discovery';
import { Compass, BookOpen, ExternalLink, Library } from 'lucide-react';

interface DiscoveryPanelProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
}

export function DiscoveryPanel({ isOpen, onOpenChange, title }: DiscoveryPanelProps) {
  const { books, isLoading, error, discoverBooks } = useDiscovery();

  useEffect(() => {
    if (isOpen && title && books.length === 0 && !isLoading) {
      discoverBooks(title);
    }
  }, [isOpen, title, books.length, isLoading, discoverBooks]);

  const handleFindPdf = (bookTitle: string, author: string) => {
    const query = encodeURIComponent(`${bookTitle} ${author} pdf free`);
    window.open(`https://www.google.com/search?q=${query}`, '_blank');
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[400px] p-0 flex flex-col bg-background/95 backdrop-blur-xl border-l-border/50">
        <div className="p-6 pb-4 border-b border-border/50 bg-secondary/20">
          <SheetHeader className="text-left">
            <SheetTitle className="font-serif text-2xl flex items-center gap-2 text-foreground">
              <Library className="text-primary w-5 h-5" />
              Similar Books
            </SheetTitle>
            <SheetDescription className="text-muted-foreground font-medium">
              Because you're reading <span className="italic text-foreground/80">"{title}"</span>
            </SheetDescription>
          </SheetHeader>
        </div>

        <ScrollArea className="flex-1 p-6 pb-safe">
          {isLoading && (
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="flex flex-col gap-2">
                  <Skeleton className="w-full aspect-[2/3] rounded-xl bg-primary/5" />
                  <Skeleton className="h-4 w-3/4 rounded bg-primary/5" />
                  <Skeleton className="h-3 w-1/2 rounded bg-primary/5" />
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="text-center py-12 flex flex-col items-center gap-3">
              <Compass className="w-12 h-12 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground font-medium">{error}</p>
              <Button variant="outline" size="sm" onClick={() => discoverBooks(title)} className="rounded-full mt-2">
                Try Again
              </Button>
            </div>
          )}

          {!isLoading && !error && books.length > 0 && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8">
              {books.map((book, idx) => (
                <div key={idx} className="group flex flex-col gap-2">
                  <div className="w-full aspect-[2/3] rounded-xl overflow-hidden bg-secondary border border-border/50 shadow-sm relative">
                    {book.coverUrl ? (
                      <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground/50 bg-secondary/80">
                        <BookOpen className="w-8 h-8" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                      <Button 
                        size="sm" 
                        className="w-full rounded-full bg-primary/90 hover:bg-primary text-white text-xs h-8"
                        onClick={() => handleFindPdf(book.title, book.author)}
                      >
                        Find PDF <ExternalLink className="w-3 h-3 ml-1.5" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-serif font-medium text-sm leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors">{book.title}</h4>
                    <p className="text-xs text-muted-foreground truncate mt-1">{book.author}</p>
                  </div>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="w-full rounded-lg text-xs h-8 sm:hidden mt-1"
                    onClick={() => handleFindPdf(book.title, book.author)}
                  >
                    Find PDF <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          
          {!isLoading && !error && books.length === 0 && (
            <div className="text-center py-12 flex flex-col items-center gap-3">
              <Compass className="w-12 h-12 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground font-medium">No recommendations found.</p>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}