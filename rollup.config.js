const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('@rollup/plugin-typescript');
const json = require('@rollup/plugin-json');
const {dts} = require('rollup-plugin-dts');

module.exports = [
  {
    input: './src/index.ts',
    output: [
      {
        file: './dist/index.esm.js',
        format: 'esm'
      },
      {
        file: './dist/index.cjs.js',
        format: 'cjs'
      }
    ],
    external: [
      '@solana/codecs',
      '@coral-xyz/anchor',
      '@solana/web3.js',
    ],
    plugins: [resolve(), commonjs(), typescript({ tsconfig: './tsconfig.json' }), json()]
  },
  {
    input: './types/index.d.ts',
    output: [{ file: './dist/index.d.ts', format: 'es' }],
    plugins: [dts()]
  }
];