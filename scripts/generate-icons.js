/**
 * Generates solid blue PNG icon files for the Chrome extension.
 * Uses only Node.js built-ins (zlib + fs) — no extra dependencies needed.
 *
 * Run: node scripts/generate-icons.js
 */

import { deflateSync } from 'zlib'
import { writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const iconsDir = resolve(__dirname, '../public/icons')

/** CRC-32 for PNG chunk integrity */
function crc32(buf) {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c
  }
  let crc = 0xffffffff
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function uint32BE(n) {
  const b = Buffer.alloc(4)
  b.writeUInt32BE(n, 0)
  return b
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const crcInput = Buffer.concat([typeBytes, data])
  const crc = uint32BE(crc32(crcInput))
  return Buffer.concat([uint32BE(data.length), typeBytes, data, crc])
}

/**
 * Create a solid-color PNG of the given size.
 * @param {number} size  width = height in pixels
 * @param {number} r     red   0–255
 * @param {number} g     green 0–255
 * @param {number} b     blue  0–255
 */
function makePNG(size, r, g, b) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = pngChunk(
    'IHDR',
    Buffer.concat([
      uint32BE(size),
      uint32BE(size),
      Buffer.from([8, 2, 0, 0, 0]), // bit depth 8, color type RGB
    ])
  )

  // Build raw image data: one filter byte (0 = None) + RGB per row
  const rowBytes = 1 + size * 3
  const raw = Buffer.alloc(size * rowBytes)
  for (let y = 0; y < size; y++) {
    const offset = y * rowBytes
    raw[offset] = 0 // filter type: None
    for (let x = 0; x < size; x++) {
      raw[offset + 1 + x * 3] = r
      raw[offset + 2 + x * 3] = g
      raw[offset + 3 + x * 3] = b
    }
  }

  const idat = pngChunk('IDAT', deflateSync(raw))
  const iend = pngChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdr, idat, iend])
}

// Brand blue: #3b82f6 → rgb(59, 130, 246)
const R = 59, G = 130, B = 246

mkdirSync(iconsDir, { recursive: true })

for (const size of [16, 48, 128]) {
  const path = resolve(iconsDir, `icon${size}.png`)
  writeFileSync(path, makePNG(size, R, G, B))
  console.log(`✓  icon${size}.png`)
}

console.log('\nIcons generated in public/icons/')
