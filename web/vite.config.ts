import { defineConfig, type Plugin } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { spawn, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const livemodelDir = path.resolve(root, 'livemodel')
const LIVEMODEL_STATIC = ['index.html', 'style.css', 'app.js'] as const

function copyLivemodelStatic(destRoot: string) {
  const dest = path.join(destRoot, 'livemodel')
  fs.mkdirSync(dest, { recursive: true })
  for (const name of LIVEMODEL_STATIC) {
    fs.copyFileSync(path.join(livemodelDir, name), path.join(dest, name))
  }
}

function livemodelStaticMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
) {
  const url = (req.url ?? '').split('?')[0] ?? ''
  if (!url.startsWith('/livemodel/')) {
    next()
    return
  }
  const rel = decodeURIComponent(url.slice('/livemodel/'.length))
  if (rel === '' || rel.includes('..') || rel.endsWith('.pt') || rel.endsWith('.py')) {
    res.statusCode = 404
    res.end('Not found')
    return
  }
  const file = path.resolve(livemodelDir, rel)
  if (!file.startsWith(livemodelDir) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    next()
    return
  }
  const ext = path.extname(file)
  const types: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
  }
  res.setHeader('Content-Type', types[ext] ?? 'application/octet-stream')
  fs.createReadStream(file).pipe(res)
}

function livemodelPlugin(): Plugin {
  let api: ChildProcess | undefined
  let outDir = path.resolve(root, 'dist')

  return {
    name: 'livemodel',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    configureServer(server) {
      const venvPy = path.join(livemodelDir, '.venv', 'bin', 'python')
      const exe = fs.existsSync(venvPy) ? venvPy : 'python3'
      api = spawn(exe, [path.join(livemodelDir, 'server.py'), '8765'], {
        cwd: livemodelDir,
        stdio: 'inherit',
      })
      api.on('error', (err) => {
        console.warn('[livemodel-api] could not start:', err.message)
      })
      server.httpServer?.once('close', () => {
        api?.kill()
      })
      server.middlewares.use(livemodelStaticMiddleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(livemodelStaticMiddleware)
    },
    writeBundle() {
      copyLivemodelStatic(outDir)
    },
  }
}

export default defineConfig({
  plugins: [react(), livemodelPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(root, 'src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8765',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
})
