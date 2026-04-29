import React, { useState, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerBody } from '@/components/ui/drawer';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { pdfjsLib, extractTextFromRange } from '@/lib/pdf-utils';
import { useAiSummarize, useAiExplain, useAiVocabulary } from '@workspace/api-client-react';
import { Sparkles, BookOpen, Languages, RefreshCcw } from 'lucide-react';

interface AIPanelProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  bookId: string;
  currentPage: number;
  currentPageText: string;
}

export function AIPanel({ isOpen, onOpenChange, pdfDoc, bookId, currentPage, currentPageText }: AIPanelProps) {
  const [activeTab, setActiveTab] = useState('summary');
  
  // Summary State
  const [summaryRange, setSummaryRange] = useState(1); // pages to summarize around current
  const [summaryResult, setSummaryResult] = useState('');
  const summarize = useAiSummarize();

  // Explain State
  const [explainInput, setExplainInput] = useState('');
  const [explainResult, setExplainResult] = useState('');
  const explain = useAiExplain();

  // Vocabulary State
  const [vocabInput, setVocabInput] = useState('');
  const [vocabResult, setVocabResult] = useState<any>(null);
  const vocabulary = useAiVocabulary();

  // Auto-fill explain input when opened
  useEffect(() => {
    if (isOpen && activeTab === 'explain' && !explainInput) {
      setExplainInput(currentPageText.substring(0, 500));
    }
  }, [isOpen, activeTab, currentPageText, explainInput]);

  const handleSummarize = async () => {
    const start = Math.max(1, currentPage);
    const end = Math.min(pdfDoc.numPages, currentPage + summaryRange - 1);
    
    // Check cache
    const cacheKey = `readeasy:summary:${bookId}:${start}-${end}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      setSummaryResult(cached);
      return;
    }

    try {
      setSummaryResult('');
      const text = await extractTextFromRange(pdfDoc, start, end);
      const res = await summarize.mutateAsync({ data: { text: text.substring(0, 3000) } });
      if (res && res.text) {
        setSummaryResult(res.text);
        localStorage.setItem(cacheKey, res.text);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExplain = async () => {
    if (!explainInput.trim()) return;
    try {
      setExplainResult('');
      const res = await explain.mutateAsync({ data: { text: explainInput } });
      if (res && res.text) {
        setExplainResult(res.text);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleVocab = async () => {
    if (!vocabInput.trim()) return;
    try {
      setVocabResult(null);
      const res = await vocabulary.mutateAsync({ 
        data: { 
          word: vocabInput,
          context: currentPageText.substring(0, 200) // Brief context
        } 
      });
      if (res) {
        setVocabResult(res);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[85vh] bg-background/95 backdrop-blur-xl border-border/50 flex flex-col rounded-t-[2rem]">
        <div className="mx-auto w-12 h-1.5 rounded-full bg-border/80 mt-4 mb-2" />
        <DrawerHeader className="text-left px-6 pb-2">
          <DrawerTitle className="font-serif text-2xl flex items-center gap-2 text-foreground">
            <Sparkles className="text-primary w-5 h-5" /> 
            Reading Assistant
          </DrawerTitle>
          <DrawerDescription className="text-muted-foreground font-medium">
            Powered by Gemini AI
          </DrawerDescription>
        </DrawerHeader>

        <DrawerBody className="px-6 flex-1 overflow-hidden flex flex-col p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full">
            <TabsList className="grid grid-cols-3 mb-4 bg-secondary/50 rounded-xl p-1 h-auto">
              <TabsTrigger value="summary" className="py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm font-medium">Summary</TabsTrigger>
              <TabsTrigger value="explain" className="py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm font-medium">Explain</TabsTrigger>
              <TabsTrigger value="vocab" className="py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm font-medium">Vocabulary</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 h-full pb-safe">
              {/* SUMMARY TAB */}
              <TabsContent value="summary" className="mt-0 h-full flex flex-col gap-4 focus-visible:outline-none">
                <div className="flex items-center gap-2 mb-2">
                  <Button 
                    variant={summaryRange === 1 ? 'secondary' : 'ghost'} 
                    size="sm" 
                    onClick={() => setSummaryRange(1)}
                    className="rounded-full"
                  >
                    This Page
                  </Button>
                  <Button 
                    variant={summaryRange === 5 ? 'secondary' : 'ghost'} 
                    size="sm" 
                    onClick={() => setSummaryRange(5)}
                    className="rounded-full"
                  >
                    Next 5 Pages
                  </Button>
                </div>
                
                {!summaryResult && !summarize.isPending && (
                  <Button onClick={handleSummarize} className="w-full rounded-xl h-12 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary border-0 shadow-none font-semibold">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Summary
                  </Button>
                )}

                {summarize.isPending && (
                  <div className="space-y-3 pt-4">
                    <Skeleton className="h-4 w-full rounded-md bg-primary/10" />
                    <Skeleton className="h-4 w-[90%] rounded-md bg-primary/10" />
                    <Skeleton className="h-4 w-[95%] rounded-md bg-primary/10" />
                    <Skeleton className="h-4 w-[80%] rounded-md bg-primary/10" />
                  </div>
                )}

                {summaryResult && (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 font-serif leading-relaxed pb-8">
                    <p className="whitespace-pre-wrap">{summaryResult}</p>
                    <Button variant="outline" size="sm" onClick={handleSummarize} className="mt-4 rounded-full text-muted-foreground">
                      <RefreshCcw className="w-3 h-3 mr-2" /> Regenerate
                    </Button>
                  </div>
                )}
                {summarize.isError && (
                  <p className="text-destructive text-sm p-4 bg-destructive/10 rounded-xl">Failed to generate summary. Please try again.</p>
                )}
              </TabsContent>

              {/* EXPLAIN TAB */}
              <TabsContent value="explain" className="mt-0 h-full flex flex-col gap-4 focus-visible:outline-none">
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-medium text-muted-foreground">Paste confusing text here:</label>
                  <Textarea 
                    value={explainInput}
                    onChange={e => setExplainInput(e.target.value)}
                    placeholder="Paste a paragraph that's hard to understand..."
                    className="min-h-[120px] rounded-xl bg-secondary/30 border-border/50 resize-none font-serif text-base"
                  />
                  <Button 
                    onClick={handleExplain} 
                    disabled={!explainInput.trim() || explain.isPending}
                    className="w-full rounded-xl h-12 bg-primary hover:bg-primary/90 text-white font-semibold"
                  >
                    {explain.isPending ? <Skeleton className="w-5 h-5 rounded-full bg-white/30 animate-spin" /> : "Explain in simple terms"}
                  </Button>
                </div>

                {explain.isPending && (
                  <div className="space-y-3 pt-6">
                    <Skeleton className="h-4 w-full rounded-md bg-primary/10" />
                    <Skeleton className="h-4 w-[85%] rounded-md bg-primary/10" />
                    <Skeleton className="h-4 w-[90%] rounded-md bg-primary/10" />
                  </div>
                )}

                {explainResult && (
                  <div className="mt-4 p-5 bg-primary/5 border border-primary/10 rounded-2xl relative">
                    <Sparkles className="absolute top-4 right-4 w-5 h-5 text-primary/30" />
                    <h4 className="font-serif font-semibold text-primary mb-2 flex items-center gap-2">Explanation</h4>
                    <p className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 font-serif leading-relaxed whitespace-pre-wrap">
                      {explainResult}
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* VOCABULARY TAB */}
              <TabsContent value="vocab" className="mt-0 h-full flex flex-col gap-4 focus-visible:outline-none">
                <div className="flex gap-2">
                  <Input 
                    value={vocabInput}
                    onChange={e => setVocabInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleVocab()}
                    placeholder="Enter a word to look up..."
                    className="rounded-xl h-12 bg-secondary/30 border-border/50 font-serif text-lg px-4"
                  />
                  <Button 
                    onClick={handleVocab} 
                    disabled={!vocabInput.trim() || vocabulary.isPending}
                    className="rounded-xl h-12 px-6 bg-primary hover:bg-primary/90 text-white"
                  >
                    Lookup
                  </Button>
                </div>

                {vocabulary.isPending && (
                  <div className="space-y-4 pt-6">
                    <Skeleton className="h-8 w-[40%] rounded-md bg-primary/10" />
                    <Skeleton className="h-4 w-full rounded-md bg-primary/10" />
                    <Skeleton className="h-16 w-full rounded-xl bg-primary/5" />
                  </div>
                )}

                {vocabResult && (
                  <div className="mt-4 flex flex-col gap-5">
                    <div>
                      <h3 className="font-serif text-3xl font-bold text-foreground capitalize tracking-tight flex items-baseline gap-3">
                        {vocabResult.word}
                        {vocabResult.meaningHindi && (
                          <span className="text-xl text-primary font-normal">{vocabResult.meaningHindi}</span>
                        )}
                      </h3>
                    </div>
                    
                    <div>
                      <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Meaning</h4>
                      <p className="font-serif text-lg text-foreground/90 leading-snug">{vocabResult.meaning}</p>
                    </div>

                    {vocabResult.example && (
                      <div className="p-4 bg-secondary/50 rounded-xl border border-border/50">
                        <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1 flex items-center gap-1"><BookOpen className="w-3 h-3" /> Example</h4>
                        <p className="font-serif italic text-foreground/80">"{vocabResult.example}"</p>
                      </div>
                    )}

                    {vocabResult.synonyms && vocabResult.synonyms.length > 0 && (
                      <div>
                        <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Similar Words</h4>
                        <div className="flex flex-wrap gap-2">
                          {vocabResult.synonyms.map((syn: string) => (
                            <span key={syn} className="px-3 py-1 bg-background border border-border rounded-full text-sm text-foreground/80 shadow-sm cursor-pointer hover:bg-secondary transition-colors" onClick={() => { setVocabInput(syn); setTimeout(handleVocab, 100); }}>
                              {syn}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}