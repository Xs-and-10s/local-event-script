/**
 * scroll-effects.js — example userland LES module (stub)
 *
 * Shows the shape a userland <use-module src="..."> must export.
 * Real implementations would use the Web Animations API or scroll
 * timeline APIs.
 *
 * Usage in HTML:
 *   <use-module src="./scroll-effects.js"></use-module>
 *
 * Then in a <local-command> body:
 *   scroll-reveal .hero-section  400ms ease-out [threshold: 0.3]
 */

/** @type {import('./dist/local-event-script.js').LESModule} */
const scrollEffects = {
  name: 'scroll-effects',
  primitives: {
    'scroll-reveal': async (selector, duration, easing, options, host) => {
      const root = host.getRootNode()
      const scope = (root instanceof Document) ? root : (root.ownerDocument ?? document)
      const els = Array.from(scope.querySelectorAll(selector))
      console.log('[scroll-effects] scroll-reveal (stub)', selector, els.length, 'elements')
      // Real implementation: IntersectionObserver + Web Animations API
      await Promise.all(
        els.map(el => el.animate(
          [{ opacity: 0, transform: 'translateY(20px)' }, { opacity: 1, transform: 'none' }],
          { duration, easing, fill: 'forwards' }
        ).finished)
      )
    },

    'parallax': async (selector, duration, easing, options, host) => {
      console.log('[scroll-effects] parallax (stub)', selector)
      // Real implementation: scroll-linked animation via ScrollTimeline API
    },
  },
}

export default scrollEffects
