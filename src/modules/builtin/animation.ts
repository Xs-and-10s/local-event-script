import type { LESModule, LESPrimitive } from '../types.js'

// ─────────────────────────────────────────────────────────────────────────────
// Built-in animation module
//
// All primitives use the Web Animations API (.animate().finished) so they
// integrate cleanly with LES's async-transparent `then` sequencing.
//
// Phase 7 fills in the implementations. Phase 0 just registers the names
// so the executor can give helpful errors rather than silent no-ops.
// ─────────────────────────────────────────────────────────────────────────────

const STUB = (name: string): LESPrimitive =>
  async (selector, duration, easing, options, host) => {
    console.debug(`[LES:animation] ${name}("${selector}", ${duration}ms, ${easing})`, options, host)
    // Phase 7 replaces this stub with real Web Animations API calls
  }

const animationModule: LESModule = {
  name: 'animation',
  primitives: {
    'fade-in':        STUB('fade-in'),
    'fade-out':       STUB('fade-out'),
    'slide-in':       STUB('slide-in'),
    'slide-out':      STUB('slide-out'),
    'slide-up':       STUB('slide-up'),
    'slide-down':     STUB('slide-down'),
    'pulse':          STUB('pulse'),
    'stagger-enter':  STUB('stagger-enter'),
    'stagger-exit':   STUB('stagger-exit'),
  },
}

export default animationModule
