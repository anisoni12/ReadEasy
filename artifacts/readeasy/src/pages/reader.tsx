import { useState, useEffect, useRef, type MouseEvent, type TouchEvent } from 'react';
import { useLocation, useParams } from 'wouter';
import { useBooks } from '@/hooks/use-books';
import { getPdfBytes } from '@/lib/idb';
import { pdfjsLib, extractTextFromPage } from '@/lib/pdf-utils';
import { PdfRenderer } from '@/components/Reader/pdf-renderer';
import { useTheme, FONT_SCALE_MAP, type FontSize } from '@/hooks/use-theme';
import { AIPanel } from '@/components/Reader/ai-panel';
import { DiscoveryPanel } from '@/components/Reader/discovery-panel';
import { NotesPanel } from '@/components/Reader/notes-panel';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, Moon, Sun, Coffee, Type, Sparkles, AlertCircle, Highlighter, Focus, X as XIcon, Compass } from 'lucide-react';
import { useNotes } from '@/hooks/use-notes';
import { useFocusMode } from '@/hooks/use-focus-mode';
import { useAiDetectBook } from '@workspace/api-client-react';

const FONT_SIZES: readonly FontSize[] = ['small', 'medium', 'large', 'xlarge'] as const;

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

  const [showFocusControls, setShowFocusControls] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const { isFocused, enter: enterFocus, exit: exitFocus } = useFocusMode();

  const detectBook = useAiDetectBook();
  const detectionAttemptedRef = useRef<string | null>(null);

  // Load PDF
  useEffect(() => {
    if (!bookId) return;
    let cancelled = false;
    let loadedDoc: pdfjsLib.PDFDocumentProxy | null = null;

    const loadPdf = async () => {
      try {
        const bytes = await getPdfBytes(bookId);
        if (cancelled) return;
        if (!bytes) {
          setError("PDF file not found on device.");
          return;
        }

        const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
        if (cancelled) {
          // Component unmounted while we were loading — release native resources.
          doc.destroy();
          return;
        }
        loadedDoc = doc;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);

        // Use the freshest book record from storage to avoid stale-closure writes.
        const fresh = bookId ? getBook(bookId) : undefined;
        if (fresh && fresh.totalPages !== doc.numPages) {
          updateBookMetadata(bookId, { totalPages: doc.numPages });
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Error loading PDF", err);
        setError("Could not read this PDF file.");
      }
    };

    loadPdf();
    return () => {
      cancelled = true;
      if (loadedDoc) {
        loadedDoc.destroy().catch(() => {});
      }
    };
    // Intentionally exclude `book` and `getBook` so we don't reload the PDF on
    // every metadata change. The latest values are read inside loadPdf.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, updateBookMetadata]);

  // Extract page text for AI features.
  useEffect(() => {
    if (!pdfDoc) return;
    let cancelled = false;
    extractTextFromPage(pdfDoc, currentPage)
      .then((text) => {
        if (!cancelled) setCurrentPageText(text);
      })
      .catch(() => {
        if (!cancelled) setCurrentPageText('');
      });
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, currentPage]);

  // One-shot book metadata detection on first open.
  // Discovery panel is opt-in (user clicks Compass icon) — never auto-opens.
  useEffect(() => {
    if (!pdfDoc || !bookId) return;
    if (currentPage !== 1) return;
    if (detectionAttemptedRef.current === bookId) return;

    const author = book?.author;
    const needsDetection = !author || author === 'Unknown Author' || author === 'Unknown';
    if (!needsDetection) return;

    let cancelled = false;
    detectionAttemptedRef.current = bookId;

    const run = async () => {
      let combinedText = '';
      for (let p = 1; p <= Math.min(3, pdfDoc.numPages); p++) {
        if (cancelled) return;
        const pageText = await extractTextFromPage(pdfDoc, p);
        combinedText += ' ' + pageText;
        if (combinedText.trim().length >= 100) break;
      }
      if (cancelled || combinedText.trim().length < 20) return;

      try {
        const res = await detectBook.mutateAsync({ data: { text: combinedText.substring(0, 1000) } });
        if (cancelled || !res) return;

        const updates: Partial<{ title: string; author: string }> = {};
        if (res.title && res.title !== 'Untitled') updates.title = res.title;
        if (res.author && res.author !== 'Unknown' && res.author !== 'Unknown Author') {
          updates.author = res.author;
        }
        if (Object.keys(updates).length > 0) {
          updateBookMetadata(bookId, updates);
        }
      } catch (err) {
        // Allow a future retry on remount if detection failed.
        detectionAttemptedRef.current = null;
        if (!cancelled) console.error('Detection failed', err);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, currentPage, bookId, book?.author, updateBookMetadata, detectBook]);

  // Save progress
  useEffect(() => {
    if (bookId && currentPage > 0) {
      updateBookProgress(bookId, currentPage);
    }
  }, [currentPage, bookId, updateBookProgress]);

  // Auto-hide chrome
  useEffect(() => {
    if (!showChrome) return;
    if (isFocused) {
      setShowChrome(false);
      return;
    }
    const timer = setTimeout(() => {
      setShowChrome(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [showChrome, currentPage, isFocused]);

  // Auto-hide focus controls
  useEffect(() => {
    if (!showFocusControls) return;
    const timer = setTimeout(() => {
      setShowFocusControls(false);
      setShowFontPicker(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [showFocusControls, currentPage, fontSize]);

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

  const toggleChrome = () => {
    if (isFocused) {
      setShowFocusControls((s) => {
        if (s) setShowFontPicker(false);
        return !s;
      });
      return;
    }
    setShowChrome((s) => !s);
  };

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].screenX;
    const diff = touchStartX.current - touchEndX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        // swipe left -> next page
        setCurrentPage(p => Math.min(p + 1, totalPages));
        if (isFocused) setShowFocusControls(true);
        else setShowChrome(true);
      } else {
        // swipe right -> prev page
        setCurrentPage(p => Math.max(p - 1, 1));
        if (isFocused) setShowFocusControls(true);
        else setShowChrome(true);
      }
    }
    touchStartX.current = null;
  };

  const cycleFontSize = () => {
    const idx = FONT_SIZES.indexOf(fontSize);
    changeFontSize(FONT_SIZES[(idx + 1) % FONT_SIZES.length]);
  };

  if (error) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-background text-center gap-4">
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
    <div className="relative min-h-dvh w-full mx-auto md:max-w-4xl bg-background overflow-hidden flex flex-col shadow-2xl">
      {/* Top Chrome */}
      <div
        className={`absolute top-0 inset-x-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/50 transition-transform duration-300 ${showChrome && !isFocused ? 'translate-y-0' : '-translate-y-full'
          }`}
      >
        <div className="h-14 px-2 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/')} className="rounded-full">
            <ChevronLeft size={24} />
          </Button>

          <div className="flex-1 px-2 overflow-hidden flex flex-col items-center">
            <h1 className="font-serif font-medium text-sm truncate w-full text-center text-foreground">
              {book?.title || (pdfDoc ? 'Untitled book' : 'Loading...')}
            </h1>
            <p className="text-[10px] text-muted-foreground truncate w-full text-center">
              {book?.author || ''}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDiscoveryOpen(true)}
              className="rounded-full text-foreground/70"
              aria-label="Similar books discovery"
            >
              <Compass size={18} />
            </Button>
            <Button variant="ghost" size="icon" onClick={enterFocus} className="rounded-full text-foreground/70" aria-label="Focus mode">
              <Focus size={18} />
            </Button>
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
        className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col relative" onClick={toggleChrome}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className={`min-h-full flex flex-col items-center justify-center ${isFocused ? 'p-0' : 'px-1 py-2'}`}>
          <PdfRenderer
            pdfDocument={pdfDoc}
            pageNumber={currentPage}
            scale={FONT_SCALE_MAP[fontSize]}
          />
        </div>
      </div>

      {/* Focus mode exit affordance */}
      {isFocused && (
        <button
          onClick={exitFocus}
          className={`absolute top-3 right-3 z-30 w-9 h-9 rounded-full bg-foreground/10 hover:bg-foreground/20 backdrop-blur-md flex items-center justify-center text-foreground/70 transition-opacity duration-300 ${showFocusControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          aria-label="Exit focus mode"
        >
          <XIcon size={16} />
        </button>
      )}

      {/* Subtle page indicator in focus mode */}
      {isFocused && (
        <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-foreground/10 backdrop-blur-md text-[11px] font-serif transition-opacity duration-300 ${showFocusControls ? 'text-foreground/90 opacity-100' : 'text-foreground/40 opacity-0 pointer-events-none'}`}>
          {currentPage} / {totalPages}
        </div>
      )}

      {/* Focus mode controls */}
      {isFocused && (
        <div className={`absolute bottom-12 right-4 flex flex-col items-end gap-2 z-30 transition-opacity duration-300 ${showFocusControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {showFontPicker && (
            <div className="flex flex-col gap-2 p-2 bg-background/90 backdrop-blur-md rounded-full border border-border/50 shadow-lg">
              {(['small', 'medium', 'large', 'xlarge'] as const).map(size => (
                <Button
                  key={size}
                  variant={fontSize === size ? 'default' : 'ghost'}
                  size="icon"
                  className="w-10 h-10 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    changeFontSize(size);
                    setShowFocusControls(true);
                  }}
                >
                  <span className={
                    size === 'small' ? 'text-xs' :
                      size === 'medium' ? 'text-sm' :
                        size === 'large' ? 'text-base' : 'text-lg'
                  }>A</span>
                </Button>
              ))}
            </div>
          )}
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full shadow-lg h-12 w-12 bg-background/90 backdrop-blur-md border border-border/50"
            onClick={(e) => {
              e.stopPropagation();
              setShowFontPicker(p => !p);
              setShowFocusControls(true);
            }}
            aria-label="Adjust font size"
          >
            <Type size={20} className="text-foreground/70" />
          </Button>
        </div>
      )}

      {/* Consolidated Companion Menu (Notes & AI Assistant) */}
      <div className={`absolute bottom-20 right-6 z-10 flex flex-col gap-3 transition-all duration-300 ${showChrome && !isFocused ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <div className="flex flex-col gap-2 p-1.5 bg-background/90 backdrop-blur-md rounded-2xl border border-border/60 shadow-lg">
          <Button
            size="icon"
            variant="ghost"
            className="rounded-xl h-11 w-11 relative hover:bg-secondary/50 text-foreground/80 hover:text-amber-600 dark:hover:text-amber-400"
            onClick={(e: MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              setIsNotesOpen(true);
            }}
            aria-label="Highlights and notes"
          >
            <Highlighter size={18} />
            {pageHasNotes && (
              <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="rounded-xl h-11 w-11 hover:bg-secondary/50 text-foreground/80 hover:text-primary"
            onClick={(e: MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              setIsAIPanelOpen(true);
            }}
            aria-label="AI Assistant"
          >
            <Sparkles size={18} />
          </Button>
        </div>
      </div>

      {/* Bottom Chrome */}
      <div
        className={`absolute bottom-0 inset-x-0 z-20 bg-background/95 backdrop-blur-md border-t border-border/50 pb-safe transition-transform duration-300 ${showChrome && !isFocused ? 'translate-y-0' : 'translate-y-full'
          }`}
      >
        <div className="h-16 px-4 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
            disabled={currentPage <= 1 || !pdfDoc}
            className="rounded-full px-5 h-9 text-sm font-medium border-border/60"
          >
            ← Prev
          </Button>

          <div className="flex flex-col items-center">
            <span className="text-sm font-serif font-semibold text-foreground/80">
              {currentPage} <span className="text-muted-foreground font-normal">/ {totalPages}</span>
            </span>
            <span className="text-[10px] text-muted-foreground">
              {Math.round((currentPage / totalPages) * 100)}%
            </span>
          </div>

          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
            disabled={currentPage >= totalPages || !pdfDoc}
            className="rounded-full px-5 h-9 text-sm font-medium border-border/60"
          >
            Next →
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