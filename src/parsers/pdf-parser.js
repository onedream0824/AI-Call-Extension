/**
 * Client-side PDF text extraction using pdfjs-dist.
 *
 * The PDF.js worker is bundled as a Vite asset via the `?url` import.
 * crxjs includes it in the extension package so it's accessible via
 * chrome.runtime.getURL at runtime.
 */

import * as pdfjs from 'pdfjs-dist'
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc

/**
 * Extracts all readable text from a PDF File object.
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function parsePdf(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise

  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const lineText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    pages.push(lineText)
  }

  return pages.join('\n').replace(/\s{3,}/g, '\n').trim()
}
