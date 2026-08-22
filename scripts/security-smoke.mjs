import { readdir, readFile } from 'node:fs/promises'
import { dirname, extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const ROOTS = ['apps', 'packages', 'examples']
const SKIP_DIRS = new Set(['node_modules', 'dist', '.vite', 'generated'])
const TEXT_EXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.vue', '.html', '.md', '.json'])

const STORAGE_WRITE = /(localStorage|sessionStorage)\.setItem\s*\(/
const INDEXED_DB = /\bindexedDB\b/
const TOKENISH = /token|credential|authorization|user-token|staff-token/i
const EXAMPLE_TOKEN_URL =
  /[?&#](?:token|access_token|accessToken|user-token|staff-token|authorization)=([^\s"'`&]+)/i
const COMMENT_OR_PROSE = /^\s*(?:\/\/|\/\*|\*|<!--|#|\{?\*)/
const PROHIBITION =
  /must not|do not|never|forbidden|not written|بدون|ممنوع|not (?:to|in)|refusing to|anti-pattern/i

const findings = []

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) {
        continue
      }
      await walk(full)
      continue
    }
    if (!TEXT_EXT.has(extname(entry.name))) {
      continue
    }
    await scanFile(full)
  }
}

function nearbyToken(lines, index) {
  const from = Math.max(0, index - 2)
  const to = Math.min(lines.length, index + 3)
  return lines.slice(from, to).some((line) => TOKENISH.test(line))
}

async function scanFile(file) {
  const rel = relative(repoRoot, file).replaceAll('\\', '/')
  const source = await readFile(file, 'utf8')
  const lines = source.split(/\r?\n/)
  const inExamples = rel.startsWith('examples/')
  const inTest = /\.test\.[cm]?[jt]sx?$/.test(rel)

  for (const [index, line] of lines.entries()) {
    const n = index + 1
    if (COMMENT_OR_PROSE.test(line) || PROHIBITION.test(line)) {
      continue
    }

    if (!inTest && STORAGE_WRITE.test(line) && nearbyToken(lines, index)) {
      findings.push(`${rel}:${n}: token-like write to Web Storage`)
    }
    if (!inTest && INDEXED_DB.test(line) && nearbyToken(lines, index)) {
      findings.push(`${rel}:${n}: token-like IndexedDB use`)
    }
    if (inExamples && EXAMPLE_TOKEN_URL.test(line) && !PROHIBITION.test(line)) {
      findings.push(`${rel}:${n}: token appears in an example URL`)
    }
  }
}

for (const root of ROOTS) {
  await walk(join(repoRoot, root))
}

if (findings.length > 0) {
  console.error('Security smoke failed — token must stay out of storage and example URLs:')
  for (const finding of findings) {
    console.error(`  ${finding}`)
  }
  process.exit(1)
}

console.log('Security smoke passed (no token persistence anti-patterns in apps/, packages/, examples/).')
