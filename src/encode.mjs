import zlib from 'zlib'
import { crc32 } from 'easy-crc'

const deflateAsync = (data) => {
  return new Promise((resolve, reject) => {
    zlib.deflate(data, (err, data) => {
      if (err != null) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}

async function encode(pixels, width, palettes) {
  let out = Buffer.alloc(0)
  const height = pixels.length / width

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
  buffer = Buffer.alloc(12 + 13), bufferOffset = 0
  bufferOffset = buffer.writeUInt32BE(13, bufferOffset)
  chunkStart = bufferOffset
  bufferOffset += buffer.write('IHDR', bufferOffset, 'latin1')
  bufferOffset = buffer.writeUInt32BE(width, bufferOffset)
  bufferOffset = buffer.writeUInt32BE(height, bufferOffset)
  bufferOffset = buffer.writeUInt8(8, bufferOffset) // Indexed 8-bit depth for palette entries
  bufferOffset = buffer.writeUInt8(3, bufferOffset) // Color type of indexed
  bufferOffset = buffer.writeUInt8(0, bufferOffset) // Compression method DEFLATE
  bufferOffset = buffer.writeUInt8(0, bufferOffset) // Filter method of 0
  bufferOffset = buffer.writeUInt8(0, bufferOffset) // No interlace method
  chunkEnd = bufferOffset
  bufferOffset = buffer.writeUInt32BE(crc32('CRC-32', buffer.slice(chunkStart, chunkEnd)), bufferOffset)
  out = Buffer.concat([out, buffer])
  // Write PLTE
  let palettesSize = palettes.length - palettes.length/4
  buffer = Buffer.alloc(12 + palettesSize), bufferOffset = 0
  bufferOffset = buffer.writeUInt32BE(palettesSize, bufferOffset)
  chunkStart = bufferOffset
  bufferOffset += buffer.write('PLTE', bufferOffset, 'latin1')
  for (let i = 0; i < palettes.length; i++) {
    bufferOffset = buffer.writeUInt8(palettes[i++], bufferOffset) // R
    bufferOffset = buffer.writeUInt8(palettes[i++], bufferOffset) // G
    bufferOffset = buffer.writeUInt8(palettes[i++], bufferOffset) // B
    // Alpha is skipped.
  }
  chunkEnd = bufferOffset
  bufferOffset = buffer.writeUInt32BE(crc32('CRC-32', buffer.slice(chunkStart, chunkEnd)), bufferOffset)
  out = Buffer.concat([out, buffer])
  // Write tRNS
  palettesSize = palettes.length/4
  buffer = Buffer.alloc(12 + palettesSize), bufferOffset = 0
  bufferOffset = buffer.writeUInt32BE(palettesSize, bufferOffset)
  chunkStart = bufferOffset
  bufferOffset += buffer.write('tRNS', bufferOffset, 'latin1')
  for (let i = 3; i < palettes.length; i += 4) {
    bufferOffset = buffer.writeUInt8(palettes[i], bufferOffset) // A
  }
  chunkEnd = bufferOffset
  bufferOffset = buffer.writeUInt32BE(crc32('CRC-32', buffer.slice(chunkStart, chunkEnd)), bufferOffset)
  out = Buffer.concat([out, buffer])
  // Build our deflate data
  let data = Buffer.alloc(pixels.length + height)
  let dataOffset = 0
  for (let i = 0; i < height; i++) {
    console.log('writing scanline', i)
    dataOffset = data.writeUInt8(0, dataOffset) // No Filter
    for (let j = 0, end = width; j < end; j++) {
      dataOffset = data.writeUInt8(pixels[i*width+j], dataOffset)
    }
  }
  let deflatedData = await deflateAsync(data)
  // Write IDAT // Our DEFLATE and 0->raw scanline data
  buffer = Buffer.alloc(8), bufferOffset = 0
  bufferOffset = buffer.writeUInt32BE(deflatedData.length, bufferOffset)
  chunkStart = bufferOffset
  bufferOffset += buffer.write('IDAT', bufferOffset, 'latin1')
  buffer = Buffer.concat([buffer, deflatedData, Buffer.alloc(4)])
  bufferOffset = bufferOffset + deflatedData.length
  chunkEnd = bufferOffset
  bufferOffset = buffer.writeUInt32BE(crc32('CRC-32', buffer.slice(chunkStart, chunkEnd)), bufferOffset)
  out = Buffer.concat([out, buffer])
  // Write IEND
  buffer = Buffer.alloc(12), bufferOffset = 0
  bufferOffset = buffer.writeUInt32BE(0, bufferOffset)
  chunkStart = bufferOffset
  bufferOffset += buffer.write('IEND', bufferOffset, 'latin1')
  chunkEnd = bufferOffset
  bufferOffset = buffer.writeUInt32BE(crc32('CRC-32', buffer.slice(chunkStart, chunkEnd)), bufferOffset)
  out = Buffer.concat([out, buffer])

  return out
}

export default encode
