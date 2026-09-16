import { build } from 'vite'
import react from '@vitejs/plugin-react'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const web = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(web, '../..')
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
const checkout = git('rev-parse', 'HEAD')
const source = process.env.NEVOLIUM_QUALIFICATION_COMMIT || checkout
if (!/^[a-f0-9]{40}$/.test(source)) throw new Error('Qualification source commit must be a full SHA')
const metadata = { source_commit: source, checkout_commit: checkout,
  dirty: Boolean(git('status', '--porcelain', '--untracked-files=normal')), built_at: new Date().toISOString() }
const result = await build({ configFile: false, root: web, plugins: [react()],
  resolve: { alias: { '@nevolium/graph': path.join(root, 'packages/graph/src/index.ts') } },
  define: { __D09_BUILD__: JSON.stringify(metadata), 'process.env.NODE_ENV': JSON.stringify('production') },
  build: { write: false, minify: true, cssCodeSplit: false, lib: {
    entry: path.join(web, 'src/qualification/d09-hardware.tsx'), name: 'NevoliumD09Hardware', formats: ['iife'],
  }, rollupOptions: { output: { inlineDynamicImports: true } } },
})
const output = (Array.isArray(result) ? result[0] : result).output
const scripts = output.filter(item => item.type === 'chunk')
if (scripts.length !== 1 || scripts[0].imports.length || scripts[0].dynamicImports.length) throw new Error('Hardware kit must be self-contained')
const css = output.filter(item => item.type === 'asset' && item.fileName.endsWith('.css')).map(item => String(item.source)).join('\n')
const html = `<!doctype html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"><title>Nevolium D09 — essai matériel</title><style>${css.replaceAll('</style', '<\\/style')}</style></head><body><div id="root"></div><script>${scripts[0].code.replaceAll('</script', '<\\/script')}</script></body></html>`
const destination = path.join(root, 'artifacts/d09-hardware-kit')
await fs.mkdir(destination, { recursive: true })
await fs.writeFile(path.join(destination, 'nevolium-d09-hardware.html'), html)
const digest = createHash('sha256').update(html).digest('hex')
await fs.writeFile(path.join(destination, 'build.json'), JSON.stringify({ ...metadata, html_sha256: digest }, null, 2) + '\n')
await fs.copyFile(path.join(root, 'docs/qualification-d09-hardware.md'), path.join(destination, 'LIRE-MOI.md'))
console.log(JSON.stringify({ ...metadata, html_sha256: digest, bytes: Buffer.byteLength(html), output: destination }))
