/**
 * LES bundle watcher — recompiles dist/local-event-script.js on source changes.
 * 
 * In dev mode, Hono (server/) serves static files including /dist/.
 * This watcher only compiles — it no longer needs to serve files.
 * 
 * Run both in parallel:
 *   Terminal 1: node esbuild.dev.mjs
 *   Terminal 2: cd server && node --watch --experimental-strip-types src/index.ts
 * 
 * Or use: npm run dev  (runs both via concurrently, if installed)
 */
import esbuild from 'esbuild'

const ctx = await esbuild.context({
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: false,
  format: 'esm',
  outfile: 'dist/local-event-script.js',
  external: ['datastar'],
  platform: 'browser',
  target: ['es2022'],
  sourcemap: 'inline',
})

await ctx.watch()
console.log('● watching src/ for changes → dist/local-event-script.js')
console.log('● open http://localhost:3000 (Hono dev server)')
