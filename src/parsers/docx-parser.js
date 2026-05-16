/**
 * Client-side DOCX text extraction using mammoth.js.
 * Mammoth converts DOCX to plain text without any server-side processing.
 */

import mammoth from 'mammoth'

/**
 * Extracts all readable text from a DOCX File object.
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function parseDocx(file) {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value.replace(/\s{3,}/g, '\n').trim()
}
