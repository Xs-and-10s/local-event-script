import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    // Default environment for DOM-heavy integration tests
    environment: 'happy-dom',
    // Per-file environment overrides via // @vitest-environment comments
    globals: false,
    // Isolate each test file in its own worker — critical for customElements registry
    // which is global and cannot be re-defined within a single environment.
    isolate: true,
    // Tests that import LES source go through vitest's TypeScript pipeline
    include: ['src/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/__tests__/**', 'src/types/**'],
      reporter: ['text', 'html'],
    },
  },
  resolve: {
    alias: {
      '@elements': resolve(__dirname, 'src/elements'),
      '@parser':   resolve(__dirname, 'src/parser'),
      '@runtime':  resolve(__dirname, 'src/runtime'),
      '@modules':  resolve(__dirname, 'src/modules'),
      '@datastar': resolve(__dirname, 'src/datastar'),
    },
  },
})
