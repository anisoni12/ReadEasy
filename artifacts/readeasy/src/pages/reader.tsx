import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { useBooks } from '@/hooks/use-books';
import { getPdfBytes } from '@/lib/idb';
import { pdfjsLib, extractTextFromPage } from '@/lib/pdf-utils';
import { PdfRenderer } from '@/components/Reader/pdf-renderer';
import { useTheme, FONT_SCALE_MAP } from '@/hooks/use-theme';
import { AIPanel } from '@/components/Reader/ai-panel';
import { DiscoveryPanel } from '@/components/Reader/discovery-panel';
import { NotesPanel } from '@/components/Reader/notes-panel';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, Moon, Sun, Coffee, Type, Sparkles, AlertCircle, Highlighter } from 'lucide-react';
import { useNotes } from '@/hooks/use-notes';
import { useAiDetectBook } from '@workspace/api-client-react';

export default function Reader() {
  const { bookId } = useParams();
  const [, setLocation] = useLocation();
  const { getBook, updateBookProgress, updateBookMetadata } = useBooks();
  const { theme, cycleTheme, fontSize, changeFontSize } = useTheme();
  
  const book = getBook(bookId || '');
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(book?.lastPage || 1);
  const [totalPages, setTotalPages] = useState(book?.totalPages || 1);
  const [showChrome, setShowChrome] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // AI and Discovery state
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [currentPageText, setCurrentPageText] = useState('');
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const { notes } = useNotes(bookId);
  const pageHasNotes = notes.some((n) => n.page === currentPage);
  
  const detectBook = useAiDetectBook();

  // Load PDF
  useEffect(() => {
    if (!bookId) return;
    
    const loadPdf = async () => {
      try {
        const bytes = await getPdfBytes(bookId);
        if (!bytes) {
          setError("PDF file not found on device.");
          return;
        }
        
        const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        
        if (book && book.totalPages !== doc.numPages) {
          updateBookMetadata(bookId, { totalPages: doc.numPages });
        }
      } catch (err) {
        console.error("Error loading PDF", err);
        setError("Could not read this PDF file.");
      }
    };
    
    loadPdf();
  }, [bookId, book, updateBookMetadata]);

  // Extract text and detect book
  useEffect(() => {
    if (!pdfDoc) return;
    
    const extractAndDetect = async () => {
      const text = await extractTextFromPage(pdfDoc, currentPage);
      setCurrentPageText(text);
      
      // Auto-detect book metadata on first page if author is unknown
      if (currentPage === 1 && book?.author === 'Unknown Author') {
        try {
          const res = await detectBook.mutateAsync({ data: { text: text.substring(0, 1000) } });
          if (res && res.title) {
            updateBookMetadata(bookId!, { 
              title: res.title, 
              author: res.author 
            });
            // Give it a moment, then show discovery
            setTimeout(() => setIsDiscoveryOpen(true), 2000);
          }
        } catch (err) {
          console.error("Detection failed", err);
        }
      }
    };
    
    extractAndDetect();
  }, [pdfDoc, currentPage, book?.author, bookId, updateBookMetadata]);

  // Save progress
  useEffect(() => {
    if (bookId && currentPage > 0) {
      updateBookProgress(bookId, currentPage);
    }
  }, [currentPage, bookId, updateBookProgress]);

  // Auto-hide chrome
  useEffect(() => {
    if (!showChrome) return;
    
    const timer = setTimeout(() => {
      setShowChrome(false);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [showChrome, currentPage]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setCurrentPage(p => Math.min(p + 1, totalPages));
        setShowChrome(true);
      } else if (e.key === 'ArrowLeft') {
        setCurrentPage(p => Math.max(p - 1, 1));
        setShowChrome(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalPages]);

  const toggleChrome = () => setShowChrome(!showChrome);
  const cycleFontSize = () => {
    const sizes: typeof fontSize[] = ['small', 'medium', 'large', 'xlarge'];
    const idx = sizes.indexOf(fontSize);
    changeFontSize(sizes[(idx + 1) % sizes.length]);
  };

  if (error) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-background text-center gap-4">
        <AlertCircle size={48} className="text-destructive opacity-80" />
        <h2 className="font-serif text-xl font-semibold">Unable to open book</h2>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => setLocation('/')} variant="outline" className="mt-4">
          Return Home
        </Button>
      </div>
    );
  }

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Coffee;

  return (
    <div className="relative min-h-[100dvh] w-full max-w-md mx-auto md:max-w-4xl bg-background overflow-hidden flex flex-col shadow-2xl">
      {/* Top Chrome */}
      <div 
        className={`absolute top-0 inset-x-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/50 transition-transform duration-300 ${
          showChrome ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="h-14 px-2 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/')} className="rounded-full">
            <ChevronLeft size={24} />
          </Button>
          
          <div className="flex-1 px-2 overflow-hidden flex flex-col items-center">
            <h1 className="font-serif font-medium text-sm truncate w-full text-center text-foreground">
              {book?.title || 'Loading...'}
            </h1>
            <p className="text-[10px] text-muted-foreground truncate w-full text-center">
              {book?.author || ''}
            </p>
          </div>
          
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={cycleFontSize} className="rounded-full text-foreground/70">
              <Type size={18} />
            </Button>
            <Button variant="ghost" size="icon" onClick={cycleTheme} className="rounded-full text-foreground/70">
              <ThemeIcon size={18} />
            </Button>
          </div>
        </div>
        <Progress value={(currentPage / totalPages) * 100} className="h-0.5 rounded-none bg-border/30" />
      </div>

      {/* Main Reader Area */}
      <div 
        className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col relative"
        onClick={toggleChrome}
      >
        <div className="min-h-full flex flex-col items-center justify-center p-4">
          <PdfRenderer 
            pdfDocument={pdfDoc} 
            pageNumber={currentPage} 
            scale={FONT_SCALE_MAP[fontSize]} 
          />
        </div>
      </div>

      {/* Floating action buttons */}
      <div className={`absolute bottom-20 right-6 z-10 flex flex-col gap-3 transition-all duration-300 ${showChrome ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <Button
          size="lg"
          variant="secondary"
          className="rounded-full shadow-lg h-12 w-12 px-0 relative"
          onClick={(e) => {
            e.stopPropagation();
            setIsNotesOpen(true);
          }}
          aria-label="Highlights and notes"
        >
          <Highlighter size={20} className="text-amber-600 dark:text-amber-400" />
          {pageHasNotes && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500" />
          )}
        </Button>
        <Button 
          size="lg" 
          className="rounded-full shadow-lg h-14 w-14 px-0 bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={(e) => {
            e.stopPropagation();
            setIsAIPanelOpen(true);
          }}
        >
          <Sparkles size={24} className="fill-primary-foreground/20" />
        </Button>
      </div>

      {/* Bottom Chrome */}
      <div 
        className={`absolute bottom-0 inset-x-0 z-20 bg-background/95 backdrop-blur-md border-t border-border/50 pb-safe transition-transform duration-300 ${
          showChrome ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="h-16 px-4 flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
            disabled={currentPage <= 1 || !pdfDoc}
            className="text-foreground/70"
          >
            Previous
          </Button>
          
          <span className="text-sm font-medium font-serif text-muted-foreground">
            {currentPage} <span className="opacity-50">/</span> {totalPages}
          </span>
          
          <Button 
            variant="ghost" 
            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
            disabled={currentPage >= totalPages || !pdfDoc}
            className="text-foreground/70"
          >
            Next
          </Button>
        </div>
      </div>

      {/* Panels */}
      {bookId && pdfDoc && (
        <AIPanel 
          isOpen={isAIPanelOpen} 
          onOpenChange={setIsAIPanelOpen}
          pdfDoc={pdfDoc}
          bookId={bookId}
          currentPage={currentPage}
          currentPageText={currentPageText}
        />
      )}
      
      {book && (
        <DiscoveryPanel
          isOpen={isDiscoveryOpen}
          onOpenChange={setIsDiscoveryOpen}
          title={book.title}
        />
      )}

      {bookId && (
        <NotesPanel
          isOpen={isNotesOpen}
          onOpenChange={setIsNotesOpen}
          bookId={bookId}
          currentPage={currentPage}
          onJumpToPage={(p) => {
            setCurrentPage(p);
            setShowChrome(true);
          }}
        />
      )}
    </div>
  );
}