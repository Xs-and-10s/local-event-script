import esbuild from 'esbuild'

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: true,
  format: 'esm',
  outfile: 'dist/local-event-script.js',
  // datastar is provided by the host page via importmap — never bundled
  external: ['datastar'],
  platform: 'browser',
  target: ['es2022'],
  sourcemap: true,
  metafile: true,
}).then(result => {
  const size = Object.values(result.metafile.outputs)
    .find(o => o.entryPoint)
  console.log(`✓ built dist/local-event-script.js`)
  if (size) {
    const kb = (Object.values(result.metafile.outputs)
      .reduce((acc, o) => acc + o.bytes, 0) / 1024).toFixed(1)
    console.log(`  total: ${kb} KiB (uncompressed)`)
  }
}).catch(() => process.exit(1))
