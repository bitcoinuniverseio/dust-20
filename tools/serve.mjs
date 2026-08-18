/**
 * DUST-20 documentation — local preview server.
 *
 * Serves the repository under /dust-20/ so the local preview exercises the
 * same base path as GitHub Pages, including the custom 404.
 *
 *   node tools/serve.mjs [port]
 */

import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const port = Number(process.argv[2] ?? 4173)
const base = '/dust-20'

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.ico': 'image/x-icon',
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://localhost:${port}`)
  let pathname = decodeURIComponent(url.pathname)

  if (pathname === base) {
    response.writeHead(301, { location: `${base}/` })
    response.end()
    return
  }
  if (!pathname.startsWith(`${base}/`)) {
    response.writeHead(404, { 'content-type': 'text/html; charset=utf-8' })
    response.end(`<p>Serve from <a href="${base}/">${base}/</a></p>`)
    return
  }

  let relative = pathname.slice(base.length + 1)
  if (relative === '' || relative.endsWith('/')) relative += 'index.html'

  // Never serve anything outside the repository.
  const target = path.resolve(root, relative)
  if (!target.startsWith(root)) {
    response.writeHead(403)
    response.end('Forbidden')
    return
  }

  try {
    const info = await stat(target)
    if (info.isDirectory()) throw new Error('directory')
    const body = await readFile(target)
    response.writeHead(200, {
      'content-type': TYPES[path.extname(target)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    })
    response.end(body)
  } catch {
    try {
      const notFound = await readFile(path.join(root, '404.html'))
      response.writeHead(404, { 'content-type': 'text/html; charset=utf-8' })
      response.end(notFound)
    } catch {
      response.writeHead(404, { 'content-type': 'text/plain' })
      response.end('Not found')
    }
  }
})

server.listen(port, () => {
  console.log(`DUST-20 docs preview: http://localhost:${port}${base}/`)
})
