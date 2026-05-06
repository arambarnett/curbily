import * as pdfjsLib from 'pdfjs-dist';

// Polyfill for Promise.withResolvers which is missing in many browsers
// used in some environments
if (typeof Promise !== 'undefined' && !(Promise as any).withResolvers) {
  (Promise as any).withResolvers = function() {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

// Polyfill for ReadableStream async iterator which is missing in some environments
// and required by modern PDF.js versions
if (typeof ReadableStream !== 'undefined' && !ReadableStream.prototype[Symbol.asyncIterator as any]) {
  (ReadableStream.prototype as any)[Symbol.asyncIterator] = function () {
    const reader = this.getReader();
    return {
      next() {
        return reader.read();
      },
      return() {
        reader.releaseLock();
        return Promise.resolve({ done: true, value: undefined });
      },
      [Symbol.asyncIterator]() {
        return this;
      },
    };
  };
}

// Set worker source to a reliable CDN that matches the major version
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export const extractTextFromPDF = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n\n';
    }

    return fullText;
  } catch (error: any) {
    console.error('Core PDF extraction error:', error);
    if (error?.name === 'PasswordException') {
      throw new Error('This PDF is password protected. Please provide an unencrypted version.');
    }
    throw new Error(`PDF extraction failed: ${error?.message || 'The file might be corrupted or in an unsupported format.'}`);
  }
};

export const fetchGoogleSheetText = async (url: string): Promise<string> => {
  try {
    const sheetIdMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetIdMatch) throw new Error('Invalid Google Sheets URL');
    
    const sheetId = sheetIdMatch[1];
    const response = await fetch(`/api/proxy/google-sheet?sheetId=${sheetId}`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to fetch Google Sheet');
    }
    
    return await response.text();
  } catch (error) {
    console.error('Error fetching Google Sheet:', error);
    throw error;
  }
};

export const fetchGoogleDocText = async (url: string): Promise<string> => {
  try {
    const docIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!docIdMatch) throw new Error('Invalid Google Docs URL');
    
    const docId = docIdMatch[1];
    const response = await fetch(`/api/proxy/google-doc?docId=${docId}`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to fetch Google Doc');
    }
    
    return await response.text();
  } catch (error) {
    console.error('Error fetching Google Doc:', error);
    throw error;
  }
};
