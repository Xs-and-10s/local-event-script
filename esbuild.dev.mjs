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
console.log('● watching src/ for changes…')

const { host, port } = await ctx.serve({ servedir: '.', port: 8000 })
console.log(`● dev server → http://${host}:${port}`)
console.log('  open index.html in your browser')
