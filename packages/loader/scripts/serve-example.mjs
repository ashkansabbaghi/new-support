import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const repo = join(root, '../../..')
const port = Number(process.env.PORT ?? 4174)

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`)
  let file
  if (url.pathname === '/' || url.pathname === '/index.html') {
    file = join(repo, 'examples/vanilla-host/index.html')
  } else if (url.pathname === '/loader.js') {
    file = join(repo, 'packages/loader/dist/loader.js')
  } else {
    res.writeHead(404)
    res.end('Not found')
    return
  }

  try {
    const body = await readFile(file)
    res.writeHead(200, {
      'content-type': types[extname(file)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    })
    res.end(body)
  } catch {
    res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('Build loader first: yarn workspace @nipoto/support-loader build')
  }
})

server.listen(port, () => {
  console.log(`vanilla-host  http://localhost:${port}`)
  console.log('module iframe http://localhost:5173  (yarn dev)')
})
