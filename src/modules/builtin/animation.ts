/**
 * Phase 7: Built-in animation module
 *
 * All primitives use the Web Animations API (element.animate().finished)
 * so they integrate with LES's async-transparent `then` sequencing:
 *
 *   fade-in #splash 200ms ease-out and
 *   slide-up #splash 180ms ease-out
 *   then fire splash:ready          ← only fires after BOTH animations complete
 *
 * `and` → Promise.all (concurrent)
 * `then` → sequential await on .finished
 *
 * The executor awaits each LESPrimitive return value, so animation
 * completion is naturally serialized without any setTimeout hacks.
 */

import type { LESModule, LESPrimitive } from '../types.js'

// ─────────────────────────────────────────────────────────────────────────────
// Utility: query all matching elements within the host scope
// ─────────────────────────────────────────────────────────────────────────────

function queryAll(selector: string, host: Element): Element[] {
  try {
    const root = host.getRootNode() as Document | ShadowRoot
    const scope = root instanceof Document ? root : root.ownerDocument ?? document
    return Array.from(scope.querySelectorAll(selector))
  } catch {
    console.warn(`[LES:animation] Invalid selector: "${selector}"`)
    return []
  }
}

/**
 * Cancel all running Web Animations on an element before starting a new one.
 * This prevents the one-frame flash that occurs when a fill:forwards animation
 * is interrupted — without cancellation, the element briefly reverts to its
 * un-animated state as the old Animation is replaced.
 */
function cancelAnimations(el: Element): void {
  for (const anim of (el as HTMLElement).getAnimations()) {
    anim.cancel()
  }
}

/** Awaits all Animation.finished promises. Returns immediately if no elements matched. */
async function animateAll(
  els: Element[],
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions
): Promise<void> {
  if (els.length === 0) return
  // Cancel any in-progress or fill:forwards animations first so we start clean.
  els.forEach(cancelAnimations)
  await Promise.all(
    els.map(el => (el as HTMLElement).animate(keyframes, options).finished)
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Direction helpers
// ─────────────────────────────────────────────────────────────────────────────

type Direction = 'left' | 'right' | 'up' | 'down'

function slideKeyframes(dir: Direction, entering: boolean): Keyframe[] {
  const distance = '60px'
  const translations: Record<Direction, string> = {
    left:  `translateX(-${distance})`,
    right: `translateX(${distance})`,
    up:    `translateY(-${distance})`,
    down:  `translateY(${distance})`,
  }
  const translate = translations[dir]
  if (entering) {
    return [
      { opacity: 0, transform: translate },
      { opacity: 1, transform: 'none' },
    ]
  } else {
    return [
      { opacity: 1, transform: 'none' },
      { opacity: 0, transform: translate },
    ]
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Core primitives
// ─────────────────────────────────────────────────────────────────────────────

const fadeIn: LESPrimitive = async (selector, duration, easing, _opts, host) => {
  const els = queryAll(selector, host)
  await animateAll(els,
    [{ opacity: 0 }, { opacity: 1 }],
    { duration, easing, fill: 'forwards' }
  )
}

const fadeOut: LESPrimitive = async (selector, duration, easing, _opts, host) => {
  const els = queryAll(selector, host)
  await animateAll(els,
    [{ opacity: 1 }, { opacity: 0 }],
    { duration, easing, fill: 'forwards' }
  )
}

const slideIn: LESPrimitive = async (selector, duration, easing, opts, host) => {
  const from = (opts['from'] as Direction | undefined) ?? 'right'
  const els = queryAll(selector, host)
  await animateAll(els, slideKeyframes(from, true), { duration, easing, fill: 'forwards' })
}

const slideOut: LESPrimitive = async (selector, duration, easing, opts, host) => {
  const to = (opts['to'] as Direction | undefined) ?? 'left'
  const els = queryAll(selector, host)
  await animateAll(els, slideKeyframes(to, false), { duration, easing, fill: 'forwards' })
}

const slideUp: LESPrimitive = async (selector, duration, easing, _opts, host) => {
  const els = queryAll(selector, host)
  await animateAll(els, slideKeyframes('up', true), { duration, easing, fill: 'forwards' })
}

const slideDown: LESPrimitive = async (selector, duration, easing, _opts, host) => {
  const els = queryAll(selector, host)
  await animateAll(els, slideKeyframes('down', false), { duration, easing, fill: 'forwards' })
}

/**
 * pulse — brief scale + opacity pulse to draw attention to updated items.
 * Used for D3 "update" phase: items whose content changed get a visual ping.
 */
const pulse: LESPrimitive = async (selector, duration, easing, _opts, host) => {
  const els = queryAll(selector, host)
  await animateAll(els, [
    { opacity: 1,    transform: 'scale(1)' },
    { opacity: 0.75, transform: 'scale(1.03)', offset: 0.4 },
    { opacity: 1,    transform: 'scale(1)' },
  ], { duration, easing, fill: 'none' })
}

/**
 * stagger-enter — runs slideIn on each matched element in sequence,
 * offset by `gap` milliseconds between each.
 *
 * Options:
 *   gap: Nms   — delay between each element (default: 40ms)
 *   from: dir  — 'left' | 'right' | 'up' | 'down' (default: 'right')
 *
 * All animations are started together (Promise.all) but each has an
 * increasing `delay` — this gives the stagger effect while keeping
 * the total Promise-settled time = duration + (n-1) * gap.
 */
const staggerEnter: LESPrimitive = async (selector, duration, easing, opts, host) => {
  const els = queryAll(selector, host)
  if (els.length === 0) return

  const gap  = parseMs(opts['gap'] as string | number | undefined, 40)
  const from = (opts['from'] as Direction | undefined) ?? 'right'

  els.forEach(cancelAnimations)
  await Promise.all(
    els.map((el, i) =>
      (el as HTMLElement).animate(
        slideKeyframes(from, true),
        { duration, easing, fill: 'forwards', delay: i * gap }
      ).finished
    )
  )
}

/**
 * stagger-exit — runs slideOut on each matched element in sequence.
 *
 * Options:
 *   gap: Nms          — delay between each element (default: 20ms)
 *   direction: reverse — process elements in reverse order
 *   to: dir           — exit direction (default: 'left')
 */
const staggerExit: LESPrimitive = async (selector, duration, easing, opts, host) => {
  // Filter to only elements that are actually visible — skip hidden/already-exited ones
  let els = queryAll(selector, host).filter(el => {
    const style = window.getComputedStyle(el as HTMLElement)
    return style.display !== 'none' && style.visibility !== 'hidden'
  })
  if (els.length === 0) return

  const gap     = parseMs(opts['gap'] as string | number | undefined, 20)
  const reverse = String(opts['direction'] ?? '') === 'reverse'
  const to      = (opts['to'] as Direction | undefined) ?? 'left'

  if (reverse) els = [...els].reverse()

  els.forEach(cancelAnimations)
  await Promise.all(
    els.map((el, i) =>
      (el as HTMLElement).animate(
        slideKeyframes(to, false),
        { duration, easing, fill: 'forwards', delay: i * gap }
      ).finished
    )
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility: parse a millisecond value from a string like "40ms" or a number
// ─────────────────────────────────────────────────────────────────────────────

function parseMs(val: string | number | undefined, fallback: number): number {
  if (val === undefined || val === null) return fallback
  if (typeof val === 'number') return val
  const m = String(val).match(/^(\d+(?:\.\d+)?)ms$/)
  if (m) return parseFloat(m[1]!)
  const n = parseFloat(String(val))
  return Number.isNaN(n) ? fallback : n
}

// ─────────────────────────────────────────────────────────────────────────────
// Module export
// ─────────────────────────────────────────────────────────────────────────────

const animationModule: LESModule = {
  name: 'animation',
  primitives: {
    'fade-in':       fadeIn,
    'fade-out':      fadeOut,
    'slide-in':      slideIn,
    'slide-out':     slideOut,
    'slide-up':      slideUp,
    'slide-down':    slideDown,
    'pulse':         pulse,
    'stagger-enter': staggerEnter,
    'stagger-exit':  staggerExit,
  },
}

export default animationModule
