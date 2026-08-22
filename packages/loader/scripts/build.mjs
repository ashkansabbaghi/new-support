import * as esbuild from 'esbuild'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const pkg = join(root, '..')

await esbuild.build({
  absWorkingDir: pkg,
  entryPoints: ['src/loader.ts'],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2020'],
  outfile: 'dist/loader.js',
  minify: true,
  sourcemap: false,
  legalComments: 'none',
  define: {
    __NIPOTO_MODULE_ORIGIN__: JSON.stringify(process.env.NIPOTO_MODULE_ORIGIN ?? 'http://localhost:5173'),
  },
  logLevel: 'info',
})
