/**
 * spring-physics.js — example userland LES module (stub)
 *
 * Demonstrates how physics-based animations could be added as a
 * userland module. Real implementation would use a spring solver
 * (e.g. popmotion, motion-one spring, or a manual Runge-Kutta).
 *
 * Usage in HTML:
 *   <use-module src="./spring-physics.js"></use-module>
 *
 * Then in a <local-command> body:
 *   spring-in .card  [stiffness: 300  damping: 20]
 */

/** @type {import('./dist/local-event-script.js').LESModule} */
const springPhysics = {
  name: 'spring-physics',
  primitives: {
    'spring-in': async (selector, duration, easing, options, host) => {
      const root = host.getRootNode()
      const scope = root instanceof Document ? root : document
      const els = Array.from(scope.querySelectorAll(selector))
      console.log('[spring-physics] spring-in (stub)', selector, els.length, 'elements')
      // Real implementation: integrate spring ODE, drive via animation frames
      await Promise.all(
        els.map(el => el.animate(
          [
            { transform: 'scale(0.8)', opacity: 0 },
            { transform: 'scale(1.05)', opacity: 1, offset: 0.7 },
            { transform: 'scale(1)', opacity: 1 },
          ],
          { duration: duration || 500, easing: 'ease-out', fill: 'forwards' }
        ).finished)
      )
    },

    'spring-out': async (selector, duration, easing, options, host) => {
      console.log('[spring-physics] spring-out (stub)', selector)
    },
  },
}

export default springPhysics
