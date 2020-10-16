import { terser }  from 'rollup-plugin-terser'
import builtins from 'rollup-plugin-node-builtins'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

export default {
  input: 'src/index.mjs',
  plugins: [
    terser(),
    builtins(),
    nodeResolve(),
    commonjs(),
  ],
  output: {
    file: 'dist/bundle.js',
    format: 'umd',
    name: 'simple-indexed-png-encode',
  }
}
