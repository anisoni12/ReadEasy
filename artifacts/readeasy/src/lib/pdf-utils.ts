import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export { pdfjsLib };

export async function extractTextFromPage(pdfDocument: pdfjsLib.PDFDocumentProxy, pageNumber: number): Promise<string> {
  try {
    const page = await pdfDocument.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const strings = textContent.items.map((item: any) => item.str);
    return strings.join(' ');
  } catch (error) {
    console.error(`Failed to extract text from page ${pageNumber}:`, error);
    return '';
  }
}

export async function extractTextFromRange(pdfDocument: pdfjsLib.PDFDocumentProxy, startPage: number, endPage: number): Promise<string> {
  let fullText = '';
  for (let i = startPage; i <= endPage; i++) {
    fullText += await extractTextFromPage(pdfDocument, i) + '\n\n';
  }
  return fullText;
}

export async function generatePdfThumbnail(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    
    const viewport = page.getViewport({ scale: 1.0 });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return '';
    
    // Scale down for thumbnail
    const scale = 300 / viewport.width;
    const scaledViewport = page.getViewport({ scale });
    
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;
    
    await page.render({
      canvasContext: ctx,
      viewport: scaledViewport,
      canvas,
    }).promise;
    
    return canvas.toDataURL('image/jpeg', 0.8);
  } catch (error) {
    console.error('Failed to generate thumbnail', error);
    return '';
  }
}