/**
 * Shared test utilities.
 * All helpers are behavioural — they work against the public surface
 * (HTML attributes, events, lesReady promise) not internal fields.
 */

/** Flush the microtask queue — waits for queueMicrotask callbacks */
export const nextMicrotask = (): Promise<void> => Promise.resolve().then(() => Promise.resolve())

/** Flush macrotask queue — waits for setTimeout(0) callbacks */
export const nextTick = (): Promise<void> => new Promise(r => setTimeout(r, 0))

/** Wait for a LES element to finish initializing */
export const lesReady = (el: Element): Promise<void> => (el as any).lesReady ?? nextTick()

/** Create a <local-event-script> element with id + optional data-signals attributes */
export function makeLES(id: string, signals: Record<string, string> = {}): HTMLElement {
  const el = document.createElement('local-event-script')
  el.id = id
  for (const [k, v] of Object.entries(signals)) {
    el.setAttribute(`data-signals:${k}`, v)
  }
  return el
}

/** Append a config child to a LES element */
export function addConfig(parent: Element, tag: string, attrs: Record<string, string>): Element {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v)
  }
  parent.appendChild(el)
  return el
}

/** Attach a LES element to the body and wait for it to be ready */
export async function attach(el: HTMLElement): Promise<void> {
  document.body.appendChild(el)
  await lesReady(el)
}

/** Attach el to body; if el has nested LES children, wait for the root's lesReady  */
export async function attachTree(root: HTMLElement): Promise<void> {
  document.body.appendChild(root)
  await lesReady(root)
}

/** Collect all CustomEvents dispatched on a target into an array */
export function collectEvents(target: EventTarget, name: string): CustomEvent[] {
  const events: CustomEvent[] = []
  target.addEventListener(name, (e) => events.push(e as CustomEvent))
  return events
}

/** Fire a named event directly on a LES element (as fireLES does) */
export function fireOn(el: Element, name: string, payload: unknown[] = []): void {
  el.dispatchEvent(new CustomEvent(name, {
    detail: { payload },
    bubbles: false,
    composed: false,
  }))
}

/** Minimal CommandDef-like object (element field is only used for warnings) */
export function mockDef(name: string, bodyRaw = '') {
  return {
    name,
    args:    [] as any[],
    guard:   null as string | null,
    body:    { type: 'expr' as const, raw: bodyRaw },
    element: {} as Element,
  }
}
