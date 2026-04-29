import React, { useEffect, useRef, useState } from 'react';
import { pdfjsLib } from '@/lib/pdf-utils';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';

interface PdfRendererProps {
  pdfDocument: pdfjsLib.PDFDocumentProxy | null;
  pageNumber: number;
  scale: number;
  onPageLoad?: () => void;
}

export function PdfRenderer({ pdfDocument, pageNumber, scale, onPageLoad }: PdfRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState(false);
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    const renderPage = async () => {
      if (!pdfDocument || !canvasRef.current) return;
      
      setIsRendering(true);
      
      try {
        const page = await pdfDocument.getPage(pageNumber);
        
        if (!isMounted) return;

        const viewport = page.getViewport({ scale: 1.0 });
        
        // Calculate dynamic scale to fit container width while respecting user scale multiplier
        const containerWidth = canvasRef.current.parentElement?.clientWidth || window.innerWidth;
        const fitScale = (containerWidth - 32) / viewport.width; // 32px total padding
        
        const finalScale = fitScale * scale;
        const finalViewport = page.getViewport({ scale: finalScale });
        
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        if (!context) return;
        
        // Handle high DPI displays
        const outputScale = window.devicePixelRatio || 1;
        canvas.width = finalViewport.width * outputScale;
        canvas.height = finalViewport.height * outputScale;
        canvas.style.width = `${finalViewport.width}px`;
        canvas.style.height = `${finalViewport.height}px`;
        
        context.scale(outputScale, outputScale);

        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const renderContext = {
          canvasContext: context,
          viewport: finalViewport,
          canvas,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        
        await renderTask.promise;
        
        if (isMounted && onPageLoad) {
          onPageLoad();
        }
      } catch (error: any) {
        if (error.name !== 'RenderingCancelledException') {
          console.error('PDF rendering error:', error);
        }
      } finally {
        if (isMounted) {
          setIsRendering(false);
        }
      }
    };

    renderPage();

    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [pdfDocument, pageNumber, scale]);

  return (
    <div className="relative flex justify-center items-center w-full min-h-[50vh] py-8">
      <AnimatePresence>
        {isRendering && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-background/50 z-10"
          >
            <div className="flex flex-col items-center gap-4">
              <Skeleton className="h-8 w-8 rounded-full animate-spin" style={{ borderRadius: '50%' }} />
              <p className="text-sm text-muted-foreground">Loading page...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <canvas 
        ref={canvasRef} 
        className="max-w-full shadow-sm bg-white dark:bg-zinc-100 transition-opacity duration-300"
        style={{ opacity: isRendering ? 0.5 : 1 }}
      />
    </div>
  );
}