import test from 'ava'
import * as sipe from  '../src/index.mjs'
import { promises } from 'fs'

let pixels = [0, 0, 0, 0, 0,
              0, 1, 0, 1, 0,
              0, 1, 0, 1, 0,
              0, 0, 0, 0, 0,
              1, 0, 0, 0, 1,
              0, 1, 1, 1, 0,
              0, 0, 0, 0, 0]
let width = 5
let palettes = [255, 255, 255, 127,
                0,   0,   0,   255]

test('Build and Compare', async t => {
  t.deepEqual(
    await sipe.encode(pixels, width, palettes),
    await promises.readFile('./test/smile.png')
  )
})

