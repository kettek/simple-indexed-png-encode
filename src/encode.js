import zlib from 'zlib'
import { crc32 } from 'easy-crc'

const deflateAsync = (data) => {
  return new Promise((resolve, reject) => {
    zlib.deflate(data, r => {
      resolve(r)
    })
  })
}

async function encode(pixels, width, palettes) {
  let out = Buffer.alloc(0)
  const height = pixels / width

  let buffer = Buffer.alloc(21)
  let bufferOffset = 0
  let chunkStart, chunkEnd
  // Write header
  buffer = Buffer.alloc(8)
  bufferOffset = buffer.writeUInt8(0x89, bufferOffset)
  bufferOffset = buffer.writeUInt8(0x50, bufferOffset)
  bufferOffset = buffer.writeUInt8(0x4E, bufferOffset)
  bufferOffset = buffer.writeUInt8(0x47, bufferOffset)
  bufferOffset = buffer.writeUInt8(0x0D, bufferOffset)
  bufferOffset = buffer.writeUInt8(0x0A, bufferOffset)
  bufferOffset = buffer.writeUInt8(0x1A, bufferOffset)
  bufferOffset = buffer.writeUInt8(0x0A, bufferOffset)
  out = Buffer.concat([out, buffer])
  // Chunk o'clock (length, type, data, crc. crc = network-order CRC-32 of type + data)
  // Write IHDR
  buffer = Buffer.alloc(25), bufferOffset = 0
  bufferOffset = buffer.writeUInt32BE(13, 0)
  chunkStart = bufferOffset
  bufferOffset = buffer.write('IHDR', bufferOffset, 'ascii')
  bufferOffset = buffer.writeUInt32BE(width, bufferOffset)
  bufferOffset = buffer.writeUInt32BE(height, bufferOffset)
  bufferOffset = buffer.writeUInt8(8, bufferOffset) // Indexed 8-bit depth for palette entries
  bufferOffset = buffer.writeUInt8(3, bufferOffset) // Color type of indexed
  bufferOffset = buffer.writeUInt8(0, bufferOffset) // Compression method DEFLATE
  bufferOffset = buffer.writeUInt8(0, bufferOffset) // Filter method of 0
  bufferOffset = buffer.writeUInt8(0, bufferOffset) // No interlace method
  chunkEnd = bufferOffset
  bufferOffset = buffer.writeUInt32(crc32('CRC-32', buffer.slice(chunkStart, chunkEnd)))
  out = Buffer.concat([out, buffer])
  // Write PLTE
  let palettesSize = palettes.length - palettes.length/4
  buffer = Buffer.alloc(12 + palettesSize), bufferOffset = 0
  bufferOffset = buffer.writeUInt32BE(palettesSize)
  chunkStart = bufferOffset
  bufferOffset = buffer.write('PLTE', bufferOffset, 'ascii')
  for (let i = 0; i < palettes.length; i++) {
    bufferOffset = buffer.writeUInt8(palettes[i++], bufferOffset) // R
    bufferOffset = buffer.writeUInt8(palettes[i++], bufferOffset) // G
    bufferOffset = buffer.writeUInt8(palettes[i++], bufferOffset) // B
    // Alpha is skipped.
  }
  chunkEnd = bufferOffset
  bufferOffset = buffer.writeUInt32(crc32('CRC-32', buffer.slice(chunkStart, chunkEnd)))
  out = Buffer.concat([out, buffer])
  // Write tRNS
  palettesSize = palettes.length/4
  buffer = Buffer.alloc(12 + palettesSize), bufferOffset = 0
  bufferOffset = buffer.writeUInt32BE(palettesSize)
  chunkStart = bufferOffset
  bufferOffset = buffer.write('tRNS', bufferOffset, 'ascii')
  for (let i = 0; i < palettes.length; i += 3) {
    bufferOffset = buffer.writeUInt8(palettes[i], bufferOffset) // A
  }
  chunkEnd = bufferOffset
  bufferOffset = buffer.writeUInt32(crc32('CRC-32', buffer.slice(chunkStart, chunkEnd)))
  out = Buffer.concat([out, buffer])
  // Build our deflate data
  let data = Buffer.alloc(pixels.length + height)
  let dataOffset = 0
  for (let i = 0; i < pixels.length; i+=width) {
    dataOffset = buffer.writeUInt8(0, dataOffset)
    for (let j = 0, end = width; j < end; j++) {
      dataOffset = buffer.writeUInt8(pixels[i+j], dataOffset)
    }
  }
  let deflatedData = await deflateAsync(data)
  // Write IDAT // Our DEFLATE and 0->raw scanline data
  buffer = Buffer.alloc(12 + deflatedData.length), bufferOffset = 0
  bufferOffset = buffer.writeUInt32BE(deflatedData.length)
  chunkStart = bufferOffset
  bufferOffset = buffer.write('IDAT', bufferOffset, 'ascii')
  buffer = Buffer.concat([buffer, deflatedData])
  bufferOffset = bufferOffset + deflatedData.length
  chunkEnd = bufferOffset
  bufferOffset = buffer.writeUInt32(crc32('CRC-32', buffer.slice(chunkStart, chunkEnd)))
  out = Buffer.concat([out, buffer])
  // Write IEND
  buffer = Buffer.alloc(12), bufferOffset = 0
  bufferOffset = buffer.writeUInt32BE(0, bufferOffset)
  chunkStart = bufferOffset
  bufferOffset = buffer.write('IEND', bufferOffset, 'ascii')
  chunkEnd = bufferOffset
  bufferOffset = buffer.writeUInt32(crc32('CRC-32', buffer.slice(chunkStart, chunkEnd)))
  out = Buffer.concat([out, buffer])

  return out
}

export default encode